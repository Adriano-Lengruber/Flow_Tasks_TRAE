import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { ReportBuilderService, CreateTemplateDto, UpdateTemplateDto, TemplateSearchFilters } from '../services/report-builder.service';
import { ReportTemplate } from '../entities/report-template.entity';
import { Report } from '../entities/report.entity';

// GraphQL Types
import { ObjectType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import { TemplateCategory, VisualizationType, FieldAggregation } from '../entities/report-template.entity';

// Register enums for GraphQL
registerEnumType(TemplateCategory, {
  name: 'TemplateCategory',
  description: 'Categorias de templates de relatórios',
});

registerEnumType(VisualizationType, {
  name: 'VisualizationType',
  description: 'Tipos de visualização disponíveis',
});

registerEnumType(FieldAggregation, {
  name: 'FieldAggregation',
  description: 'Tipos de agregação para campos',
});

// GraphQL Input Types
@InputType()
export class TemplateFieldInput {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  type: string;

  @Field()
  source: string;

  @Field()
  label: string;

  @Field(() => FieldAggregation, { nullable: true })
  aggregation?: FieldAggregation;

  @Field({ nullable: true })
  format?: string;

  @Field({ nullable: true })
  required?: boolean;

  @Field({ nullable: true })
  defaultValue?: string;
}

@InputType()
export class TemplateFilterInput {
  @Field()
  id: string;

  @Field()
  fieldId: string;

  @Field()
  operator: string;

  @Field()
  value: string;

  @Field()
  label: string;

  @Field({ nullable: true })
  required?: boolean;
}

@InputType()
export class VisualizationConfigInput {
  @Field(() => VisualizationType)
  type: VisualizationType;

  @Field({ nullable: true })
  xAxis?: string;

  @Field({ nullable: true })
  yAxis?: string;

  @Field({ nullable: true })
  groupBy?: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  subtitle?: string;

  @Field({ nullable: true })
  showLegend?: boolean;

  @Field({ nullable: true })
  showGrid?: boolean;

  @Field(() => [String], { nullable: true })
  colors?: string[];

  @Field({ nullable: true })
  width?: number;

  @Field({ nullable: true })
  height?: number;

  @Field({ nullable: true })
  responsive?: boolean;

  @Field({ nullable: true })
  animation?: boolean;

  @Field({ nullable: true })
  dataLabels?: boolean;
}

@InputType()
export class CreateTemplateInput {
  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => TemplateCategory)
  category: TemplateCategory;

  @Field(() => [TemplateFieldInput])
  fields: TemplateFieldInput[];

  @Field(() => [TemplateFilterInput], { nullable: true })
  filters?: TemplateFilterInput[];

  @Field(() => VisualizationConfigInput)
  visualization: VisualizationConfigInput;

  @Field({ nullable: true })
  isPublic?: boolean;

  @Field(() => [String], { nullable: true })
  tags?: string[];
}

@InputType()
export class UpdateTemplateInput {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => TemplateCategory, { nullable: true })
  category?: TemplateCategory;

  @Field(() => [TemplateFieldInput], { nullable: true })
  fields?: TemplateFieldInput[];

  @Field(() => [TemplateFilterInput], { nullable: true })
  filters?: TemplateFilterInput[];

  @Field(() => VisualizationConfigInput, { nullable: true })
  visualization?: VisualizationConfigInput;

  @Field({ nullable: true })
  isPublic?: boolean;

  @Field(() => [String], { nullable: true })
  tags?: string[];
}

@InputType()
export class TemplateSearchInput {
  @Field(() => TemplateCategory, { nullable: true })
  category?: TemplateCategory;

  @Field({ nullable: true })
  isPublic?: boolean;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true })
  search?: string;
}

// GraphQL Output Types
@ObjectType()
export class BuilderField {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  type: string;

  @Field()
  source: string;

  @Field()
  label: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  aggregations?: string[];

  @Field(() => [String], { nullable: true })
  formats?: string[];
}

@ObjectType()
export class DataSource {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  type: string;

  @Field(() => [BuilderField])
  fields: BuilderField[];

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  schema?: string;
}

@ObjectType()
export class TemplateUsageStats {
  @Field()
  templateId: string;

  @Field()
  name: string;

  @Field()
  usageCount: number;

  @Field()
  rating: number;

  @Field()
  reportsCreated: number;

  @Field()
  createdAt: Date;

  @Field()
  lastUsed: Date;
}

@ObjectType()
export class ValidationResult {
  @Field()
  valid: boolean;

  @Field(() => [String])
  errors: string[];
}

@Resolver(() => ReportTemplate)
export class ReportBuilderResolver {
  constructor(private readonly reportBuilderService: ReportBuilderService) {}

  // ==================== QUERIES ====================

  @Query(() => [ReportTemplate], { name: 'reportTemplates' })
  @UseGuards(JwtAuthGuard)
  async getTemplates(
    @Args('filters', { type: () => TemplateSearchInput, nullable: true }) filters?: TemplateSearchInput,
    @CurrentUser() user?: User,
  ): Promise<ReportTemplate[]> {
    const searchFilters: TemplateSearchFilters = {
      ...filters,
      // Se não for admin, mostrar apenas templates públicos ou próprios
      ...(filters?.isPublic === undefined && {
        // Implementar lógica de permissões aqui
      }),
    };

    return await this.reportBuilderService.getTemplates(searchFilters);
  }

