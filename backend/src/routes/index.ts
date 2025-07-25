import { Router } from 'express';
import { structuredLogger } from '../utils/logger';
import metricsRoutes from './metrics';

const logger = structuredLogger.child({ service: 'routes' });
const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Info route
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'TRAE Backend API',
      version: '1.0.0',
      description: 'Backend API for TRAE project management system',
      endpoints: {
        health: '/api/health',
        metrics: '/api/metrics/*',
        info: '/api/info'
      },
      features: [
        'Metrics and Analytics',
        'Dashboard Data',
        'KPI Tracking',
        'Performance Monitoring',
        'Real-time Alerts'
      ]
    },
    message: 'API information retrieved successfully'
  });
});

// Mount metrics routes
router.use('/metrics', metricsRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
  logger.warn('API route not found', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: {
      health: 'GET /api/health',
      info: 'GET /api/info',
      metrics: {
        dashboard: 'GET /api/metrics/dashboard',
        overview: 'GET /api/metrics/overview',
        kpis: 'GET /api/metrics/kpis',
        charts: 'GET /api/metrics/charts',
        activity: 'GET /api/metrics/activity',
        alerts: 'GET /api/metrics/alerts',
        performance: 'GET /api/metrics/performance',
        export: 'POST /api/metrics/export',
        health: 'GET /api/metrics/health'
      }
    }
  });
});

// Error handler for API routes
router.use((error: any, req: any, res: any, next: any) => {
  logger.error('API route error', error.message || 'Unknown error');
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    error: 'Internal server error',
    message: isDevelopment ? error.message : 'An unexpected error occurred',
    ...(isDevelopment && { stack: error.stack })
  });
});

export default router;

// Export route documentation for reference
export const apiDocumentation = {
  baseUrl: '/api',
  version: '1.0.0',
  routes: {
    health: {
      path: '/health',
      method: 'GET',
      description: 'Check API health status',
      authentication: false
    },
    info: {
      path: '/info',
      method: 'GET',
      description: 'Get API information and available endpoints',
      authentication: false
    },
    metrics: {
      basePath: '/metrics',
      description: 'Metrics and analytics endpoints',
      authentication: true,
      endpoints: {
        dashboard: 'GET /dashboard - Complete dashboard data',
        overview: 'GET /overview - Overview metrics',
        kpis: 'GET /kpis - Key Performance Indicators',
        charts: 'GET /charts - Chart data',
        activity: 'GET /activity - Recent activity',
        alerts: 'GET /alerts - Active alerts',
        performance: 'GET /performance - Performance metrics',
        export: 'POST /export - Export metrics data',
        health: 'GET /health - Metrics service health'
      }
    }
  }
};