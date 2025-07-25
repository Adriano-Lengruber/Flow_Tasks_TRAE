import { PrismaClient } from '@prisma/client';
import { getCache } from '../utils/redisCache';
import { structuredLogger } from '../utils/logger';
import { EventEmitter } from 'events';
import config from '../config';

// Interfaces para métricas e KPIs
interface KPIMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  target?: number;
  status: 'good' | 'warning' | 'critical';
  lastUpdated: Date;
  category: KPICategory;
}

interface DashboardData {
  overview: OverviewMetrics;
  kpis: KPIMetric[];
  charts: ChartMetric[];
  recentActivity: ActivityMetric[];
  alerts: AlertMetric[];
  performance: PerformanceMetrics;
  generatedAt: Date;
}

interface OverviewMetrics {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalUsers: number;
  activeUsers: number;
  completionRate: number;
  averageTaskDuration: number;
}

interface ChartMetric {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
  data: any[];
  labels: string[];
  options?: Record<string, any>;
  timeRange: string;
}

interface ActivityMetric {
  id: string;
  type: 'task_created' | 'task_completed' | 'project_created' | 'user_joined';
  description: string;
  userId?: string;
  userName?: string;
  projectId?: string;
  projectName?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface AlertMetric {
  id: string;
  type: 'performance' | 'deadline' | 'resource' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  threshold: number;
  currentValue: number;
  createdAt: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

interface PerformanceMetrics {
  apiResponseTime: number;
  databaseQueryTime: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

interface MetricsFilter {
  dateRange?: {
    start: Date;
    end: Date;
  };
  projects?: string[];
  users?: string[];
  categories?: KPICategory[];
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

type KPICategory = 'productivity' | 'performance' | 'quality' | 'engagement' | 'system';

class MetricsService extends EventEmitter {
  private prisma: PrismaClient;
  private cache = getCache();
  private logger = structuredLogger.child({ service: 'metrics' });
  private metricsCache = new Map<string, any>();
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly CACHE_TTL = 300; // 5 minutos

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing metrics service');
    
    // Iniciar coleta de métricas em tempo real
    this.startMetricsCollection();
    
    // Configurar alertas automáticos
    this.setupAlerts();
    
    this.logger.info('Metrics service initialized successfully');
  }

  private startMetricsCollection(): void {
    // Atualizar métricas a cada 5 minutos
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateCachedMetrics();
        this.emit('metrics_updated');
      } catch (error) {
        this.logger.error('Error updating metrics', error as Error);
      }
    }, 5 * 60 * 1000);
  }

  private async updateCachedMetrics(): Promise<void> {
    const overview = await this.calculateOverviewMetrics();
    const kpis = await this.calculateKPIs();
    const performance = await this.calculatePerformanceMetrics();
    
    await this.cache.set('metrics:overview', overview, this.CACHE_TTL);
    await this.cache.set('metrics:kpis', kpis, this.CACHE_TTL);
    await this.cache.set('metrics:performance', performance, this.CACHE_TTL);
  }

  async getDashboardData(filter?: MetricsFilter): Promise<DashboardData> {
    const cacheKey = `dashboard:${JSON.stringify(filter || {})}`;
    
    // Tentar buscar do cache primeiro
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const [overview, kpis, charts, recentActivity, alerts, performance] = await Promise.all([
      this.getOverviewMetrics(filter),
      this.getKPIs(filter),
      this.getChartMetrics(filter),
      this.getRecentActivity(filter),
      this.getActiveAlerts(),
      this.getPerformanceMetrics()
    ]);

    const dashboardData: DashboardData = {
      overview,
      kpis,
      charts,
      recentActivity,
      alerts,
      performance,
      generatedAt: new Date()
    };

    // Cache por 2 minutos
    await this.cache.set(cacheKey, dashboardData, 120);
    
    return dashboardData;
  }

  async getOverviewMetrics(filter?: MetricsFilter): Promise<OverviewMetrics> {
    const cached = await this.cache.get('metrics:overview');
    if (cached && !filter) {
      return cached;
    }

    return this.calculateOverviewMetrics(filter);
  }

