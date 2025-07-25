import { PrismaClient } from '@prisma/client';
import { getCache } from '../utils/redisCache';
import { structuredLogger } from '../utils/logger';
import { getAuditService } from './auditService';
import { getNotificationService } from './notificationService';
import config from '../config';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import cron from 'node-cron';

// Interfaces para workflows
interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  variables: WorkflowVariable[];
  conditions: WorkflowCondition[];
  settings: WorkflowSettings;
  metadata: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastExecuted?: Date;
  executionCount: number;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  triggeredBy: string;
  triggerData: Record<string, any>;
  context: ExecutionContext;
  steps: StepExecution[];
  error?: string;
  logs: ExecutionLog[];
  metadata: Record<string, any>;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  order: number;
  enabled: boolean;
  config: StepConfig;
  conditions: StepCondition[];
  onSuccess?: string; // Next step ID
  onFailure?: string; // Next step ID
  timeout: number; // em segundos
  retryPolicy: RetryPolicy;
  metadata: Record<string, any>;
}

interface StepExecution {
  id: string;
  stepId: string;
  status: StepStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  retryCount: number;
  logs: string[];
}

interface WorkflowTrigger {
  type: TriggerType;
  config: TriggerConfig;
  enabled: boolean;
  conditions: TriggerCondition[];
}

interface WorkflowVariable {
  name: string;
  type: VariableType;
  value: any;
  description?: string;
  required: boolean;
  scope: VariableScope;
}

interface WorkflowCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: LogicalOperator;
}

interface WorkflowSettings {
  maxConcurrentExecutions: number;
  executionTimeout: number; // em segundos
  retryPolicy: RetryPolicy;
  errorHandling: ErrorHandling;
  logging: LoggingSettings;
  notifications: NotificationSettings;
}

interface ExecutionContext {
  workflowId: string;
  executionId: string;
  variables: Record<string, any>;
  triggerData: Record<string, any>;
  currentStep?: string;
  stepResults: Record<string, any>;
  metadata: Record<string, any>;
}

interface ExecutionLog {
  timestamp: Date;
  level: LogLevel;
  message: string;
  stepId?: string;
  data?: Record<string, any>;
}

interface StepConfig {
  // Configurações específicas por tipo de step
  [key: string]: any;
}

interface TriggerConfig {
  // Configurações específicas por tipo de trigger
  [key: string]: any;
}

interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

interface StepCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  source: 'input' | 'context' | 'previous_step';
}

interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  backoffStrategy: BackoffStrategy;
  backoffMultiplier: number;
  maxBackoffTime: number; // em segundos
}

interface ErrorHandling {
  strategy: ErrorStrategy;
  continueOnError: boolean;
  notifyOnError: boolean;
  rollbackOnError: boolean;
}

interface LoggingSettings {
  level: LogLevel;
  includeStepDetails: boolean;
  includeVariables: boolean;
  retentionDays: number;
}

interface NotificationSettings {
  onStart: boolean;
  onSuccess: boolean;
  onFailure: boolean;
  recipients: string[];
  channels: NotificationChannel[];
}

// Tipos
type WorkflowStatus = 'draft' | 'active' | 'inactive' | 'archived';
type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'timeout';
type TriggerType = 'manual' | 'schedule' | 'event' | 'webhook' | 'api' | 'file_change';
type StepType = 
  | 'task_create'
  | 'task_update'
  | 'task_assign'
  | 'notification_send'
  | 'email_send'
  | 'api_call'
  | 'database_query'
  | 'file_operation'
  | 'condition'
  | 'delay'
  | 'script'
  | 'approval'
  | 'integration'
  | 'custom';
type VariableType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
type VariableScope = 'global' | 'execution' | 'step';
type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less' | 'greater_equal' | 'less_equal' | 'in' | 'not_in' | 'exists' | 'not_exists';
type LogicalOperator = 'and' | 'or';
type BackoffStrategy = 'fixed' | 'linear' | 'exponential';
type ErrorStrategy = 'stop' | 'continue' | 'retry' | 'rollback';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type NotificationChannel = 'email' | 'slack' | 'webhook' | 'in_app';

// Classe base para steps
abstract class BaseStep {
  protected logger = structuredLogger.child({ service: 'workflow-step' });
  protected cache = getCache();
  
  abstract execute(
    config: StepConfig,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: any; error?: string }>;
  
