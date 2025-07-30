import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';
import { ReportSchedule } from './report-schedule.entity';
import { ReportAnalytics } from './report-analytics.entity';

export enum ReportTemplateType {
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

// Register enums for GraphQL
registerEnumType(ReportTemplateType, {
  name: 'ReportTemplateType',
});

registerEnumType(FieldType, {
  name: 'FieldType',
});

registerEnumType(FilterOperator, {
  name: 'FilterOperator',
});

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

@ObjectType()
@Entity('reports')
export class Report {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Field()
  @Column({ type: 'text' })
  description: string;

  @Field(() => String)
  @Column({ type: 'json' })
  fields: ReportField[];

  @Field(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  filters: ReportFilter[];

  @Field({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  groupBy: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  sortBy: string;

  @Field()
  @Column({ type: 'varchar', length: 10, default: 'asc' })
  sortOrder: 'asc' | 'desc';

  @Field(() => ReportTemplateType)
  @Column({ type: 'varchar', length: 20, default: ReportTemplateType.TABLE })
  template: ReportTemplateType;

  @Field()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Field()
  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Field({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  category: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Field(() => User)
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @Field(() => [ReportSchedule], { nullable: true })
  @OneToMany(() => ReportSchedule, schedule => schedule.report)
  schedules: ReportSchedule[];

  @Field(() => [ReportAnalytics], { nullable: true })
  @OneToMany(() => ReportAnalytics, analytics => analytics.report)
  analytics: ReportAnalytics[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
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