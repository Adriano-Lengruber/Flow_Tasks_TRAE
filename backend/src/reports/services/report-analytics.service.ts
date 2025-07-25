import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { ReportAnalytics, AnalyticsEventType, ExportFormat, ReportStats, UserStats, GlobalStats } from '../entities/report-analytics.entity';
import { Report } from '../entities/report.entity';
import { User } from '../../auth/entities/user.entity';

export interface AnalyticsEventData {
  reportId: string;
  userId: string;
  eventType: AnalyticsEventType;
  exportFormat?: ExportFormat;
  executionTime?: number;
  recordCount?: number;
  filters?: any[];
  metadata?: any;
}

export interface AnalyticsQuery {
  startDate?: Date;
  endDate?: Date;
  eventType?: AnalyticsEventType;
  exportFormat?: ExportFormat;
  userId?: string;
  reportId?: string;
}

@Injectable()
export class ReportAnalyticsService {
  constructor(
    @InjectRepository(ReportAnalytics)
    private analyticsRepository: Repository<ReportAnalytics>,
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Registrar evento de analytics
  async recordEvent(eventData: AnalyticsEventData): Promise<ReportAnalytics> {
    const analytics = this.analyticsRepository.create({
      reportId: eventData.reportId,
      userId: eventData.userId,
      eventType: eventData.eventType,
      exportFormat: eventData.exportFormat,
      executionTime: eventData.executionTime,
      recordCount: eventData.recordCount,
      filters: eventData.filters,
      metadata: eventData.metadata,
    });

    return this.analyticsRepository.save(analytics);
  }

  // Obter estatísticas de um relatório específico
  async getReportStats(reportId: string, query: AnalyticsQuery = {}): Promise<ReportStats> {
    const { startDate, endDate } = this.getDateRange(query);
    
    const whereClause: any = {
      reportId,
      createdAt: Between(startDate, endDate),
    };

    // Total de visualizações
    const totalViews = await this.analyticsRepository.count({
      where: { ...whereClause, eventType: AnalyticsEventType.VIEW },
    });

    // Total de exportações
    const totalExports = await this.analyticsRepository.count({
      where: { ...whereClause, eventType: AnalyticsEventType.EXPORT },
    });

    // Usuários únicos
    const uniqueUsersResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('COUNT(DISTINCT analytics.userId)', 'count')
      .where('analytics.reportId = :reportId', { reportId })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();
    
    const uniqueUsers = parseInt(uniqueUsersResult.count) || 0;

    // Tempo médio de execução
    const avgExecutionResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('AVG(analytics.executionTime)', 'avg')
      .where('analytics.reportId = :reportId', { reportId })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('analytics.executionTime IS NOT NULL')
      .getRawOne();
    
    const avgExecutionTime = parseFloat(avgExecutionResult.avg) || 0;

    // Formatos populares
    const popularFormatsResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.exportFormat', 'format')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.reportId = :reportId', { reportId })
      .andWhere('analytics.eventType = :eventType', { eventType: AnalyticsEventType.EXPORT })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('analytics.exportFormat IS NOT NULL')
      .groupBy('analytics.exportFormat')
      .orderBy('count', 'DESC')
      .getRawMany();

    const popularFormats = popularFormatsResult.map(result => ({
      format: result.format as ExportFormat,
      count: parseInt(result.count),
    }));

    // Visualizações por dia
    const viewsByDayResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('DATE(analytics.createdAt)', 'date')
      .addSelect('COUNT(*)', 'views')
      .where('analytics.reportId = :reportId', { reportId })
      .andWhere('analytics.eventType = :eventType', { eventType: AnalyticsEventType.VIEW })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(analytics.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const viewsByDay = viewsByDayResult.map(result => ({
      date: result.date,
      views: parseInt(result.views),
    }));

    // Exportações por dia
    const exportsByDayResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('DATE(analytics.createdAt)', 'date')
      .addSelect('COUNT(*)', 'exports')
      .where('analytics.reportId = :reportId', { reportId })
      .andWhere('analytics.eventType = :eventType', { eventType: AnalyticsEventType.EXPORT })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(analytics.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const exportsByDay = exportsByDayResult.map(result => ({
      date: result.date,
      exports: parseInt(result.exports),
    }));

    // Top usuários
    const topUsersResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .leftJoinAndSelect('analytics.user', 'user')
      .select('analytics.userId', 'userId')
      .addSelect('user.name', 'userName')
      .addSelect('COUNT(*)', 'activityCount')
      .where('analytics.reportId = :reportId', { reportId })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('analytics.userId')
      .addGroupBy('user.name')
      .orderBy('activityCount', 'DESC')
      .limit(10)
      .getRawMany();

    const topUsers = topUsersResult.map(result => ({
      userId: result.userId,
      userName: result.userName,
      activityCount: parseInt(result.activityCount),
    }));

    // Última atividade
    const lastActivityResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('MAX(analytics.createdAt)', 'lastActivity')
      .where('analytics.reportId = :reportId', { reportId })
      .getRawOne();

    const lastActivity = lastActivityResult.lastActivity;

    return {
      reportId,
      totalViews,
      totalExports,
      uniqueUsers,
      avgExecutionTime,
      popularFormats,
      viewsByDay,
      exportsByDay,
      topUsers,
      lastActivity,
    };
  }

  // Obter estatísticas do usuário
  async getUserStats(userId: string, query: AnalyticsQuery = {}): Promise<UserStats> {
    const { startDate, endDate } = this.getDateRange(query);
    
    const whereClause: any = {
      userId,
      createdAt: Between(startDate, endDate),
    };

    // Total de relatórios visualizados
    const totalReportsViewedResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('COUNT(DISTINCT analytics.reportId)', 'count')
      .where('analytics.userId = :userId', { userId })
      .andWhere('analytics.eventType = :eventType', { eventType: AnalyticsEventType.VIEW })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();
    
    const totalReportsViewed = parseInt(totalReportsViewedResult.count) || 0;

    // Total de exportações
    const totalExports = await this.analyticsRepository.count({
      where: { ...whereClause, eventType: AnalyticsEventType.EXPORT },
    });

    // Formatos favoritos
    const favoriteFormatsResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.exportFormat', 'format')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.userId = :userId', { userId })
      .andWhere('analytics.eventType = :eventType', { eventType: AnalyticsEventType.EXPORT })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('analytics.exportFormat IS NOT NULL')
      .groupBy('analytics.exportFormat')
      .orderBy('count', 'DESC')
      .getRawMany();

    const favoriteFormats = favoriteFormatsResult.map(result => ({
      format: result.format as ExportFormat,
      count: parseInt(result.count),
    }));

    // Relatórios mais visualizados
    const mostViewedReportsResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .leftJoinAndSelect('analytics.report', 'report')
      .select('analytics.reportId', 'reportId')
      .addSelect('report.name', 'reportName')
      .addSelect('COUNT(*)', 'viewCount')
      .where('analytics.userId = :userId', { userId })
      .andWhere('analytics.eventType = :eventType', { eventType: AnalyticsEventType.VIEW })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('analytics.reportId')
      .addGroupBy('report.name')
      .orderBy('viewCount', 'DESC')
      .limit(10)
      .getRawMany();

    const mostViewedReports = mostViewedReportsResult.map(result => ({
      reportId: result.reportId,
      reportName: result.reportName,
      viewCount: parseInt(result.viewCount),
    }));

    // Atividade por dia
    const activityByDayResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('DATE(analytics.createdAt)', 'date')
      .addSelect('SUM(CASE WHEN analytics.eventType = \'view\' THEN 1 ELSE 0 END)', 'views')
      .addSelect('SUM(CASE WHEN analytics.eventType = \'export\' THEN 1 ELSE 0 END)', 'exports')
      .where('analytics.userId = :userId', { userId })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(analytics.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const activityByDay = activityByDayResult.map(result => ({
      date: result.date,
      views: parseInt(result.views),
      exports: parseInt(result.exports),
    }));

    // Tempo médio de execução
    const avgExecutionResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('AVG(analytics.executionTime)', 'avg')
      .where('analytics.userId = :userId', { userId })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('analytics.executionTime IS NOT NULL')
      .getRawOne();
    
    const avgExecutionTime = parseFloat(avgExecutionResult.avg) || 0;

    return {
      userId,
      totalReportsViewed,
      totalExports,
      favoriteFormats,
      mostViewedReports,
      activityByDay,
      avgExecutionTime,
    };
  }

  // Obter estatísticas globais
  async getGlobalStats(query: AnalyticsQuery = {}): Promise<GlobalStats> {
    const { startDate, endDate } = this.getDateRange(query);
    
    // Total de relatórios
    const totalReports = await this.reportRepository.count();

    // Total de visualizações
    const totalViews = await this.analyticsRepository.count({
      where: {
        eventType: AnalyticsEventType.VIEW,
        createdAt: Between(startDate, endDate),
      },
    });

    // Total de exportações
    const totalExports = await this.analyticsRepository.count({
      where: {
        eventType: AnalyticsEventType.EXPORT,
        createdAt: Between(startDate, endDate),
      },
    });

    // Usuários ativos
    const activeUsersResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('COUNT(DISTINCT analytics.userId)', 'count')
      .where('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();
    
    const activeUsers = parseInt(activeUsersResult.count) || 0;

    // Tempo médio de execução
    const avgExecutionResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('AVG(analytics.executionTime)', 'avg')
      .where('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('analytics.executionTime IS NOT NULL')
      .getRawOne();
    
    const avgExecutionTime = parseFloat(avgExecutionResult.avg) || 0;

    // Relatórios populares
    const popularReportsResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .leftJoinAndSelect('analytics.report', 'report')
      .select('analytics.reportId', 'reportId')
      .addSelect('report.name', 'reportName')
      .addSelect('COUNT(*)', 'viewCount')
      .where('analytics.eventType = :eventType', { eventType: AnalyticsEventType.VIEW })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('analytics.reportId')
      .addGroupBy('report.name')
      .orderBy('viewCount', 'DESC')
      .limit(10)
      .getRawMany();

    const popularReports = popularReportsResult.map(result => ({
      reportId: result.reportId,
      reportName: result.reportName,
      viewCount: parseInt(result.viewCount),
    }));

    // Formatos populares
    const popularFormatsResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.exportFormat', 'format')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.eventType = :eventType', { eventType: AnalyticsEventType.EXPORT })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('analytics.exportFormat IS NOT NULL')
      .groupBy('analytics.exportFormat')
      .orderBy('count', 'DESC')
      .getRawMany();

    const popularFormats = popularFormatsResult.map(result => ({
      format: result.format as ExportFormat,
      count: parseInt(result.count),
    }));

    // Tendência de atividade
    const activityTrendResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('DATE(analytics.createdAt)', 'date')
      .addSelect('SUM(CASE WHEN analytics.eventType = \'view\' THEN 1 ELSE 0 END)', 'views')
      .addSelect('SUM(CASE WHEN analytics.eventType = \'export\' THEN 1 ELSE 0 END)', 'exports')
      .where('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(analytics.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const activityTrend = activityTrendResult.map(result => ({
      date: result.date,
      views: parseInt(result.views),
      exports: parseInt(result.exports),
    }));

    // Métricas de performance
    const fastestReportsResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .leftJoinAndSelect('analytics.report', 'report')
      .select('analytics.reportId', 'reportId')
      .addSelect('report.name', 'reportName')
      .addSelect('AVG(analytics.executionTime)', 'avgTime')
      .where('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('analytics.executionTime IS NOT NULL')
      .groupBy('analytics.reportId')
      .addGroupBy('report.name')
      .orderBy('avgTime', 'ASC')
      .limit(5)
      .getRawMany();

    const slowestReportsResult = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .leftJoinAndSelect('analytics.report', 'report')
      .select('analytics.reportId', 'reportId')
      .addSelect('report.name', 'reportName')
      .addSelect('AVG(analytics.executionTime)', 'avgTime')
      .where('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('analytics.executionTime IS NOT NULL')
      .groupBy('analytics.reportId')
      .addGroupBy('report.name')
      .orderBy('avgTime', 'DESC')
      .limit(5)
      .getRawMany();

    const performanceMetrics = {
      fastestReports: fastestReportsResult.map(result => ({
        reportId: result.reportId,
        reportName: result.reportName,
        avgTime: parseFloat(result.avgTime),
      })),
      slowestReports: slowestReportsResult.map(result => ({
        reportId: result.reportId,
        reportName: result.reportName,
        avgTime: parseFloat(result.avgTime),
      })),
    };

    return {
      totalReports,
      totalViews,
      totalExports,
      activeUsers,
      avgExecutionTime,
      popularReports,
      popularFormats,
      activityTrend,
      performanceMetrics,
    };
  }

  // Obter eventos de analytics com filtros
  async getAnalyticsEvents(query: AnalyticsQuery & { page?: number; limit?: number }) {
    const { startDate, endDate, page = 1, limit = 50, ...filters } = query;
    
    const queryBuilder = this.analyticsRepository
      .createQueryBuilder('analytics')
      .leftJoinAndSelect('analytics.report', 'report')
      .leftJoinAndSelect('analytics.user', 'user')
      .where('analytics.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (filters.eventType) {
      queryBuilder.andWhere('analytics.eventType = :eventType', { eventType: filters.eventType });
    }

    if (filters.exportFormat) {
      queryBuilder.andWhere('analytics.exportFormat = :exportFormat', { exportFormat: filters.exportFormat });
    }

    if (filters.userId) {
      queryBuilder.andWhere('analytics.userId = :userId', { userId: filters.userId });
    }

    if (filters.reportId) {
      queryBuilder.andWhere('analytics.reportId = :reportId', { reportId: filters.reportId });
    }

    const [events, total] = await queryBuilder
      .orderBy('analytics.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Limpar dados antigos de analytics
  async cleanupOldData(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.analyticsRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  private getDateRange(query: AnalyticsQuery): { startDate: Date; endDate: Date } {
    const endDate = query.endDate || new Date();
    const startDate = query.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
    
    return { startDate, endDate };
  }
}

export default ReportAnalyticsService;