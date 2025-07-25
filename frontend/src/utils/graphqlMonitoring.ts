import { ApolloLink, Operation, NextLink, FetchResult } from '@apollo/client';
import { Observable } from '@apollo/client/utilities';

// Interface para métricas de GraphQL
interface GraphQLMetrics {
  operationName: string;
  operationType: 'query' | 'mutation' | 'subscription';
  duration: number;
  variables?: any;
  errors?: any[];
  cacheHit: boolean;
  timestamp: number;
  complexity?: number;
  dataSize?: number;
}

// Interface para configuração do monitoramento
interface MonitoringConfig {
  enableLogging: boolean;
  enableAnalytics: boolean;
  slowQueryThreshold: number;
  maxMetricsHistory: number;
  excludeOperations: string[];
  analyticsEndpoint?: string;
}

// Configuração padrão
const defaultConfig: MonitoringConfig = {
  enableLogging: true,
  enableAnalytics: true,
  slowQueryThreshold: 1000, // 1 segundo
  maxMetricsHistory: 100,
  excludeOperations: ['IntrospectionQuery']
};

// Classe para gerenciar métricas
class GraphQLMetricsCollector {
  private metrics: GraphQLMetrics[] = [];
  private config: MonitoringConfig;
  
  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }
  
  // Adicionar métrica
  addMetric(metric: GraphQLMetrics) {
    // Verificar se a operação deve ser excluída
    if (this.config.excludeOperations.includes(metric.operationName)) {
      return;
    }
    
    this.metrics.push(metric);
    
    // Manter apenas as últimas métricas
    if (this.metrics.length > this.config.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.config.maxMetricsHistory);
    }
    
    // Log para queries lentas
    if (this.config.enableLogging && metric.duration > this.config.slowQueryThreshold) {
      console.warn(`Slow GraphQL ${metric.operationType}:`, {
        operation: metric.operationName,
        duration: `${metric.duration}ms`,
        variables: metric.variables
      });
    }
    
    // Enviar para analytics
    if (this.config.enableAnalytics) {
      this.sendToAnalytics(metric);
    }
  }
  
  // Obter métricas
  getMetrics(): GraphQLMetrics[] {
    return [...this.metrics];
  }
  
  // Obter estatísticas
  getStats() {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        slowQueries: 0,
        cacheHitRate: 0,
        errorRate: 0
      };
    }
    
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const slowQueries = this.metrics.filter(m => m.duration > this.config.slowQueryThreshold).length;
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const errors = this.metrics.filter(m => m.errors && m.errors.length > 0).length;
    
    return {
      totalOperations: this.metrics.length,
      averageDuration: Math.round(totalDuration / this.metrics.length),
      slowQueries,
      cacheHitRate: Math.round((cacheHits / this.metrics.length) * 100),
      errorRate: Math.round((errors / this.metrics.length) * 100)
    };
  }
  
  // Obter métricas por operação
  getOperationStats() {
    const operationMap = new Map<string, GraphQLMetrics[]>();
    
    this.metrics.forEach(metric => {
      const existing = operationMap.get(metric.operationName) || [];
      existing.push(metric);
      operationMap.set(metric.operationName, existing);
    });
    
    const stats: Array<{
      operationName: string;
      count: number;
      averageDuration: number;
      minDuration: number;
      maxDuration: number;
      cacheHitRate: number;
      errorRate: number;
    }> = [];
    
    operationMap.forEach((metrics, operationName) => {
      const durations = metrics.map(m => m.duration);
      const cacheHits = metrics.filter(m => m.cacheHit).length;
      const errors = metrics.filter(m => m.errors && m.errors.length > 0).length;
      
      stats.push({
        operationName,
        count: metrics.length,
        averageDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        cacheHitRate: Math.round((cacheHits / metrics.length) * 100),
        errorRate: Math.round((errors / metrics.length) * 100)
      });
    });
    
    return stats.sort((a, b) => b.count - a.count);
  }
  
  // Limpar métricas
  clearMetrics() {
    this.metrics = [];
  }
  
  // Enviar para analytics
  private async sendToAnalytics(metric: GraphQLMetrics) {
    if (!this.config.analyticsEndpoint) return;
    
    try {
      await fetch(this.config.analyticsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'graphql_metric',
          data: metric
        })
      });
    } catch (error) {
      console.error('Failed to send GraphQL metrics to analytics:', error);
    }
  }
}

// Instância global do coletor
const metricsCollector = new GraphQLMetricsCollector();

