import React, { useState, useMemo } from 'react';
import { useMetrics, useAlerts, useMetricsExport } from '../../hooks/useMetrics';
import { MetricsFilter } from '../../services/metricsApi';

// Interface para props do dashboard
interface BusinessMetricsDashboardProps {
  className?: string;
  refreshInterval?: number;
  showFilters?: boolean;
  compact?: boolean;
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
      case 'good': return 'bg-green-50 border-green-200 text-green-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
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
  
  if (loading) {
    return (
      <div className="p-4 rounded-lg border-2 bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-8 bg-gray-200 rounded mb-1"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }
  
  return (
    <div className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="flex items-center space-x-1">
          {trend && <span className="text-lg">{getTrendIcon()}</span>}
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
  data: Array<{ label: string; value: number; category?: string }>;
  title: string;
  type?: 'bar' | 'line' | 'pie' | 'area';
  loading?: boolean;
}

const SimpleChart: React.FC<SimpleChartProps> = ({ data, title, type = 'bar', loading = false }) => {
  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg border animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center">
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
              <div className="flex-1 mx-2">
                <div className="bg-gray-200 rounded-full h-4"></div>
              </div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (type === 'pie' || type === 'area') {
    // Simple representation for pie/area as list for now
    return (
      <div className="p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span>{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const maxValue = Math.max(...data.map(d => d.value));
  return (
    <div className="p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-2">
        {data.slice(0, 10).map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-24 text-sm truncate" title={item.label}>
              {item.label}
            </div>
            <div className="flex-1 mx-2">
              <div className="bg-gray-200 rounded-full h-4 relative">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
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

// Componente para alertas
interface AlertsListProps {
  loading?: boolean;
}

const AlertsList: React.FC<AlertsListProps> = ({ loading = false }) => {
  const { data: alerts, error } = useAlerts();
  
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-3 bg-gray-50 rounded animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800 text-sm">Erro ao carregar alertas: {error}</p>
      </div>
    );
  }
  
  if (!alerts || alerts.length === 0) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded">
        <p className="text-green-800 text-sm">✅ Nenhum alerta ativo</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {alerts.slice(0, 5).map((alert) => {
        const getSeverityColor = () => {
          switch (alert.severity) {
            case 'critical': return 'bg-red-50 border-red-200 text-red-800';
            case 'high': return 'bg-orange-50 border-orange-200 text-orange-800';
            case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            case 'low': return 'bg-blue-50 border-blue-200 text-blue-800';
            default: return 'bg-gray-50 border-gray-200 text-gray-800';
          }
        };
        
        return (
          <div key={alert.id} className={`p-3 rounded border ${getSeverityColor()}`}>
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-sm">{alert.title}</h4>
              <span className="text-xs uppercase font-bold">{alert.severity}</span>
            </div>
            <p className="text-xs opacity-75">{alert.description}</p>
            <p className="text-xs mt-1">
              {new Date(alert.timestamp).toLocaleString()}
            </p>
          </div>
        );
      })}
    </div>
  );
};

// Componente principal do dashboard
export const BusinessMetricsDashboard: React.FC<BusinessMetricsDashboardProps> = ({
  className = '',
  refreshInterval = 30000,
  showFilters = true,
  compact = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [filter, setFilter] = useState<MetricsFilter | undefined>(undefined);
  const { exportMetrics, loading: exportLoading } = useMetricsExport();
  
  const { data, loading, error, refresh, lastUpdated } = useMetrics({
    refreshInterval,
    filter,
    onError: (error) => {
      console.error('Metrics error:', error);
    }
  });
  
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
  
  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Mostrar Dashboard de Métricas de Negócio"
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
        <h2 className="text-xl font-bold text-gray-800">Dashboard de Métricas de Negócio</h2>
        <div className="flex items-center space-x-2">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Última atualização: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refresh}
            className="text-gray-500 hover:text-gray-700 p-1"
            title="Atualizar"
            disabled={loading}
          >
            🔄
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700 p-1"
            title="Fechar Dashboard"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Filtros */}
        {showFilters && (
          <section className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 self-center">Período:</span>
            {quickFilters.map((quickFilter) => (
              <button
                key={quickFilter.value}
                onClick={() => handleQuickFilter(quickFilter.value)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
              >
                {quickFilter.label}
              </button>
            ))}
            <button
              onClick={() => setFilter(undefined)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
            >
              Limpar
            </button>
          </section>
        )}
        
        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800">Erro ao carregar métricas: {error}</p>
            <button
              onClick={refresh}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        )}
        
        {/* Overview Metrics */}
        {data?.overview && (
          <section>
            <h3 className="text-lg font-semibold mb-4">Visão Geral</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                title="Total de Tarefas"
                value={data.overview.totalTasks}
                description="Tarefas criadas"
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
                title="Tarefas Concluídas"
                value={data.overview.completedTasks}
                description="Tarefas finalizadas"
                loading={loading}
              />
              <MetricCard
                title="Tarefas Pendentes"
                value={data.overview.pendingTasks}
                description="Aguardando execução"
                loading={loading}
              />
              <MetricCard
                title="Tarefas Atrasadas"
                value={data.overview.overdueTasks}
                status={data.overview.overdueTasks > 10 ? 'critical' : data.overview.overdueTasks > 5 ? 'warning' : 'good'}
                description="Fora do prazo"
                loading={loading}
              />
              <MetricCard
                title="Usuários Ativos"
                value={data.overview.activeUsers}
                description="Usuários online"
                loading={loading}
              />
            </div>
          </section>
        )}
        
        {/* KPIs */}
        {data?.kpis && data.kpis.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-4">Indicadores Chave (KPIs)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </section>
        )}
        
        {/* Charts */}
        {data?.charts && data.charts.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-4">Gráficos</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.charts.slice(0, 4).map((chart) => (
                <SimpleChart
                  key={chart.id}
                  title={chart.title}
                  data={chart.data}
                  type={chart.type}
                  loading={loading}
                />
              ))}
            </div>
          </section>
        )}
        
        {/* Recent Activity & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          {data?.recentActivity && data.recentActivity.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-4">Atividade Recente</h3>
              <div className="bg-white border rounded-lg p-4">
                <div className="space-y-3">
                  {data.recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                      <div className="flex-shrink-0">
                        <span className="text-lg">
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
            </section>
          )}
          
          {/* Alerts */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Alertas</h3>
            <AlertsList loading={loading} />
          </section>
        </div>
        
        {/* Performance Metrics */}
        {data?.performance && (
          <section>
            <h3 className="text-lg font-semibold mb-4">Performance do Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <MetricCard
                title="Taxa de Erro"
                value={`${data.performance.application.errorRate.toFixed(2)}`}
                unit="%"
                status={data.performance.application.errorRate > 5 ? 'critical' : data.performance.application.errorRate > 2 ? 'warning' : 'good'}
                description="Erros da aplicação"
                loading={loading}
              />
            </div>
          </section>
        )}
        
        {/* Actions */}
        <section>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={refresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '🔄 Atualizando...' : '🔄 Atualizar Dados'}
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={exportLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              📄 Exportar JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exportLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              📊 Exportar CSV
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BusinessMetricsDashboard;