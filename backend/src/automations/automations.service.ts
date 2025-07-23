import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Automation, TriggerType, ActionType } from './entities/automation.entity';
import { AutomationLog, ExecutionStatus } from './entities/automation-log.entity';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { User } from '../auth/entities/user.entity';
import { Project } from '../projects/entities/project.entity';


@Injectable()
export class AutomationsService {
  constructor(
    @InjectRepository(Automation)
    private automationRepository: Repository<Automation>,
    @InjectRepository(AutomationLog)
    private automationLogRepository: Repository<AutomationLog>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createAutomationDto: CreateAutomationDto, userId: string): Promise<Automation> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    let project = null;
    if (createAutomationDto.projectId) {
      project = await this.projectRepository.findOne({
        where: { id: createAutomationDto.projectId },
        relations: ['owner']
      });
      if (!project) {
        throw new NotFoundException('Projeto não encontrado');
      }
      // Verificar se o usuário tem permissão no projeto
      if (project.owner && project.owner.id !== userId) {
        throw new ForbiddenException('Você não tem permissão para criar automações neste projeto');
      }
    }

    const automation = this.automationRepository.create({
      ...createAutomationDto,
      createdBy: user,
      project,
      isActive: createAutomationDto.isActive ?? true,
    });

    return this.automationRepository.save(automation);
  }

  async findAll(userId: string, projectId?: string): Promise<Automation[]> {
    const queryBuilder = this.automationRepository
      .createQueryBuilder('automation')
      .leftJoinAndSelect('automation.createdBy', 'createdBy')
      .leftJoinAndSelect('automation.project', 'project')
      .where('automation.createdBy.id = :userId', { userId });

    if (projectId) {
      queryBuilder.andWhere('automation.project.id = :projectId', { projectId });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string, userId: string): Promise<Automation> {
    const automation = await this.automationRepository.findOne({
      where: { id },
      relations: ['createdBy', 'project']
    });

    if (!automation) {
      throw new NotFoundException('Automação não encontrada');
    }

    if (automation.createdBy.id !== userId) {
      throw new ForbiddenException('Você não tem permissão para acessar esta automação');
    }

    return automation;
  }

  async update(id: string, updateAutomationDto: UpdateAutomationDto, userId: string): Promise<Automation> {
    const automation = await this.findOne(id, userId);

    Object.assign(automation, updateAutomationDto);
    return this.automationRepository.save(automation);
  }

  async remove(id: string, userId: string): Promise<void> {
    const automation = await this.findOne(id, userId);
    await this.automationRepository.remove(automation);
  }

  async toggleActive(id: string, userId: string): Promise<Automation> {
    const automation = await this.findOne(id, userId);
    automation.isActive = !automation.isActive;
    return this.automationRepository.save(automation);
  }

  // Método para executar automações baseadas em triggers
  async executeAutomations(triggerType: TriggerType, triggerData: any, userId?: string): Promise<void> {
    const automations = await this.automationRepository.find({
      where: {
        triggerType,
        isActive: true,
        ...(triggerData.projectId && { project: { id: triggerData.projectId } })
      },
      relations: ['createdBy', 'project']
    });

    for (const automation of automations) {
      await this.executeAutomation(automation, triggerData, userId);
    }
  }

  private async executeAutomation(automation: Automation, triggerData: any, userId?: string): Promise<void> {
    const startTime = Date.now();
    let status = ExecutionStatus.SUCCESS;
    let errorMessage: string | undefined;
    let actionResult: any;

    try {
      // Verificar condições do trigger
      if (!this.checkTriggerConditions(automation, triggerData)) {
        status = ExecutionStatus.SKIPPED;
        return;
      }

      // Executar ação
      actionResult = await this.executeAction(automation, triggerData);

      // Atualizar contador de execuções
      automation.executionCount++;
      automation.lastExecutedAt = new Date();
      await this.automationRepository.save(automation);

    } catch (error) {
      status = ExecutionStatus.FAILED;
      errorMessage = error.message;
    } finally {
      // Registrar log de execução
      const executionTime = Date.now() - startTime;
      await this.logExecution(automation, status, triggerData, actionResult, errorMessage, executionTime, userId);
    }
  }

  private checkTriggerConditions(automation: Automation, triggerData: any): boolean {
    if (!automation.triggerConditions) {
      return true; // Sem condições específicas, sempre executa
    }

    try {
      const conditions = JSON.parse(automation.triggerConditions);
      // Implementar lógica de verificação de condições
      // Por exemplo: verificar se a tarefa foi movida para uma seção específica
      return true; // Simplificado por enquanto
    } catch {
      return false;
    }
  }

  private async executeAction(automation: Automation, triggerData: any): Promise<any> {
    const parameters = automation.actionParameters ? JSON.parse(automation.actionParameters) : {};

    switch (automation.actionType) {
      case ActionType.SEND_NOTIFICATION:
        return this.sendNotification(parameters, triggerData);
      case ActionType.ASSIGN_TASK:
        return this.assignTask(parameters, triggerData);
      case ActionType.MOVE_TASK:
        return this.moveTask(parameters, triggerData);
      case ActionType.CREATE_TASK:
        return this.createTask(parameters, triggerData);
      case ActionType.UPDATE_TASK_PRIORITY:
        return this.updateTaskPriority(parameters, triggerData);
      case ActionType.SEND_EMAIL:
        return this.sendEmail(parameters, triggerData);
      default:
        throw new Error(`Tipo de ação não suportado: ${automation.actionType}`);
    }
  }

  private async sendNotification(parameters: any, triggerData: any): Promise<any> {
    // Implementar envio de notificação
    console.log('Enviando notificação:', parameters, triggerData);
    return { sent: true, message: parameters.message };
  }

  private async assignTask(parameters: any, triggerData: any): Promise<any> {
    // Implementar atribuição de tarefa
    console.log('Atribuindo tarefa:', parameters, triggerData);
    return { assigned: true, userId: parameters.userId };
  }

  private async moveTask(parameters: any, triggerData: any): Promise<any> {
    // Implementar movimentação de tarefa
    console.log('Movendo tarefa:', parameters, triggerData);
    return { moved: true, sectionId: parameters.sectionId };
  }

  private async createTask(parameters: any, triggerData: any): Promise<any> {
    // Implementar criação de tarefa
    console.log('Criando tarefa:', parameters, triggerData);
    return { created: true, taskId: 'new-task-id' };
  }

  private async updateTaskPriority(parameters: any, triggerData: any): Promise<any> {
    // Implementar atualização de prioridade
    console.log('Atualizando prioridade:', parameters, triggerData);
    return { updated: true, priority: parameters.priority };
  }

  private async sendEmail(parameters: any, triggerData: any): Promise<any> {
    // Implementar envio de email
    console.log('Enviando email:', parameters, triggerData);
    return { sent: true, to: parameters.to };
  }

  private async logExecution(
    automation: Automation,
    status: ExecutionStatus,
    triggerData: any,
    actionResult: any,
    errorMessage?: string,
    executionTimeMs: number = 0,
    userId?: string
  ): Promise<void> {
    const user = userId ? await this.userRepository.findOne({ where: { id: userId } }) : undefined;
    
    const log = this.automationLogRepository.create({
      automation,
      status,
      triggerData: JSON.stringify(triggerData),
      actionResult: actionResult ? JSON.stringify(actionResult) : undefined,
      errorMessage,
      executionTimeMs,
      triggeredBy: user,
      relatedTaskId: triggerData.taskId
    });

    await this.automationLogRepository.save(log);
  }

  async getExecutionLogs(automationId: string, userId: string): Promise<AutomationLog[]> {
    // Verificar se o usuário tem acesso à automação
    await this.findOne(automationId, userId);

    return this.automationLogRepository.find({
      where: { automation: { id: automationId } },
      relations: ['automation', 'triggeredBy', 'relatedTask'],
      order: { executedAt: 'DESC' },
      take: 50 // Limitar a 50 logs mais recentes
    });
  }
}