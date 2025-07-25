import { PrismaClient } from '@prisma/client';
import { getCache } from '../utils/redisCache';
import { structuredLogger } from '../utils/logger';
import config from '../config';
import { EventEmitter } from 'events';
import crypto from 'crypto';

// Interfaces para auditoria
interface AuditLog {
  id: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  changes?: AuditChange[];
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: AuditCategory;
}

interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
  type: 'create' | 'update' | 'delete';
}

interface AuditContext {
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  requestId?: string;
  operation?: string;
}

interface AuditRule {
  resource: string;
  actions: AuditAction[];
  enabled: boolean;
  retentionDays: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  includeDetails: boolean;
  includeChanges: boolean;
  alertOnAction: boolean;
}

interface AuditReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalActions: number;
    uniqueUsers: number;
    topActions: Array<{ action: string; count: number }>;
    topResources: Array<{ resource: string; count: number }>;
    securityEvents: number;
    failedActions: number;
  };
  timeline: Array<{
    date: string;
    actions: number;
    users: number;
  }>;
  details: AuditLog[];
}

// Tipos de ação de auditoria
type AuditAction = 
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.password_change'
  | 'user.profile_update'
  | 'user.delete'
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'project.member_add'
  | 'project.member_remove'
  | 'task.create'
  | 'task.update'
  | 'task.delete'
  | 'task.assign'
  | 'task.complete'
  | 'comment.create'
  | 'comment.update'
  | 'comment.delete'
  | 'file.upload'
  | 'file.download'
  | 'file.delete'
  | 'security.failed_login'
  | 'security.suspicious_activity'
  | 'security.permission_denied'
  | 'admin.settings_change'
  | 'admin.user_impersonate'
  | 'system.backup'
  | 'system.restore'
  | 'api.rate_limit_exceeded'
  | 'api.unauthorized_access';

// Categorias de auditoria
type AuditCategory = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'security'
  | 'administration'
  | 'system'
  | 'api';