  private async calculateOverviewMetrics(filter?: MetricsFilter): Promise<OverviewMetrics> {
    const dateFilter = filter?.dateRange ? {
      createdAt: {
        gte: filter.dateRange.start,
        lte: filter.dateRange.end
      }
    } : {};

    const [projects, tasks, users] = await Promise.all([
      this.prisma.project.findMany({
        where: {
          ...dateFilter,
          ...(filter?.projects ? { id: { in: filter.projects } } : {})
        },
        include: { _count: { select: { tasks: true } } }
      }),
      this.prisma.task.findMany({
        where: {
          ...dateFilter,
          ...(filter?.projects ? { projectId: { in: filter.projects } } : {})
        }
      }),
      this.prisma.user.findMany({
        where: {
          ...dateFilter,
          ...(filter?.users ? { id: { in: filter.users } } : {})
        }
      })
    ]);

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
    const overdueTasks = tasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < new Date() && 
      t.status !== 'completed'
    );

    const activeProjects = projects.filter(p => p.status === 'active');
    const activeUsers = users.filter(u => {
      const lastActivity = new Date(u.updatedAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return lastActivity > thirtyDaysAgo;
    });

    const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
    const averageTaskDuration = this.calculateAverageTaskDuration(completedTasks);

    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasks.length,
      totalUsers: users.length,
      activeUsers: activeUsers.length,
      completionRate,
      averageTaskDuration
    };
  }

  async getKPIs(filter?: MetricsFilter): Promise<KPIMetric[]> {
    const cached = await this.cache.get('metrics:kpis');
    if (cached && !filter) {
      return cached;
    }

    return this.calculateKPIs(filter);
  }

  private async calculateKPIs(filter?: MetricsFilter): Promise<KPIMetric[]> {
    const overview = await this.getOverviewMetrics(filter);
    const previousPeriod = await this.getPreviousPeriodMetrics(filter);

    const kpis: KPIMetric[] = [
      {
        id: 'completion_rate',
        name: 'Taxa de Conclusão',
        value: overview.completionRate,
        unit: '%',
        trend: this.calculateTrend(overview.completionRate, previousPeriod.completionRate),
        trendPercentage: this.calculateTrendPercentage(overview.completionRate, previousPeriod.completionRate),
        target: 85,
        status: overview.completionRate >= 85 ? 'good' : overview.completionRate >= 70 ? 'warning' : 'critical',
        lastUpdated: new Date(),
        category: 'productivity'
      },
      {
        id: 'active_projects',
        name: 'Projetos Ativos',
        value: overview.activeProjects,
        unit: 'projetos',
        trend: this.calculateTrend(overview.activeProjects, previousPeriod.activeProjects),
        trendPercentage: this.calculateTrendPercentage(overview.activeProjects, previousPeriod.activeProjects),
        status: 'good',
        lastUpdated: new Date(),
        category: 'engagement'
      },
      {
        id: 'overdue_tasks',
        name: 'Tarefas Atrasadas',
        value: overview.overdueTasks,
        unit: 'tarefas',
        trend: this.calculateTrend(overview.overdueTasks, previousPeriod.overdueTasks, true),
        trendPercentage: this.calculateTrendPercentage(overview.overdueTasks, previousPeriod.overdueTasks),
        target: 5,
        status: overview.overdueTasks <= 5 ? 'good' : overview.overdueTasks <= 15 ? 'warning' : 'critical',
        lastUpdated: new Date(),
        category: 'quality'
      },
      {
        id: 'avg_task_duration',
        name: 'Duração Média das Tarefas',
        value: overview.averageTaskDuration,
        unit: 'dias',
        trend: this.calculateTrend(overview.averageTaskDuration, previousPeriod.averageTaskDuration, true),
        trendPercentage: this.calculateTrendPercentage(overview.averageTaskDuration, previousPeriod.averageTaskDuration),
        target: 3,
        status: overview.averageTaskDuration <= 3 ? 'good' : overview.averageTaskDuration <= 7 ? 'warning' : 'critical',
        lastUpdated: new Date(),
        category: 'performance'
      },
      {
        id: 'active_users',
        name: 'Usuários Ativos',
        value: overview.activeUsers,
        unit: 'usuários',
        trend: this.calculateTrend(overview.activeUsers, previousPeriod.activeUsers),
        trendPercentage: this.calculateTrendPercentage(overview.activeUsers, previousPeriod.activeUsers),
        status: 'good',
        lastUpdated: new Date(),
        category: 'engagement'
      }
    ];

    return kpis;
  }

  async getChartMetrics(filter?: MetricsFilter): Promise<ChartMetric[]> {
    const timeRange = filter?.granularity || 'day';
    const dateRange = filter?.dateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
      end: new Date()
    };

    const [tasksOverTime, tasksByStatus, tasksByPriority, projectProgress] = await Promise.all([
      this.getTasksOverTimeChart(dateRange, timeRange),
      this.getTasksByStatusChart(filter),
      this.getTasksByPriorityChart(filter),
      this.getProjectProgressChart(filter)
    ]);

    return [tasksOverTime, tasksByStatus, tasksByPriority, projectProgress];
  }

  private async getTasksOverTimeChart(dateRange: { start: Date; end: Date }, granularity: string): Promise<ChartMetric> {
    // Implementar lógica para gráfico de tarefas ao longo do tempo
    const tasks = await this.prisma.task.findMany({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      select: {
        createdAt: true,
        status: true
      }
    });

    const groupedData = this.groupDataByTime(tasks, granularity, 'createdAt');
    
    return {
      id: 'tasks_over_time',
      title: 'Tarefas Criadas ao Longo do Tempo',
      type: 'line',
      data: groupedData.map(d => d.count),
      labels: groupedData.map(d => d.label),
      timeRange: `${granularity}ly`
    };
  }

  private async getTasksByStatusChart(filter?: MetricsFilter): Promise<ChartMetric> {
    const tasks = await this.prisma.task.findMany({
      where: this.buildTaskFilter(filter),
      select: { status: true }
    });

    const statusCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      id: 'tasks_by_status',
      title: 'Tarefas por Status',
      type: 'doughnut',
      data: Object.values(statusCounts),
      labels: Object.keys(statusCounts),
      timeRange: 'current'
    };
  }

  private async getTasksByPriorityChart(filter?: MetricsFilter): Promise<ChartMetric> {
    const tasks = await this.prisma.task.findMany({
      where: this.buildTaskFilter(filter),
      select: { priority: true }
    });

    const priorityCounts = tasks.reduce((acc, task) => {
      const priority = task.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      id: 'tasks_by_priority',
      title: 'Tarefas por Prioridade',
      type: 'bar',
      data: Object.values(priorityCounts),
      labels: Object.keys(priorityCounts),
      timeRange: 'current'
    };
  }

  private async getProjectProgressChart(filter?: MetricsFilter): Promise<ChartMetric> {
    const projects = await this.prisma.project.findMany({
      where: this.buildProjectFilter(filter),
      include: {
        tasks: {
          select: { status: true }
        }
      }
    });

    const progressData = projects.map(project => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(t => t.status === 'completed').length;
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      return {
        name: project.name,
        progress: Math.round(progress)
      };
    });

    return {
      id: 'project_progress',
      title: 'Progresso dos Projetos',
      type: 'bar',
      data: progressData.map(p => p.progress),
      labels: progressData.map(p => p.name),
      timeRange: 'current'
    };
  }

  async getRecentActivity(filter?: MetricsFilter, limit: number = 10): Promise<ActivityMetric[]> {
    const activities: ActivityMetric[] = [];

    // Buscar atividades recentes de diferentes tipos
    const [recentTasks, recentProjects] = await Promise.all([
      this.prisma.task.findMany({
        where: this.buildTaskFilter(filter),
        include: {
          project: { select: { name: true } },
          assignee: { select: { firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      this.prisma.project.findMany({
        where: this.buildProjectFilter(filter),
        orderBy: { createdAt: 'desc' },
        take: limit
      })
    ]);

    // Converter tarefas em atividades
    recentTasks.forEach(task => {
      activities.push({
        id: `task_${task.id}`,
        type: 'task_created',
        description: `Tarefa "${task.title}" criada no projeto "${task.project.name}"`,
        userId: task.assigneeId || undefined,
        userName: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : undefined,
        projectId: task.projectId,
        projectName: task.project.name,
        timestamp: task.createdAt
      });
    });

    // Converter projetos em atividades
    recentProjects.forEach(project => {
      activities.push({
        id: `project_${project.id}`,
        type: 'project_created',
        description: `Projeto "${project.name}" criado`,
        userId: undefined,
        userName: undefined,
        projectId: project.id,
        projectName: project.name,
        timestamp: project.createdAt
      });
    });

    // Ordenar por timestamp e limitar
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getActiveAlerts(): Promise<AlertMetric[]> {
    // Por enquanto, retornar alertas mockados
    // Em uma implementação real, estes viriam de um sistema de monitoramento
    const alerts: AlertMetric[] = [];

    const overview = await this.getOverviewMetrics();
    const performance = await this.getPerformanceMetrics();

    // Verificar alertas baseados em métricas
    if (overview.overdueTasks > 15) {
      alerts.push({
        id: 'overdue_tasks_high',
        type: 'deadline',
        severity: overview.overdueTasks > 25 ? 'critical' : 'high',
        title: 'Muitas Tarefas Atrasadas',
        description: `${overview.overdueTasks} tarefas estão atrasadas`,
        threshold: 15,
        currentValue: overview.overdueTasks,
        createdAt: new Date(),
        acknowledged: false
      });
    }

    if (performance.apiResponseTime > 1000) {
      alerts.push({
        id: 'api_slow_response',
        type: 'performance',
        severity: performance.apiResponseTime > 2000 ? 'critical' : 'medium',
        title: 'API com Resposta Lenta',
        description: `Tempo de resposta da API: ${performance.apiResponseTime}ms`,
        threshold: 1000,
        currentValue: performance.apiResponseTime,
        createdAt: new Date(),
        acknowledged: false
      });
    }

    return alerts;
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const cached = await this.cache.get('metrics:performance');
    if (cached) {
      return cached;
    }

    return this.calculatePerformanceMetrics();
  }

  private async calculatePerformanceMetrics(): Promise<PerformanceMetrics> {
    // Em uma implementação real, estas métricas viriam de sistemas de monitoramento
    // Por enquanto, retornar valores simulados baseados em dados reais quando possível
    
    const startTime = Date.now();
    
    // Testar tempo de resposta do banco
    await this.prisma.user.count();
    const dbQueryTime = Date.now() - startTime;

    // Simular outras métricas (em produção, viriam de ferramentas como Prometheus, New Relic, etc.)
    return {
      apiResponseTime: Math.random() * 500 + 100, // 100-600ms
      databaseQueryTime: dbQueryTime,
      cacheHitRate: Math.random() * 30 + 70, // 70-100%
      errorRate: Math.random() * 2, // 0-2%
      throughput: Math.random() * 100 + 50, // 50-150 req/min
      activeConnections: Math.floor(Math.random() * 50 + 10), // 10-60 conexões
      memoryUsage: Math.random() * 30 + 40, // 40-70%
      cpuUsage: Math.random() * 20 + 10 // 10-30%
    };
  }

  // Métodos auxiliares
  private async getPreviousPeriodMetrics(filter?: MetricsFilter): Promise<OverviewMetrics> {
    const currentRange = filter?.dateRange;
    if (!currentRange) {
      // Se não há filtro de data, usar período anterior de 30 dias
      const end = new Date();
      end.setDate(end.getDate() - 30);
      const start = new Date();
      start.setDate(start.getDate() - 60);
      
      return this.calculateOverviewMetrics({
        ...filter,
        dateRange: { start, end }
      });
    }

    const duration = currentRange.end.getTime() - currentRange.start.getTime();
    const previousEnd = new Date(currentRange.start.getTime());
    const previousStart = new Date(currentRange.start.getTime() - duration);

    return this.calculateOverviewMetrics({
      ...filter,
      dateRange: { start: previousStart, end: previousEnd }
    });
  }

  private calculateTrend(current: number, previous: number, inverse: boolean = false): 'up' | 'down' | 'stable' {
    const threshold = 0.05; // 5% de diferença para considerar estável
    const change = (current - previous) / previous;
    
    if (Math.abs(change) < threshold) return 'stable';
    
    const isUp = change > 0;
    if (inverse) {
      return isUp ? 'down' : 'up'; // Para métricas onde menor é melhor
    }
    return isUp ? 'up' : 'down';
  }

  private calculateTrendPercentage(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private calculateAverageTaskDuration(completedTasks: any[]): number {
    if (completedTasks.length === 0) return 0;
    
    const totalDuration = completedTasks.reduce((sum, task) => {
      if (task.completedAt && task.createdAt) {
        const duration = new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime();
        return sum + (duration / (1000 * 60 * 60 * 24)); // Converter para dias
      }
      return sum;
    }, 0);
    
    return Math.round((totalDuration / completedTasks.length) * 10) / 10;
  }

  private groupDataByTime(data: any[], granularity: string, dateField: string): { label: string; count: number }[] {
    const grouped = new Map<string, number>();
    
    data.forEach(item => {
      const date = new Date(item[dateField]);
      let key: string;
      
      switch (granularity) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `Semana ${weekStart.getFullYear()}-${weekStart.getMonth() + 1}-${weekStart.getDate()}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    
    return Array.from(grouped.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  private buildTaskFilter(filter?: MetricsFilter): any {
    const where: any = {};
    
    if (filter?.dateRange) {
      where.createdAt = {
        gte: filter.dateRange.start,
        lte: filter.dateRange.end
      };
    }
    
    if (filter?.projects?.length) {
      where.projectId = { in: filter.projects };
    }
    
    if (filter?.users?.length) {
      where.assigneeId = { in: filter.users };
    }
    
    return where;
  }

  private buildProjectFilter(filter?: MetricsFilter): any {
    const where: any = {};
    
    if (filter?.dateRange) {
      where.createdAt = {
        gte: filter.dateRange.start,
        lte: filter.dateRange.end
      };
    }
    
    if (filter?.projects?.length) {
      where.id = { in: filter.projects };
    }
    
    if (filter?.users?.length) {
      where.ownerId = { in: filter.users };
    }
    
    return where;
  }

  private setupAlerts(): void {
    // Configurar verificação de alertas a cada 10 minutos
    setInterval(async () => {
      try {
        const alerts = await this.getActiveAlerts();
        const criticalAlerts = alerts.filter(a => a.severity === 'critical');
        
        if (criticalAlerts.length > 0) {
          this.emit('critical_alerts', criticalAlerts);
        }
      } catch (error) {
        this.logger.error('Error checking alerts', error as Error);
      }
    }, 10 * 60 * 1000);
  }

  async shutdown(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.logger.info('Metrics service shutdown completed');
  }

  // Métodos para exportar dados
  async exportMetrics(format: 'json' | 'csv', filter?: MetricsFilter): Promise<string> {
    const data = await this.getDashboardData(filter);
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    // Implementar exportação CSV se necessário
    throw new Error('CSV export not implemented yet');
  }
}

// Singleton instance
let metricsService: MetricsService;

export function createMetricsService(prisma: PrismaClient): MetricsService {
  if (!metricsService) {
    metricsService = new MetricsService(prisma);
  }
  return metricsService;
}

export function getMetricsService(): MetricsService {
  if (!metricsService) {
    throw new Error('Metrics service not initialized. Call createMetricsService first.');
  }
  return metricsService;
}

export {
  MetricsService,
  KPIMetric,
  DashboardData,
  OverviewMetrics,
  ChartMetric,
  ActivityMetric,
  AlertMetric,
  PerformanceMetrics,
  MetricsFilter,
  KPICategory
};

export default MetricsService;