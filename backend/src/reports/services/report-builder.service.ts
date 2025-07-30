import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportTemplate, TemplateCategory, VisualizationType, TemplateField, TemplateFilter, VisualizationConfig, LayoutConfig } from '../entities/report-template.entity';
import { Report } from '../entities/report.entity';
import { User } from '../../auth/entities/user.entity';

export interface CreateTemplateDto {
  name: string;
  description: string;
  category: TemplateCategory;
  fields: TemplateField[];
  filters?: TemplateFilter[];
  visualization: VisualizationConfig;
  layout?: LayoutConfig;
  sampleData?: any[];
  isPublic?: boolean;
  tags?: string[];
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {
  id: string;
}

export interface TemplateSearchFilters {
  category?: TemplateCategory;
  isPublic?: boolean;
  tags?: string[];
  createdBy?: string;
  search?: string;
}

export interface BuilderField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  source: string;
  label: string;
  description?: string;
  aggregations?: string[];
  formats?: string[];
}

export interface DataSource {
  id: string;
  name: string;
  type: 'table' | 'view' | 'query';
  fields: BuilderField[];
  description?: string;
  schema?: string;
}

@Injectable()
export class ReportBuilderService {
  constructor(
    @InjectRepository(ReportTemplate)
    private templateRepository: Repository<ReportTemplate>,
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
  ) {}

  // ==================== TEMPLATES ====================

  async createTemplate(createDto: CreateTemplateDto, userId: string): Promise<ReportTemplate> {
    // Validar dados de entrada
    const validation = this.validateTemplateData(createDto);
    if (!validation.valid) {
      throw new BadRequestException(`Dados inválidos: ${validation.errors.join(', ')}`);
    }

    const template = this.templateRepository.create({
      ...createDto,
      createdById: userId,
      usageCount: 0,
      rating: 0,
    });

    return await this.templateRepository.save(template);
  }

