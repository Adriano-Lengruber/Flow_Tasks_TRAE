import { PrismaClient } from '@prisma/client';
import { getCache } from '../utils/redisCache';
import { structuredLogger } from '../utils/logger';
import { EventEmitter } from 'events';
import os from 'os';
import process from 'process';
import { performance } from 'perf_hooks';
import cluster from 'cluster';

// Interfaces para análise de performance
interface PerformanceMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    used: number;
    free: number;
    total: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  disk: {
    usage?: number;
    free?: number;
    total?: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    connectionsActive: number;
  };
  database: {
    activeConnections: number;
    queryCount: number;
    avgQueryTime: number;
    slowQueries: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    memoryUsage: number;
    keyCount: number;
  };
  application: {
    uptime: number;
    requestCount: number;
    avgResponseTime: number;
    errorRate: number;
    activeUsers: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  message: string;
  resolved: boolean;
  resolvedAt?: Date;
}

interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
  enabled: boolean;
}

interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    avgCpuUsage: number;
    avgMemoryUsage: number;
    avgResponseTime: number;
    totalRequests: number;
    errorRate: number;
    uptime: number;
  };
  trends: {
    cpuTrend: 'increasing' | 'decreasing' | 'stable';
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
    responseTrend: 'increasing' | 'decreasing' | 'stable';
  };
  bottlenecks: Array<{
    type: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
  recommendations: Array<{
    category: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    estimatedImpact: string;
  }>;
}

interface OptimizationSuggestion {
  id: string;
  category: OptimizationCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  implementation: string;
  estimatedImpact: string;
  effort: 'low' | 'medium' | 'high';
  metrics: string[];
  applied: boolean;
  appliedAt?: Date;
}

// Tipos
type AlertType = 'cpu' | 'memory' | 'disk' | 'database' | 'cache' | 'response_time' | 'error_rate';
type AlertSeverity = 'info' | 'warning' | 'critical';
type OptimizationCategory = 'database' | 'cache' | 'memory' | 'cpu' | 'network' | 'code' | 'infrastructure';

// Classe principal do analisador de performance
class PerformanceAnalyzer extends EventEmitter {
  private prisma: PrismaClient;
  private cache = getCache();
  private logger = structuredLogger.child({ service: 'performance' });
  private metrics: PerformanceMetrics[] = [];
  private alerts: Map<string, PerformanceAlert> = new Map();
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private suggestions: Map<string, OptimizationSuggestion> = new Map();
  private isCollecting = false;
  private collectionInterval?: NodeJS.Timeout;
  private analysisInterval?: NodeJS.Timeout;
  private startTime = Date.now();
  private requestCount = 0;
  private responseTimeSum = 0;
  private errorCount = 0;
  private activeConnections = 0;
  
  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
    this.setupDefaultThresholds();
    this.setupDefaultSuggestions();
  }
  
  // Configurar limites padrão
  private setupDefaultThresholds() {
    const defaultThresholds: PerformanceThreshold[] = [
      {
        metric: 'cpu.usage',
        warning: 70,
        critical: 90,
        unit: '%',
        enabled: true
      },
      {
        metric: 'memory.usage',
        warning: 80,
        critical: 95,
        unit: '%',
        enabled: true
      },
      {
        metric: 'disk.usage',
        warning: 85,
        critical: 95,
        unit: '%',
        enabled: true
      },
      {
        metric: 'database.avgQueryTime',
        warning: 1000,
        critical: 5000,
        unit: 'ms',
        enabled: true
      },
      {
        metric: 'application.avgResponseTime',
        warning: 2000,
        critical: 5000,
        unit: 'ms',
        enabled: true
      },
      {
        metric: 'application.errorRate',
        warning: 5,
        critical: 10,
        unit: '%',
        enabled: true
      },
      {
        metric: 'cache.hitRate',
        warning: 70,
        critical: 50,
        unit: '%',
        enabled: true
      }
    ];
    
    defaultThresholds.forEach(threshold => {
      this.thresholds.set(threshold.metric, threshold);
    });
  }
  
  // Configurar sugestões padrão
  private setupDefaultSuggestions() {
    const defaultSuggestions: OptimizationSuggestion[] = [
      {
        id: 'db-connection-pool',
        category: 'database',
        priority: 'high',
        title: 'Optimize Database Connection Pool',
        description: 'Increase database connection pool size to handle more concurrent requests',
        implementation: 'Update Prisma configuration to increase connection pool size',
        estimatedImpact: '20-30% improvement in database response time',
        effort: 'low',
        metrics: ['database.avgQueryTime', 'database.activeConnections'],
        applied: false
      },
      {
        id: 'redis-cache-optimization',
        category: 'cache',
        priority: 'high',
        title: 'Implement Redis Cache Optimization',
        description: 'Add caching for frequently accessed data to reduce database load',
        implementation: 'Implement cache-aside pattern for user data and project information',
        estimatedImpact: '40-60% reduction in database queries',
        effort: 'medium',
        metrics: ['cache.hitRate', 'database.queryCount'],
        applied: false
      },
      {
        id: 'memory-leak-detection',
        category: 'memory',
        priority: 'critical',
        title: 'Memory Leak Detection and Prevention',
        description: 'Implement memory monitoring to detect and prevent memory leaks',
        implementation: 'Add heap snapshots and memory profiling',
        estimatedImpact: 'Prevent memory-related crashes and improve stability',
        effort: 'medium',
        metrics: ['memory.heapUsed', 'memory.external'],
        applied: false
      },
      {
        id: 'query-optimization',
        category: 'database',
        priority: 'high',
        title: 'Database Query Optimization',
        description: 'Optimize slow database queries and add proper indexing',
        implementation: 'Analyze slow query log and add database indexes',
        estimatedImpact: '30-50% improvement in query performance',
        effort: 'high',
        metrics: ['database.avgQueryTime', 'database.slowQueries'],
        applied: false
      },
      {
        id: 'response-compression',
        category: 'network',
        priority: 'medium',
        title: 'Enable Response Compression',
        description: 'Enable gzip compression for API responses to reduce bandwidth',
        implementation: 'Configure compression middleware in Express',
        estimatedImpact: '60-80% reduction in response size',
        effort: 'low',
        metrics: ['network.bytesSent', 'application.avgResponseTime'],
        applied: false
      },
      {
        id: 'cpu-optimization',
        category: 'cpu',
        priority: 'medium',
        title: 'CPU Usage Optimization',
        description: 'Optimize CPU-intensive operations and implement worker threads',
        implementation: 'Move heavy computations to worker threads',
        estimatedImpact: '20-40% reduction in CPU usage',
        effort: 'high',
        metrics: ['cpu.usage', 'cpu.loadAverage'],
        applied: false
      }
    ];
    
    defaultSuggestions.forEach(suggestion => {
      this.suggestions.set(suggestion.id, suggestion);
    });
  }
  
  // Iniciar coleta de métricas
  startCollection(intervalMs: number = 30000) {
    if (this.isCollecting) {
      this.logger.warn('Performance collection already started');
      return;
    }
    
    this.isCollecting = true;
    
    // Coletar métricas imediatamente
    this.collectMetrics();
    
    // Configurar coleta periódica
    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
    
    // Configurar análise periódica
    this.analysisInterval = setInterval(() => {
      this.analyzePerformance();
    }, intervalMs * 2); // Análise a cada 2 coletas
    
    this.logger.info('Performance collection started', { intervalMs });
  }
  
  // Parar coleta de métricas
  stopCollection() {
    if (!this.isCollecting) {
      return;
    }
    
    this.isCollecting = false;
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = undefined;
    }
    
    this.logger.info('Performance collection stopped');
  }
  
  // Coletar métricas
  private async collectMetrics() {
    try {
      const timestamp = new Date();
      
      // Métricas de CPU
      const cpuUsage = await this.getCpuUsage();
      const loadAverage = os.loadavg();
      
      // Métricas de memória
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      
      // Métricas de disco
      const diskMetrics = await this.getDiskMetrics();
      
      // Métricas de rede
      const networkMetrics = await this.getNetworkMetrics();
      
      // Métricas de banco de dados
      const databaseMetrics = await this.getDatabaseMetrics();
      
      // Métricas de cache
      const cacheMetrics = await this.getCacheMetrics();
      
      // Métricas da aplicação
      const applicationMetrics = this.getApplicationMetrics();
      
      const metrics: PerformanceMetrics = {
        timestamp,
        cpu: {
          usage: cpuUsage,
          loadAverage,
          cores: os.cpus().length
        },
        memory: {
          used: totalMemory - freeMemory,
          free: freeMemory,
          total: totalMemory,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        },
        disk: diskMetrics,
        network: networkMetrics,
        database: databaseMetrics,
        cache: cacheMetrics,
        application: applicationMetrics
      };
      
      // Adicionar às métricas
      this.metrics.push(metrics);
      
      // Manter apenas as últimas 1000 métricas em memória
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }
      
      // Salvar no cache para acesso rápido
      await this.cache.set(
        'performance:latest',
        JSON.stringify(metrics),
        60 // 1 minuto
      );
      
      // Emitir evento
      this.emit('metrics:collected', metrics);
      
      this.logger.debug('Performance metrics collected', {
        cpu: cpuUsage,
        memory: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        requests: this.requestCount
      });
      
    } catch (error) {
      this.logger.error('Failed to collect performance metrics', error as Error);
    }
  }
  
  // Obter uso de CPU
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = performance.now();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = performance.now();
        
        const totalTime = (endTime - startTime) * 1000; // Convert to microseconds
        const totalCpuTime = endUsage.user + endUsage.system;
        
        const cpuPercent = (totalCpuTime / totalTime) * 100;
        resolve(Math.min(cpuPercent, 100));
      }, 100);
    });
  }
  
  // Obter métricas de disco
  private async getDiskMetrics(): Promise<{ usage?: number; free?: number; total?: number }> {
    try {
      // Implementação simplificada - em produção usar bibliotecas específicas
      return {
        usage: 0,
        free: 0,
        total: 0
      };
    } catch (error) {
      return {};
    }
  }
  
  // Obter métricas de rede
  private async getNetworkMetrics(): Promise<{
    bytesReceived: number;
    bytesSent: number;
    connectionsActive: number;
  }> {
    return {
      bytesReceived: 0, // Implementar coleta real
      bytesSent: 0,
      connectionsActive: this.activeConnections
    };
  }
  
  // Obter métricas de banco de dados
  private async getDatabaseMetrics(): Promise<{
    activeConnections: number;
    queryCount: number;
    avgQueryTime: number;
    slowQueries: number;
  }> {
    try {
      // Obter estatísticas do Prisma
      const stats = await this.cache.get('db:stats');
      const parsedStats = stats ? JSON.parse(stats) : {};
      
      return {
        activeConnections: parsedStats.activeConnections || 0,
        queryCount: parsedStats.queryCount || 0,
        avgQueryTime: parsedStats.avgQueryTime || 0,
        slowQueries: parsedStats.slowQueries || 0
      };
    } catch (error) {
      return {
        activeConnections: 0,
        queryCount: 0,
        avgQueryTime: 0,
        slowQueries: 0
      };
    }
  }
  
  // Obter métricas de cache
  private async getCacheMetrics(): Promise<{
    hitRate: number;
    missRate: number;
    memoryUsage: number;
    keyCount: number;
  }> {
    try {
      // const cacheStats = this.cache.getStats();
      
      return {
        hitRate: 0.95, // Mock value
        missRate: 0.05, // Mock value
        memoryUsage: 0, // Mock value
        keyCount: 0 // Mock value
      };
    } catch (error) {
      return {
        hitRate: 0,
        missRate: 0,
        memoryUsage: 0,
        keyCount: 0
      };
    }
  }
  
  // Obter métricas da aplicação
  private getApplicationMetrics(): {
    uptime: number;
    requestCount: number;
    avgResponseTime: number;
    errorRate: number;
    activeUsers: number;
  } {
    const uptime = Date.now() - this.startTime;
    const avgResponseTime = this.requestCount > 0 ? this.responseTimeSum / this.requestCount : 0;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    
    return {
      uptime,
      requestCount: this.requestCount,
      avgResponseTime,
      errorRate,
      activeUsers: 0 // Implementar contagem de usuários ativos
    };
  }
  
  // Analisar performance
  private async analyzePerformance() {
    if (this.metrics.length < 2) {
      return;
    }
    
    const latestMetrics = this.metrics[this.metrics.length - 1];
    
    // Verificar limites
    await this.checkThresholds(latestMetrics);
    
    // Detectar tendências
    this.detectTrends();
    
    // Gerar sugestões
    this.generateSuggestions(latestMetrics);
    
    // Detectar gargalos
    this.detectBottlenecks(latestMetrics);
  }
  
  // Verificar limites
  private async checkThresholds(metrics: PerformanceMetrics) {
    for (const [metricPath, threshold] of this.thresholds) {
      if (!threshold.enabled) continue;
      
      const value = this.getMetricValue(metrics, metricPath);
      if (value === undefined) continue;
      
      let severity: AlertSeverity | null = null;
      
      if (value >= threshold.critical) {
        severity = 'critical';
      } else if (value >= threshold.warning) {
        severity = 'warning';
      }
      
      if (severity) {
        await this.createAlert({
          type: metricPath.split('.')[0] as AlertType,
          severity,
          metric: metricPath,
          threshold: severity === 'critical' ? threshold.critical : threshold.warning,
          currentValue: value,
          message: `${metricPath} is ${value}${threshold.unit}, exceeding ${severity} threshold of ${severity === 'critical' ? threshold.critical : threshold.warning}${threshold.unit}`
        });
      } else {
        // Resolver alerta se existir
        await this.resolveAlert(metricPath);
      }
    }
  }
  
  // Obter valor da métrica
  private getMetricValue(metrics: PerformanceMetrics, path: string): number | undefined {
    const parts = path.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return typeof value === 'number' ? value : undefined;
  }
  
  // Criar alerta
  private async createAlert(alertData: {
    type: AlertType;
    severity: AlertSeverity;
    metric: string;
    threshold: number;
    currentValue: number;
    message: string;
  }) {
    const alertId = `${alertData.metric}-${alertData.severity}`;
    
    // Verificar se alerta já existe
    if (this.alerts.has(alertId) && !this.alerts.get(alertId)!.resolved) {
      return;
    }
    
    const alert: PerformanceAlert = {
      id: alertId,
      ...alertData,
      timestamp: new Date(),
      resolved: false
    };
    
    this.alerts.set(alertId, alert);
    
    // Salvar no banco
    try {
      // await this.prisma.performanceAlert.create({
      //   data: {
      //     id: alert.id,
      //     type: alert.type,
      //     severity: alert.severity,
      //     metric: alert.metric,
      //     threshold: alert.threshold,
      //     currentValue: alert.currentValue,
      //     message: alert.message,
      //     timestamp: alert.timestamp,
      //     resolved: alert.resolved
      //   }
      // });
    } catch (error) {
      this.logger.error('Failed to save performance alert', error as Error);
    }
    
    // Emitir evento
    this.emit('alert:created', alert);
    
    this.logger.warn('Performance alert created', {
      type: alert.type,
      severity: alert.severity,
      metric: alert.metric,
      value: alert.currentValue
    });
  }
  
  // Resolver alerta
  private async resolveAlert(metric: string) {
    const alertIds = Array.from(this.alerts.keys()).filter(id => id.startsWith(metric));
    
    for (const alertId of alertIds) {
      const alert = this.alerts.get(alertId);
      if (alert && !alert.resolved) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        
        // Atualizar no banco
        try {
          // await this.prisma.performanceAlert.update({
          //   where: { id: alertId },
          //   data: {
          //     resolved: true,
          //     resolvedAt: alert.resolvedAt
          //   }
          // });
        } catch (error) {
          this.logger.error('Failed to resolve performance alert', error as Error);
        }
        
        this.emit('alert:resolved', alert);
        
        this.logger.info('Performance alert resolved', {
          type: alert.type,
          metric: alert.metric
        });
      }
    }
  }
  
  // Detectar tendências
  private detectTrends() {
    if (this.metrics.length < 10) return;
    
    const recent = this.metrics.slice(-10);
    const older = this.metrics.slice(-20, -10);
    
    if (older.length === 0) return;
    
    // Calcular médias
    const recentAvgCpu = recent.reduce((sum, m) => sum + m.cpu.usage, 0) / recent.length;
    const olderAvgCpu = older.reduce((sum, m) => sum + m.cpu.usage, 0) / older.length;
    
    const recentAvgMemory = recent.reduce((sum, m) => sum + (m.memory.used / m.memory.total * 100), 0) / recent.length;
    const olderAvgMemory = older.reduce((sum, m) => sum + (m.memory.used / m.memory.total * 100), 0) / older.length;
    
    const recentAvgResponse = recent.reduce((sum, m) => sum + m.application.avgResponseTime, 0) / recent.length;
    const olderAvgResponse = older.reduce((sum, m) => sum + m.application.avgResponseTime, 0) / older.length;
    
    // Detectar tendências significativas (>10% de mudança)
    const cpuChange = ((recentAvgCpu - olderAvgCpu) / olderAvgCpu) * 100;
    const memoryChange = ((recentAvgMemory - olderAvgMemory) / olderAvgMemory) * 100;
    const responseChange = ((recentAvgResponse - olderAvgResponse) / olderAvgResponse) * 100;
    
    if (Math.abs(cpuChange) > 10) {
      this.emit('trend:detected', {
        metric: 'cpu',
        trend: cpuChange > 0 ? 'increasing' : 'decreasing',
        change: cpuChange
      });
    }
    
    if (Math.abs(memoryChange) > 10) {
      this.emit('trend:detected', {
        metric: 'memory',
        trend: memoryChange > 0 ? 'increasing' : 'decreasing',
        change: memoryChange
      });
    }
    
    if (Math.abs(responseChange) > 10) {
      this.emit('trend:detected', {
        metric: 'response_time',
        trend: responseChange > 0 ? 'increasing' : 'decreasing',
        change: responseChange
      });
    }
  }
  
  // Gerar sugestões
  private generateSuggestions(metrics: PerformanceMetrics) {
    // Sugestão para otimização de banco de dados
    if (metrics.database.avgQueryTime > 1000) {
      const suggestion = this.suggestions.get('query-optimization');
      if (suggestion && !suggestion.applied) {
        suggestion.priority = metrics.database.avgQueryTime > 3000 ? 'critical' : 'high';
        this.emit('suggestion:generated', suggestion);
      }
    }
    
    // Sugestão para cache
    if (metrics.cache.hitRate < 70) {
      const suggestion = this.suggestions.get('redis-cache-optimization');
      if (suggestion && !suggestion.applied) {
        suggestion.priority = metrics.cache.hitRate < 50 ? 'critical' : 'high';
        this.emit('suggestion:generated', suggestion);
      }
    }
    
    // Sugestão para memória
    const memoryUsage = (metrics.memory.used / metrics.memory.total) * 100;
    if (memoryUsage > 80) {
      const suggestion = this.suggestions.get('memory-leak-detection');
      if (suggestion && !suggestion.applied) {
        suggestion.priority = memoryUsage > 90 ? 'critical' : 'high';
        this.emit('suggestion:generated', suggestion);
      }
    }
    
    // Sugestão para CPU
    if (metrics.cpu.usage > 70) {
      const suggestion = this.suggestions.get('cpu-optimization');
      if (suggestion && !suggestion.applied) {
        suggestion.priority = metrics.cpu.usage > 85 ? 'critical' : 'high';
        this.emit('suggestion:generated', suggestion);
      }
    }
  }
  
  // Detectar gargalos
  private detectBottlenecks(metrics: PerformanceMetrics) {
    const bottlenecks: Array<{
      type: string;
      description: string;
      impact: 'low' | 'medium' | 'high';
      recommendation: string;
    }> = [];
    
    // Gargalo de CPU
    if (metrics.cpu.usage > 80) {
      bottlenecks.push({
        type: 'cpu',
        description: `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        impact: metrics.cpu.usage > 90 ? 'high' : 'medium',
        recommendation: 'Consider optimizing CPU-intensive operations or scaling horizontally'
      });
    }
    
    // Gargalo de memória
    const memoryUsage = (metrics.memory.used / metrics.memory.total) * 100;
    if (memoryUsage > 80) {
      bottlenecks.push({
        type: 'memory',
        description: `High memory usage: ${memoryUsage.toFixed(1)}%`,
        impact: memoryUsage > 90 ? 'high' : 'medium',
        recommendation: 'Check for memory leaks and optimize memory usage'
      });
    }
    
    // Gargalo de banco de dados
    if (metrics.database.avgQueryTime > 2000) {
      bottlenecks.push({
        type: 'database',
        description: `Slow database queries: ${metrics.database.avgQueryTime}ms average`,
        impact: metrics.database.avgQueryTime > 5000 ? 'high' : 'medium',
        recommendation: 'Optimize database queries and add proper indexing'
      });
    }
    
    // Gargalo de cache
    if (metrics.cache.hitRate < 60) {
      bottlenecks.push({
        type: 'cache',
        description: `Low cache hit rate: ${metrics.cache.hitRate.toFixed(1)}%`,
        impact: metrics.cache.hitRate < 40 ? 'high' : 'medium',
        recommendation: 'Improve caching strategy and cache more frequently accessed data'
      });
    }
    
    if (bottlenecks.length > 0) {
      this.emit('bottlenecks:detected', bottlenecks);
    }
  }
  
  // Registrar requisição
  recordRequest(responseTime: number, isError: boolean = false) {
    this.requestCount++;
    this.responseTimeSum += responseTime;
    
    if (isError) {
      this.errorCount++;
    }
  }
  
  // Registrar conexão ativa
  recordConnection(active: boolean) {
    if (active) {
      this.activeConnections++;
    } else {
      this.activeConnections = Math.max(0, this.activeConnections - 1);
    }
  }
  
  // Obter métricas atuais
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }
  
  // Obter histórico de métricas
  getMetricsHistory(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }
  
  // Obter alertas ativos
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }
  
  // Obter todas as sugestões
  getSuggestions(): OptimizationSuggestion[] {
    return Array.from(this.suggestions.values());
  }
  
  // Marcar sugestão como aplicada
  async applySuggestion(suggestionId: string): Promise<void> {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) {
      throw new Error(`Suggestion not found: ${suggestionId}`);
    }
    
    suggestion.applied = true;
    suggestion.appliedAt = new Date();
    
    this.emit('suggestion:applied', suggestion);
    
    this.logger.info('Optimization suggestion applied', {
      id: suggestionId,
      title: suggestion.title
    });
  }
  
  // Gerar relatório de performance
  async generateReport(
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceReport> {
    const metricsInPeriod = this.metrics.filter(
      m => m.timestamp >= startDate && m.timestamp <= endDate
    );
    
    if (metricsInPeriod.length === 0) {
      throw new Error('No metrics found for the specified period');
    }
    
    // Calcular resumo
    const avgCpuUsage = metricsInPeriod.reduce((sum, m) => sum + m.cpu.usage, 0) / metricsInPeriod.length;
    const avgMemoryUsage = metricsInPeriod.reduce((sum, m) => sum + (m.memory.used / m.memory.total * 100), 0) / metricsInPeriod.length;
    const avgResponseTime = metricsInPeriod.reduce((sum, m) => sum + m.application.avgResponseTime, 0) / metricsInPeriod.length;
    const totalRequests = metricsInPeriod[metricsInPeriod.length - 1]?.application.requestCount || 0;
    const errorRate = metricsInPeriod[metricsInPeriod.length - 1]?.application.errorRate || 0;
    const uptime = metricsInPeriod[metricsInPeriod.length - 1]?.application.uptime || 0;
    
    // Detectar tendências
    const firstHalf = metricsInPeriod.slice(0, Math.floor(metricsInPeriod.length / 2));
    const secondHalf = metricsInPeriod.slice(Math.floor(metricsInPeriod.length / 2));
    
    const firstHalfCpu = firstHalf.reduce((sum, m) => sum + m.cpu.usage, 0) / firstHalf.length;
    const secondHalfCpu = secondHalf.reduce((sum, m) => sum + m.cpu.usage, 0) / secondHalf.length;
    
    const firstHalfMemory = firstHalf.reduce((sum, m) => sum + (m.memory.used / m.memory.total * 100), 0) / firstHalf.length;
    const secondHalfMemory = secondHalf.reduce((sum, m) => sum + (m.memory.used / m.memory.total * 100), 0) / secondHalf.length;
    
    const firstHalfResponse = firstHalf.reduce((sum, m) => sum + m.application.avgResponseTime, 0) / firstHalf.length;
    const secondHalfResponse = secondHalf.reduce((sum, m) => sum + m.application.avgResponseTime, 0) / secondHalf.length;
    
    const cpuTrend = this.getTrend(firstHalfCpu, secondHalfCpu);
    const memoryTrend = this.getTrend(firstHalfMemory, secondHalfMemory);
    const responseTrend = this.getTrend(firstHalfResponse, secondHalfResponse);
    
    // Detectar gargalos
    const bottlenecks: Array<{
      type: string;
      description: string;
      impact: 'low' | 'medium' | 'high';
      recommendation: string;
    }> = [];
    
    if (avgCpuUsage > 70) {
      bottlenecks.push({
        type: 'cpu',
        description: 'High average CPU usage',
        impact: avgCpuUsage > 85 ? 'high' : 'medium',
        recommendation: 'Optimize CPU-intensive operations'
      });
    }
    
    if (avgMemoryUsage > 70) {
      bottlenecks.push({
        type: 'memory',
        description: 'High average memory usage',
        impact: avgMemoryUsage > 85 ? 'high' : 'medium',
        recommendation: 'Investigate memory leaks and optimize memory usage'
      });
    }
    
    if (avgResponseTime > 1000) {
      bottlenecks.push({
        type: 'response_time',
        description: 'Slow average response time',
        impact: avgResponseTime > 3000 ? 'high' : 'medium',
        recommendation: 'Optimize application performance and database queries'
      });
    }
    
    // Gerar recomendações
    const recommendations: Array<{
      category: string;
      priority: 'low' | 'medium' | 'high';
      description: string;
      estimatedImpact: string;
    }> = [];
    
    if (avgCpuUsage > 70) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        description: 'Implement CPU optimization strategies',
        estimatedImpact: '20-40% reduction in CPU usage'
      });
    }
    
    if (avgMemoryUsage > 70) {
      recommendations.push({
        category: 'memory',
        priority: 'high',
        description: 'Implement memory management improvements',
        estimatedImpact: '15-30% reduction in memory usage'
      });
    }
    
    if (avgResponseTime > 1000) {
      recommendations.push({
        category: 'database',
        priority: 'high',
        description: 'Optimize database queries and implement caching',
        estimatedImpact: '30-60% improvement in response time'
      });
    }
    
    return {
      period: { start: startDate, end: endDate },
      summary: {
        avgCpuUsage,
        avgMemoryUsage,
        avgResponseTime,
        totalRequests,
        errorRate,
        uptime
      },
      trends: {
        cpuTrend,
        memoryTrend,
        responseTrend
      },
      bottlenecks,
      recommendations
    };
  }
  
  // Determinar tendência
  private getTrend(first: number, second: number): 'increasing' | 'decreasing' | 'stable' {
    const change = ((second - first) / first) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }
  
  // Finalizar serviço
  async shutdown() {
    this.stopCollection();
    
    this.logger.info('Performance analyzer shutdown completed');
  }
}

// Singleton instance
let performanceAnalyzer: PerformanceAnalyzer;

export function createPerformanceAnalyzer(prisma: PrismaClient): PerformanceAnalyzer {
  if (!performanceAnalyzer) {
    performanceAnalyzer = new PerformanceAnalyzer(prisma);
  }
  return performanceAnalyzer;
}

export function getPerformanceAnalyzer(): PerformanceAnalyzer {
  if (!performanceAnalyzer) {
    throw new Error('PerformanceAnalyzer not initialized');
  }
  return performanceAnalyzer;
}

export {
  PerformanceAnalyzer,
  PerformanceMetrics,
  PerformanceAlert,
  PerformanceThreshold,
  PerformanceReport,
  OptimizationSuggestion,
  AlertType,
  AlertSeverity,
  OptimizationCategory
};

export default PerformanceAnalyzer;