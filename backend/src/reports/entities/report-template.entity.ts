import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';

export enum TemplateCategory {
  SALES = 'sales',
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  ANALYTICS = 'analytics',
  CUSTOM = 'custom',
}

export enum VisualizationType {
  TABLE = 'table',
  BAR_CHART = 'bar',
  LINE_CHART = 'line',
  PIE_CHART = 'pie',
  METRIC = 'metric',
  HEATMAP = 'heatmap',
  SCATTER = 'scatter',
  AREA = 'area',
}

export enum FieldAggregation {
  SUM = 'sum',
  AVG = 'avg',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  DISTINCT = 'distinct',
}

// Register enums for GraphQL
registerEnumType(TemplateCategory, {
  name: 'TemplateCategory',
});

registerEnumType(VisualizationType, {
  name: 'VisualizationType',
});

registerEnumType(FieldAggregation, {
  name: 'FieldAggregation',
});

export interface TemplateField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  source: string;
  label: string;
  aggregation?: FieldAggregation;
  format?: string;
  required?: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface TemplateFilter {
  id: string;
  fieldId: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
  label: string;
  required?: boolean;
}

export interface VisualizationConfig {
  type: VisualizationType;
  config: {
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
    title?: string;
    subtitle?: string;
    showLegend?: boolean;
    showGrid?: boolean;
    colors?: string[];
    width?: number;
    height?: number;
    responsive?: boolean;
    animation?: boolean;
    dataLabels?: boolean;
    tooltip?: {
      enabled: boolean;
      format?: string;
    };
    axes?: {
      x?: {
        title?: string;
        format?: string;
        rotation?: number;
      };
      y?: {
        title?: string;
        format?: string;
        min?: number;
        max?: number;
      };
    };
  };
}

export interface LayoutConfig {
  sections: {
    id: string;
    type: 'header' | 'content' | 'footer' | 'sidebar';
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    style?: {
      backgroundColor?: string;
      borderColor?: string;
      borderWidth?: number;
      borderRadius?: number;
      padding?: number;
      margin?: number;
    };
    content?: {
      type: 'text' | 'image' | 'chart' | 'table' | 'metric';
      data?: any;
      style?: any;
    };
  }[];
  grid: {
    enabled: boolean;
    size: number;
    snap: boolean;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: number;
  };
}

@ObjectType()
@Entity('report_templates')
export class ReportTemplate {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Field()
  @Column({ type: 'text' })
  description: string;

  @Field(() => TemplateCategory)
  @Column({ type: 'varchar', length: 20, default: TemplateCategory.CUSTOM })
  category: TemplateCategory;

  @Field(() => String)
  @Column({ type: 'json' })
  fields: TemplateField[];

  @Field(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  filters: TemplateFilter[];

  @Field(() => String)
  @Column({ type: 'json' })
  visualization: VisualizationConfig;

  @Field(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  layout: LayoutConfig;

  @Field(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  sampleData: any[];

  @Field()
  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Field()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Field()
  @Column({ type: 'boolean', default: false })
  isPremium: boolean;

  @Field({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  thumbnail: string;

  @Field(() => [String], { nullable: true })
  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Field()
  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Field()
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Field(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  metadata: {
    version?: string;
    compatibility?: string[];
    requirements?: string[];
    documentation?: string;
    changelog?: {
      version: string;
      date: Date;
      changes: string[];
    }[];
  };

  @Field(() => User)
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  // Métodos auxiliares
  getFieldById(fieldId: string): TemplateField | undefined {
    return this.fields.find(field => field.id === fieldId);
  }

  getRequiredFields(): TemplateField[] {
    return this.fields.filter(field => field.required);
  }

  getRequiredFilters(): TemplateFilter[] {
    return this.filters?.filter(filter => filter.required) || [];
  }

  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar campos obrigatórios
    if (!this.name?.trim()) {
      errors.push('Nome do template é obrigatório');
    }

    if (!this.fields || this.fields.length === 0) {
      errors.push('Pelo menos um campo deve ser definido');
    }

    // Validar visualização
    if (!this.visualization) {
      errors.push('Configuração de visualização é obrigatória');
    } else {
      const { type, config } = this.visualization;
      
      if (type === VisualizationType.BAR_CHART || type === VisualizationType.LINE_CHART) {
        if (!config.xAxis || !config.yAxis) {
          errors.push('Gráficos de barras e linha requerem eixos X e Y');
        }
      }
      
      if (type === VisualizationType.PIE_CHART && !config.groupBy) {
        errors.push('Gráfico de pizza requer campo de agrupamento');
      }
    }

    // Validar filtros
    if (this.filters) {
      this.filters.forEach((filter, index) => {
        if (!filter.fieldId) {
          errors.push(`Filtro ${index + 1}: Campo é obrigatório`);
        }
        if (!filter.operator) {
          errors.push(`Filtro ${index + 1}: Operador é obrigatório`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  clone(): Partial<ReportTemplate> {
    return {
      name: `${this.name} (Cópia)`,
      description: this.description,
      category: this.category,
      fields: JSON.parse(JSON.stringify(this.fields)),
      filters: this.filters ? JSON.parse(JSON.stringify(this.filters)) : null,
      visualization: JSON.parse(JSON.stringify(this.visualization)),
      layout: this.layout ? JSON.parse(JSON.stringify(this.layout)) : null,
      sampleData: this.sampleData ? JSON.parse(JSON.stringify(this.sampleData)) : null,
      tags: this.tags ? [...this.tags] : null,
      metadata: this.metadata ? JSON.parse(JSON.stringify(this.metadata)) : null,
    };
  }

  incrementUsage(): void {
    this.usageCount += 1;
  }

  updateRating(newRating: number): void {
    // Implementar lógica de média ponderada se necessário
    this.rating = newRating;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      fields: this.fields,
      filters: this.filters,
      visualization: this.visualization,
      layout: this.layout,
      sampleData: this.sampleData,
      isPublic: this.isPublic,
      isActive: this.isActive,
      isPremium: this.isPremium,
      thumbnail: this.thumbnail,
      tags: this.tags,
      usageCount: this.usageCount,
      rating: this.rating,
      metadata: this.metadata,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default ReportTemplate;