import React, { useState } from 'react';
import { useMetrics, useAlerts, useMetricsExport } from '../hooks/useMetrics';
import { MetricsFilter } from '../services/metricsApi';

// Interface para props da página
interface MetricsDashboardPageProps {
  className?: string;
}

// Componente para cartão de métrica
interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  status?: 'good' | 'warning' | 'critical';
  description?: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  trend,
  change,
  status = 'good',
  description,
  loading = false
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'border-green-500 bg-green-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      case 'critical': return 'border-red-500 bg-red-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };
  
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <span className="text-green-600">↗️</span>;
      case 'down': return <span className="text-red-600">↘️</span>;
      case 'stable': return <span className="text-gray-600">→</span>;
      default: return null;
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-8 bg-gray-200 rounded mb-1"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          {change !== undefined && (
            <span className={`text-xs font-medium ${
              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {change > 0 ? '+' : ''}{change}%
            </span>
          )}
        </div>
      </div>
      <div className="flex items-baseline">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {unit && <span className="ml-1 text-lg text-gray-500">{unit}</span>}
      </div>
      {description && (
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
};

// Componente para gráfico
interface ChartCardProps {
  title: string;
  data: Array<{ label: string; value: number }>;
  loading?: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, data, loading = false }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center">
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
              <div className="flex-1 mx-3">
                <div className="bg-gray-200 rounded-full h-4"></div>
              </div>
              <div className="w-12 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.slice(0, 8).map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-20 text-sm text-gray-600 truncate" title={item.label}>
              {item.label}
            </div>
            <div className="flex-1 mx-3">
              <div className="bg-gray-200 rounded-full h-4 relative">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="w-12 text-sm text-gray-900 font-medium text-right">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente principal da página
const MetricsDashboardPage: React.FC<MetricsDashboardPageProps> = ({ className = '' }) => {
  const [filter, setFilter] = useState<MetricsFilter | undefined>(undefined);
  const { exportMetrics, loading: exportLoading } = useMetricsExport();
  
  const { data, loading, error, refresh, lastUpdated } = useMetrics({
    refreshInterval: 30000,
    filter,
    onError: (error) => {
      console.error('Metrics error:', error);
    }
  });
  
  const { data: alerts } = useAlerts();
  
  // Filtros de data rápidos
  const quickFilters = [
    { label: 'Hoje', value: 'today' },
    { label: 'Esta Semana', value: 'week' },
    { label: 'Este Mês', value: 'month' },
    { label: 'Últimos 3 Meses', value: 'quarter' }
  ];
  
  const handleQuickFilter = (value: string) => {
    const now = new Date();
    let start: Date;
    
    switch (value) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    setFilter({
      dateRange: {
        start,
        end: now
      }
    });
  };
  
  const handleExport = async (format: 'json' | 'csv') => {
    await exportMetrics(format, filter);
  };
  
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard de Métricas</h1>
              {lastUpdated && (
                <p className="text-sm text-gray-500">
                  Última atualização: {lastUpdated.toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={refresh}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Atualizando...
                  </>
                ) : (
                  '🔄 Atualizar'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Período:</span>
              {quickFilters.map((quickFilter) => (
                <button
                  key={quickFilter.value}
                  onClick={() => handleQuickFilter(quickFilter.value)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
                >
                  {quickFilter.label}
                </button>
              ))}
              <button
                onClick={() => setFilter(undefined)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
              >
                Limpar
              </button>
              <div className="ml-auto flex space-x-2">
                <button
                  onClick={() => handleExport('json')}
                  disabled={exportLoading}
                  className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  📄 JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exportLoading}
                  className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  📊 CSV
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Error State */}
        {error && (
          <div className="mb-8">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Erro ao carregar métricas</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={refresh}
                      className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Alertas */}
        {alerts && alerts.length > 0 && (
          <div className="mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    {alerts.length} alerta{alerts.length > 1 ? 's' : ''} ativo{alerts.length > 1 ? 's' : ''}
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      {alerts.slice(0, 3).map((alert) => (
                        <li key={alert.id}>{alert.title}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Overview Metrics */}
        {data?.overview && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Visão Geral</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total de Projetos"
                value={data.overview.totalProjects}
                description="Projetos no sistema"
                loading={loading}
              />
              <MetricCard
                title="Projetos Ativos"
                value={data.overview.activeProjects}
                description="Projetos em andamento"
                loading={loading}
              />
              <MetricCard
                title="Taxa de Conclusão"
                value={`${(data.overview.completionRate * 100).toFixed(1)}`}
                unit="%"
                status={data.overview.completionRate > 0.8 ? 'good' : data.overview.completionRate > 0.6 ? 'warning' : 'critical'}
                description="Tarefas concluídas"
                loading={loading}
              />
              <MetricCard
                title="Tarefas Atrasadas"
                value={data.overview.overdueTasks}
                status={data.overview.overdueTasks > 10 ? 'critical' : data.overview.overdueTasks > 5 ? 'warning' : 'good'}
                description="Fora do prazo"
                loading={loading}
              />
            </div>
          </div>
        )}
        
        {/* KPIs */}
        {data?.kpis && data.kpis.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Indicadores Chave (KPIs)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.kpis.map((kpi) => (
                <MetricCard
                  key={kpi.id}
                  title={kpi.name}
                  value={kpi.value}
                  unit={kpi.unit}
                  trend={kpi.trend}
                  change={kpi.change}
                  status={kpi.status}
                  description={kpi.description}
                  loading={loading}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Charts */}
        {data?.charts && data.charts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Gráficos</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.charts.slice(0, 4).map((chart) => (
                <ChartCard
                  key={chart.id}
                  title={chart.title}
                  data={chart.data}
                  loading={loading}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Recent Activity & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          {data?.recentActivity && data.recentActivity.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Atividade Recente</h2>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="space-y-4">
                  {data.recentActivity.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">
                          {activity.type === 'task_created' && '📝'}
                          {activity.type === 'task_completed' && '✅'}
                          {activity.type === 'project_created' && '🚀'}
                          {activity.type === 'user_joined' && '👤'}
                          {activity.type === 'comment_added' && '💬'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Performance */}
          {data?.performance && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Performance do Sistema</h2>
              <div className="space-y-4">
                <MetricCard
                  title="CPU"
                  value={`${data.performance.system.cpu.usage.toFixed(1)}`}
                  unit="%"
                  status={data.performance.system.cpu.usage > 80 ? 'critical' : data.performance.system.cpu.usage > 60 ? 'warning' : 'good'}
                  description="Uso do processador"
                  loading={loading}
                />
                <MetricCard
                  title="Memória"
                  value={`${data.performance.system.memory.percentage.toFixed(1)}`}
                  unit="%"
                  status={data.performance.system.memory.percentage > 85 ? 'critical' : data.performance.system.memory.percentage > 70 ? 'warning' : 'good'}
                  description="Uso da memória"
                  loading={loading}
                />
                <MetricCard
                  title="Tempo de Resposta"
                  value={`${data.performance.application.avgResponseTime.toFixed(0)}`}
                  unit="ms"
                  status={data.performance.application.avgResponseTime > 1000 ? 'critical' : data.performance.application.avgResponseTime > 500 ? 'warning' : 'good'}
                  description="Resposta média da API"
                  loading={loading}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboardPage;