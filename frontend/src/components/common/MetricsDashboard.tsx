import React, { useState, useEffect, useMemo } from 'react';
import { useGraphQLMetrics, generatePerformanceReport } from '../../utils/graphqlMonitoring';
import { useWebVitals } from '../../utils/webVitals';

// Interface para props do dashboard
interface MetricsDashboardProps {
  className?: string;
  refreshInterval?: number;
  showGraphQL?: boolean;
  showWebVitals?: boolean;
  showRecommendations?: boolean;
}

// Componente para cartão de métrica
interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'green' | 'yellow' | 'red' | 'blue';
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  trend,
  color = 'blue',
  description
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'green': return 'bg-green-50 border-green-200 text-green-800';
      case 'yellow': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'red': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };
  
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '→';
      default: return '';
    }
  };
  
  return (
    <div className={`p-4 rounded-lg border-2 ${getColorClasses()}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {trend && <span className="text-lg">{getTrendIcon()}</span>}
      </div>
      <div className="flex items-baseline">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="ml-1 text-sm">{unit}</span>}
      </div>
      {description && (
        <p className="text-xs mt-1 opacity-75">{description}</p>
      )}
    </div>
  );
};

// Componente para gráfico simples
interface SimpleChartProps {
  data: Array<{ label: string; value: number }>;
  title: string;
  type?: 'bar' | 'line';
}

const SimpleChart: React.FC<SimpleChartProps> = ({ data, title, type = 'bar' }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="p-4 bg-white rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-24 text-sm truncate" title={item.label}>
              {item.label}
            </div>
            <div className="flex-1 mx-2">
              <div className="bg-gray-200 rounded-full h-4 relative">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
            <div className="w-16 text-sm text-right font-medium">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente principal do dashboard
export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  className = '',
  refreshInterval = 5000,
  showGraphQL = true,
  showWebVitals = true,
  showRecommendations = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  const graphqlMetrics = useGraphQLMetrics();
  const webVitals = useWebVitals();
  
  // Atualizar métricas periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(Date.now());
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);
  
  // Gerar relatório de performance
  const performanceReport = useMemo(() => {
    return generatePerformanceReport();
  }, [lastUpdate]);
  
  // Métricas GraphQL
  const graphqlStats = useMemo(() => {
    return graphqlMetrics.getStats();
  }, [lastUpdate]);
  
  // Métricas Web Vitals
  const webVitalsData = useMemo(() => {
    return webVitals.getMetrics();
  }, [lastUpdate]);
  
  // Determinar cor baseada no valor
  const getMetricColor = (value: number, thresholds: { good: number; needs_improvement: number }) => {
    if (value <= thresholds.good) return 'green';
    if (value <= thresholds.needs_improvement) return 'yellow';
    return 'red';
  };
  
  // Toggle de visibilidade
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };
  
  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleVisibility}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Mostrar Dashboard de Métricas"
        >
          📊
        </button>
      </div>
    );
  }
  
  return (
    <div className={`fixed inset-4 z-50 bg-white rounded-lg shadow-2xl border overflow-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h2 className="text-xl font-bold text-gray-800">Dashboard de Métricas</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Última atualização: {new Date(lastUpdate).toLocaleTimeString()}
          </span>
          <button
            onClick={toggleVisibility}
            className="text-gray-500 hover:text-gray-700 p-1"
            title="Fechar Dashboard"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Web Vitals */}
        {showWebVitals && (
          <section>
            <h3 className="text-lg font-semibold mb-4">Web Vitals</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard
                title="LCP"
                value={webVitalsData.lcp?.toFixed(0) || 'N/A'}
                unit="ms"
                color={webVitalsData.lcp ? getMetricColor(webVitalsData.lcp, { good: 2500, needs_improvement: 4000 }) : 'blue'}
                description="Largest Contentful Paint"
              />
              <MetricCard
                title="FID"
                value={webVitalsData.fid?.toFixed(0) || 'N/A'}
                unit="ms"
                color={webVitalsData.fid ? getMetricColor(webVitalsData.fid, { good: 100, needs_improvement: 300 }) : 'blue'}
                description="First Input Delay"
              />
              <MetricCard
                title="CLS"
                value={webVitalsData.cls?.toFixed(3) || 'N/A'}
                color={webVitalsData.cls ? getMetricColor(webVitalsData.cls, { good: 0.1, needs_improvement: 0.25 }) : 'blue'}
                description="Cumulative Layout Shift"
              />
              <MetricCard
                title="FCP"
                value={webVitalsData.fcp?.toFixed(0) || 'N/A'}
                unit="ms"
                color={webVitalsData.fcp ? getMetricColor(webVitalsData.fcp, { good: 1800, needs_improvement: 3000 }) : 'blue'}
                description="First Contentful Paint"
              />
              <MetricCard
                title="TTFB"
                value={webVitalsData.ttfb?.toFixed(0) || 'N/A'}
                unit="ms"
                color={webVitalsData.ttfb ? getMetricColor(webVitalsData.ttfb, { good: 800, needs_improvement: 1800 }) : 'blue'}
                description="Time to First Byte"
              />
            </div>
          </section>
        )}
        
        {/* GraphQL Metrics */}
        {showGraphQL && (
          <section>
            <h3 className="text-lg font-semibold mb-4">GraphQL Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Total Operations"
                value={graphqlStats.totalOperations}
                color="blue"
                description="Operações executadas"
              />
              <MetricCard
                title="Avg Duration"
                value={graphqlStats.averageDuration}
                unit="ms"
                color={getMetricColor(graphqlStats.averageDuration, { good: 200, needs_improvement: 500 })}
                description="Tempo médio de resposta"
              />
              <MetricCard
                title="Cache Hit Rate"
                value={graphqlStats.cacheHitRate}
                unit="%"
                color={graphqlStats.cacheHitRate > 70 ? 'green' : graphqlStats.cacheHitRate > 40 ? 'yellow' : 'red'}
                description="Taxa de acerto do cache"
              />
              <MetricCard
                title="Error Rate"
                value={graphqlStats.errorRate}
                unit="%"
                color={graphqlStats.errorRate < 2 ? 'green' : graphqlStats.errorRate < 5 ? 'yellow' : 'red'}
                description="Taxa de erro"
              />
            </div>
            
            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleChart
                title="Operações por Duração Média"
                data={performanceReport.operations.slice(0, 10).map(op => ({
                  label: op.operationName,
                  value: op.averageDuration
                }))}
              />
              <SimpleChart
                title="Operações por Frequência"
                data={performanceReport.operations.slice(0, 10).map(op => ({
                  label: op.operationName,
                  value: op.count
                }))}
              />
            </div>
          </section>
        )}
        
        {/* Slow Queries */}
        {showGraphQL && performanceReport.slowQueries.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-4">Queries Lentas</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="space-y-2">
                {performanceReport.slowQueries.slice(0, 5).map((query, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="font-medium">{query.operationName}</span>
                    <span className="text-yellow-800 font-bold">{query.duration}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
        
        {/* N+1 Queries */}
        {showGraphQL && performanceReport.nPlusOneQueries.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-4">Possíveis N+1 Queries</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="space-y-2">
                {performanceReport.nPlusOneQueries.map((query, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="font-medium">{query.operationName}</span>
                    <span className="text-red-800 font-bold">{query.count} execuções</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
        
        {/* Recommendations */}
        {showRecommendations && performanceReport.recommendations.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-4">Recomendações</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <ul className="space-y-2">
                {performanceReport.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 mr-2">💡</span>
                    <span className="text-blue-800">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
        
        {/* Actions */}
        <section>
          <div className="flex space-x-4">
            <button
              onClick={() => graphqlMetrics.clearMetrics()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Limpar Métricas GraphQL
            </button>
            <button
              onClick={() => webVitals.clearMetrics()}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              Limpar Web Vitals
            </button>
            <button
              onClick={() => {
                const report = generatePerformanceReport();
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `performance-report-${new Date().toISOString()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Exportar Relatório
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MetricsDashboard;