  // Validar configuração do step
  abstract validateConfig(config: StepConfig): boolean;
  
  // Obter schema de configuração
  abstract getConfigSchema(): Record<string, any>;
}

// Step para criar tarefa
class TaskCreateStep extends BaseStep {
  async execute(
    config: StepConfig,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const { title, description, projectId, assigneeId, priority, dueDate } = config;
      
      // Substituir variáveis
      const resolvedTitle = this.resolveVariables(title, context);
      const resolvedDescription = this.resolveVariables(description, context);
      
      // Criar tarefa (implementar integração com serviço de tarefas)
      const task = {
        id: crypto.randomUUID(),
        title: resolvedTitle,
        description: resolvedDescription,
        projectId,
        assigneeId,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: 'pending',
        createdAt: new Date()
      };
      
      this.logger.info('Task created by workflow', {
        workflowId: context.workflowId,
        executionId: context.executionId,
        taskId: task.id
      });
      
      return {
        success: true,
        output: { taskId: task.id, task }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  validateConfig(config: StepConfig): boolean {
    return !!(config.title && config.projectId);
  }
  
  getConfigSchema(): Record<string, any> {
    return {
      title: { type: 'string', required: true },
      description: { type: 'string', required: false },
      projectId: { type: 'string', required: true },
      assigneeId: { type: 'string', required: false },
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], required: false },
      dueDate: { type: 'string', format: 'date', required: false }
    };
  }
  
