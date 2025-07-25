import { useState, useEffect, useCallback } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';

// Tipos para as métricas Web Vitals
export interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id: string;
  timestamp: number;
}

export interface WebVitalsState {
  cls?: WebVitalMetric;
  fid?: WebVitalMetric;
  fcp?: WebVitalMetric;
  lcp?: WebVitalMetric;
  ttfb?: WebVitalMetric;
  isLoading: boolean;
  hasData: boolean;
}

// Thresholds para determinar o rating das métricas
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

// Função para determinar o rating de uma métrica
const getRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
};

// Função para converter Metric para WebVitalMetric
const convertMetric = (metric: Metric): WebVitalMetric => ({
  name: metric.name,
  value: metric.value,
  rating: getRating(metric.name, metric.value),
  delta: metric.delta,
  id: metric.id,
  timestamp: Date.now(),
});

// Hook principal para Web Vitals
export const useWebVitals = (options?: {
  reportAllChanges?: boolean;
  onMetric?: (metric: WebVitalMetric) => void;
}) => {
  const { reportAllChanges = false, onMetric } = options || {};
  
  const [webVitals, setWebVitals] = useState<WebVitalsState>({
    isLoading: true,
    hasData: false,
  });

  const handleMetric = useCallback((metric: Metric) => {
    const webVitalMetric = convertMetric(metric);
    
    setWebVitals(prev => ({
      ...prev,
      [metric.name.toLowerCase()]: webVitalMetric,
      isLoading: false,
      hasData: true,
    }));

    // Chama callback se fornecido
    onMetric?.(webVitalMetric);
  }, [onMetric]);

  useEffect(() => {
    // Coleta todas as métricas Web Vitals
    getCLS(handleMetric, reportAllChanges);
    getFID(handleMetric);
    getFCP(handleMetric, reportAllChanges);
    getLCP(handleMetric, reportAllChanges);
    getTTFB(handleMetric);

    // Timeout para parar o loading se nenhuma métrica for coletada
    const timeout = setTimeout(() => {
      setWebVitals(prev => ({ ...prev, isLoading: false }));
    }, 5000);

    return () => clearTimeout(timeout);
  }, [handleMetric, reportAllChanges]);

  // Função para obter o score geral
  const getOverallScore = useCallback((): {
    score: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    metrics: number;
  } => {
    const metrics = [webVitals.cls, webVitals.fid, webVitals.fcp, webVitals.lcp, webVitals.ttfb]
      .filter(Boolean) as WebVitalMetric[];
    
    if (metrics.length === 0) {
      return { score: 0, rating: 'good', metrics: 0 };
    }

    const scores = metrics.map(metric => {
      switch (metric.rating) {
        case 'good': return 100;
        case 'needs-improvement': return 50;
        case 'poor': return 0;
        default: return 0;
      }
    });

    const averageScore = scores.reduce((sum: number, score) => sum + score, 0) / scores.length;
    
    let rating: 'good' | 'needs-improvement' | 'poor';
    if (averageScore >= 80) rating = 'good';
    else if (averageScore >= 50) rating = 'needs-improvement';
    else rating = 'poor';

    return {
      score: Math.round(averageScore),
      rating,
      metrics: metrics.length,
    };
  }, [webVitals]);

  // Função para obter métricas por rating
  const getMetricsByRating = useCallback(() => {
    const metrics = [webVitals.cls, webVitals.fid, webVitals.fcp, webVitals.lcp, webVitals.ttfb]
      .filter(Boolean) as WebVitalMetric[];
    
    return {
      good: metrics.filter(m => m.rating === 'good'),
      needsImprovement: metrics.filter(m => m.rating === 'needs-improvement'),
      poor: metrics.filter(m => m.rating === 'poor'),
    };
  }, [webVitals]);

  // Função para formatar valor da métrica
  const formatMetricValue = useCallback((metric: WebVitalMetric): string => {
    switch (metric.name) {
      case 'CLS':
        return metric.value.toFixed(3);
      case 'FID':
      case 'FCP':
      case 'LCP':
      case 'TTFB':
        return `${Math.round(metric.value)}ms`;
      default:
        return metric.value.toString();
    }
  }, []);

  // Função para obter descrição da métrica
  const getMetricDescription = useCallback((metricName: string): string => {
    const descriptions = {
      CLS: 'Cumulative Layout Shift - Mede a estabilidade visual',
      FID: 'First Input Delay - Mede a interatividade',
      FCP: 'First Contentful Paint - Mede a velocidade de carregamento',
      LCP: 'Largest Contentful Paint - Mede a velocidade de carregamento',
      TTFB: 'Time to First Byte - Mede a velocidade do servidor',
    };
    return descriptions[metricName as keyof typeof descriptions] || 'Métrica de performance';
  }, []);

  // Função para obter cor baseada no rating
  const getRatingColor = useCallback((rating: 'good' | 'needs-improvement' | 'poor'): string => {
    switch (rating) {
      case 'good': return '#0CCE6B';
      case 'needs-improvement': return '#FFA400';
      case 'poor': return '#FF4E42';
      default: return '#9AA0A6';
    }
  }, []);

  return {
    ...webVitals,
    overallScore: getOverallScore(),
    metricsByRating: getMetricsByRating(),
    formatMetricValue,
    getMetricDescription,
    getRatingColor,
  };
};

