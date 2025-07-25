import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { ReportSchedule } from './report-schedule.entity';
import { ReportAnalytics } from './report-analytics.entity';

export enum ReportTemplate {
  TABLE = 'table',
  CHART = 'chart',
  DASHBOARD = 'dashboard',
  SUMMARY = 'summary',
}

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  STATUS = 'status',
  USER = 'user',
  PROGRESS = 'progress',
}

export enum FilterOperator {
  EQUALS = 'equals',
  CONTAINS = 'contains',
  GREATER = 'greater',
  LESS = 'less',
  BETWEEN = 'between',
  IN = 'in',
}

export interface ReportField {
  id: string;
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
}

export interface ReportFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'json' })
  fields: ReportField[];

  @Column({ type: 'json', nullable: true })
  filters: ReportFilter[];

  @Column({ type: 'varchar', nullable: true })
  groupBy: string;

  @Column({ type: 'varchar', nullable: true })
  sortBy: string;

  @Column({ type: 'varchar', length: 10, default: 'asc' })
  sortOrder: 'asc' | 'desc';

  @Column({ type: 'varchar', length: 20, default: ReportTemplate.TABLE })
  template: ReportTemplate;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'varchar', nullable: true })
  category: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @OneToMany(() => ReportSchedule, schedule => schedule.report)
  schedules: ReportSchedule[];

  @OneToMany(() => ReportAnalytics, analytics => analytics.report)
  analytics: ReportAnalytics[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Métodos auxiliares
  getFieldByName(fieldName: string): ReportField | undefined {
    return this.fields.find(field => field.name === fieldName);
  }

  getActiveFilters(): ReportFilter[] {
    return this.filters || [];
  }

  hasField(fieldName: string): boolean {
    return this.fields.some(field => field.name === fieldName);
  }

  getRequiredFields(): ReportField[] {
    return this.fields.filter(field => field.required);
  }

  validateFilters(): boolean {
    if (!this.filters) return true;
    
    return this.filters.every(filter => {
      const field = this.getFieldByName(filter.field);
      return field !== undefined;
    });
  }

  clone(): Partial<Report> {
    return {
      name: `${this.name} (Cópia)`,
      description: this.description,
      fields: [...this.fields],
      filters: this.filters ? [...this.filters] : [],
      groupBy: this.groupBy,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      template: this.template,
      category: this.category,
      metadata: this.metadata ? { ...this.metadata } : null,
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      fields: this.fields,
      filters: this.filters,
      groupBy: this.groupBy,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      template: this.template,
      isActive: this.isActive,
      isPublic: this.isPublic,
      category: this.category,
      metadata: this.metadata,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default Report;