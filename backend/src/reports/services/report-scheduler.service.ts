import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ReportSchedule, ScheduleStatus } from '../entities/report-schedule.entity';
import { Report } from '../entities/report.entity';
import { ReportsService } from '../reports.service';
import { EmailService } from '../../email/email.service';
import * as cron from 'node-cron';

export interface ScheduleJobData {
  scheduleId: string;
  reportId: string;
  userId: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  filters?: any[];
  options?: any;
}

@Injectable()
export class ReportSchedulerService {
  private readonly logger = new Logger(ReportSchedulerService.name);

  constructor(
    @InjectRepository(ReportSchedule)
    private scheduleRepository: Repository<ReportSchedule>,
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectQueue('reports')
    private reportsQueue: Queue,
    private reportsService: ReportsService,
    private emailService: EmailService,
  ) {}

  // Executar verificação de agendamentos a cada minuto
  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledReports() {
    this.logger.debug('Verificando relatórios agendados...');
    
    try {
      const now = new Date();
      const schedulesToRun = await this.scheduleRepository
        .createQueryBuilder('schedule')
        .leftJoinAndSelect('schedule.report', 'report')
        .leftJoinAndSelect('schedule.createdBy', 'user')
        .where('schedule.enabled = :enabled', { enabled: true })
        .andWhere('schedule.status = :status', { status: ScheduleStatus.ACTIVE })
        .andWhere('(schedule.nextRun IS NULL OR schedule.nextRun <= :now)', { now })
        .getMany();

      this.logger.debug(`Encontrados ${schedulesToRun.length} agendamentos para executar`);

      for (const schedule of schedulesToRun) {
        await this.executeSchedule(schedule);
      }
    } catch (error) {
      this.logger.error('Erro ao verificar agendamentos:', error);
    }
  }