// Hook para monitorar uma métrica específica
export const useWebVital = (metricName: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB') => {
  const [metric, setMetric] = useState<WebVitalMetric | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleMetric = (webVitalMetric: Metric) => {
      if (webVitalMetric.name === metricName) {
        setMetric(convertMetric(webVitalMetric));
        setIsLoading(false);
      }
    };

    // Coleta a métrica específica
    switch (metricName) {
      case 'CLS':
        getCLS(handleMetric);
        break;
      case 'FID':
        getFID(handleMetric);
        break;
      case 'FCP':
        getFCP(handleMetric);
        break;
      case 'LCP':
        getLCP(handleMetric);
        break;
      case 'TTFB':
        getTTFB(handleMetric);
        break;
    }

    // Timeout para parar o loading
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [metricName]);

  return {
    metric,
    isLoading,
    hasData: metric !== null,
  };
};

// Hook para reportar métricas para um endpoint
export const useWebVitalsReporting = (endpoint?: string) => {
  const [reportCount, setReportCount] = useState(0);
  const [lastReportTime, setLastReportTime] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Error[]>([]);

  const reportMetric = useCallback(async (metric: WebVitalMetric) => {
    if (!endpoint) return;

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...metric,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        }),
      });

      setReportCount(prev => prev + 1);
      setLastReportTime(new Date());
    } catch (error) {
      setErrors(prev => [...prev, error as Error]);
      console.error('Failed to report Web Vital:', error);
    }
  }, [endpoint]);

  const { ...webVitals } = useWebVitals({
    onMetric: reportMetric,
  });

  return {
    ...webVitals,
    reportCount,
    lastReportTime,
    errors,
  };
};

// Hook para comparar métricas com benchmarks
export const useWebVitalsBenchmark = () => {
  const webVitals = useWebVitals();

  const getBenchmarkComparison = useCallback((metric: WebVitalMetric) => {
    const threshold = THRESHOLDS[metric.name as keyof typeof THRESHOLDS];
    if (!threshold) return null;

    const goodPercentage = Math.max(0, Math.min(100, (threshold.good / metric.value) * 100));
    const improvementNeeded = metric.value > threshold.good;
    const criticalImprovement = metric.value > threshold.poor;

    return {
      goodPercentage,
      improvementNeeded,
      criticalImprovement,
      targetValue: threshold.good,
      poorThreshold: threshold.poor,
    };
  }, []);

  const getRecommendations = useCallback((metric: WebVitalMetric): string[] => {
    const recommendations: Record<string, string[]> = {
      CLS: [
        'Use tamanhos explícitos para imagens e vídeos',
        'Evite inserir conteúdo acima do conteúdo existente',
        'Use transform e opacity para animações',
        'Pré-carregue fontes web',
      ],
      FID: [
        'Reduza o tempo de execução de JavaScript',
        'Divida código em chunks menores',
        'Use Web Workers para tarefas pesadas',
        'Otimize event listeners',
      ],
      FCP: [
        'Otimize recursos críticos',
        'Elimine recursos que bloqueiam renderização',
        'Comprima texto',
        'Use CDN para recursos estáticos',
      ],
      LCP: [
        'Otimize imagens',
        'Pré-carregue recursos importantes',
        'Reduza tempo de resposta do servidor',
        'Use cache eficiente',
      ],
      TTFB: [
        'Use CDN',
        'Otimize consultas de banco de dados',
        'Implemente cache do servidor',
        'Reduza redirects',
      ],
    };

    return recommendations[metric.name] || [];
  }, []);

  return {
    ...webVitals,
    getBenchmarkComparison,
    getRecommendations,
  };
};

export default useWebVitals;