// Classe principal do serviço de auditoria
class AuditService extends EventEmitter {
  private prisma: PrismaClient;
  private cache = getCache();
  private logger = structuredLogger.child({ service: 'audit' });
  private rules = new Map<string, AuditRule>();
  private batchSize = 100;
  private batchTimeout = 5000; // 5 segundos
  private pendingLogs: AuditLog[] = [];
  private batchTimer?: NodeJS.Timeout;
  
  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
    this.setupDefaultRules();
    this.startBatchProcessor();
  }
  
  // Configurar regras padrão de auditoria
  private setupDefaultRules() {
    const defaultRules: AuditRule[] = [
      {
        resource: 'user',
        actions: ['user.login', 'user.logout', 'user.register', 'user.password_change', 'user.delete'],
        enabled: true,
        retentionDays: 365,
        severity: 'medium',
        includeDetails: true,
        includeChanges: true,
        alertOnAction: false
      },
      {
        resource: 'project',
        actions: ['project.create', 'project.update', 'project.delete', 'project.member_add', 'project.member_remove'],
        enabled: true,
        retentionDays: 180,
        severity: 'medium',
        includeDetails: true,
        includeChanges: true,
        alertOnAction: false
      },
      {
        resource: 'task',
        actions: ['task.create', 'task.update', 'task.delete', 'task.assign', 'task.complete'],
        enabled: true,
        retentionDays: 90,
        severity: 'low',
        includeDetails: true,
        includeChanges: true,
        alertOnAction: false
      },
      {
        resource: 'security',
        actions: ['security.failed_login', 'security.suspicious_activity', 'security.permission_denied'],
        enabled: true,
        retentionDays: 730, // 2 anos
        severity: 'high',
        includeDetails: true,
        includeChanges: false,
        alertOnAction: true
      },
      {
        resource: 'admin',
        actions: ['admin.settings_change', 'admin.user_impersonate'],
        enabled: true,
        retentionDays: 1095, // 3 anos
        severity: 'critical',
        includeDetails: true,
        includeChanges: true,
        alertOnAction: true
      },
      {
        resource: 'system',
        actions: ['system.backup', 'system.restore'],
        enabled: true,
        retentionDays: 365,
        severity: 'high',
        includeDetails: true,
        includeChanges: false,
        alertOnAction: true
      },
      {
        resource: 'api',
        actions: ['api.rate_limit_exceeded', 'api.unauthorized_access'],
        enabled: true,
        retentionDays: 30,
        severity: 'medium',
        includeDetails: true,
        includeChanges: false,
        alertOnAction: false
      }
    ];
    
    defaultRules.forEach(rule => {
      this.rules.set(rule.resource, rule);
    });
    
    this.logger.info('Audit rules configured', { rulesCount: defaultRules.length });
  }
  
  // Iniciar processador de lotes
  private startBatchProcessor() {
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.batchTimeout);
  }
  
  // Processar lote de logs
  private async processBatch() {
    if (this.pendingLogs.length === 0) return;
    
    const logsToProcess = this.pendingLogs.splice(0, this.batchSize);
    
    try {
      await this.saveBatchToDatabase(logsToProcess);
      this.logger.debug('Audit batch processed', { count: logsToProcess.length });
    } catch (error) {
      this.logger.error('Failed to process audit batch', error as Error, {
        count: logsToProcess.length
      });
      
      // Recolocar logs na fila em caso de erro
      this.pendingLogs.unshift(...logsToProcess);
    }
  }
  
  // Salvar lote no banco de dados
  private async saveBatchToDatabase(logs: AuditLog[]) {
    const data = logs.map(log => ({
      id: log.id,
      action: log.action,
      entity: log.resource,
      entityId: log.resourceId,
      userId: log.userId,
      userAgent: log.userAgent,
      createdAt: log.timestamp,
      oldValues: log.changes ? JSON.stringify(log.changes.map(c => c.oldValue)) : '',
      newValues: log.changes ? JSON.stringify(log.changes.map(c => c.newValue)) : '',
      ipAddress: log.ip,
      severity: log.severity,
      category: log.category
    }));
    
    await this.prisma.auditLog.createMany({ data });
  }
  
  // Registrar ação de auditoria
  async log(
    action: AuditAction,
    resource: string,
    resourceId: string,
    context: AuditContext,
    details: Record<string, any> = {},
    changes?: AuditChange[]
  ): Promise<void> {
    const rule = this.getRule(resource, action);
    if (!rule || !rule.enabled) {
      return;
    }
    
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      action,
      resource,
      resourceId,
      userId: context.userId,
      sessionId: context.sessionId,
      ip: context.ip,
      userAgent: context.userAgent,
      timestamp: new Date(),
      details: rule.includeDetails ? details : {},
      changes: rule.includeChanges ? changes : undefined,
      metadata: {
        requestId: context.requestId,
        operation: context.operation
      },
      severity: rule.severity,
      category: this.getCategoryForAction(action)
    };
    
    // Adicionar à fila de processamento
    this.pendingLogs.push(auditLog);
    
    // Processar imediatamente se atingir o tamanho do lote
    if (this.pendingLogs.length >= this.batchSize) {
      await this.processBatch();
    }
    
    // Emitir evento para alertas
    if (rule.alertOnAction) {
      this.emit('audit:alert', auditLog);
    }
    
    // Log estruturado
    this.logger.audit(action, resource, {
      resourceId,
      userId: context.userId,
      severity: rule.severity,
      category: auditLog.category
    });
  }
  
  // Obter regra para recurso e ação
  private getRule(resource: string, action: AuditAction): AuditRule | undefined {
    const rule = this.rules.get(resource);
    if (!rule) return undefined;
    
    return rule.actions.includes(action) ? rule : undefined;
  }
  
  // Obter categoria para ação
  private getCategoryForAction(action: AuditAction): AuditCategory {
    const categoryMap: Record<string, AuditCategory> = {
      'user.login': 'authentication',
      'user.logout': 'authentication',
      'user.register': 'authentication',
      'user.password_change': 'authentication',
      'user.profile_update': 'data_modification',
      'user.delete': 'data_modification',
      'project.create': 'data_modification',
      'project.update': 'data_modification',
      'project.delete': 'data_modification',
      'project.member_add': 'authorization',
      'project.member_remove': 'authorization',
      'task.create': 'data_modification',
      'task.update': 'data_modification',
      'task.delete': 'data_modification',
      'task.assign': 'authorization',
      'task.complete': 'data_modification',
      'comment.create': 'data_modification',
      'comment.update': 'data_modification',
      'comment.delete': 'data_modification',
      'file.upload': 'data_modification',
      'file.download': 'data_access',
      'file.delete': 'data_modification',
      'security.failed_login': 'security',
      'security.suspicious_activity': 'security',
      'security.permission_denied': 'security',
      'admin.settings_change': 'administration',
      'admin.user_impersonate': 'administration',
      'system.backup': 'system',
      'system.restore': 'system',
      'api.rate_limit_exceeded': 'api',
      'api.unauthorized_access': 'api'
    };
    
    return categoryMap[action] || 'data_access';
  }
  
  // Buscar logs de auditoria
  async search(filters: {
    userId?: string;
    resource?: string;
    action?: AuditAction;
    category?: AuditCategory;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    startDate?: Date;
    endDate?: Date;
    ip?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: AuditLog[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 1000);
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.resource) where.resource = filters.resource;
    if (filters.action) where.action = filters.action;
    if (filters.category) where.category = filters.category;
    if (filters.severity) where.severity = filters.severity;
    if (filters.ip) where.ip = filters.ip;
    
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }
    
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.auditLog.count({ where })
    ]);
    
    const parsedLogs: AuditLog[] = logs.map(log => ({
      ...log
    })) as any;
    
    return {
      logs: parsedLogs,
      total,
      page,
      limit
    };
  }
  
  // Gerar relatório de auditoria
  async generateReport(
    startDate: Date,
    endDate: Date,
    options: {
      includeDetails?: boolean;
      categories?: AuditCategory[];
      severities?: Array<'low' | 'medium' | 'high' | 'critical'>;
      maxDetails?: number;
    } = {}
  ): Promise<AuditReport> {
    const where: any = {
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    };
    
    if (options.categories?.length) {
      where.category = { in: options.categories };
    }
    
    if (options.severities?.length) {
      where.severity = { in: options.severities };
    }
    
    // Buscar dados agregados
    const [totalActions, uniqueUsers, topActions, topResources, securityEvents, failedActions] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        select: { userId: true },
        distinct: ['userId']
      }).then(users => users.filter(u => u.userId).length),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10
      }),
      this.prisma.auditLog.groupBy({
        by: ['entity'],
        where,
        _count: { entity: true },
        orderBy: { _count: { entity: 'desc' } },
        take: 10
      }),
      this.prisma.auditLog.count({
        where: {
          ...where,
          category: 'security'
        }
      }),
      this.prisma.auditLog.count({
        where: {
          ...where,
          action: {
            in: ['security.failed_login', 'security.permission_denied', 'api.unauthorized_access']
          }
        }
      })
    ]);
    
    // Gerar timeline
    const timeline = await this.generateTimeline(startDate, endDate, where);
    
    // Buscar detalhes se solicitado
    let details: AuditLog[] = [];
    if (options.includeDetails) {
      const logs = await this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.maxDetails || 1000
      });
      
      details = logs.map(log => ({
        ...log
      })) as any;
    }
    
    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalActions,
        uniqueUsers,
        topActions: topActions.map(a => ({ action: a.action, count: a._count.action })),
        topResources: topResources.map(r => ({ resource: r.entity, count: r._count.entity })),
        securityEvents,
        failedActions
      },
      timeline,
      details
    };
  }
  
  // Gerar timeline para relatório
  private async generateTimeline(
    startDate: Date,
    endDate: Date,
    where: any
  ): Promise<Array<{ date: string; actions: number; users: number }>> {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const timeline: Array<{ date: string; actions: number; users: number }> = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayWhere = {
        ...where,
        timestamp: {
          gte: dayStart,
          lte: dayEnd
        }
      };
      
      const [actions, users] = await Promise.all([
        this.prisma.auditLog.count({ where: dayWhere }),
        this.prisma.auditLog.findMany({
          where: dayWhere,
          select: { userId: true },
          distinct: ['userId']
        }).then(users => users.filter(u => u.userId).length)
      ]);
      
      timeline.push({
        date: date.toISOString().split('T')[0],
        actions,
        users
      });
    }
    
    return timeline;
  }
  
  // Detectar anomalias
  async detectAnomalies(options: {
    timeWindow?: number; // em horas
    thresholds?: {
      failedLogins?: number;
      suspiciousActivity?: number;
      adminActions?: number;
    };
  } = {}): Promise<Array<{ type: string; description: string; count: number; severity: string }>> {
    const timeWindow = options.timeWindow || 24; // 24 horas por padrão
    const thresholds = {
      failedLogins: 10,
      suspiciousActivity: 5,
      adminActions: 20,
      ...options.thresholds
    };
    
    const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000);
    const anomalies: Array<{ type: string; description: string; count: number; severity: string }> = [];
    
    // Detectar muitos logins falhados
    const failedLogins = await this.prisma.auditLog.count({
      where: {
        action: 'security.failed_login',
        createdAt: { gte: since }
      }
    });
    
    if (failedLogins > thresholds.failedLogins) {
      anomalies.push({
        type: 'failed_logins',
        description: `Unusual number of failed login attempts: ${failedLogins}`,
        count: failedLogins,
        severity: 'high'
      });
    }
    
    // Detectar atividade suspeita
    const suspiciousActivity = await this.prisma.auditLog.count({
      where: {
        action: 'security.suspicious_activity',
        createdAt: { gte: since }
      }
    });
    
    if (suspiciousActivity > thresholds.suspiciousActivity) {
      anomalies.push({
        type: 'suspicious_activity',
        description: `High number of suspicious activities detected: ${suspiciousActivity}`,
        count: suspiciousActivity,
        severity: 'critical'
      });
    }
    
    // Detectar muitas ações administrativas
    const adminActions = await this.prisma.auditLog.count({
      where: {
        category: 'administration',
        createdAt: { gte: since }
      }
    });
    
    if (adminActions > thresholds.adminActions) {
      anomalies.push({
        type: 'admin_actions',
        description: `Unusual number of administrative actions: ${adminActions}`,
        count: adminActions,
        severity: 'medium'
      });
    }
    
    // Detectar acessos fora do horário
    const offHoursAccess = await this.prisma.auditLog.count({
      where: {
        action: 'user.login',
        createdAt: { gte: since },
        OR: [
          { createdAt: { gte: new Date(new Date().setHours(22, 0, 0, 0)) } },
          { createdAt: { lte: new Date(new Date().setHours(6, 0, 0, 0)) } }
        ]
      }
    });
    
    if (offHoursAccess > 5) {
      anomalies.push({
        type: 'off_hours_access',
        description: `Logins detected outside business hours: ${offHoursAccess}`,
        count: offHoursAccess,
        severity: 'medium'
      });
    }
    
    return anomalies;
  }
  
  // Limpar logs antigos
  async cleanupOldLogs(): Promise<number> {
    let totalDeleted = 0;
    
    for (const [resource, rule] of this.rules) {
      if (!rule.enabled) continue;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - rule.retentionDays);
      
      const deleted = await this.prisma.auditLog.deleteMany({
        where: {
          entity: resource,
          createdAt: { lt: cutoffDate }
        }
      });
      
      totalDeleted += deleted.count;
      
      this.logger.info('Audit logs cleaned up', {
        resource,
        deleted: deleted.count,
        cutoffDate
      });
    }
    
    return totalDeleted;
  }
  
  // Obter estatísticas
  async getStats(): Promise<{
    totalLogs: number;
    logsByCategory: Record<AuditCategory, number>;
    logsBySeverity: Record<string, number>;
    recentActivity: number;
    pendingLogs: number;
  }> {
    const [totalLogs, logsByCategory, logsBySeverity, recentActivity] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['category'],
        _count: { category: true }
      }),
      this.prisma.auditLog.groupBy({
        by: ['severity'],
        _count: { severity: true }
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24 horas
          }
        }
      })
    ]);
    
    const categoryStats = logsByCategory.reduce((acc, item) => {
      acc[item.category as AuditCategory] = item._count.category;
      return acc;
    }, {} as Record<AuditCategory, number>);
    
    const severityStats = logsBySeverity.reduce((acc, item) => {
      acc[item.severity] = item._count.severity;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalLogs,
      logsByCategory: categoryStats,
      logsBySeverity: severityStats,
      recentActivity,
      pendingLogs: this.pendingLogs.length
    };
  }
  
  // Atualizar regra de auditoria
  updateRule(resource: string, updates: Partial<AuditRule>) {
    const currentRule = this.rules.get(resource);
    if (!currentRule) {
      throw new Error(`Audit rule not found for resource: ${resource}`);
    }
    
    const updatedRule = { ...currentRule, ...updates };
    this.rules.set(resource, updatedRule);
    
    this.logger.info('Audit rule updated', { resource, updates });
  }
  
  // Finalizar serviço
  async shutdown() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // Processar logs pendentes
    if (this.pendingLogs.length > 0) {
      await this.processBatch();
    }
    
    this.logger.info('Audit service shutdown completed');
  }
}

// Singleton instance
let auditService: AuditService;

export function createAuditService(prisma: PrismaClient): AuditService {
  if (!auditService) {
    auditService = new AuditService(prisma);
  }
  return auditService;
}

export function getAuditService(): AuditService {
  if (!auditService) {
    throw new Error('AuditService not initialized');
  }
  return auditService;
}

export {
  AuditService,
  AuditLog,
  AuditChange,
  AuditContext,
  AuditRule,
  AuditReport,
  AuditAction,
  AuditCategory
};

export default AuditService;