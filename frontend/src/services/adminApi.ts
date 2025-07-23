// Mock API para dados do Dashboard Administrativo
// Em produção, estes dados viriam de endpoints reais

export interface TestResult {
  id: string;
  name: string;
  status: 'running' | 'passed' | 'failed' | 'pending';
  duration: number;
  coverage: number;
  timestamp: string;
  type: 'unit' | 'integration' | 'e2e' | 'security' | 'performance';
  details?: string;
  logs?: string[];
}

export interface PipelineStatus {
  id: string;
  branch: string;
  status: 'running' | 'success' | 'failed' | 'pending';
  stage: string;
  progress: number;
  timestamp: string;
  commit: string;
  author: string;
  stages: PipelineStage[];
}

export interface PipelineStage {
  name: string;
  status: 'running' | 'success' | 'failed' | 'pending' | 'skipped';
  duration?: number;
  startTime?: string;
  endTime?: string;
}

export interface QualityMetrics {
  codeQuality: number;
  testCoverage: number;
  security: number;
  performance: number;
  accessibility: number;
  maintainability: number;
  complexity: number;
  duplication: number;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  lastCheck: string;
  uptime: number;
  endpoint?: string;
  version?: string;
}

export interface SecurityScan {
  id: string;
  type: 'dependency' | 'code' | 'container' | 'infrastructure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  status: 'open' | 'fixed' | 'ignored';
  timestamp: string;
}

export interface PerformanceMetric {
  timestamp: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
}

// Mock data generators
const generateMockTests = (): TestResult[] => {
  const testTypes: TestResult['type'][] = ['unit', 'integration', 'e2e', 'security', 'performance'];
  const statuses: TestResult['status'][] = ['passed', 'failed', 'running', 'pending'];
  
  return [
    {
      id: '1',
      name: 'Testes de Autenticação E2E',
      status: 'passed',
      duration: 45,
      coverage: 95,
      timestamp: new Date(Date.now() - 300000).toISOString(),
      type: 'e2e',
      logs: [
        '✓ Login com credenciais válidas',
        '✓ Logout funcional',
        '✓ Redirecionamento após login',
        '✓ Persistência de sessão'
      ]
    },
    {
      id: '2',
      name: 'Testes de Projetos E2E',
      status: 'running',
      duration: 0,
      coverage: 0,
      timestamp: new Date().toISOString(),
      type: 'e2e',
      logs: [
        '⏳ Executando teste de criação de projeto...',
        '⏳ Verificando navegação Kanban...'
      ]
    },
    {
      id: '3',
      name: 'Testes de Segurança',
      status: 'passed',
      duration: 120,
      coverage: 88,
      timestamp: new Date(Date.now() - 600000).toISOString(),
      type: 'security',
      logs: [
        '✓ Prevenção XSS',
        '✓ Validação CSRF',
        '✓ Sanitização de inputs',
        '⚠ Rate limiting parcial'
      ]
    },
    {
      id: '4',
      name: 'Testes de Performance',
      status: 'failed',
      duration: 180,
      coverage: 75,
      timestamp: new Date(Date.now() - 900000).toISOString(),
      type: 'performance',
      details: 'Core Web Vitals: LCP > 2.5s, CLS > 0.1',
      logs: [
        '✓ First Contentful Paint < 1.8s',
        '✗ Largest Contentful Paint: 3.2s (limite: 2.5s)',
        '✗ Cumulative Layout Shift: 0.15 (limite: 0.1)',
        '✓ First Input Delay < 100ms'
      ]
    },
    {
      id: '5',
      name: 'Testes Unitários Backend',
      status: 'passed',
      duration: 25,
      coverage: 92,
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      type: 'unit',
      logs: [
        '✓ Auth Service: 15/15 testes',
        '✓ Project Service: 22/22 testes',
        '✓ Task Service: 18/18 testes',
        '✓ Notification Service: 8/8 testes'
      ]
    },
    {
      id: '6',
      name: 'Testes de Integração',
      status: 'passed',
      duration: 85,
      coverage: 87,
      timestamp: new Date(Date.now() - 1500000).toISOString(),
      type: 'integration',
      logs: [
        '✓ API GraphQL endpoints',
        '✓ Database operations',
        '✓ WebSocket connections',
        '✓ File upload/download'
      ]
    }
  ];
};