  @Query(() => ReportTemplate, { name: 'reportTemplate' })
  @UseGuards(JwtAuthGuard)
  async getTemplate(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ReportTemplate> {
    return await this.reportBuilderService.getTemplateById(id);
  }

  @Query(() => [ReportTemplate], { name: 'prebuiltTemplates' })
  @UseGuards(JwtAuthGuard)
  async getPrebuiltTemplates(): Promise<ReportTemplate[]> {
    return await this.reportBuilderService.getPrebuiltTemplates();
  }

  @Query(() => [ReportTemplate], { name: 'popularTemplates' })
  @UseGuards(JwtAuthGuard)
  async getPopularTemplates(
    @Args('limit', { type: () => Number, defaultValue: 10 }) limit: number,
  ): Promise<ReportTemplate[]> {
    return await this.reportBuilderService.getPopularTemplates(limit);
  }

  @Query(() => [DataSource], { name: 'availableDataSources' })
  @UseGuards(JwtAuthGuard)
  async getAvailableDataSources(): Promise<DataSource[]> {
    return await this.reportBuilderService.getAvailableDataSources();
  }

  @Query(() => TemplateUsageStats, { name: 'templateUsageStats' })
  @UseGuards(JwtAuthGuard)
  async getTemplateUsageStats(
    @Args('templateId', { type: () => ID }) templateId: string,
  ): Promise<TemplateUsageStats> {
    return await this.reportBuilderService.getTemplateUsageStats(templateId);
  }

  // ==================== MUTATIONS ====================

  @Mutation(() => ReportTemplate, { name: 'createReportTemplate' })
  @UseGuards(JwtAuthGuard)
  async createTemplate(
    @Args('input') input: CreateTemplateInput,
    @CurrentUser() user: User,
  ): Promise<ReportTemplate> {
    const createDto: CreateTemplateDto = {
      name: input.name,
      description: input.description,
      category: input.category,
      fields: input.fields.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type as any,
        source: field.source,
        label: field.label,
        aggregation: field.aggregation,
        format: field.format,
        required: field.required,
        defaultValue: field.defaultValue,
      })),
      filters: input.filters?.map(filter => ({
        id: filter.id,
        fieldId: filter.fieldId,
        operator: filter.operator as any,
        value: filter.value,
        label: filter.label,
        required: filter.required,
      })),
      visualization: {
        type: input.visualization.type,
        config: {
          xAxis: input.visualization.xAxis,
          yAxis: input.visualization.yAxis,
          groupBy: input.visualization.groupBy,
          title: input.visualization.title,
          subtitle: input.visualization.subtitle,
          showLegend: input.visualization.showLegend,
          showGrid: input.visualization.showGrid,
          colors: input.visualization.colors,
          width: input.visualization.width,
          height: input.visualization.height,
          responsive: input.visualization.responsive,
          animation: input.visualization.animation,
          dataLabels: input.visualization.dataLabels,
        },
      },
      isPublic: input.isPublic,
      tags: input.tags,
    };

    return await this.reportBuilderService.createTemplate(createDto, user.id);
  }

  @Mutation(() => ReportTemplate, { name: 'updateReportTemplate' })
  @UseGuards(JwtAuthGuard)
  async updateTemplate(
    @Args('input') input: UpdateTemplateInput,
    @CurrentUser() user: User,
  ): Promise<ReportTemplate> {
    const updateDto: UpdateTemplateDto = {
      id: input.id,
      name: input.name,
      description: input.description,
      category: input.category,
      fields: input.fields?.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type as any,
        source: field.source,
        label: field.label,
        aggregation: field.aggregation,
        format: field.format,
        required: field.required,
        defaultValue: field.defaultValue,
      })),
      filters: input.filters?.map(filter => ({
        id: filter.id,
        fieldId: filter.fieldId,
        operator: filter.operator as any,
        value: filter.value,
        label: filter.label,
        required: filter.required,
      })),
      visualization: input.visualization ? {
        type: input.visualization.type,
        config: {
          xAxis: input.visualization.xAxis,
          yAxis: input.visualization.yAxis,
          groupBy: input.visualization.groupBy,
          title: input.visualization.title,
          subtitle: input.visualization.subtitle,
          showLegend: input.visualization.showLegend,
          showGrid: input.visualization.showGrid,
          colors: input.visualization.colors,
          width: input.visualization.width,
          height: input.visualization.height,
          responsive: input.visualization.responsive,
          animation: input.visualization.animation,
          dataLabels: input.visualization.dataLabels,
        },
      } : undefined,
      isPublic: input.isPublic,
      tags: input.tags,
    };

    return await this.reportBuilderService.updateTemplate(updateDto, user.id);
  }

  @Mutation(() => Boolean, { name: 'deleteReportTemplate' })
  @UseGuards(JwtAuthGuard)
  async deleteTemplate(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    await this.reportBuilderService.deleteTemplate(id, user.id);
    return true;
  }

  @Mutation(() => ReportTemplate, { name: 'cloneReportTemplate' })
  @UseGuards(JwtAuthGuard)
  async cloneTemplate(
    @Args('id', { type: () => ID }) id: string,
    @Args('newName', { nullable: true }) newName?: string,
    @CurrentUser() user?: User,
  ): Promise<ReportTemplate> {
    return await this.reportBuilderService.cloneTemplate(id, user.id, newName);
  }

  @Mutation(() => Report, { name: 'generateReportFromTemplate' })
  @UseGuards(JwtAuthGuard)
  async generateReportFromTemplate(
    @Args('templateId', { type: () => ID }) templateId: string,
    @CurrentUser() user: User,
  ): Promise<Report> {
    return await this.reportBuilderService.generateReportFromTemplate(templateId, user.id);
  }
}

export default ReportBuilderResolver;