  // Executar um agendamento específico
  async executeSchedule(schedule: ReportSchedule): Promise<void> {
    this.logger.log(`Executando agendamento ${schedule.id} para relatório ${schedule.reportId}`);
    
    try {
      // Calcular próxima execução
      const nextRun = this.calculateNextRun(schedule.cronExpression);
      
      // Atualizar próxima execução
      await this.scheduleRepository.update(schedule.id, {
        nextRun,
        lastRun: new Date(),
      });

      // Adicionar job à fila
      const jobData: ScheduleJobData = {
        scheduleId: schedule.id,
        reportId: schedule.reportId,
        userId: schedule.createdById,
        recipients: schedule.recipients,
        format: schedule.format,
        filters: schedule.filters,
        options: schedule.options,
      };

      await this.reportsQueue.add('execute-scheduled-report', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      });

      this.logger.log(`Job adicionado à fila para agendamento ${schedule.id}`);
    } catch (error) {
      this.logger.error(`Erro ao executar agendamento ${schedule.id}:`, error);
      
      // Marcar como erro
      await this.markScheduleAsError(schedule.id, error.message);
    }
  }

  // Processar job de relatório agendado
  async processScheduledReport(jobData: ScheduleJobData): Promise<void> {
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;

    try {
      this.logger.log(`Processando relatório agendado ${jobData.scheduleId}`);

      // Gerar relatório
      const exportResult = await this.reportsService.exportReport(
        jobData.reportId,
        jobData.userId,
        jobData.format,
        jobData.filters || [],
      );

      // Obter dados do agendamento e relatório
      const schedule = await this.scheduleRepository.findOne({
        where: { id: jobData.scheduleId },
        relations: ['report', 'createdBy'],
      });

      if (!schedule) {
        throw new Error('Agendamento não encontrado');
      }

      // Enviar por email
      await this.sendReportByEmail(schedule, {
        buffer: exportResult,
        filename: `${schedule.report.name}.${jobData.format === 'excel' ? 'xlsx' : jobData.format}`,
        mimeType: this.getMimeType(jobData.format)
      });

      success = true;
      this.logger.log(`Relatório agendado ${jobData.scheduleId} processado com sucesso`);
    } catch (error) {
      success = false;
      errorMessage = error.message;
      this.logger.error(`Erro ao processar relatório agendado ${jobData.scheduleId}:`, error);
    } finally {
      const executionTime = Date.now() - startTime;
      
      // Atualizar estatísticas do agendamento
      await this.updateScheduleStats(jobData.scheduleId, success, executionTime, errorMessage);
    }
  }

  // Enviar relatório por email
  private async sendReportByEmail(
    schedule: ReportSchedule,
    exportResult: { buffer: Buffer; filename: string; mimeType: string },
  ): Promise<void> {
    const subject = schedule.options?.emailSubject || 
      `Relatório Agendado: ${schedule.report.name}`;
    
    const body = schedule.options?.emailBody || 
      `Segue em anexo o relatório "${schedule.report.name}" gerado automaticamente.\n\n` +
      `Gerado em: ${new Date().toLocaleString('pt-BR')}\n` +
      `Agendamento: ${schedule.name}`;

    for (const recipient of schedule.recipients) {
      try {
        await this.emailService.sendEmail({
          to: recipient,
          subject,
          text: body,
          attachments: [
            {
              filename: exportResult.filename,
              content: exportResult.buffer,
              contentType: exportResult.mimeType,
            },
          ],
        });

        this.logger.log(`Email enviado para ${recipient}`);
      } catch (error) {
        this.logger.error(`Erro ao enviar email para ${recipient}:`, error);
        throw error;
      }
    }
  }

  // Atualizar estatísticas do agendamento
  private async updateScheduleStats(
    scheduleId: string,
    success: boolean,
    executionTime: number,
    errorMessage?: string,
  ): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (schedule) {
      schedule.markAsRun(success, executionTime, errorMessage);
      await this.scheduleRepository.save(schedule);
    }
  }

  // Marcar agendamento como erro
  private async markScheduleAsError(scheduleId: string, errorMessage: string): Promise<void> {
    await this.scheduleRepository.update(scheduleId, {
      status: ScheduleStatus.ERROR,
      lastError: errorMessage,
      errorCount: () => 'errorCount + 1',
    });
  }

  // Calcular próxima execução baseada na expressão cron
  private calculateNextRun(cronExpression: string): Date {
    try {
      // Usar biblioteca node-cron para calcular próxima execução
      const task = cron.schedule(cronExpression, () => {}, {
        scheduled: false,
      });
      
      // Como node-cron não tem método direto para próxima execução,
      // vamos usar uma aproximação baseada na expressão
      const now = new Date();
      const nextRun = new Date(now);
      
      // Análise básica da expressão cron (minuto hora dia mês dia-da-semana)
      const parts = cronExpression.split(' ');
      
      if (parts.length >= 5) {
        const [minute, hour, day, month, dayOfWeek] = parts;
        
        // Se é uma execução diária (0 hora *)
        if (minute === '0' && hour !== '*' && day === '*') {
          nextRun.setHours(parseInt(hour), 0, 0, 0);
          if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
          }
        }
        // Se é uma execução por hora (* * *)
        else if (minute !== '*' && hour === '*' && day === '*') {
          nextRun.setMinutes(parseInt(minute), 0, 0);
          if (nextRun <= now) {
            nextRun.setHours(nextRun.getHours() + 1);
          }
        }
        // Se é uma execução semanal
        else if (dayOfWeek !== '*') {
          const targetDay = parseInt(dayOfWeek);
          const currentDay = nextRun.getDay();
          const daysUntilTarget = (targetDay - currentDay + 7) % 7;
          
          nextRun.setDate(nextRun.getDate() + (daysUntilTarget || 7));
          nextRun.setHours(parseInt(hour) || 0, parseInt(minute) || 0, 0, 0);
        }
        // Padrão: adicionar 1 dia
        else {
          nextRun.setDate(nextRun.getDate() + 1);
        }
      } else {
        // Expressão inválida, agendar para 1 hora
        nextRun.setHours(nextRun.getHours() + 1);
      }
      
      return nextRun;
    } catch (error) {
      this.logger.error(`Erro ao calcular próxima execução para ${cronExpression}:`, error);
      // Fallback: 1 dia
      const nextRun = new Date();
      nextRun.setDate(nextRun.getDate() + 1);
      return nextRun;
    }
  }

  // Validar expressão cron
  validateCronExpression(expression: string): boolean {
    try {
      return cron.validate(expression);
    } catch {
      return false;
    }
  }

  // Obter próximas execuções de um agendamento
  getNextExecutions(cronExpression: string, count: number = 5): Date[] {
    const executions: Date[] = [];
    let current = new Date();
    
    for (let i = 0; i < count; i++) {
      current = this.calculateNextRun(cronExpression);
      executions.push(new Date(current));
      current = new Date(current.getTime() + 60000); // +1 minuto
    }
    
    return executions;
  }

  // Pausar agendamento
  async pauseSchedule(scheduleId: string): Promise<ReportSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (schedule) {
      schedule.pause();
      return this.scheduleRepository.save(schedule);
    }

    throw new Error('Agendamento não encontrado');
  }

  // Retomar agendamento
  async resumeSchedule(scheduleId: string): Promise<ReportSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (schedule) {
      schedule.resume();
      // Recalcular próxima execução
      schedule.nextRun = this.calculateNextRun(schedule.cronExpression);
      return this.scheduleRepository.save(schedule);
    }

    throw new Error('Agendamento não encontrado');
  }

  // Obter estatísticas de agendamentos
  async getScheduleStats() {
    const total = await this.scheduleRepository.count();
    const active = await this.scheduleRepository.count({
      where: { status: ScheduleStatus.ACTIVE, enabled: true },
    });
    const paused = await this.scheduleRepository.count({
      where: { status: ScheduleStatus.PAUSED },
    });
    const error = await this.scheduleRepository.count({
      where: { status: ScheduleStatus.ERROR },
    });

    // Próximas execuções
    const nextExecutions = await this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.report', 'report')
      .where('schedule.enabled = :enabled', { enabled: true })
      .andWhere('schedule.status = :status', { status: ScheduleStatus.ACTIVE })
      .andWhere('schedule.nextRun IS NOT NULL')
      .orderBy('schedule.nextRun', 'ASC')
      .limit(10)
      .getMany();

    return {
      total,
      active,
      paused,
      error,
      nextExecutions: nextExecutions.map(schedule => ({
        id: schedule.id,
        name: schedule.name,
        reportName: schedule.report.name,
        nextRun: schedule.nextRun,
        cronExpression: schedule.cronExpression,
      })),
    };
  }

  // Limpar agendamentos antigos
  async cleanupOldSchedules(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.scheduleRepository
      .createQueryBuilder()
      .delete()
      .where('status = :status', { status: ScheduleStatus.COMPLETED })
      .andWhere('updatedAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  // Obter expressões cron comuns
  getCommonCronExpressions() {
    return [
      { label: 'Diariamente às 9h', expression: '0 9 * * *' },
      { label: 'Semanalmente (Segunda-feira às 9h)', expression: '0 9 * * 1' },
      { label: 'Mensalmente (1º dia às 9h)', expression: '0 9 1 * *' },
      { label: 'A cada hora', expression: '0 * * * *' },
      { label: 'A cada 30 minutos', expression: '*/30 * * * *' },
      { label: 'Diariamente às 18h', expression: '0 18 * * *' },
      { label: 'Semanalmente (Sexta-feira às 17h)', expression: '0 17 * * 5' },
      { label: 'Quinzenalmente (1º e 15º às 9h)', expression: '0 9 1,15 * *' },
    ];
  }

  // Obter MIME type baseado no formato
  private getMimeType(format: string): string {
    switch (format) {
      case 'pdf':
        return 'application/pdf';
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }
}

export default ReportSchedulerService;