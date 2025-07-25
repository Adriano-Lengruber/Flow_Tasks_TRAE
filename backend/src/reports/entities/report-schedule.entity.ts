import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Report } from './report.entity';
import { User } from '../../auth/entities/user.entity';

export enum ScheduleStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

@Entity('report_schedules')
export class ReportSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  cronExpression: string;

  @Column({ type: 'json' })
  recipients: string[];

  @Column({ type: 'varchar', length: 20, default: ExportFormat.PDF })
  format: ExportFormat;

  @Column({ type: 'varchar', length: 20, default: ScheduleStatus.ACTIVE })
  status: ScheduleStatus;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'json', nullable: true })
  filters: any[];

  @Column({ type: 'json', nullable: true })
  options: {
    includeCharts?: boolean;
    includeData?: boolean;
    emailSubject?: string;
    emailBody?: string;
    timezone?: string;
  };

  @Column({ type: 'datetime', nullable: true })
  lastRun: Date;

  @Column({ type: 'datetime', nullable: true })
  nextRun: Date;

  @Column({ type: 'int', default: 0 })
  runCount: number;

  @Column({ type: 'int', default: 0 })
  errorCount: number;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @Column({ type: 'json', nullable: true })
  executionHistory: {
    timestamp: Date;
    status: 'success' | 'error';
    duration: number;
    recipientCount: number;
    error?: string;
  }[];

  @ManyToOne(() => Report, report => report.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report: Report;

  @Column({ name: 'report_id' })
  reportId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Métodos auxiliares
  isActive(): boolean {
    return this.enabled && this.status === ScheduleStatus.ACTIVE;
  }

  canRun(): boolean {
    return this.isActive() && (!this.nextRun || this.nextRun <= new Date());
  }

  markAsRun(success: boolean, duration: number, error?: string): void {
    this.lastRun = new Date();
    this.runCount++;
    
    if (!success) {
      this.errorCount++;
      this.lastError = error || 'Erro desconhecido';
      
      // Se muitos erros consecutivos, pausar o agendamento
      if (this.errorCount >= 5) {
        this.status = ScheduleStatus.ERROR;
        this.enabled = false;
      }
    } else {
      this.lastError = null;
      // Reset error count on success
      this.errorCount = 0;
    }

    // Adicionar ao histórico
    if (!this.executionHistory) {
      this.executionHistory = [];
    }

    this.executionHistory.push({
      timestamp: new Date(),
      status: success ? 'success' : 'error',
      duration,
      recipientCount: this.recipients.length,
      error: error || undefined,
    });

    // Manter apenas os últimos 50 registros
    if (this.executionHistory.length > 50) {
      this.executionHistory = this.executionHistory.slice(-50);
    }
  }

  getSuccessRate(): number {
    if (this.runCount === 0) return 0;
    const successCount = this.runCount - this.errorCount;
    return (successCount / this.runCount) * 100;
  }

  getAverageExecutionTime(): number {
    if (!this.executionHistory || this.executionHistory.length === 0) return 0;
    
    const totalDuration = this.executionHistory.reduce((sum, exec) => sum + exec.duration, 0);
    return totalDuration / this.executionHistory.length;
  }

  getRecentExecutions(limit: number = 10): typeof this.executionHistory {
    if (!this.executionHistory) return [];
    return this.executionHistory.slice(-limit).reverse();
  }

  pause(): void {
    this.status = ScheduleStatus.PAUSED;
    this.enabled = false;
  }

  resume(): void {
    this.status = ScheduleStatus.ACTIVE;
    this.enabled = true;
    this.errorCount = 0;
    this.lastError = null;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      cronExpression: this.cronExpression,
      recipients: this.recipients,
      format: this.format,
      status: this.status,
      enabled: this.enabled,
      filters: this.filters,
      options: this.options,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      runCount: this.runCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
      successRate: this.getSuccessRate(),
      averageExecutionTime: this.getAverageExecutionTime(),
      recentExecutions: this.getRecentExecutions(),
      reportId: this.reportId,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default ReportSchedule;