// Apollo Link para monitoramento
export const createMonitoringLink = (config?: Partial<MonitoringConfig>): ApolloLink => {
  if (config) {
    // Recriar coletor com nova configuração
    Object.assign(metricsCollector, new GraphQLMetricsCollector(config));
  }
  
  return new ApolloLink((operation: Operation, forward: NextLink) => {
    const startTime = Date.now();
    const operationName = operation.operationName || 'Unknown';
    const operationType = operation.query.definitions[0]?.kind === 'OperationDefinition' 
      ? operation.query.definitions[0].operation 
      : 'query';
    
    return new Observable<FetchResult>((observer) => {
      const subscription = forward(operation).subscribe({
        next: (result) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // Verificar se foi cache hit (simplificado)
          const cacheHit = Boolean(result.data);
          
          // Calcular tamanho dos dados
          const dataSize = result.data ? JSON.stringify(result.data).length : 0;
          
          // Criar métrica
          const metric: GraphQLMetrics = {
            operationName,
            operationType: operationType as 'query' | 'mutation' | 'subscription',
            duration,
            variables: operation.variables,
            errors: result.errors ? [...result.errors] : undefined,
            cacheHit,
            timestamp: startTime,
            dataSize
          };
          
          // Adicionar métrica
          metricsCollector.addMetric(metric);
          
          observer.next(result);
        },
        error: (error) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // Criar métrica para erro
          const metric: GraphQLMetrics = {
            operationName,
            operationType: operationType as 'query' | 'mutation' | 'subscription',
            duration,
            variables: operation.variables,
            errors: [error],
            cacheHit: false,
            timestamp: startTime
          };
          
          metricsCollector.addMetric(metric);
          
          observer.error(error);
        },
        complete: () => {
          observer.complete();
        }
      });
      
      return () => subscription.unsubscribe();
    });
  });
};

// Hook para acessar métricas
export const useGraphQLMetrics = () => {
  return {
    getMetrics: () => metricsCollector.getMetrics(),
    getStats: () => metricsCollector.getStats(),
    getOperationStats: () => metricsCollector.getOperationStats(),
    clearMetrics: () => metricsCollector.clearMetrics()
  };
};

// Função para calcular complexidade da query
export const calculateQueryComplexity = (operation: Operation): number => {
  let complexity = 0;
  
  const visit = (node: any, depth: number = 0) => {
    if (!node) return;
    
    if (node.kind === 'Field') {
      complexity += Math.pow(2, depth); // Exponencial baseado na profundidade
      
      if (node.selectionSet) {
        node.selectionSet.selections.forEach((selection: any) => {
          visit(selection, depth + 1);
        });
      }
    } else if (node.selectionSet) {
      node.selectionSet.selections.forEach((selection: any) => {
        visit(selection, depth);
      });
    }
  };
  
  operation.query.definitions.forEach((definition: any) => {
    if (definition.kind === 'OperationDefinition') {
      visit(definition, 0);
    }
  });
  
  return complexity;
};

// Função para detectar N+1 queries
export const detectNPlusOneQueries = (metrics: GraphQLMetrics[]): Array<{
  operationName: string;
  count: number;
  timeWindow: number;
  suspiciousPattern: boolean;
}> => {
  const timeWindow = 5000; // 5 segundos
  const now = Date.now();
  const recentMetrics = metrics.filter(m => now - m.timestamp < timeWindow);
  
  const operationCounts = new Map<string, number>();
  
  recentMetrics.forEach(metric => {
    const count = operationCounts.get(metric.operationName) || 0;
    operationCounts.set(metric.operationName, count + 1);
  });
  
  const results: Array<{
    operationName: string;
    count: number;
    timeWindow: number;
    suspiciousPattern: boolean;
  }> = [];
  
  operationCounts.forEach((count, operationName) => {
    results.push({
      operationName,
      count,
      timeWindow,
      suspiciousPattern: count > 10 // Mais de 10 queries da mesma operação em 5 segundos
    });
  });
  
  return results.filter(r => r.suspiciousPattern);
};

// Função para gerar relatório de performance
export const generatePerformanceReport = () => {
  const metrics = metricsCollector.getMetrics();
  const stats = metricsCollector.getStats();
  const operationStats = metricsCollector.getOperationStats();
  const nPlusOneQueries = detectNPlusOneQueries(metrics);
  
  return {
    summary: stats,
    operations: operationStats,
    slowQueries: metrics
      .filter(m => m.duration > defaultConfig.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10),
    nPlusOneQueries,
    recommendations: generateRecommendations(stats, operationStats, nPlusOneQueries)
  };
};

// Função para gerar recomendações
const generateRecommendations = (
  stats: ReturnType<typeof metricsCollector.getStats>,
  operationStats: ReturnType<typeof metricsCollector.getOperationStats>,
  nPlusOneQueries: ReturnType<typeof detectNPlusOneQueries>
): string[] => {
  const recommendations: string[] = [];
  
  if (stats.averageDuration > 500) {
    recommendations.push('Considere otimizar queries - tempo médio acima de 500ms');
  }
  
  if (stats.cacheHitRate < 50) {
    recommendations.push('Taxa de cache baixa - considere implementar cache mais agressivo');
  }
  
  if (stats.errorRate > 5) {
    recommendations.push('Taxa de erro alta - verifique validação e tratamento de erros');
  }
  
  if (nPlusOneQueries.length > 0) {
    recommendations.push('Detectados possíveis N+1 queries - considere usar DataLoaders');
  }
  
  const heavyOperations = operationStats.filter(op => op.averageDuration > 1000);
  if (heavyOperations.length > 0) {
    recommendations.push(`Operações lentas detectadas: ${heavyOperations.map(op => op.operationName).join(', ')}`);
  }
  
  return recommendations;
};

// Exportar coletor para uso direto
export { metricsCollector };

export default createMonitoringLink;