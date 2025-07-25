import { Router } from 'express';
import {
  getDashboard,
  getOverview,
  getKPIs,
  getCharts,
  getRecentActivity,
  getAlerts,
  getPerformance,
  exportMetrics,
  getHealth
} from '../controllers/metricsController';
import { requireAuth } from '../middleware/auth';
import { rateLimitingMiddleware } from '../middleware/rateLimiting';
import { auditMiddleware } from '../middleware/auditMiddleware';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Aplicar middleware de autenticação para todas as rotas
router.use(requireAuth());

// Aplicar rate limiting específico para métricas
router.use(rateLimitingMiddleware);

// Aplicar auditoria para todas as rotas de métricas
router.use(auditMiddleware);

// Schemas de validação para query parameters
const filterQuerySchema = z.object({
  filter: z.string().optional(),
  limit: z.string().regex(/^\d+$/).optional()
});

/**
 * @route GET /api/metrics/dashboard
 * @desc Retorna dados completos do dashboard com métricas, KPIs, gráficos e atividades
 * @access Private
 * @query filter - Filtros JSON opcionais (dateRange, projects, users, categories, granularity)
 */
router.get('/dashboard', 
  validateRequest({ query: filterQuerySchema }),
  getDashboard
);

/**
 * @route GET /api/metrics/overview
 * @desc Retorna métricas de visão geral (totais, taxas, etc.)
 * @access Private
 * @query filter - Filtros JSON opcionais
 */
router.get('/overview',
  validateRequest({ query: filterQuerySchema }),
  getOverview
);

/**
 * @route GET /api/metrics/kpis
 * @desc Retorna KPIs principais com tendências e status
 * @access Private
 * @query filter - Filtros JSON opcionais
 */
router.get('/kpis',
  validateRequest({ query: filterQuerySchema }),
  getKPIs
);

/**
 * @route GET /api/metrics/charts
 * @desc Retorna dados formatados para gráficos
 * @access Private
 * @query filter - Filtros JSON opcionais
 */
router.get('/charts',
  validateRequest({ query: filterQuerySchema }),
  getCharts
);

/**
 * @route GET /api/metrics/activity
 * @desc Retorna atividades recentes do sistema
 * @access Private
 * @query filter - Filtros JSON opcionais
 * @query limit - Limite de resultados (1-100, padrão: 10)
 */
router.get('/activity',
  validateRequest({ query: filterQuerySchema }),
  getRecentActivity
);

/**
 * @route GET /api/metrics/alerts
 * @desc Retorna alertas ativos do sistema
 * @access Private
 */
router.get('/alerts', getAlerts);

/**
 * @route GET /api/metrics/performance
 * @desc Retorna métricas de performance do sistema
 * @access Private
 */
router.get('/performance', getPerformance);

/**
 * @route POST /api/metrics/export
 * @desc Exporta métricas em diferentes formatos (JSON, CSV)
 * @access Private
 * @body format - Formato de exportação ('json' | 'csv')
 * @body filter - Filtros opcionais
 */
const exportBodySchema = z.object({
  format: z.enum(['json', 'csv']),
  filter: z.object({
    dateRange: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional()
    }).optional(),
    projects: z.array(z.string()).optional(),
    users: z.array(z.string()).optional(),
    categories: z.array(z.enum(['productivity', 'performance', 'quality', 'engagement', 'system'])).optional(),
    granularity: z.enum(['hour', 'day', 'week', 'month']).optional()
  }).optional()
});

router.post('/export',
  validateRequest({ body: exportBodySchema }),
  exportMetrics
);

/**
 * @route GET /api/metrics/health
 * @desc Verifica a saúde do serviço de métricas
 * @access Private
 */
router.get('/health', getHealth);

// Middleware de tratamento de erros específico para métricas
router.use((error: any, req: any, res: any, next: any) => {
  console.error('Metrics route error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error in metrics request',
      details: error.message
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized access to metrics'
    });
  }
  
  return res.status(500).json({
    success: false,
    error: 'Internal server error in metrics service'
  });
});

export default router;

// Documentação das rotas para referência
export const metricsRoutesDocumentation = {
  '/dashboard': {
    method: 'GET',
    description: 'Retorna dados completos do dashboard',
    queryParams: {
      filter: 'JSON string com filtros opcionais (dateRange, projects, users, categories, granularity)'
    },
    response: 'DashboardData com overview, kpis, charts, recentActivity, alerts, performance'
  },
  '/overview': {
    method: 'GET',
    description: 'Retorna métricas de visão geral',
    queryParams: {
      filter: 'JSON string com filtros opcionais'
    },
    response: 'OverviewMetrics com totais e taxas'
  },
  '/kpis': {
    method: 'GET',
    description: 'Retorna KPIs principais',
    queryParams: {
      filter: 'JSON string com filtros opcionais'
    },
    response: 'Array de KPIMetric com valores, tendências e status'
  },
  '/charts': {
    method: 'GET',
    description: 'Retorna dados para gráficos',
    queryParams: {
      filter: 'JSON string com filtros opcionais'
    },
    response: 'Array de ChartMetric com dados formatados para diferentes tipos de gráfico'
  },
  '/activity': {
    method: 'GET',
    description: 'Retorna atividades recentes',
    queryParams: {
      filter: 'JSON string com filtros opcionais',
      limit: 'Número de resultados (1-100, padrão: 10)'
    },
    response: 'Array de ActivityMetric com atividades recentes'
  },
  '/alerts': {
    method: 'GET',
    description: 'Retorna alertas ativos',
    response: 'Array de AlertMetric com alertas do sistema'
  },
  '/performance': {
    method: 'GET',
    description: 'Retorna métricas de performance',
    response: 'PerformanceMetrics com dados de sistema'
  },
  '/export': {
    method: 'POST',
    description: 'Exporta métricas em diferentes formatos',
    body: {
      format: 'Formato de exportação (json | csv)',
      filter: 'Filtros opcionais'
    },
    response: 'Arquivo de download com dados exportados'
  },
  '/health': {
    method: 'GET',
    description: 'Verifica saúde do serviço',
    response: 'Status de saúde do serviço de métricas'
  }
};