import { IsString, IsArray, IsOptional, IsEnum, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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

export class ReportFieldDto {
  @ApiProperty({ description: 'ID único do campo' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Nome do campo na base de dados' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tipo do campo', enum: FieldType })
  @IsEnum(FieldType)
  type: FieldType;

  @ApiProperty({ description: 'Label do campo para exibição' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Se o campo é obrigatório', required: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class ReportFilterDto {
  @ApiProperty({ description: 'ID único do filtro' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Campo a ser filtrado' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Operador do filtro', enum: FilterOperator })
  @IsEnum(FilterOperator)
  operator: FilterOperator;

  @ApiProperty({ description: 'Valor do filtro' })
  value: any;
}

export class CreateReportDto {
  @ApiProperty({ description: 'Nome do relatório' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descrição do relatório' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Campos do relatório', type: [ReportFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFieldDto)
  fields: ReportFieldDto[];

  @ApiProperty({ description: 'Filtros do relatório', type: [ReportFilterDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFilterDto)
  filters: ReportFilterDto[];

  @ApiProperty({ description: 'Campo para agrupamento', required: false })
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiProperty({ description: 'Campo para ordenação', required: false })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ description: 'Ordem de classificação', enum: ['asc', 'desc'] })
  @IsEnum(['asc', 'desc'])
  sortOrder: 'asc' | 'desc';

  @ApiProperty({ description: 'Template do relatório', enum: ReportTemplateType })
  @IsEnum(ReportTemplateType)
  template: ReportTemplateType;
}

export class UpdateReportDto {
  @ApiProperty({ description: 'Nome do relatório', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Descrição do relatório', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Campos do relatório', type: [ReportFieldDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFieldDto)
  fields?: ReportFieldDto[];

  @ApiProperty({ description: 'Filtros do relatório', type: [ReportFilterDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFilterDto)
  filters?: ReportFilterDto[];

  @ApiProperty({ description: 'Campo para agrupamento', required: false })
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiProperty({ description: 'Campo para ordenação', required: false })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ description: 'Ordem de classificação', enum: ['asc', 'desc'], required: false })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({ description: 'Template do relatório', enum: ReportTemplateType, required: false })
  @IsOptional()
  @IsEnum(ReportTemplateType)
  template?: ReportTemplateType;
}

export class GenerateReportDto {
  @ApiProperty({ description: 'Filtros adicionais para geração', type: [ReportFilterDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFilterDto)
  filters?: ReportFilterDto[];

  @ApiProperty({ description: 'Limite de registros', required: false })
  @IsOptional()
  limit?: number;

  @ApiProperty({ description: 'Offset para paginação', required: false })
  @IsOptional()
  offset?: number;
}

export class ExportReportDto {
  @ApiProperty({ description: 'Formato de exportação', enum: ['pdf', 'excel', 'csv'] })
  @IsEnum(['pdf', 'excel', 'csv'])
  format: 'pdf' | 'excel' | 'csv';

  @ApiProperty({ description: 'Filtros adicionais para exportação', type: [ReportFilterDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFilterDto)
  filters?: ReportFilterDto[];
}

export class ScheduleReportDto {
  @ApiProperty({ description: 'Expressão cron para agendamento' })
  @IsString()
  cronExpression: string;

  @ApiProperty({ description: 'Lista de emails para envio', type: [String] })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiProperty({ description: 'Formato do relatório agendado', enum: ['pdf', 'excel', 'csv'] })
  @IsEnum(['pdf', 'excel', 'csv'])
  format: 'pdf' | 'excel' | 'csv';

  @ApiProperty({ description: 'Se o agendamento está ativo' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Filtros para o relatório agendado', type: [ReportFilterDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFilterDto)
  filters?: ReportFilterDto[];
}

export class ReportTemplateDto {
  @ApiProperty({ description: 'ID do template' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Nome do template' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descrição do template' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Configuração do template' })
  @IsObject()
  config: any;

  @ApiProperty({ description: 'Setor/categoria do template', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Se é um template público', required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class CreateReportTemplateDto {
  @ApiProperty({ description: 'Nome do template' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descrição do template' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Configuração do template' })
  @IsObject()
  config: any;

  @ApiProperty({ description: 'Setor/categoria do template', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Se é um template público', required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class ReportAnalyticsDto {
  @ApiProperty({ description: 'ID do relatório' })
  @IsString()
  reportId: string;

  @ApiProperty({ description: 'Número de visualizações' })
  views: number;

  @ApiProperty({ description: 'Número de exportações' })
  exports: number;

  @ApiProperty({ description: 'Tempo médio de geração (ms)' })
  avgGenerationTime: number;

  @ApiProperty({ description: 'Última visualização' })
  lastViewed: Date;

  @ApiProperty({ description: 'Formatos mais utilizados' })
  popularFormats: { format: string; count: number }[];
}

export default {
  CreateReportDto,
  UpdateReportDto,
  GenerateReportDto,
  ExportReportDto,
  ScheduleReportDto,
  ReportTemplateDto,
  CreateReportTemplateDto,
  ReportAnalyticsDto,
  ReportFieldDto,
  ReportFilterDto,
};