const generateMockPipelines = (): PipelineStatus[] => {
  return [
    {
      id: '1',
      branch: 'main',
      status: 'running',
      stage: 'Quality Gates',
      progress: 65,
      timestamp: new Date().toISOString(),
      commit: 'abc123f',
      author: 'João Silva',
      stages: [
        { name: 'Checkout', status: 'success', duration: 5, startTime: new Date(Date.now() - 300000).toISOString(), endTime: new Date(Date.now() - 295000).toISOString() },
        { name: 'Install Dependencies', status: 'success', duration: 45, startTime: new Date(Date.now() - 295000).toISOString(), endTime: new Date(Date.now() - 250000).toISOString() },
        { name: 'Lint & Format', status: 'success', duration: 15, startTime: new Date(Date.now() - 250000).toISOString(), endTime: new Date(Date.now() - 235000).toISOString() },
        { name: 'Unit Tests', status: 'success', duration: 30, startTime: new Date(Date.now() - 235000).toISOString(), endTime: new Date(Date.now() - 205000).toISOString() },
        { name: 'Integration Tests', status: 'success', duration: 60, startTime: new Date(Date.now() - 205000).toISOString(), endTime: new Date(Date.now() - 145000).toISOString() },
        { name: 'E2E Tests', status: 'running', startTime: new Date(Date.now() - 145000).toISOString() },
        { name: 'Security Scan', status: 'pending' },
        { name: 'Build', status: 'pending' },
        { name: 'Deploy Staging', status: 'pending' }
      ]
    },
    {
      id: '2',
      branch: 'feature/admin-dashboard',
      status: 'success',
      stage: 'Deploy Staging',
      progress: 100,
      timestamp: new Date(Date.now() - 300000).toISOString(),
      commit: 'def456g',
      author: 'Maria Santos',
      stages: [
        { name: 'Checkout', status: 'success', duration: 3 },
        { name: 'Install Dependencies', status: 'success', duration: 42 },
        { name: 'Lint & Format', status: 'success', duration: 12 },
        { name: 'Unit Tests', status: 'success', duration: 28 },
        { name: 'Integration Tests', status: 'success', duration: 55 },
        { name: 'E2E Tests', status: 'success', duration: 120 },
        { name: 'Security Scan', status: 'success', duration: 35 },
        { name: 'Build', status: 'success', duration: 90 },
        { name: 'Deploy Staging', status: 'success', duration: 25 }
      ]
    },
    {
      id: '3',
      branch: 'hotfix/security-patch',
      status: 'failed',
      stage: 'Security Scan',
      progress: 45,
      timestamp: new Date(Date.now() - 600000).toISOString(),
      commit: 'ghi789h',
      author: 'Carlos Lima',
      stages: [
        { name: 'Checkout', status: 'success', duration: 4 },
        { name: 'Install Dependencies', status: 'success', duration: 38 },
        { name: 'Lint & Format', status: 'success', duration: 10 },
        { name: 'Unit Tests', status: 'success', duration: 25 },
        { name: 'Integration Tests', status: 'success', duration: 50 },
        { name: 'E2E Tests', status: 'failed', duration: 95 },
        { name: 'Security Scan', status: 'skipped' },
        { name: 'Build', status: 'skipped' },
        { name: 'Deploy Staging', status: 'skipped' }
      ]
    }
  ];
};

const generateMockHealthChecks = (): HealthCheck[] => {
  return [
    {
      service: 'Backend API',
      status: 'healthy',
      responseTime: 45,
      lastCheck: new Date().toISOString(),
      uptime: 99.9,
      endpoint: 'http://localhost:3000/health',
      version: '1.2.3'
    },
    {
      service: 'Frontend',
      status: 'healthy',
      responseTime: 120,
      lastCheck: new Date().toISOString(),
      uptime: 99.8,
      endpoint: 'http://localhost:3001',
      version: '1.2.3'
    },
    {
      service: 'Database',
      status: 'degraded',
      responseTime: 250,
      lastCheck: new Date().toISOString(),
      uptime: 98.5,
      endpoint: 'postgresql://localhost:5432',
      version: '14.2'
    },
    {
      service: 'Redis Cache',
      status: 'healthy',
      responseTime: 15,
      lastCheck: new Date().toISOString(),
      uptime: 99.95,
      endpoint: 'redis://localhost:6379',
      version: '7.0'
    },
    {
      service: 'File Storage',
      status: 'unhealthy',
      responseTime: 0,
      lastCheck: new Date(Date.now() - 120000).toISOString(),
      uptime: 95.2,
      endpoint: 'http://localhost:9000',
      version: 'MinIO 2023'
    }
  ];
};

const generateMockQualityMetrics = (): QualityMetrics => {
  return {
    codeQuality: 85,
    testCoverage: 78,
    security: 92,
    performance: 88,
    accessibility: 95,
    maintainability: 82,
    complexity: 76,
    duplication: 8
  };
};

const generateMockSecurityScans = (): SecurityScan[] => {
  return [
    {
      id: '1',
      type: 'dependency',
      severity: 'high',
      title: 'Vulnerabilidade em lodash',
      description: 'Prototype pollution vulnerability in lodash < 4.17.21',
      status: 'open',
      timestamp: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: '2',
      type: 'code',
      severity: 'medium',
      title: 'Hardcoded API Key',
      description: 'API key encontrada no código fonte',
      status: 'fixed',
      timestamp: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: '3',
      type: 'container',
      severity: 'low',
      title: 'Base image outdated',
      description: 'Imagem base do Docker está desatualizada',
      status: 'ignored',
      timestamp: new Date(Date.now() - 259200000).toISOString()
    }
  ];
};

const generateMockPerformanceMetrics = (): PerformanceMetric[] => {
  const metrics: PerformanceMetric[] = [];
  const now = Date.now();
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now - (i * 60 * 60 * 1000)).toISOString();
    metrics.push({
      timestamp,
      responseTime: 45 + Math.random() * 30,
      throughput: 100 + Math.random() * 50,
      errorRate: Math.random() * 2,
      cpuUsage: 20 + Math.random() * 40,
      memoryUsage: 30 + Math.random() * 30
    });
  }
  
  return metrics;
};

// API functions
export const adminApi = {
  async getTestResults(): Promise<TestResult[]> {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateMockTests();
  },

  async getPipelineStatus(): Promise<PipelineStatus[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockPipelines();
  },

  async getHealthChecks(): Promise<HealthCheck[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return generateMockHealthChecks();
  },

  async getQualityMetrics(): Promise<QualityMetrics> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return generateMockQualityMetrics();
  },

  async getSecurityScans(): Promise<SecurityScan[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    return generateMockSecurityScans();
  },

  async getPerformanceMetrics(): Promise<PerformanceMetric[]> {
    await new Promise(resolve => setTimeout(resolve, 350));
    return generateMockPerformanceMetrics();
  },

  async runTest(testId: string): Promise<void> {
    // Simular execução de teste
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`Teste ${testId} executado com sucesso`);
  },

  async retryPipeline(pipelineId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Pipeline ${pipelineId} reiniciado`);
  },

  async restartService(serviceName: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log(`Serviço ${serviceName} reiniciado`);
  }
};

export default adminApi;