import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType?: string;
}

interface PerformanceThresholds {
  lcp: { good: number; needsImprovement: number };
  fid: { good: number; needsImprovement: number };
  cls: { good: number; needsImprovement: number };
  fcp: { good: number; needsImprovement: number };
  ttfb: { good: number; needsImprovement: number };
}

// Thresholds baseados nas recomendações do Google
const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  lcp: { good: 2500, needsImprovement: 4000 },
  fid: { good: 100, needsImprovement: 300 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  fcp: { good: 1800, needsImprovement: 3000 },
  ttfb: { good: 800, needsImprovement: 1800 }
};

class WebVitalsTracker {
  private metrics: PerformanceMetrics;
  private callbacks: Array<(metrics: PerformanceMetrics) => void> = [];
  private isTracking = false;

  constructor() {
    this.metrics = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType()
    };
  }

  /**
   * Iniciar tracking de Web Vitals
   */
  startTracking(): void {
    if (this.isTracking) {
      console.warn('[WebVitals] Tracking já está ativo');
      return;
    }

    this.isTracking = true;
    console.log('[WebVitals] Iniciando tracking de performance');

    // Largest Contentful Paint
    getLCP((metric: Metric) => {
      this.updateMetric('lcp', metric.value);
      this.logMetric('LCP', metric.value, PERFORMANCE_THRESHOLDS.lcp);
    });

    // First Input Delay
    getFID((metric: Metric) => {
      this.updateMetric('fid', metric.value);
      this.logMetric('FID', metric.value, PERFORMANCE_THRESHOLDS.fid);
    });

    // Cumulative Layout Shift
    getCLS((metric: Metric) => {
      this.updateMetric('cls', metric.value);
      this.logMetric('CLS', metric.value, PERFORMANCE_THRESHOLDS.cls);
    });

    // First Contentful Paint
    getFCP((metric: Metric) => {
      this.updateMetric('fcp', metric.value);
      this.logMetric('FCP', metric.value, PERFORMANCE_THRESHOLDS.fcp);
    });

    // Time to First Byte
    getTTFB((metric: Metric) => {
      this.updateMetric('ttfb', metric.value);
      this.logMetric('TTFB', metric.value, PERFORMANCE_THRESHOLDS.ttfb);
    });

    // Métricas customizadas
    this.trackCustomMetrics();
  }

  /**
   * Parar tracking
   */
  stopTracking(): void {
    this.isTracking = false;
    console.log('[WebVitals] Tracking parado');
  }

  /**
   * Adicionar callback para receber métricas
   */
  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.callbacks.push(callback);
    
    // Retornar função para remover callback
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Obter métricas atuais
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Limpar métricas
   */
  clearMetrics(): void {
    this.metrics = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType()
    };
    this.notifyCallbacks();
  }

  /**
   * Enviar métricas para analytics
   */
  async sendToAnalytics(endpoint?: string): Promise<void> {
    const analyticsEndpoint = endpoint || '/api/analytics/web-vitals';
    
    try {
      await fetch(analyticsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...this.metrics,
          sessionId: this.getSessionId(),
          buildVersion: process.env.REACT_APP_VERSION || 'unknown'
        })
      });
      
      console.log('[WebVitals] Métricas enviadas para analytics');
    } catch (error) {
      console.error('[WebVitals] Erro ao enviar métricas:', error);
    }
  }

  /**
   * Gerar relatório de performance
   */
  generateReport(): {
    metrics: PerformanceMetrics;
    scores: Record<string, { value: number; rating: string; threshold: any } | null>;
    overall: { score: number; rating: string };
  } {
    const scores: Record<string, { value: number; rating: string; threshold: any } | null> = {
      lcp: this.calculateScore('lcp', this.metrics.lcp),
      fid: this.calculateScore('fid', this.metrics.fid),
      cls: this.calculateScore('cls', this.metrics.cls),
      fcp: this.calculateScore('fcp', this.metrics.fcp),
      ttfb: this.calculateScore('ttfb', this.metrics.ttfb)
    };

    // Calcular score geral (média ponderada)
    const weights = { lcp: 0.25, fid: 0.25, cls: 0.25, fcp: 0.15, ttfb: 0.1 };
    const overallScore = Object.entries(scores).reduce((total, [key, score]) => {
      if (score && typeof score.value === 'number') {
        return total + (score.value * weights[key as keyof typeof weights]);
      }
      return total;
    }, 0);

    return {
      metrics: this.metrics,
      scores,
      overall: {
        score: Math.round(overallScore),
        rating: this.getRating(overallScore)
      }
    };
  }

  private updateMetric(key: keyof PerformanceMetrics, value: number): void {
    (this.metrics as any)[key] = value;
    this.notifyCallbacks();
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
        console.error('[WebVitals] Erro em callback:', error);
      }
    });
  }

  private logMetric(
    name: string, 
    value: number, 
    threshold: { good: number; needsImprovement: number }
  ): void {
    const rating = this.getMetricRating(value, threshold);
    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
    
    console.log(
      `[WebVitals] ${emoji} ${name}: ${value.toFixed(2)}ms (${rating})`
    );
  }

  private getMetricRating(
    value: number, 
    threshold: { good: number; needsImprovement: number }
  ): string {
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  private calculateScore(
    metricName: string, 
    value?: number
  ): { value: number; rating: string; threshold: any } | null {
    if (value === undefined) return null;
    
    const threshold = PERFORMANCE_THRESHOLDS[metricName as keyof PerformanceThresholds];
    const rating = this.getMetricRating(value, threshold);
    
    // Score de 0-100 baseado nos thresholds
    let score: number;
    if (rating === 'good') {
      score = 90 + (10 * (1 - value / threshold.good));
    } else if (rating === 'needs-improvement') {
      score = 50 + (40 * (1 - (value - threshold.good) / (threshold.needsImprovement - threshold.good)));
    } else {
      score = Math.max(0, 50 * (1 - (value - threshold.needsImprovement) / threshold.needsImprovement));
    }
    
    return {
      value: Math.round(Math.max(0, Math.min(100, score))),
      rating,
      threshold
    };
  }

  private getRating(score: number): string {
    if (score >= 90) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }

  private getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('webvitals-session-id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('webvitals-session-id', sessionId);
    }
    return sessionId;
  }

  private trackCustomMetrics(): void {
    // Time to Interactive (TTI) aproximado
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              const startTime = (navEntry as any).navigationStart || navEntry.startTime;
              const tti = navEntry.domInteractive - startTime;
              console.log(`[WebVitals] ⏱️ TTI (approx): ${tti.toFixed(2)}ms`);
            }
          });
        });
        
        observer.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('[WebVitals] Erro ao observar navigation timing:', error);
      }
    }

    // Bundle size tracking
    if ('performance' in window && 'getEntriesByType' in performance) {
      setTimeout(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const jsResources = resources.filter(r => r.name.includes('.js'));
        const cssResources = resources.filter(r => r.name.includes('.css'));
        
        const totalJSSize = jsResources.reduce((total, resource) => {
          return total + (resource.transferSize || 0);
        }, 0);
        
        const totalCSSSize = cssResources.reduce((total, resource) => {
          return total + (resource.transferSize || 0);
        }, 0);
        
        console.log(`[WebVitals] 📦 JS Bundle Size: ${(totalJSSize / 1024).toFixed(2)}KB`);
        console.log(`[WebVitals] 🎨 CSS Bundle Size: ${(totalCSSSize / 1024).toFixed(2)}KB`);
      }, 2000);
    }
  }
}