  async updateTemplate(updateDto: UpdateTemplateDto, userId: string): Promise<ReportTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: updateDto.id },
      relations: ['createdBy'],
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    // Verificar permissões (apenas o criador pode editar)
    if (template.createdById !== userId) {
      throw new BadRequestException('Sem permissão para editar este template');
    }

    // Validar dados se fornecidos
    if (updateDto.fields || updateDto.visualization) {
      const validation = this.validateTemplateData(updateDto as CreateTemplateDto);
      if (!validation.valid) {
        throw new BadRequestException(`Dados inválidos: ${validation.errors.join(', ')}`);
      }
    }

    Object.assign(template, updateDto);
    return await this.templateRepository.save(template);
  }

  async getTemplates(filters: TemplateSearchFilters = {}): Promise<ReportTemplate[]> {
    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.createdBy', 'user')
      .where('template.isActive = :isActive', { isActive: true });

    if (filters.category) {
      queryBuilder.andWhere('template.category = :category', { category: filters.category });
    }

    if (filters.isPublic !== undefined) {
      queryBuilder.andWhere('template.isPublic = :isPublic', { isPublic: filters.isPublic });
    }

    if (filters.createdBy) {
      queryBuilder.andWhere('template.createdById = :createdBy', { createdBy: filters.createdBy });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere(
        'template.tags && :tags',
        { tags: filters.tags }
      );
    }

    return await queryBuilder
      .orderBy('template.usageCount', 'DESC')
      .addOrderBy('template.rating', 'DESC')
      .addOrderBy('template.createdAt', 'DESC')
      .getMany();
  }

  async getTemplateById(id: string): Promise<ReportTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id, isActive: true },
      relations: ['createdBy'],
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    return template;
  }

  async deleteTemplate(id: string, userId: string): Promise<void> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    if (template.createdById !== userId) {
      throw new BadRequestException('Sem permissão para deletar este template');
    }

    // Soft delete
    template.isActive = false;
    await this.templateRepository.save(template);
  }

  async cloneTemplate(id: string, userId: string, newName?: string): Promise<ReportTemplate> {
    const originalTemplate = await this.getTemplateById(id);
    
    const clonedData = originalTemplate.clone();
    clonedData.name = newName || clonedData.name;
    clonedData.isPublic = false; // Clones são sempre privados inicialmente

    return await this.createTemplate(clonedData as CreateTemplateDto, userId);
  }

  // ==================== BUILDER UTILITIES ====================

  async getAvailableDataSources(): Promise<DataSource[]> {
    // Simular fontes de dados disponíveis
    // Em produção, isso viria do schema do banco de dados
    return [
      {
        id: 'users',
        name: 'Usuários',
        type: 'table',
        description: 'Dados dos usuários do sistema',
        fields: [
          {
            id: 'user_id',
            name: 'id',
            type: 'number',
            source: 'users',
            label: 'ID do Usuário',
            aggregations: ['count'],
          },
          {
            id: 'user_name',
            name: 'name',
            type: 'string',
            source: 'users',
            label: 'Nome',
            aggregations: ['count'],
          },
          {
            id: 'user_email',
            name: 'email',
            type: 'string',
            source: 'users',
            label: 'Email',
            aggregations: ['count'],
          },
          {
            id: 'user_created_at',
            name: 'created_at',
            type: 'date',
            source: 'users',
            label: 'Data de Criação',
            formats: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/YYYY'],
          },
        ],
      },
      {
        id: 'projects',
        name: 'Projetos',
        type: 'table',
        description: 'Dados dos projetos',
        fields: [
          {
            id: 'project_id',
            name: 'id',
            type: 'number',
            source: 'projects',
            label: 'ID do Projeto',
            aggregations: ['count'],
          },
          {
            id: 'project_name',
            name: 'name',
            type: 'string',
            source: 'projects',
            label: 'Nome do Projeto',
            aggregations: ['count'],
          },
          {
            id: 'project_status',
            name: 'status',
            type: 'string',
            source: 'projects',
            label: 'Status',
            aggregations: ['count'],
          },
          {
            id: 'project_created_at',
            name: 'created_at',
            type: 'date',
            source: 'projects',
            label: 'Data de Criação',
            formats: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/YYYY'],
          },
        ],
      },
      {
        id: 'tasks',
        name: 'Tarefas',
        type: 'table',
        description: 'Dados das tarefas',
        fields: [
          {
            id: 'task_id',
            name: 'id',
            type: 'number',
            source: 'tasks',
            label: 'ID da Tarefa',
            aggregations: ['count'],
          },
          {
            id: 'task_title',
            name: 'title',
            type: 'string',
            source: 'tasks',
            label: 'Título',
            aggregations: ['count'],
          },
          {
            id: 'task_priority',
            name: 'priority',
            type: 'string',
            source: 'tasks',
            label: 'Prioridade',
            aggregations: ['count'],
          },
          {
            id: 'task_completed',
            name: 'completed',
            type: 'boolean',
            source: 'tasks',
            label: 'Concluída',
            aggregations: ['count'],
          },
          {
            id: 'task_due_date',
            name: 'due_date',
            type: 'date',
            source: 'tasks',
            label: 'Data de Vencimento',
            formats: ['YYYY-MM-DD', 'DD/MM/YYYY'],
          },
        ],
      },
    ];
  }

  async getPrebuiltTemplates(): Promise<ReportTemplate[]> {
    // Retornar templates pré-construídos do sistema
    return await this.templateRepository.find({
      where: { isPublic: true, isActive: true },
      relations: ['createdBy'],
      order: { usageCount: 'DESC', rating: 'DESC' },
    });
  }

  async generateReportFromTemplate(templateId: string, userId: string): Promise<Report> {
    const template = await this.getTemplateById(templateId);
    
    // Incrementar contador de uso
    template.incrementUsage();
    await this.templateRepository.save(template);

    // Converter template para report
    const report = this.templateRepository.manager.create(Report, {
      name: template.name,
      description: template.description,
      fields: template.fields.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type as any,
        label: field.label,
        required: field.required,
      })),
      filters: template.filters?.map(filter => ({
        id: filter.id,
        field: filter.fieldId,
        operator: filter.operator as any,
        value: filter.value,
      })) || [],
      template: template.visualization.type as any,
      metadata: {
        templateId: template.id,
        visualization: template.visualization,
        layout: template.layout,
      },
      createdById: userId,
    });

    return await this.reportRepository.save(report);
  }

  // ==================== VALIDATION ====================

  private validateTemplateData(data: Partial<CreateTemplateDto>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.name && !data.name.trim()) {
      errors.push('Nome é obrigatório');
    }

    if (data.fields && data.fields.length === 0) {
      errors.push('Pelo menos um campo deve ser definido');
    }

    if (data.visualization) {
      const { type, config } = data.visualization;
      
      if (type === VisualizationType.BAR_CHART || type === VisualizationType.LINE_CHART) {
        if (!config.xAxis || !config.yAxis) {
          errors.push('Gráficos de barras e linha requerem eixos X e Y');
        }
      }
      
      if (type === VisualizationType.PIE_CHART && !config.groupBy) {
        errors.push('Gráfico de pizza requer campo de agrupamento');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ==================== ANALYTICS ====================

  async getTemplateUsageStats(templateId: string): Promise<any> {
    const template = await this.getTemplateById(templateId);
    
    const reportsCreated = await this.reportRepository.count({
      where: {
        metadata: {
          templateId: templateId
        } as any
      }
    });

    return {
      templateId: template.id,
      name: template.name,
      usageCount: template.usageCount,
      rating: template.rating,
      reportsCreated,
      createdAt: template.createdAt,
      lastUsed: template.updatedAt,
    };
  }

  async getPopularTemplates(limit: number = 10): Promise<ReportTemplate[]> {
    return await this.templateRepository.find({
      where: { isPublic: true, isActive: true },
      relations: ['createdBy'],
      order: { usageCount: 'DESC', rating: 'DESC' },
      take: limit,
    });
  }
}

export default ReportBuilderService;