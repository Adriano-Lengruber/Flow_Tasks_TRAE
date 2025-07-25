import { useState, useEffect, useCallback, useRef } from 'react';
import { metricsApi, DashboardData, MetricsFilter, OverviewMetrics, KPIMetric, ChartMetric, ActivityMetric, AlertMetric, PerformanceMetrics } from '../services/metricsApi';

// Interface para o estado do hook
interface MetricsState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Interface para opções do hook
interface UseMetricsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  filter?: MetricsFilter;
  onError?: (error: Error) => void;
  onSuccess?: (data: DashboardData) => void;
}

// Hook principal para métricas
export const useMetrics = (options: UseMetricsOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 segundos
    filter,
    onError,
    onSuccess
  } = options;

  const [state, setState] = useState<MetricsState>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Função para buscar dados
  const fetchMetrics = useCallback(async (showLoading = true) => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      if (showLoading) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      const data = await metricsApi.getDashboard(filter);
      
      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: new Date()
      });

      onSuccess?.(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch metrics';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [filter, onError, onSuccess]);

  // Função para refresh manual
  const refresh = useCallback(() => {
    fetchMetrics(true);
  }, [fetchMetrics]);

  // Função para refresh silencioso (sem loading)
  const silentRefresh = useCallback(() => {
    fetchMetrics(false);
  }, [fetchMetrics]);

  // Configurar auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(silentRefresh, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, silentRefresh]);

  // Buscar dados iniciais
  useEffect(() => {
    fetchMetrics(true);
    
    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchMetrics]);

  return {
    ...state,
    refresh,
    silentRefresh
  };
};

// Hook específico para overview
export const useOverviewMetrics = (filter?: MetricsFilter) => {
  const [data, setData] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const overview = await metricsApi.getOverview(filter);
      setData(overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overview');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return { data, loading, error, refresh: fetchOverview };
};

// Hook específico para KPIs
export const useKPIMetrics = (filter?: MetricsFilter) => {
  const [data, setData] = useState<KPIMetric[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const kpis = await metricsApi.getKPIs(filter);
      setData(kpis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch KPIs');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  return { data, loading, error, refresh: fetchKPIs };
};

// Hook específico para gráficos
export const useChartMetrics = (filter?: MetricsFilter) => {
  const [data, setData] = useState<ChartMetric[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCharts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const charts = await metricsApi.getCharts(filter);
      setData(charts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch charts');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchCharts();
  }, [fetchCharts]);

  return { data, loading, error, refresh: fetchCharts };
};

// Hook específico para atividade recente
export const useRecentActivity = (filter?: MetricsFilter) => {
  const [data, setData] = useState<ActivityMetric[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const activity = await metricsApi.getRecentActivity(filter);
      setData(activity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return { data, loading, error, refresh: fetchActivity };
};

// Hook específico para alertas
export const useAlerts = () => {
  const [data, setData] = useState<AlertMetric[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const alerts = await metricsApi.getAlerts();
      setData(alerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { data, loading, error, refresh: fetchAlerts };
};

// Hook específico para performance
export const usePerformanceMetrics = () => {
  const [data, setData] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const performance = await metricsApi.getPerformance();
      setData(performance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  return { data, loading, error, refresh: fetchPerformance };
};

// Hook para exportar métricas
export const useMetricsExport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportMetrics = useCallback(async (format: 'json' | 'csv', filter?: MetricsFilter) => {
    try {
      setLoading(true);
      setError(null);
      
      const blob = await metricsApi.exportMetrics({ format, filter });
      
      // Criar download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metrics-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  return { exportMetrics, loading, error };
};

export default useMetrics;