// Instância singleton
const webVitalsTracker = new WebVitalsTracker();

// Hook React para usar Web Vitals
export const useWebVitals = () => {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);
  const [isTracking, setIsTracking] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = webVitalsTracker.onMetricsUpdate(setMetrics);
    return unsubscribe;
  }, []);

  const startTracking = React.useCallback(() => {
    webVitalsTracker.startTracking();
    setIsTracking(true);
  }, []);

  const stopTracking = React.useCallback(() => {
    webVitalsTracker.stopTracking();
    setIsTracking(false);
  }, []);

  const getReport = React.useCallback(() => {
    return webVitalsTracker.generateReport();
  }, []);

  const sendToAnalytics = React.useCallback((endpoint?: string) => {
    return webVitalsTracker.sendToAnalytics(endpoint);
  }, []);

  const getMetrics = React.useCallback(() => {
    return webVitalsTracker.getMetrics();
  }, []);

  const clearMetrics = React.useCallback(() => {
    webVitalsTracker.clearMetrics();
  }, []);

  return {
    metrics,
    isTracking,
    startTracking,
    stopTracking,
    getReport,
    sendToAnalytics,
    getMetrics,
    clearMetrics
  };
};

// Função para inicializar tracking automaticamente
export const initWebVitals = (options?: {
  autoStart?: boolean;
  analyticsEndpoint?: string;
  sendInterval?: number;
}) => {
  const { autoStart = true, analyticsEndpoint, sendInterval = 30000 } = options || {};

  if (autoStart) {
    // Aguardar carregamento completo
    if (document.readyState === 'complete') {
      webVitalsTracker.startTracking();
    } else {
      window.addEventListener('load', () => {
        webVitalsTracker.startTracking();
      });
    }
  }

  // Enviar métricas periodicamente
  if (analyticsEndpoint) {
    setInterval(() => {
      webVitalsTracker.sendToAnalytics(analyticsEndpoint);
    }, sendInterval);
  }

  // Enviar métricas antes de sair da página
  window.addEventListener('beforeunload', () => {
    if (analyticsEndpoint) {
      webVitalsTracker.sendToAnalytics(analyticsEndpoint);
    }
  });

  return webVitalsTracker;
};

export default webVitalsTracker;

// Importar React para o hook
import React from 'react';