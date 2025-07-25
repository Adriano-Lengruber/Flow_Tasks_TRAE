import { ApiResponse } from '../types/api';

// Interfaces para as métricas do backend
export interface OverviewMetrics {
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

export interface KPIMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  target?: number;
  status: 'good' | 'warning' | 'critical';
  description?: string;
}

export interface ChartMetric {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: Array<{
    label: string;
    value: number;
    date?: string;
    category?: string;
  }>;
  config?: {
    xAxis?: string;
    yAxis?: string;
    colors?: string[];
  };
}

export interface ActivityMetric {
  id: string;
  type: 'task_created' | 'task_completed' | 'project_created' | 'user_joined' | 'comment_added';
  description: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  metadata?: Record<string, any>;
}

export interface AlertMetric {
  id: string;
  type: 'performance' | 'deadline' | 'resource' | 'error' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  isActive: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  system: {
    cpu: {
      usage: number;
      cores: number;
      loadAverage: number[];
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  application: {
    uptime: number;
    requestCount: number;
    avgResponseTime: number;
    errorRate: number;
    activeUsers: number;
  };
  database: {
    connections: number;
    avgQueryTime: number;
    slowQueries: number;
    cacheHitRate: number;
  };
}

export interface DashboardData {
  overview: OverviewMetrics;
  kpis: KPIMetric[];
  charts: ChartMetric[];
  recentActivity: ActivityMetric[];
  alerts: AlertMetric[];
  performance: PerformanceMetrics;
  generatedAt: Date;
}

export interface MetricsFilter {
  dateRange?: {
    start: Date;
    end: Date;
  };
  projects?: string[];
  users?: string[];
  categories?: string[];
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

export interface ExportOptions {
  format: 'json' | 'csv';
  filter?: MetricsFilter;
}

// Configuração da API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const METRICS_BASE_URL = `${API_BASE_URL}/metrics`;

// Função auxiliar para fazer requisições autenticadas
const makeAuthenticatedRequest = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Função auxiliar para construir query string
const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        searchParams.append(key, JSON.stringify(value));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
};

// Serviço de API para métricas
export const metricsApi = {
  /**
   * Obter dados completos do dashboard
   */
  async getDashboard(filter?: MetricsFilter): Promise<DashboardData> {
    const queryString = filter ? `?${buildQueryString({ filter })}` : '';
    const response = await makeAuthenticatedRequest<DashboardData>(
      `${METRICS_BASE_URL}/dashboard${queryString}`
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch dashboard data');
    }
    
    return response.data;
  },

  /**
   * Obter métricas de overview
   */
  async getOverview(filter?: MetricsFilter): Promise<OverviewMetrics> {
    const queryString = filter ? `?${buildQueryString({ filter })}` : '';
    const response = await makeAuthenticatedRequest<OverviewMetrics>(
      `${METRICS_BASE_URL}/overview${queryString}`
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch overview metrics');
    }
    
    return response.data;
  },

  /**
   * Obter KPIs
   */
  async getKPIs(filter?: MetricsFilter): Promise<KPIMetric[]> {
    const queryString = filter ? `?${buildQueryString({ filter })}` : '';
    const response = await makeAuthenticatedRequest<KPIMetric[]>(
      `${METRICS_BASE_URL}/kpis${queryString}`
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch KPIs');
    }
    
    return response.data;
  },

  /**
   * Obter dados para gráficos
   */
  async getCharts(filter?: MetricsFilter): Promise<ChartMetric[]> {
    const queryString = filter ? `?${buildQueryString({ filter })}` : '';
    const response = await makeAuthenticatedRequest<ChartMetric[]>(
      `${METRICS_BASE_URL}/charts${queryString}`
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch chart data');
    }
    
    return response.data;
  },

  /**
   * Obter atividade recente
   */
  async getRecentActivity(filter?: MetricsFilter): Promise<ActivityMetric[]> {
    const queryString = filter ? `?${buildQueryString({ filter })}` : '';
    const response = await makeAuthenticatedRequest<ActivityMetric[]>(
      `${METRICS_BASE_URL}/activity${queryString}`
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch recent activity');
    }
    
    return response.data;
  },

  /**
   * Obter alertas ativos
   */
  async getAlerts(): Promise<AlertMetric[]> {
    const response = await makeAuthenticatedRequest<AlertMetric[]>(
      `${METRICS_BASE_URL}/alerts`
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch alerts');
    }
    
    return response.data;
  },

  /**
   * Obter métricas de performance
   */
  async getPerformance(): Promise<PerformanceMetrics> {
    const response = await makeAuthenticatedRequest<PerformanceMetrics>(
      `${METRICS_BASE_URL}/performance`
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch performance metrics');
    }
    
    return response.data;
  },

  /**
   * Exportar métricas
   */
  async exportMetrics(options: ExportOptions): Promise<Blob> {
    const response = await fetch(`${METRICS_BASE_URL}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    return response.blob();
  },

  /**
   * Verificar saúde do serviço de métricas
   */
  async getHealth(): Promise<{ status: string; timestamp: Date; services: any[] }> {
    const response = await makeAuthenticatedRequest<{ status: string; timestamp: Date; services: any[] }>(
      `${METRICS_BASE_URL}/health`
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch health status');
    }
    
    return response.data;
  },
};

export default metricsApi;