import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ReportSchedulerService, ScheduleJobData } from '../services/report-scheduler.service';
import { ReportsService } from '../reports.service';
import { ReportAnalyticsService } from '../services/report-analytics.service';
import { AnalyticsEventType } from '../entities/report-analytics.entity';

export interface ReportGenerationJobData {
  reportId: string;
  userId: string;
  format: 'pdf' | 'excel' | 'csv';
  filters?: any[];
  options?: {
    includeCharts?: boolean;
    includeMetadata?: boolean;
    customTitle?: string;
    emailRecipients?: string[];
    emailSubject?: string;
    emailBody?: string;
  };
}

export interface ReportBatchJobData {
  reportIds: string[];
  userId: string;
  format: 'pdf' | 'excel' | 'csv';
  zipFilename?: string;
  emailRecipients?: string[];
}

export interface ReportCleanupJobData {
  type: 'analytics' | 'schedules' | 'temp_files';
  daysToKeep?: number;
  userId?: string;
}

@Processor('reports')
export class ReportProcessor {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    private readonly schedulerService: ReportSchedulerService,
    private readonly reportsService: ReportsService,
    private readonly analyticsService: ReportAnalyticsService,
  ) {}

  // Processar relatório agendado
  @Process('execute-scheduled-report')
  async handleScheduledReport(job: Job<ScheduleJobData>) {
    this.logger.log(`Processando relatório agendado: ${job.data.scheduleId}`);
    
    try {
      await this.schedulerService.processScheduledReport(job.data);
      this.logger.log(`Relatório agendado ${job.data.scheduleId} processado com sucesso`);
    } catch (error) {
      this.logger.error(`Erro ao processar relatório agendado ${job.data.scheduleId}:`, error);
      throw error;
    }
  }

  // Processar geração de relatório em background
  @Process('generate-report')
  async handleReportGeneration(job: Job<ReportGenerationJobData>) {
    this.logger.log(`Gerando relatório: ${job.data.reportId}`);
    
    const startTime = Date.now();
    let success = false;
    
    try {
      // Atualizar progresso
      await job.progress(10);
      
      // Gerar dados do relatório
      const reportData = await this.reportsService.generateReport(
          job.data.reportId,
          job.data.userId,
          { filters: job.data.filters || [] },
        );
      
      await job.progress(50);
      
      // Exportar relatório
        const exportResult = await this.reportsService.exportReport(
          job.data.reportId,
          job.data.userId,
          job.data.format as 'pdf' | 'excel' | 'csv',
          job.data.filters
        );
      
      await job.progress(80);
      
      // Enviar por email se especificado
      if (job.data.options?.emailRecipients?.length) {
        // Email sending would be implemented here
        this.logger.log('Report generated and would be sent by email');
      }
      
      await job.progress(100);
      
      success = true;
      const executionTime = Date.now() - startTime;
      
      this.logger.log(`Relatório ${job.data.reportId} gerado com sucesso em ${executionTime}ms`);
      
      return {
        success: true,
        executionTime,
        recordCount: reportData.rows.length,
        fileSize: Buffer.byteLength(exportResult),
        filename: `report_${job.data.reportId}.${job.data.format}`,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Registrar erro no analytics
      await this.analyticsService.recordEvent({
        reportId: job.data.reportId,
        userId: job.data.userId,
        eventType: AnalyticsEventType.EXPORT,
        exportFormat: job.data.format as any,
        executionTime,
        metadata: {
          errorMessage: error.message,
          jobId: job.id,
        },
      });
      
      this.logger.error(`Erro ao gerar relatório ${job.data.reportId}:`, error);
      throw error;
    }
  }

  // Processar geração de múltiplos relatórios
  @Process('generate-batch-reports')
  async handleBatchReportGeneration(job: Job<ReportBatchJobData>) {
    this.logger.log(`Gerando lote de ${job.data.reportIds.length} relatórios`);
    
    const results: any[] = [];
    const totalReports = job.data.reportIds.length;
    
    try {
      for (let i = 0; i < job.data.reportIds.length; i++) {
        const reportId = job.data.reportIds[i];
        const progress = Math.round(((i + 1) / totalReports) * 100);
        
        await job.progress(progress);
        
        try {
          // Gerar relatório individual
          const exportResult = await this.reportsService.exportReport(
            reportId,
            job.data.userId,
            job.data.format as 'pdf' | 'excel' | 'csv',
            []
          );
          
          results.push({
            reportId,
            success: true,
            filename: `report_${reportId}.${job.data.format}`,
            size: Buffer.byteLength(exportResult),
          });
          
          this.logger.log(`Relatório ${reportId} gerado com sucesso (${i + 1}/${totalReports})`);
        } catch (error) {
          results.push({
            reportId,
            success: false,
            error: error.message,
          });
          
          this.logger.error(`Erro ao gerar relatório ${reportId}:`, error);
        }
      }
      
      // Se especificado, criar arquivo ZIP e enviar por email
      if (job.data.emailRecipients?.length) {
        await this.createAndSendBatchZip(job.data, results);
      }
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      this.logger.log(`Lote concluído: ${successCount} sucessos, ${errorCount} erros`);
      
      return {
        success: true,
        totalReports,
        successCount,
        errorCount,
        results,
      };
    } catch (error) {
      this.logger.error('Erro ao processar lote de relatórios:', error);
      throw error;
    }
  }

  // Processar limpeza de dados
  @Process('cleanup-data')
  async handleDataCleanup(job: Job<ReportCleanupJobData>) {
    this.logger.log(`Executando limpeza: ${job.data.type}`);
    
    try {
      let deletedCount = 0;
      
      switch (job.data.type) {
        case 'analytics':
          deletedCount = await this.analyticsService.cleanupOldData(
            job.data.daysToKeep || 365,
          );
          break;
          
        case 'schedules':
          deletedCount = await this.schedulerService.cleanupOldSchedules(
            job.data.daysToKeep || 90,
          );
          break;
          
        case 'temp_files':
          // Implementar limpeza de arquivos temporários
          deletedCount = await this.cleanupTempFiles(job.data.daysToKeep || 7);
          break;
          
        default:
          throw new Error(`Tipo de limpeza não suportado: ${job.data.type}`);
      }
      
      this.logger.log(`Limpeza ${job.data.type} concluída: ${deletedCount} itens removidos`);
      
      return {
        success: true,
        type: job.data.type,
        deletedCount,
      };
    } catch (error) {
      this.logger.error(`Erro na limpeza ${job.data.type}:`, error);
      throw error;
    }
  }

  // Processar otimização de relatórios
  @Process('optimize-reports')
  async handleReportOptimization(job: Job<{ userId?: string }>) {
    this.logger.log('Executando otimização de relatórios');
    
    try {
      // Analisar relatórios não utilizados
      const unusedReports = await this.findUnusedReports(30); // 30 dias
      
      // Analisar relatórios com performance ruim
      const slowReports = await this.findSlowReports();
      
      // Sugerir otimizações
      const suggestions = await this.generateOptimizationSuggestions(
        unusedReports,
        slowReports,
      );
      
      this.logger.log(`Otimização concluída: ${suggestions.length} sugestões geradas`);
      
      return {
        success: true,
        unusedReports: unusedReports.length,
        slowReports: slowReports.length,
        suggestions,
      };
    } catch (error) {
      this.logger.error('Erro na otimização de relatórios:', error);
      throw error;
    }
  }

  // Métodos auxiliares privados
  private async sendReportByEmail(
    jobData: ReportGenerationJobData,
    exportResult: { buffer: Buffer; filename: string; mimeType: string },
  ): Promise<void> {
    // Implementar envio de email
    // Esta funcionalidade seria integrada com o EmailService
    this.logger.log(`Enviando relatório por email para ${jobData.options?.emailRecipients?.length} destinatários`);
  }

  private async createAndSendBatchZip(
    jobData: ReportBatchJobData,
    results: any[],
  ): Promise<void> {
    // Implementar criação de ZIP e envio por email
    this.logger.log('Criando arquivo ZIP com relatórios do lote');
  }

  private async cleanupTempFiles(daysToKeep: number): Promise<number> {
    // Implementar limpeza de arquivos temporários
    this.logger.log(`Limpando arquivos temporários com mais de ${daysToKeep} dias`);
    return 0;
  }

  private async findUnusedReports(days: number): Promise<any[]> {
    // Encontrar relatórios não acessados nos últimos X dias
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Implementar lógica de busca
    return [];
  }

  private async findSlowReports(): Promise<any[]> {
    // Encontrar relatórios com tempo de execução acima da média
    const globalStats = await this.analyticsService.getGlobalStats();
    const avgTime = globalStats.avgExecutionTime;
    
    // Implementar lógica de busca
    return [];
  }

  private async generateOptimizationSuggestions(
    unusedReports: any[],
    slowReports: any[],
  ): Promise<any[]> {
    const suggestions: any[] = [];
    
    // Sugestões para relatórios não utilizados
    if (unusedReports.length > 0) {
      suggestions.push({
        type: 'unused_reports',
        title: 'Relatórios não utilizados',
        description: `${unusedReports.length} relatórios não foram acessados recentemente`,
        action: 'consider_archiving',
        reports: unusedReports,
      });
    }
    
    // Sugestões para relatórios lentos
    if (slowReports.length > 0) {
      suggestions.push({
        type: 'slow_reports',
        title: 'Relatórios com performance ruim',
        description: `${slowReports.length} relatórios têm tempo de execução acima da média`,
        action: 'optimize_queries',
        reports: slowReports,
      });
    }
    
    return suggestions;
  }

  // Event handlers removed due to compatibility issues
  // Job events would be handled by the queue system
}

export default ReportProcessor;