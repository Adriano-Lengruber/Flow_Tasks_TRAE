import { Request, Response } from 'express';
import { getMetricsService } from '../services/metricsService';
import { structuredLogger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';
import { ApiResponse } from '../types/api';

const logger = structuredLogger.child({ service: 'metrics' });

// Schemas de validação
const metricsFilterSchema = z.object({
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional(),
  projects: z.array(z.string()).optional(),
  users: z.array(z.string()).optional(),
  categories: z.array(z.enum(['productivity', 'performance', 'quality', 'engagement', 'system'])).optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional()
});

const exportMetricsSchema = z.object({
  format: z.enum(['json', 'csv']),
  filter: metricsFilterSchema.optional()
});

class MetricsController {
  /**
   * GET /api/metrics/dashboard
   * Retorna dados completos do dashboard
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const filter = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;
      
      // Validar filtros se fornecidos
      if (filter) {
        const validation = metricsFilterSchema.safeParse(filter);
        if (!validation.success) {
          res.status(400).json({
            success: false,
            error: 'Invalid filter parameters',
            details: validation.error.issues
          } as ApiResponse<null>);
          return;
        }
      }

      const metricsService = getMetricsService();
      const dashboardData = await metricsService.getDashboardData(filter);

      logger.info('Dashboard data retrieved successfully', {
        userId: req.user?.id,
        filterApplied: !!filter
      });

      res.json({
        success: true,
        data: dashboardData,
        message: 'Dashboard data retrieved successfully'
      } as ApiResponse<typeof dashboardData>);
    } catch (error) {
      logger.error('Error retrieving dashboard data', error instanceof Error ? error : undefined);

      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving dashboard data'
      } as ApiResponse<null>);
    }
  }

  /**
   * GET /api/metrics/overview
   * Retorna métricas de visão geral
   */
  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const filter = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;
      
      if (filter) {
        const validation = metricsFilterSchema.safeParse(filter);
        if (!validation.success) {
          res.status(400).json({
            success: false,
            error: 'Invalid filter parameters',
            details: validation.error.issues
          } as ApiResponse<null>);
          return;
        }
      }

      const metricsService = getMetricsService();
      const overview = await metricsService.getOverviewMetrics(filter);

      logger.info('Overview metrics retrieved successfully', {
        userId: req.user?.id
      });

      res.json({
        success: true,
        data: overview,
        message: 'Overview metrics retrieved successfully'
      } as ApiResponse<typeof overview>);
    } catch (error) {
      logger.error('Error retrieving overview metrics', error instanceof Error ? error : undefined);

      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving overview metrics'
      } as ApiResponse<null>);
    }
  }

  /**
   * GET /api/metrics/kpis
   * Retorna KPIs principais
   */
  async getKPIs(req: Request, res: Response): Promise<void> {
    try {
      const filter = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;
      
      if (filter) {
        const validation = metricsFilterSchema.safeParse(filter);
        if (!validation.success) {
          res.status(400).json({
            success: false,
            error: 'Invalid filter parameters',
            details: validation.error.issues
          } as ApiResponse<null>);
          return;
        }
      }

      const metricsService = getMetricsService();
      const kpis = await metricsService.getKPIs(filter);

      logger.info('KPIs retrieved successfully', {
        userId: req.user?.id,
        kpiCount: kpis.length
      });

      res.json({
        success: true,
        data: kpis,
        message: 'KPIs retrieved successfully'
      } as ApiResponse<typeof kpis>);
    } catch (error) {
      logger.error('Error retrieving KPIs', error instanceof Error ? error : undefined);

      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving KPIs'
      } as ApiResponse<null>);
    }
  }

  /**
   * GET /api/metrics/charts
   * Retorna dados para gráficos
   */
  async getCharts(req: Request, res: Response): Promise<void> {
    try {
      const filter = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;
      
      if (filter) {
        const validation = metricsFilterSchema.safeParse(filter);
        if (!validation.success) {
          res.status(400).json({
            success: false,
            error: 'Invalid filter parameters',
            details: validation.error.issues
          } as ApiResponse<null>);
          return;
        }
      }

      const metricsService = getMetricsService();
      const charts = await metricsService.getChartMetrics(filter);

      logger.info('Chart metrics retrieved successfully', {
        userId: req.user?.id,
        chartCount: charts.length
      });

      res.json({
        success: true,
        data: charts,
        message: 'Chart metrics retrieved successfully'
      } as ApiResponse<typeof charts>);
    } catch (error) {
      logger.error('Error retrieving chart metrics', error instanceof Error ? error : undefined);

      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving chart metrics'
      } as ApiResponse<null>);
    }
  }

  /**
   * GET /api/metrics/activity
   * Retorna atividades recentes
   */
  async getRecentActivity(req: Request, res: Response): Promise<void> {
    try {
      const filter = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      if (filter) {
        const validation = metricsFilterSchema.safeParse(filter);
        if (!validation.success) {
          res.status(400).json({
            success: false,
            error: 'Invalid filter parameters',
            details: validation.error.issues
          } as ApiResponse<null>);
          return;
        }
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error: 'Limit must be a number between 1 and 100'
        } as ApiResponse<null>);
        return;
      }

      const metricsService = getMetricsService();
      const activities = await metricsService.getRecentActivity(filter, limit);

      logger.info('Recent activity retrieved successfully', {
        userId: req.user?.id,
        activityCount: activities.length
      });

      res.json({
        success: true,
        data: activities,
        message: 'Recent activity retrieved successfully'
      } as ApiResponse<typeof activities>);
    } catch (error) {
      logger.error('Error retrieving recent activity', error instanceof Error ? error : undefined);

      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving recent activity'
      } as ApiResponse<null>);
    }
  }

  /**
   * GET /api/metrics/alerts
   * Retorna alertas ativos
   */
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const metricsService = getMetricsService();
      const alerts = await metricsService.getActiveAlerts();

      logger.info('Active alerts retrieved successfully', {
        userId: req.user?.id,
        alertCount: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length
      });

      res.json({
        success: true,
        data: alerts,
        message: 'Active alerts retrieved successfully'
      } as ApiResponse<typeof alerts>);
    } catch (error) {
      logger.error('Error retrieving active alerts', error instanceof Error ? error : undefined);

      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving active alerts'
      } as ApiResponse<null>);
    }
  }

  /**
   * GET /api/metrics/performance
   * Retorna métricas de performance
   */
  async getPerformance(req: Request, res: Response): Promise<void> {
    try {
      const metricsService = getMetricsService();
      const performance = await metricsService.getPerformanceMetrics();

      logger.info('Performance metrics retrieved successfully', {
        userId: req.user?.id
      });

      res.json({
        success: true,
        data: performance,
        message: 'Performance metrics retrieved successfully'
      } as ApiResponse<typeof performance>);
    } catch (error) {
      logger.error('Error retrieving performance metrics', error instanceof Error ? error : undefined);

      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving performance metrics'
      } as ApiResponse<null>);
    }
  }

  /**
   * POST /api/metrics/export
   * Exporta métricas em diferentes formatos
   */
  async exportMetrics(req: Request, res: Response): Promise<void> {
    try {
      const validation = exportMetricsSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid export parameters',
          details: validation.error.issues
        } as ApiResponse<null>);
        return;
      }

      const { format, filter } = validation.data;
      
      // Converter strings de data para objetos Date
      const processedFilter = filter ? {
        ...filter,
        dateRange: filter.dateRange ? {
          start: filter.dateRange.start ? new Date(filter.dateRange.start) : undefined,
          end: filter.dateRange.end ? new Date(filter.dateRange.end) : undefined
        } : undefined
      } : undefined;
      
      const metricsService = getMetricsService();
      const exportData = await metricsService.exportMetrics(format, processedFilter);

      const filename = `metrics_export_${new Date().toISOString().split('T')[0]}.${format}`;
      const contentType = format === 'json' ? 'application/json' : 'text/csv';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      logger.info('Metrics exported successfully', {
        userId: req.user?.id,
        format,
        filename
      });

      res.send(exportData);
    } catch (error) {
      logger.error('Error exporting metrics', error instanceof Error ? error : undefined);

      res.status(500).json({
        success: false,
        error: 'Internal server error while exporting metrics'
      } as ApiResponse<null>);
    }
  }

  /**
   * GET /api/metrics/health
   * Verifica a saúde do serviço de métricas
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const metricsService = getMetricsService();
      
      // Fazer uma verificação básica
      const startTime = Date.now();
      await metricsService.getPerformanceMetrics();
      const responseTime = Date.now() - startTime;

      const health = {
        status: 'healthy',
        responseTime,
        timestamp: new Date(),
        version: '1.0.0'
      };

      logger.info('Metrics service health check completed', {
        responseTime,
        userId: req.user?.id
      });

      res.json({
        success: true,
        data: health,
        message: 'Metrics service is healthy'
      } as ApiResponse<typeof health>);
    } catch (error) {
      logger.error('Metrics service health check failed', error instanceof Error ? error : undefined);

      res.status(503).json({
        success: false,
        error: 'Metrics service is unhealthy',
        data: {
          status: 'unhealthy',
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      } as ApiResponse<null>);
    }
  }
}

// Instância singleton do controller
const metricsController = new MetricsController();

// Exportar métodos do controller
export const {
  getDashboard,
  getOverview,
  getKPIs,
  getCharts,
  getRecentActivity,
  getAlerts,
  getPerformance,
  exportMetrics,
  getHealth
} = metricsController;

export default metricsController;