  private resolveVariables(template: string, context: ExecutionContext): string {
    if (!template) return template;
    
    let resolved = template;
    
    // Substituir variáveis do contexto
    for (const [key, value] of Object.entries(context.variables)) {
      resolved = resolved.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    
    // Substituir dados do trigger
    for (const [key, value] of Object.entries(context.triggerData)) {
      resolved = resolved.replace(new RegExp(`{{trigger.${key}}}`, 'g'), String(value));
    }
    
    // Substituir resultados de steps anteriores
    for (const [stepId, result] of Object.entries(context.stepResults)) {
      if (typeof result === 'object') {
        for (const [resultKey, resultValue] of Object.entries(result)) {
          resolved = resolved.replace(
            new RegExp(`{{${stepId}.${resultKey}}}`, 'g'),
            String(resultValue)
          );
        }
      }
    }
    
    return resolved;
  }
}

// Step para enviar notificação
class NotificationSendStep extends BaseStep {
  async execute(
    config: StepConfig,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const { type, recipients, title, message, data } = config;
      
      const resolvedTitle = this.resolveVariables(title, context);
      const resolvedMessage = this.resolveVariables(message, context);
      
      const notificationService = getNotificationService();
      
      for (const recipient of recipients) {
        await notificationService.createNotification(
          type,
          recipient,
          {
            title: resolvedTitle,
            message: resolvedMessage,
            ...data
          },
          {
            channels: ['in_app']
          }
        );
      }
      
      return {
        success: true,
        output: { notificationsSent: recipients.length }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  validateConfig(config: StepConfig): boolean {
    return !!(config.recipients && config.title && config.message);
  }
  
  getConfigSchema(): Record<string, any> {
    return {
      type: { type: 'string', required: true },
      recipients: { type: 'array', items: { type: 'string' }, required: true },
      title: { type: 'string', required: true },
      message: { type: 'string', required: true },
      data: { type: 'object', required: false }
    };
  }
  
  private resolveVariables(template: string, context: ExecutionContext): string {
    // Implementar resolução de variáveis (similar ao TaskCreateStep)
    return template;
  }
}

// Step para chamada de API
class ApiCallStep extends BaseStep {
  async execute(
    config: StepConfig,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const { method, url, headers, body, timeout } = config;
      
      const response = await fetch(url, {
        method: method || 'GET',
        headers: headers || {},
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeout || 30000)
      });
      
      const data = await response.json();
      
      return {
        success: response.ok,
        output: {
          status: response.status,
          data,
          headers: Object.fromEntries(response.headers.entries())
        },
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  validateConfig(config: StepConfig): boolean {
    return !!(config.url);
  }
  
  getConfigSchema(): Record<string, any> {
    return {
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], required: false },
      url: { type: 'string', required: true },
      headers: { type: 'object', required: false },
      body: { type: 'object', required: false },
      timeout: { type: 'number', required: false }
    };
  }
}

// Step para condição
class ConditionStep extends BaseStep {
  async execute(
    config: StepConfig,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const { conditions, logicalOperator } = config;
      
      const results = conditions.map((condition: any) => 
        this.evaluateCondition(condition, context)
      );
      
      let result: boolean;
      if (logicalOperator === 'or') {
        result = results.some(r => r);
      } else {
        result = results.every(r => r);
      }
      
      return {
        success: true,
        output: { conditionMet: result, results }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  private evaluateCondition(condition: any, context: ExecutionContext): boolean {
    const { field, operator, value, source } = condition;
    
    let fieldValue: any;
    
    switch (source) {
      case 'context':
        fieldValue = context.variables[field];
        break;
      case 'trigger':
        fieldValue = context.triggerData[field];
        break;
      case 'previous_step':
        const [stepId, stepField] = field.split('.');
        fieldValue = context.stepResults[stepId]?.[stepField];
        break;
      default:
        fieldValue = context.variables[field];
    }
    
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'not_contains':
        return !String(fieldValue).includes(String(value));
      case 'greater':
        return Number(fieldValue) > Number(value);
      case 'less':
        return Number(fieldValue) < Number(value);
      case 'greater_equal':
        return Number(fieldValue) >= Number(value);
      case 'less_equal':
        return Number(fieldValue) <= Number(value);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }
  
  validateConfig(config: StepConfig): boolean {
    return !!(config.conditions && Array.isArray(config.conditions));
  }
  
  getConfigSchema(): Record<string, any> {
    return {
      conditions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', required: true },
            operator: { type: 'string', required: true },
            value: { required: true },
            source: { type: 'string', enum: ['context', 'trigger', 'previous_step'], required: false }
          }
        },
        required: true
      },
      logicalOperator: { type: 'string', enum: ['and', 'or'], required: false }
    };
  }
}

// Step para delay
class DelayStep extends BaseStep {
  async execute(
    config: StepConfig,
    context: ExecutionContext
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const { duration, unit } = config;
      
      let milliseconds: number;
      switch (unit) {
        case 'seconds':
          milliseconds = duration * 1000;
          break;
        case 'minutes':
          milliseconds = duration * 60 * 1000;
          break;
        case 'hours':
          milliseconds = duration * 60 * 60 * 1000;
          break;
        default:
          milliseconds = duration;
      }
      
      await new Promise(resolve => setTimeout(resolve, milliseconds));
      
      return {
        success: true,
        output: { delayedFor: milliseconds }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  validateConfig(config: StepConfig): boolean {
    return !!(config.duration && typeof config.duration === 'number');
  }
  
  getConfigSchema(): Record<string, any> {
    return {
      duration: { type: 'number', required: true },
      unit: { type: 'string', enum: ['milliseconds', 'seconds', 'minutes', 'hours'], required: false }
    };
  }
}

// Classe principal do serviço de workflow
class WorkflowService extends EventEmitter {
  private prisma: PrismaClient;
  private cache = getCache();
  private logger = structuredLogger.child({ service: 'workflow' });
  private workflows = new Map<string, Workflow>();
  private executions = new Map<string, WorkflowExecution>();
  private stepRegistry = new Map<StepType, BaseStep>();
  private cronJobs = new Map<string, any>();
  private executionQueue: string[] = [];
  private isProcessingQueue = false;
  
  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
    this.registerSteps();
  }
  
  // Registrar steps
  private registerSteps(): void {
    this.stepRegistry.set('task_create', new TaskCreateStep());
    this.stepRegistry.set('notification_send', new NotificationSendStep());
    this.stepRegistry.set('api_call', new ApiCallStep());
    this.stepRegistry.set('condition', new ConditionStep());
    this.stepRegistry.set('delay', new DelayStep());
  }
  
  // Inicializar serviço
  async initialize(): Promise<void> {
    await this.loadWorkflows();
    this.setupTriggers();
    this.startQueueProcessor();
    
    this.logger.info('Workflow service initialized', {
      workflowsCount: this.workflows.size
    });
  }
  
  // Carregar workflows
  private async loadWorkflows(): Promise<void> {
    try {
      const workflows = await this.prisma.workflow.findMany({
        where: { isActive: true }
      });
      
      for (const workflow of workflows) {
        const parsed: Workflow = {
          ...workflow,
          steps: JSON.parse(workflow.steps as string),
          variables: JSON.parse(workflow.variables as string),
          config: JSON.parse(workflow.config as string),
          triggers: JSON.parse(workflow.triggers as string)
        } as any;
        
        this.workflows.set(workflow.id, parsed);
      }
    } catch (error) {
      this.logger.error('Failed to load workflows', error as Error);
    }
  }
  
  // Configurar triggers
  private setupTriggers(): void {
    for (const [id, workflow] of this.workflows) {
      if (workflow.trigger.enabled) {
        this.setupTrigger(id, workflow);
      }
    }
  }
  
  // Configurar trigger individual
  private setupTrigger(workflowId: string, workflow: Workflow): void {
    const { trigger } = workflow;
    
    switch (trigger.type) {
      case 'schedule':
        this.setupScheduleTrigger(workflowId, trigger.config);
        break;
      case 'event':
        this.setupEventTrigger(workflowId, trigger.config);
        break;
      // Outros tipos de trigger podem ser implementados aqui
    }
  }
  
  // Configurar trigger de agendamento
  private setupScheduleTrigger(workflowId: string, config: TriggerConfig): void {
    const { cron: cronExpression } = config;
    
    if (cronExpression && cron.validate(cronExpression)) {
      const job = cron.schedule(cronExpression, async () => {
        await this.triggerWorkflow(workflowId, 'schedule', {});
      });
      
      job.start();
      this.cronJobs.set(workflowId, job);
      
      this.logger.info('Schedule trigger configured', {
        workflowId,
        cron: cronExpression
      });
    }
  }
  
  // Configurar trigger de evento
  private setupEventTrigger(workflowId: string, config: TriggerConfig): void {
    const { events } = config;
    
    for (const event of events) {
      this.on(event, async (data: any) => {
        await this.triggerWorkflow(workflowId, 'event', data);
      });
    }
    
    this.logger.info('Event trigger configured', {
      workflowId,
      events
    });
  }
  
  // Iniciar processador de fila
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (!this.isProcessingQueue && this.executionQueue.length > 0) {
        this.isProcessingQueue = true;
        
        try {
          const executionId = this.executionQueue.shift();
          if (executionId) {
            await this.processExecution(executionId);
          }
        } catch (error) {
          this.logger.error('Queue processing error', error as Error);
        } finally {
          this.isProcessingQueue = false;
        }
      }
    }, 1000); // Processar a cada segundo
  }
  
  // Disparar workflow
  async triggerWorkflow(
    workflowId: string,
    triggerType: string,
    triggerData: Record<string, any>,
    triggeredBy: string = 'system'
  ): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    // Verificar condições do trigger
    if (workflow.trigger.conditions.length > 0) {
      const conditionsMet = this.evaluateTriggerConditions(
        workflow.trigger.conditions,
        triggerData
      );
      
      if (!conditionsMet) {
        this.logger.debug('Trigger conditions not met', {
          workflowId,
          triggerData
        });
        return '';
      }
    }
    
    // Verificar limite de execuções concorrentes
    const activeExecutions = Array.from(this.executions.values())
      .filter(e => e.workflowId === workflowId && e.status === 'running');
    
    if (activeExecutions.length >= workflow.settings.maxConcurrentExecutions) {
      this.logger.warn('Max concurrent executions reached', {
        workflowId,
        activeExecutions: activeExecutions.length,
        maxConcurrent: workflow.settings.maxConcurrentExecutions
      });
      throw new Error('Maximum concurrent executions reached');
    }
    
    // Criar execução
    const executionId = crypto.randomUUID();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'pending',
      startTime: new Date(),
      triggeredBy,
      triggerData,
      context: {
        workflowId,
        executionId,
        variables: this.initializeVariables(workflow.variables),
        triggerData,
        stepResults: {},
        metadata: {}
      },
      steps: [],
      logs: [],
      metadata: {}
    };
    
    this.executions.set(executionId, execution);
    
    // Adicionar à fila de processamento
    this.executionQueue.push(executionId);
    
    // Salvar no banco
    await this.prisma.workflowExecution.create({
      data: {
        id: execution.id,
        workflow: {
          connect: { id: execution.workflowId }
        },
        status: execution.status,
        trigger: execution.triggeredBy || 'manual',
        startedAt: execution.startTime,
        context: JSON.stringify(execution.context)
      }
    });
    
    // Atualizar workflow
    workflow.lastExecuted = new Date();
    workflow.executionCount++;
    
    await this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        updatedAt: new Date()
      }
    });
    
    this.emit('workflow:triggered', workflow, execution);
    
    this.logger.info('Workflow triggered', {
      workflowId,
      executionId,
      triggerType,
      triggeredBy
    });
    
    return executionId;
  }
  
  // Avaliar condições do trigger
  private evaluateTriggerConditions(
    conditions: TriggerCondition[],
    triggerData: Record<string, any>
  ): boolean {
    return conditions.every(condition => {
      const fieldValue = triggerData[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'greater':
          return Number(fieldValue) > Number(condition.value);
        case 'less':
          return Number(fieldValue) < Number(condition.value);
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null;
        default:
          return false;
      }
    });
  }
  
  // Inicializar variáveis
  private initializeVariables(variables: WorkflowVariable[]): Record<string, any> {
    const initialized: Record<string, any> = {};
    
    for (const variable of variables) {
      initialized[variable.name] = variable.value;
    }
    
    return initialized;
  }
  
  // Processar execução
  private async processExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      this.logger.error('Execution not found', undefined, { executionId });
      return;
    }
    
    const workflow = this.workflows.get(execution.workflowId);
    if (!workflow) {
      this.logger.error('Workflow not found for execution', undefined, {
        executionId,
        workflowId: execution.workflowId
      });
      return;
    }
    
    try {
      execution.status = 'running';
      
      // Configurar timeout da execução
      const executionTimeout = setTimeout(() => {
        this.timeoutExecution(executionId);
      }, workflow.settings.executionTimeout * 1000);
      
      // Executar steps
      await this.executeSteps(workflow, execution);
      
      clearTimeout(executionTimeout);
      
      // Finalizar execução
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      
      this.emit('workflow:completed', workflow, execution);
      
      this.logger.info('Workflow execution completed', {
        workflowId: execution.workflowId,
        executionId,
        duration: execution.duration
      });
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.error = (error as Error).message;
      
      this.emit('workflow:failed', workflow, execution, error);
      
      this.logger.error('Workflow execution failed', error as Error, {
        workflowId: execution.workflowId,
        executionId
      });
    } finally {
      // Atualizar no banco
      await this.updateExecutionInDatabase(execution);
    }
  }
  
  // Executar steps
  private async executeSteps(
    workflow: Workflow,
    execution: WorkflowExecution
  ): Promise<void> {
    const steps = workflow.steps.sort((a, b) => a.order - b.order);
    let currentStepIndex = 0;
    
    while (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex];
      
      if (!step.enabled) {
        currentStepIndex++;
        continue;
      }
      
      // Verificar condições do step
      if (step.conditions.length > 0) {
        const conditionsMet = this.evaluateStepConditions(
          step.conditions,
          execution.context
        );
        
        if (!conditionsMet) {
          this.addExecutionLog(execution, 'info', `Step ${step.name} skipped - conditions not met`, step.id);
          currentStepIndex++;
          continue;
        }
      }
      
      // Executar step
      const stepExecution = await this.executeStep(step, execution);
      execution.steps.push(stepExecution);
      
      // Verificar resultado
      if (stepExecution.status === 'failed') {
        if (workflow.settings.errorHandling.continueOnError) {
          this.addExecutionLog(execution, 'warn', `Step ${step.name} failed but continuing`, step.id);
        } else {
          throw new Error(`Step ${step.name} failed: ${stepExecution.error}`);
        }
      }
      
      // Determinar próximo step
      let nextStepId: string | undefined;
      
      if (stepExecution.status === 'completed' && step.onSuccess) {
        nextStepId = step.onSuccess;
      } else if (stepExecution.status === 'failed' && step.onFailure) {
        nextStepId = step.onFailure;
      }
      
      if (nextStepId) {
        const nextStepIndex = steps.findIndex(s => s.id === nextStepId);
        if (nextStepIndex !== -1) {
          currentStepIndex = nextStepIndex;
        } else {
          currentStepIndex++;
        }
      } else {
        currentStepIndex++;
      }
    }
  }
  
  // Executar step individual
  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<StepExecution> {
    const stepExecution: StepExecution = {
      id: crypto.randomUUID(),
      stepId: step.id,
      status: 'running',
      startTime: new Date(),
      input: step.config,
      retryCount: 0,
      logs: []
    };
    
    execution.context.currentStep = step.id;
    
    this.addExecutionLog(execution, 'info', `Starting step: ${step.name}`, step.id);
    
    try {
      const stepHandler = this.stepRegistry.get(step.type);
      if (!stepHandler) {
        throw new Error(`Unknown step type: ${step.type}`);
      }
      
      // Configurar timeout do step
      const stepTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Step timeout after ${step.timeout} seconds`));
        }, step.timeout * 1000);
      });
      
      // Executar step com retry
      let lastError: Error | undefined;
      
      for (let attempt = 0; attempt <= step.retryPolicy.maxAttempts; attempt++) {
        try {
          stepExecution.retryCount = attempt;
          
          const result = await Promise.race([
            stepHandler.execute(step.config, execution.context),
            stepTimeout
          ]);
          
          stepExecution.output = result.output;
          
          if (result.success) {
            stepExecution.status = 'completed';
            
            // Armazenar resultado no contexto
            execution.context.stepResults[step.id] = result.output;
            
            this.addExecutionLog(execution, 'info', `Step completed: ${step.name}`, step.id);
            break;
          } else {
            throw new Error(result.error || 'Step execution failed');
          }
        } catch (error) {
          lastError = error as Error;
          
          if (attempt < step.retryPolicy.maxAttempts) {
            const backoffTime = this.calculateBackoffTime(
              attempt,
              step.retryPolicy
            );
            
            this.addExecutionLog(
              execution,
              'warn',
              `Step failed (attempt ${attempt + 1}), retrying in ${backoffTime}ms: ${lastError.message}`,
              step.id
            );
            
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        }
      }
      
      if (stepExecution.status !== 'completed') {
        stepExecution.status = 'failed';
        stepExecution.error = lastError?.message || 'Step execution failed';
        
        this.addExecutionLog(
          execution,
          'error',
          `Step failed after ${step.retryPolicy.maxAttempts + 1} attempts: ${stepExecution.error}`,
          step.id
        );
      }
    } catch (error) {
      stepExecution.status = 'failed';
      stepExecution.error = (error as Error).message;
      
      this.addExecutionLog(
        execution,
        'error',
        `Step execution error: ${stepExecution.error}`,
        step.id
      );
    } finally {
      stepExecution.endTime = new Date();
      stepExecution.duration = stepExecution.endTime.getTime() - stepExecution.startTime.getTime();
      execution.context.currentStep = undefined;
    }
    
    return stepExecution;
  }
  
  // Avaliar condições do step
  private evaluateStepConditions(
    conditions: StepCondition[],
    context: ExecutionContext
  ): boolean {
    return conditions.every(condition => {
      let fieldValue: any;
      
      switch (condition.source) {
        case 'context':
          fieldValue = context.variables[condition.field];
          break;
        case 'input':
          fieldValue = context.triggerData[condition.field];
          break;
        case 'previous_step':
          const [stepId, stepField] = condition.field.split('.');
          fieldValue = context.stepResults[stepId]?.[stepField];
          break;
        default:
          fieldValue = context.variables[condition.field];
      }
      
      // Usar a mesma lógica de avaliação do ConditionStep
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null;
        default:
          return false;
      }
    });
  }
  
  // Calcular tempo de backoff
  private calculateBackoffTime(
    attempt: number,
    retryPolicy: RetryPolicy
  ): number {
    let backoffTime: number;
    
    switch (retryPolicy.backoffStrategy) {
      case 'fixed':
        backoffTime = 1000; // 1 segundo
        break;
      case 'linear':
        backoffTime = (attempt + 1) * 1000 * retryPolicy.backoffMultiplier;
        break;
      case 'exponential':
        backoffTime = Math.pow(2, attempt) * 1000 * retryPolicy.backoffMultiplier;
        break;
      default:
        backoffTime = 1000;
    }
    
    return Math.min(backoffTime, retryPolicy.maxBackoffTime * 1000);
  }
  
  // Adicionar log de execução
  private addExecutionLog(
    execution: WorkflowExecution,
    level: LogLevel,
    message: string,
    stepId?: string
  ): void {
    const log: ExecutionLog = {
      timestamp: new Date(),
      level,
      message,
      stepId
    };
    
    execution.logs.push(log);
    
    if (level === 'error') {
      this.logger.error(message, undefined, {
        workflowId: execution.workflowId,
        executionId: execution.id,
        stepId
      });
    } else {
      this.logger[level](message, {
        workflowId: execution.workflowId,
        executionId: execution.id,
        stepId
      });
    }
  }
  
  // Timeout de execução
  private async timeoutExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return;
    }
    
    execution.status = 'timeout';
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
    execution.error = 'Execution timeout';
    
    this.addExecutionLog(execution, 'error', 'Execution timed out');
    
    await this.updateExecutionInDatabase(execution);
    
    this.emit('workflow:timeout', execution);
    
    this.logger.warn('Workflow execution timed out', {
      workflowId: execution.workflowId,
      executionId
    });
  }
  
  // Atualizar execução no banco
  private async updateExecutionInDatabase(execution: WorkflowExecution): Promise<void> {
    try {
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: execution.status,
          finishedAt: execution.endTime,
          context: JSON.stringify(execution.context),
          error: execution.error
        }
      });
    } catch (error) {
      this.logger.error('Failed to update execution in database', error as Error, {
        executionId: execution.id
      });
    }
  }
  
  // Criar workflow
  async createWorkflow(
    name: string,
    description: string,
    trigger: WorkflowTrigger,
    steps: WorkflowStep[],
    variables: WorkflowVariable[] = [],
    conditions: WorkflowCondition[] = [],
    settings: Partial<WorkflowSettings> = {},
    createdBy: string
  ): Promise<Workflow> {
    const id = crypto.randomUUID();
    
    const defaultSettings: WorkflowSettings = {
      maxConcurrentExecutions: 1,
      executionTimeout: 300, // 5 minutos
      retryPolicy: {
        enabled: true,
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        backoffMultiplier: 1,
        maxBackoffTime: 60
      },
      errorHandling: {
        strategy: 'stop',
        continueOnError: false,
        notifyOnError: true,
        rollbackOnError: false
      },
      logging: {
        level: 'info',
        includeStepDetails: true,
        includeVariables: false,
        retentionDays: 30
      },
      notifications: {
        onStart: false,
        onSuccess: true,
        onFailure: true,
        recipients: [],
        channels: ['in_app']
      }
    };
    
    const workflow: Workflow = {
      id,
      name,
      description,
      version: 1,
      status: 'draft',
      trigger,
      steps,
      variables,
      conditions,
      settings: { ...defaultSettings, ...settings },
      metadata: {},
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0
    };
    
    // Validar workflow
    this.validateWorkflow(workflow);
    
    // Salvar no banco
    await this.prisma.workflow.create({
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        config: JSON.stringify(workflow.settings || {}),
        triggers: JSON.stringify(workflow.trigger || {}),
        steps: JSON.stringify(workflow.steps || []),
        variables: JSON.stringify(workflow.variables || {}),
        createdById: workflow.createdBy,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt
      }
    });
    
    // Adicionar às coleções
    this.workflows.set(id, workflow);
    
    // Registrar auditoria
    const auditService = getAuditService();
    await auditService.log(
      'admin.settings_change',
      'workflow',
      id,
      {
        ip: 'system',
        userAgent: 'workflow-service'
      },
      {
        action: 'create',
        name
      }
    );
    
    this.emit('workflow:created', workflow);
    
    this.logger.info('Workflow created', {
      id,
      name,
      stepsCount: steps.length
    });
    
    return workflow;
  }
  
  // Validar workflow
  private validateWorkflow(workflow: Workflow): void {
    // Validar steps
    for (const step of workflow.steps) {
      const stepHandler = this.stepRegistry.get(step.type);
      if (!stepHandler) {
        throw new Error(`Unknown step type: ${step.type}`);
      }
      
      if (!stepHandler.validateConfig(step.config)) {
        throw new Error(`Invalid configuration for step: ${step.name}`);
      }
    }
    
    // Validar referências de steps
    const stepIds = new Set(workflow.steps.map(s => s.id));
    
    for (const step of workflow.steps) {
      if (step.onSuccess && !stepIds.has(step.onSuccess)) {
        throw new Error(`Invalid onSuccess reference in step: ${step.name}`);
      }
      
      if (step.onFailure && !stepIds.has(step.onFailure)) {
        throw new Error(`Invalid onFailure reference in step: ${step.name}`);
      }
    }
  }
  
  // Ativar workflow
  async activateWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    workflow.status = 'active';
    workflow.updatedAt = new Date();
    
    await this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        updatedAt: workflow.updatedAt
      }
    });
    
    // Configurar trigger
    if (workflow.trigger.enabled) {
      this.setupTrigger(workflowId, workflow);
    }
    
    this.emit('workflow:activated', workflow);
    
    this.logger.info('Workflow activated', { workflowId });
  }
  
  // Desativar workflow
  async deactivateWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    workflow.status = 'inactive';
    workflow.updatedAt = new Date();
    
    await this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        updatedAt: workflow.updatedAt
      }
    });
    
    // Remover trigger
    const cronJob = this.cronJobs.get(workflowId);
    if (cronJob) {
      cronJob.stop();
      this.cronJobs.delete(workflowId);
    }
    
    this.emit('workflow:deactivated', workflow);
    
    this.logger.info('Workflow deactivated', { workflowId });
  }
  
  // Listar workflows
  getWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }
  
  // Obter workflow
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }
  
  // Obter execuções
  async getExecutions(
    workflowId?: string,
    limit: number = 50
  ) {
    const executions = await this.prisma.workflowExecution.findMany({
      where: workflowId ? { workflowId } : undefined,
      orderBy: { startedAt: 'desc' },
      take: limit
    });
    
    return executions.map(e => ({
      ...e,
      context: e.context ? JSON.parse(e.context as string) : null
    }));
  }
  
  // Obter execução
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }
  
  // Cancelar execução
  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }
    
    if (execution.status !== 'running') {
      throw new Error(`Cannot cancel execution with status: ${execution.status}`);
    }
    
    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
    
    this.addExecutionLog(execution, 'info', 'Execution cancelled by user');
    
    await this.updateExecutionInDatabase(execution);
    
    this.emit('workflow:cancelled', execution);
    
    this.logger.info('Workflow execution cancelled', {
      workflowId: execution.workflowId,
      executionId
    });
  }
  
  // Obter estatísticas
  getStats(): {
    workflows: {
      total: number;
      active: number;
      byStatus: Record<WorkflowStatus, number>;
    };
    executions: {
      total: number;
      running: number;
      byStatus: Record<ExecutionStatus, number>;
    };
    steps: {
      registered: number;
      types: StepType[];
    };
  } {
    const workflows = Array.from(this.workflows.values());
    const executions = Array.from(this.executions.values());
    
    const workflowsByStatus = workflows.reduce((acc, workflow) => {
      acc[workflow.status] = (acc[workflow.status] || 0) + 1;
      return acc;
    }, {} as Record<WorkflowStatus, number>);
    
    const executionsByStatus = executions.reduce((acc, execution) => {
      acc[execution.status] = (acc[execution.status] || 0) + 1;
      return acc;
    }, {} as Record<ExecutionStatus, number>);
    
    return {
      workflows: {
        total: workflows.length,
        active: workflows.filter(w => w.status === 'active').length,
        byStatus: workflowsByStatus
      },
      executions: {
        total: executions.length,
        running: executions.filter(e => e.status === 'running').length,
        byStatus: executionsByStatus
      },
      steps: {
        registered: this.stepRegistry.size,
        types: Array.from(this.stepRegistry.keys())
      }
    };
  }
  
  // Finalizar serviço
  async shutdown(): Promise<void> {
    // Parar todos os cron jobs
    for (const job of this.cronJobs.values()) {
      job.stop();
    }
    this.cronJobs.clear();
    
    // Cancelar execuções em andamento
    for (const execution of this.executions.values()) {
      if (execution.status === 'running') {
        await this.cancelExecution(execution.id);
      }
    }
    
    this.logger.info('Workflow service shutdown completed');
  }
}

// Singleton instance
let workflowService: WorkflowService;

export function createWorkflowService(prisma: PrismaClient): WorkflowService {
  if (!workflowService) {
    workflowService = new WorkflowService(prisma);
  }
  return workflowService;
}

export function getWorkflowService(): WorkflowService {
  if (!workflowService) {
    throw new Error('WorkflowService not initialized');
  }
  return workflowService;
}

export {
  WorkflowService,
  BaseStep,
  TaskCreateStep,
  NotificationSendStep,
  ApiCallStep,
  ConditionStep,
  DelayStep,
  Workflow,
  WorkflowExecution,
  WorkflowStep,
  WorkflowTrigger,
  StepType,
  TriggerType,
  WorkflowStatus,
  ExecutionStatus
};

export default WorkflowService;