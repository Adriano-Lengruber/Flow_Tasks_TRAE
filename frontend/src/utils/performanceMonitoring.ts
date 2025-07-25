import React from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';

// Tipos para métricas de performance
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  id: string;
  delta?: number;
  entries?: PerformanceEntry[];
}

export interface WebVitalsData {
  cls?: PerformanceMetric;
  fid?: PerformanceMetric;
  fcp?: PerformanceMetric;
  lcp?: PerformanceMetric;
  ttfb?: PerformanceMetric;
}

export interface CustomMetrics {
  bundleSize?: number;
  renderTime?: number;
  apiResponseTime?: number;
  memoryUsage?: number;
  networkSpeed?: string;
  deviceType?: string;
  connectionType?: string;
}

export interface PerformanceReport {
  webVitals: WebVitalsData;
  customMetrics: CustomMetrics;
  userAgent: string;
  url: string;
  timestamp: number;
  sessionId: string;
}

// Classe principal para monitoramento de performance
export class PerformanceMonitoring {
  private static instance: PerformanceMonitoring;
  private webVitalsData: WebVitalsData = {};
  private customMetrics: CustomMetrics = {};
  private sessionId: string;
  private isEnabled: boolean = true;
  private reportingEndpoint?: string;
  private listeners: ((report: PerformanceReport) => void)[] = [];

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeWebVitals();
    this.initializeCustomMetrics();
  }

  public static getInstance(): PerformanceMonitoring {
    if (!PerformanceMonitoring.instance) {
      PerformanceMonitoring.instance = new PerformanceMonitoring();
    }
    return PerformanceMonitoring.instance;
  }

  // Configuração
  public configure(options: {
    enabled?: boolean;
    reportingEndpoint?: string;
  }) {
    this.isEnabled = options.enabled ?? true;
    this.reportingEndpoint = options.reportingEndpoint;
  }

  // Adiciona listener para relatórios
  public addListener(listener: (report: PerformanceReport) => void) {
    this.listeners.push(listener);
  }

  // Remove listener
  public removeListener(listener: (report: PerformanceReport) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Inicializa Web Vitals
  private initializeWebVitals() {
    if (!this.isEnabled) return;

    const handleMetric = (metric: Metric) => {
      const performanceMetric: PerformanceMetric = {
        name: metric.name,
        value: metric.value,
        rating: this.getRating(metric.name, metric.value),
        timestamp: Date.now(),
        id: metric.id,
        delta: metric.delta,
        entries: metric.entries as PerformanceEntry[],
      };

      this.webVitalsData[metric.name.toLowerCase() as keyof WebVitalsData] = performanceMetric;
      this.reportMetrics();
    };

    // Coleta Web Vitals
    getCLS(handleMetric);
    getFID(handleMetric);
    getFCP(handleMetric);
    getLCP(handleMetric);
    getTTFB(handleMetric);
  }

  // Inicializa métricas customizadas
  private initializeCustomMetrics() {
    if (!this.isEnabled) return;

    // Detecta tipo de dispositivo
    this.customMetrics.deviceType = this.getDeviceType();
    
    // Detecta tipo de conexão
    this.customMetrics.connectionType = this.getConnectionType();
    
    // Detecta velocidade da rede
    this.customMetrics.networkSpeed = this.getNetworkSpeed();

    // Monitora uso de memória
    this.monitorMemoryUsage();

    // Monitora tamanho do bundle
    this.measureBundleSize();
  }

  // Determina rating baseado na métrica
  private getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, { good: number; poor: number }> = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[metricName];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  // Detecta tipo de dispositivo
  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  // Detecta tipo de conexão
  private getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  // Detecta velocidade da rede
  private getNetworkSpeed(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      const downlink = connection.downlink;
      if (downlink >= 10) return 'fast';
      if (downlink >= 1.5) return 'medium';
      return 'slow';
    }
    return 'unknown';
  }

  // Monitora uso de memória
  private monitorMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.customMetrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
  }

  // Mede tamanho do bundle
  private measureBundleSize() {
    if ('getEntriesByType' in performance) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(resource => 
        resource.name.includes('.js') && 
        resource.name.includes(window.location.origin)
      );
      
      const totalSize = jsResources.reduce((total, resource) => {
        return total + (resource.transferSize || 0);
      }, 0);
      
      this.customMetrics.bundleSize = totalSize;
    }
  }

  // Mede tempo de renderização
  public measureRenderTime(componentName: string, startTime: number) {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    this.customMetrics.renderTime = renderTime;
    
    // Log para componentes que demoram muito para renderizar
    if (renderTime > 16) { // 60fps = 16ms por frame
      console.warn(`Slow render detected for ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }

  // Mede tempo de resposta da API
  public measureApiResponseTime(endpoint: string, startTime: number) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    this.customMetrics.apiResponseTime = responseTime;
    
    // Log para APIs lentas
    if (responseTime > 1000) {
      console.warn(`Slow API response for ${endpoint}: ${responseTime.toFixed(2)}ms`);
    }
  }

  // Gera ID da sessão
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cria relatório de performance
  private createReport(): PerformanceReport {
    return {
      webVitals: this.webVitalsData,
      customMetrics: this.customMetrics,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };
  }

  // Reporta métricas
  private reportMetrics() {
    if (!this.isEnabled) return;

    const report = this.createReport();
    
    // Notifica listeners
    this.listeners.forEach(listener => {
      try {
        listener(report);
      } catch (error) {
        console.error('Error in performance listener:', error);
      }
    });

    // Envia para endpoint se configurado
    if (this.reportingEndpoint) {
      this.sendToEndpoint(report);
    }
  }

  // Envia dados para endpoint
  private async sendToEndpoint(report: PerformanceReport) {
    try {
      await fetch(this.reportingEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
    } catch (error) {
      console.error('Failed to send performance report:', error);
    }
  }

  // Obtém dados atuais
  public getCurrentData(): PerformanceReport {
    return this.createReport();
  }

  // Obtém apenas Web Vitals
  public getWebVitals(): WebVitalsData {
    return { ...this.webVitalsData };
  }

  // Obtém apenas métricas customizadas
  public getCustomMetrics(): CustomMetrics {
    return { ...this.customMetrics };
  }

  // Reseta dados
  public reset() {
    this.webVitalsData = {};
    this.customMetrics = {};
    this.sessionId = this.generateSessionId();
  }

  // Para o monitoramento
  public stop() {
    this.isEnabled = false;
  }

  // Inicia o monitoramento
  public start() {
    this.isEnabled = true;
    this.initializeWebVitals();
    this.initializeCustomMetrics();
  }
}

// Funções utilitárias
export const performanceMonitoring = PerformanceMonitoring.getInstance();

// Hook para React
export const usePerformanceMonitoring = () => {
  const [data, setData] = React.useState<PerformanceReport | null>(null);

  React.useEffect(() => {
    const listener = (report: PerformanceReport) => {
      setData(report);
    };

    performanceMonitoring.addListener(listener);
    
    // Obtém dados iniciais
    setData(performanceMonitoring.getCurrentData());

    return () => {
      performanceMonitoring.removeListener(listener);
    };
  }, []);

  return {
    data,
    webVitals: data?.webVitals || {},
    customMetrics: data?.customMetrics || {},
    measureRenderTime: performanceMonitoring.measureRenderTime.bind(performanceMonitoring),
    measureApiResponseTime: performanceMonitoring.measureApiResponseTime.bind(performanceMonitoring),
  };
};

// Decorator para medir tempo de renderização de componentes
export const withPerformanceMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) => {
  const ComponentWithPerformanceMonitoring = (props: P) => {
    const startTime = React.useRef(performance.now());
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown';

    React.useEffect(() => {
      performanceMonitoring.measureRenderTime(name, startTime.current);
    });

    return React.createElement(WrappedComponent, props);
  };

  ComponentWithPerformanceMonitoring.displayName = `withPerformanceMonitoring(${componentName || WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithPerformanceMonitoring;
};

// Função para medir performance de funções
export const measureFunction = async <T>(
  fn: () => Promise<T> | T,
  name: string
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Function ${name} took ${duration.toFixed(2)}ms`);
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.error(`Function ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};

// Configuração inicial
performanceMonitoring.configure({
  enabled: process.env.NODE_ENV === 'production',
  reportingEndpoint: process.env.REACT_APP_PERFORMANCE_ENDPOINT,
});

export default performanceMonitoring;