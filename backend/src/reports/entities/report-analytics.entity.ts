import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { Report } from './report.entity';
import { User } from '../../auth/entities/user.entity';

export enum AnalyticsEventType {
  VIEW = 'view',
  EXPORT = 'export',
  SHARE = 'share',
  DUPLICATE = 'duplicate',
  SCHEDULE = 'schedule',
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

// Register enums for GraphQL
registerEnumType(AnalyticsEventType, {
  name: 'AnalyticsEventType',
});

registerEnumType(ExportFormat, {
  name: 'AnalyticsExportFormat',
});

@ObjectType()
@Entity('report_analytics')
@Index(['reportId', 'eventType'])
@Index(['reportId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class ReportAnalytics {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => AnalyticsEventType)
  @Column({ type: 'varchar', length: 20 })
  eventType: AnalyticsEventType;

  @Field(() => ExportFormat, { nullable: true })
  @Column({ type: 'varchar', length: 20, nullable: true })
  exportFormat: ExportFormat;

  @Field({ nullable: true })
  @Column({ type: 'int', nullable: true })
  executionTime: number; // em millisegundos

  @Field({ nullable: true })
  @Column({ type: 'int', nullable: true })
  recordCount: number;

  @Field(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  filters: any[];

  @Field(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
    referrer?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    os?: string;
    fileSize?: number; // para exports
    errorMessage?: string; // para eventos com erro
  };

  @Field(() => Report)
  @ManyToOne(() => Report, report => report.analytics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report: Report;

  @Field()
  @Column({ name: 'report_id' })
  reportId: string;

  @Field(() => User)
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Field()
  @Column({ name: 'user_id' })
  userId: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  // Métodos estáticos para análises
  static async getReportViews(reportId: string, startDate?: Date, endDate?: Date): Promise<number> {
    // Implementação seria feita no serviço
    return 0;
  }

  static async getPopularReports(limit: number = 10): Promise<any[]> {
    // Implementação seria feita no serviço
    return [];
  }

  static async getUserActivity(userId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    // Implementação seria feita no serviço
    return [];
  }

  // Métodos auxiliares
  isExportEvent(): boolean {
    return this.eventType === AnalyticsEventType.EXPORT;
  }

  isViewEvent(): boolean {
    return this.eventType === AnalyticsEventType.VIEW;
  }

  getFormattedExecutionTime(): string {
    if (!this.executionTime) return 'N/A';
    
    if (this.executionTime < 1000) {
      return `${this.executionTime}ms`;
    } else if (this.executionTime < 60000) {
      return `${(this.executionTime / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(this.executionTime / 60000);
      const seconds = ((this.executionTime % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  getFormattedFileSize(): string {
    if (!this.metadata?.fileSize) return 'N/A';
    
    const size = this.metadata.fileSize;
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
  }

  toJSON() {
    return {
      id: this.id,
      eventType: this.eventType,
      exportFormat: this.exportFormat,
      executionTime: this.executionTime,
      formattedExecutionTime: this.getFormattedExecutionTime(),
      recordCount: this.recordCount,
      filters: this.filters,
      metadata: this.metadata,
      formattedFileSize: this.getFormattedFileSize(),
      reportId: this.reportId,
      user: this.user,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// Interface para estatísticas agregadas
export interface ReportStats {
  reportId: string;
  totalViews: number;
  totalExports: number;
  uniqueUsers: number;
  avgExecutionTime: number;
  popularFormats: { format: ExportFormat; count: number }[];
  viewsByDay: { date: string; views: number }[];
  exportsByDay: { date: string; exports: number }[];
  topUsers: { userId: string; userName: string; activityCount: number }[];
  lastActivity: Date;
}

// Interface para estatísticas do usuário
export interface UserStats {
  userId: string;
  totalReportsViewed: number;
  totalExports: number;
  favoriteFormats: { format: ExportFormat; count: number }[];
  mostViewedReports: { reportId: string; reportName: string; viewCount: number }[];
  activityByDay: { date: string; views: number; exports: number }[];
  avgExecutionTime: number;
}

// Interface para estatísticas globais
export interface GlobalStats {
  totalReports: number;
  totalViews: number;
  totalExports: number;
  activeUsers: number;
  avgExecutionTime: number;
  popularReports: { reportId: string; reportName: string; viewCount: number }[];
  popularFormats: { format: ExportFormat; count: number }[];
  activityTrend: { date: string; views: number; exports: number }[];
  performanceMetrics: {
    fastestReports: { reportId: string; reportName: string; avgTime: number }[];
    slowestReports: { reportId: string; reportName: string; avgTime: number }[];
  };
}

export default ReportAnalytics;