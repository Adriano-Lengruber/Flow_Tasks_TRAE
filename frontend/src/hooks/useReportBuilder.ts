import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { toast } from 'react-hot-toast';
import {
  GET_DATA_SOURCES,
  GET_PREBUILT_TEMPLATES,
  GET_REPORT_TEMPLATE,
  CREATE_TEMPLATE,
  UPDATE_TEMPLATE,
  DELETE_TEMPLATE,
  CLONE_TEMPLATE,
  GENERATE_REPORT,
  EXPORT_TEMPLATE,
  SHARE_TEMPLATE,
  GET_TEMPLATE_USAGE_STATS,
  ShareTemplateInput,
  ExportFormat,
  FilterOperator,
  TemplateField,
} from '../graphql/reportBuilder';

// Types
export interface BuilderField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  source: string;
  label: string;
  description?: string;
  aggregations?: string[];
  formats?: string[];
  aggregation?: string;
  format?: string;
}

export interface ReportFilter {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: any;
  label: string;
}

export interface VisualizationConfig {
  type: 'table' | 'bar' | 'line' | 'pie' | 'metric';
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
}

export interface ReportTemplate {
  id?: string;
  name: string;
  description: string;
  category: 'SALES' | 'FINANCIAL' | 'OPERATIONAL' | 'ANALYTICS' | 'CUSTOM';
  fields: TemplateField[];
  filters: ReportFilter[];
  visualization: VisualizationConfig;
  isPublic?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  usageCount?: number;
  rating?: number;
}

export interface DataSource {
  id: string;
  name: string;
  type: string;
  description?: string;
  fields: BuilderField[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface UseReportBuilderOptions {
  templateId?: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

const DEFAULT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
];

const DEFAULT_TEMPLATE: ReportTemplate = {
  name: '',
  description: '',
  category: 'CUSTOM',
  fields: [],
  filters: [],
  visualization: {
    type: 'table',
    responsive: true,
    animation: true,
    showLegend: true,
    showGrid: true,
    colors: DEFAULT_COLORS,
  },
  isPublic: false,
  tags: [],
};

export const useReportBuilder = (options: UseReportBuilderOptions = {}) => {
  const { templateId, autoSave = false, autoSaveInterval = 30000 } = options;

  // State
  const [template, setTemplate] = useState<ReportTemplate>(DEFAULT_TEMPLATE);
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // GraphQL Queries and Mutations
  const { data: dataSourcesData, loading: loadingDataSources, refetch: refetchDataSources } = useQuery(GET_DATA_SOURCES);
  const { data: templatesData, loading: loadingTemplates, refetch: refetchTemplates } = useQuery(GET_PREBUILT_TEMPLATES);
  const { data: usageStatsData } = useQuery(GET_TEMPLATE_USAGE_STATS, {
    variables: { templateId },
    skip: !templateId,
  });
  const { data: templateData, loading: loadingTemplate } = useQuery(GET_REPORT_TEMPLATE, {
    variables: { id: templateId },
    skip: !templateId,
  });

  // Load template function
  const loadTemplate = useCallback((templateToLoad: ReportTemplate) => {
    setTemplate(templateToLoad);
    setIsDirty(false);
    setLastSaved(templateToLoad.updatedAt ? new Date(templateToLoad.updatedAt) : null);
  }, []);

  useEffect(() => {
    if (templateData?.reportTemplate) {
      loadTemplate(templateData.reportTemplate);
    }
  }, [templateData, loadTemplate]);

  const [createTemplate, { loading: creatingTemplate }] = useMutation(CREATE_TEMPLATE, {
    onCompleted: (data) => {
      setTemplate(prev => ({ ...prev, id: data.createReportTemplate.id }));
      setIsDirty(false);
      setLastSaved(new Date());
      toast.success('Template criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar template:', error);
      toast.error('Erro ao criar template');
    },
  });

  const [updateTemplate, { loading: updatingTemplate }] = useMutation(UPDATE_TEMPLATE, {
    onCompleted: () => {
      setIsDirty(false);
      setLastSaved(new Date());
      toast.success('Template atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar template:', error);
      toast.error('Erro ao atualizar template');
    },
  });

  const [deleteTemplate, { loading: deletingTemplate }] = useMutation(DELETE_TEMPLATE, {
    onCompleted: () => {
      toast.success('Template excluído com sucesso!');
      resetTemplate();
    },
    onError: (error) => {
      console.error('Erro ao excluir template:', error);
      toast.error('Erro ao excluir template');
    },
  });

  const [cloneTemplate, { loading: cloningTemplate }] = useMutation(CLONE_TEMPLATE, {
    onCompleted: (data) => {
      setTemplate(data.cloneReportTemplate);
      setIsDirty(true);
      toast.success('Template clonado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao clonar template:', error);
      toast.error('Erro ao clonar template');
    },
  });

  const [generateReport, { loading: generatingReport }] = useMutation(GENERATE_REPORT, {
    onCompleted: (data) => {
      toast.success('Relatório gerado com sucesso!');
      // Aqui você pode redirecionar para a página do relatório ou abrir em nova aba
    },
    onError: (error) => {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    },
  });

  const [exportTemplateMutation] = useMutation(EXPORT_TEMPLATE);
  const [shareTemplateMutation] = useMutation(SHARE_TEMPLATE);

  // Template operations

  const exportReport = useCallback(async (format: string) => {
    if (!template.id) throw new Error('No template ID');
    const { data } = await exportTemplateMutation({ variables: { templateId: template.id, format } });
    return data.exportReportTemplate;
  }, [template.id, exportTemplateMutation]);

  const shareReport = useCallback(async () => {
    if (!template.id) throw new Error('No template ID');
    const { data } = await shareTemplateMutation({ variables: { templateId: template.id } });
    return data.shareReportTemplate.shareUrl;
  }, [template.id, shareTemplateMutation]);

  const duplicateTemplate = useCallback(async (templateId: string) => {
    await cloneTemplate({ variables: { templateId } });
  }, [cloneTemplate]);

  // Computed values
  const dataSources: DataSource[] = dataSourcesData?.availableDataSources || [];
  const prebuiltTemplates = templatesData?.prebuiltTemplates || [];
  const selectedSource = dataSources.find(ds => ds.id === selectedDataSource);
  const availableFields = selectedSource?.fields || [];
  const usageStats = usageStatsData?.templateUsageStats;

  const filteredFields = useMemo(() => {
    if (!searchTerm) return availableFields;
    return availableFields.filter(field => 
      field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableFields, searchTerm]);

  const isLoading = loadingDataSources || loadingTemplates || creatingTemplate || updatingTemplate;
  const isSaving = creatingTemplate || updatingTemplate;

  // Validation
  const validateTemplate = useCallback((templateToValidate: ReportTemplate = template): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!templateToValidate.name.trim()) {
      errors.push({ field: 'name', message: 'Nome do relatório é obrigatório' });
    }

    if (templateToValidate.name.length > 100) {
      errors.push({ field: 'name', message: 'Nome deve ter no máximo 100 caracteres' });
    }

    if (templateToValidate.fields.length === 0) {
      errors.push({ field: 'fields', message: 'Pelo menos um campo deve ser selecionado' });
    }

    if (templateToValidate.visualization.type === 'bar' || templateToValidate.visualization.type === 'line') {
      if (!templateToValidate.visualization.xAxis) {
        errors.push({ field: 'xAxis', message: 'Eixo X é obrigatório para gráficos de barras e linha' });
      }
      if (!templateToValidate.visualization.yAxis) {
        errors.push({ field: 'yAxis', message: 'Eixo Y é obrigatório para gráficos de barras e linha' });
      }
    }

    if (templateToValidate.visualization.type === 'pie' && !templateToValidate.visualization.groupBy) {
      errors.push({ field: 'groupBy', message: 'Campo de agrupamento é obrigatório para gráfico de pizza' });
    }

    // Validar filtros
    templateToValidate.filters.forEach((filter, index) => {
      if (!filter.fieldId) {
        errors.push({ field: `filter-${index}-field`, message: `Campo é obrigatório no filtro ${index + 1}` });
      }
      if (!filter.value && filter.operator !== 'in') {
        errors.push({ field: `filter-${index}-value`, message: `Valor é obrigatório no filtro ${index + 1}` });
      }
    });

    return errors;
  }, [template]);

  const isValid = useMemo(() => {
    const errors = validateTemplate();
    setValidationErrors(errors);
    return errors.length === 0;
  }, [validateTemplate]);

  const updateTemplateField = useCallback((updates: Partial<ReportTemplate>) => {
    setTemplate(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const resetTemplate = useCallback(() => {
    setTemplate(DEFAULT_TEMPLATE);
    setSelectedDataSource('');
    setSearchTerm('');
    setValidationErrors([]);
    setPreviewData([]);
    setIsDirty(false);
    setLastSaved(null);
  }, []);

  // Field operations
  const addField = useCallback((field: BuilderField) => {
    if (!template.fields.find(f => f.id === field.id)) {
      const templateField: TemplateField = {
        id: field.id,
        name: field.name,
        displayName: field.label || field.name,
        type: field.type,
        source: field.source,
        label: field.label,
        description: field.description,
        aggregation: field.aggregation || 'none',
        visible: true,
        sortable: true,
        filterable: true,
        width: '150px'
      };
      setTemplate(prev => ({
        ...prev,
        fields: [...prev.fields, templateField]
      }));
      setIsDirty(true);
    }
  }, [template.fields]);

  const removeField = useCallback((fieldId: string) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }));
    setIsDirty(true);
  }, []);

  const updateFieldConfig = useCallback((fieldId: string, config: Partial<BuilderField>) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(f => 
        f.id === fieldId ? { ...f, ...config } : f
      )
    }));
    setIsDirty(true);
  }, []);

  const reorderFields = useCallback((startIndex: number, endIndex: number) => {
    setTemplate(prev => {
      const newFields = Array.from(prev.fields);
      const [reorderedField] = newFields.splice(startIndex, 1);
      newFields.splice(endIndex, 0, reorderedField);
      return { ...prev, fields: newFields };
    });
    setIsDirty(true);
  }, []);

  // Filter operations
  const addFilter = useCallback(() => {
    const newFilter: ReportFilter = {
      id: Date.now().toString(),
      fieldId: '',
      operator: 'equals',
      value: '',
      label: 'Novo Filtro'
    };

    setTemplate(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
    setIsDirty(true);
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setTemplate(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== filterId)
    }));
    setIsDirty(true);
  }, []);

  const updateFilter = useCallback((filterId: string, updates: Partial<ReportFilter>) => {
    setTemplate(prev => ({
      ...prev,
      filters: prev.filters.map(f => 
        f.id === filterId ? { ...f, ...updates } : f
      )
    }));
    setIsDirty(true);
  }, []);

  // Visualization operations
  const updateVisualization = useCallback((updates: Partial<VisualizationConfig>) => {
    setTemplate(prev => ({
      ...prev,
      visualization: { ...prev.visualization, ...updates }
    }));
    setIsDirty(true);
  }, []);

  // Preview operations
  const generatePreview = useCallback(async () => {
    if (!isValid) {
      toast.error('Corrija os erros antes de gerar preview');
      return;
    }

    setIsGeneratingPreview(true);
    try {
      // Simular dados de preview baseados nos campos selecionados
      const mockData = Array.from({ length: 10 }, (_, index) => {
        const row: any = { id: index + 1 };
        
        template.fields.forEach(field => {
          switch (field.type) {
            case 'string':
              row[field.name] = `Valor ${index + 1}`;
              break;
            case 'number':
              row[field.name] = Math.floor(Math.random() * 10000) + 1000;
              break;
            case 'date':
              row[field.name] = new Date(2024, 0, index + 1).toISOString().split('T')[0];
              break;
            case 'boolean':
              row[field.name] = Math.random() > 0.5;
              break;
            default:
              row[field.name] = `Dados ${index + 1}`;
          }
        });
        
        return row;
      });

      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setPreviewData(mockData);
      toast.success('Preview gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      toast.error('Erro ao gerar preview');
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [template, isValid]);

  // Save operations
  const saveTemplate = useCallback(async () => {
    if (!isValid) {
      toast.error('Corrija os erros antes de salvar');
      return;
    }

    const input = {
      name: template.name,
      description: template.description,
      category: template.category.toUpperCase(),
      fields: template.fields.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type,
        source: field.source,
        label: field.label,
        aggregation: field.aggregation,
        format: field.format,
      })),
      filters: template.filters.map(filter => ({
        id: filter.id,
        fieldId: filter.fieldId,
        operator: filter.operator,
        value: filter.value,
        label: filter.label,
      })),
      visualization: {
        type: template.visualization.type.toUpperCase(),
        xAxis: template.visualization.xAxis,
        yAxis: template.visualization.yAxis,
        groupBy: template.visualization.groupBy,
        title: template.visualization.title,
        subtitle: template.visualization.subtitle,
        showLegend: template.visualization.showLegend,
        showGrid: template.visualization.showGrid,
        colors: template.visualization.colors,
        width: template.visualization.width,
        height: template.visualization.height,
        responsive: template.visualization.responsive,
        animation: template.visualization.animation,
        dataLabels: template.visualization.dataLabels,
      },
      isPublic: template.isPublic,
      tags: template.tags,
    };

    if (template.id) {
      await updateTemplate({ variables: { id: template.id, input } });
    } else {
      await createTemplate({ variables: { input } });
    }
  }, [template, isValid, createTemplate, updateTemplate]);

  const handleDeleteTemplate = useCallback(async () => {
    if (!template.id) return;
    
    if (window.confirm('Tem certeza que deseja excluir este template?')) {
      await deleteTemplate({ variables: { id: template.id } });
    }
  }, [template.id, deleteTemplate]);

  const handleCloneTemplate = useCallback(async (templateIdToClone: string) => {
    await cloneTemplate({ variables: { templateId: templateIdToClone } });
  }, [cloneTemplate]);

  const handleGenerateReport = useCallback(async () => {
    if (!template.id) {
      toast.error('Salve o template antes de gerar o relatório');
      return;
    }

    await generateReport({ variables: { templateId: template.id } });
  }, [template.id, generateReport]);

  // Apply prebuilt template
  const applyPrebuiltTemplate = useCallback((prebuiltTemplate: any) => {
    const newTemplate: ReportTemplate = {
      name: prebuiltTemplate.name,
      description: prebuiltTemplate.description,
      category: prebuiltTemplate.category.toLowerCase(),
      fields: [],
      filters: [],
      visualization: {
        type: prebuiltTemplate.visualization.type.toLowerCase(),
        ...prebuiltTemplate.visualization.config,
        colors: DEFAULT_COLORS,
      },
      isPublic: false,
      tags: prebuiltTemplate.tags || [],
    };
    
    setTemplate(newTemplate);
    setIsDirty(true);
    toast.success('Template aplicado com sucesso!');
  }, []);

  // Auto-save functionality
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const scheduleAutoSave = useCallback(() => {
    if (!autoSave || !isDirty || !isValid) return;

    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(() => {
      saveTemplate();
    }, autoSaveInterval);

    setAutoSaveTimeout(timeout);
  }, [autoSave, isDirty, isValid, autoSaveInterval, saveTemplate, autoSaveTimeout]);

  // Cleanup auto-save timeout
  const cancelAutoSave = useCallback(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
      setAutoSaveTimeout(null);
    }
  }, [autoSaveTimeout]);

  const fields = template.fields;
  const filters = template.filters;
  const visualization = template.visualization;
  const saveStatus = isSaving ? 'SAVING' : isDirty ? 'UNSAVED' : lastSaved ? 'SAVED' : 'ERROR';

  return {
    // State
    template,
    fields,
    filters,
    visualization,
    selectedDataSource,
    searchTerm,
    validationErrors,
    previewData,
    isGeneratingPreview,
    isDirty,
    lastSaved,
    
    // Computed
    dataSources,
    prebuiltTemplates,
    selectedSource,
    availableFields,
    filteredFields,
    usageStats,
    isLoading,
    isSaving,
    isValid,
    saveStatus,
    
    // Template operations
    updateTemplate: updateTemplateField,
    resetTemplate,
    loadTemplate,
    validateTemplate,
    updateFullField: (updatedField: ReportTemplate['fields'][number]) => {
      setTemplate(prev => ({
        ...prev,
        fields: prev.fields.map(f => f.id === updatedField.id ? updatedField : f)
      }));
    },

    // Field operations
    addField,
    removeField,
    updateField: updateFieldConfig,
    reorderFields,
    
    // Filter operations
    addFilter,
    removeFilter,
    updateFilter,
    
    // Visualization operations
    updateVisualization,
    
    // Preview operations
    generatePreview,
    
    // Save operations
    saveTemplate,
    handleDeleteTemplate,
    duplicateTemplate: useCallback(async (id: string) => {
      try {
        const { data } = await cloneTemplate({ variables: { id } });
        return data.cloneTemplate;
      } catch (error) {
        throw error;
      }
    }, [cloneTemplate]),
    handleGenerateReport,
    exportTemplate: async (format: ExportFormat) => {
      if (!template.id) throw new Error('No template ID');
      const { data } = await exportTemplateMutation({ variables: { templateId: template.id, format } });
      return data.exportReportTemplate;
    },
    shareTemplate: async (shareOptions: ShareTemplateInput) => {
      if (!template.id) throw new Error('No template ID');
      const { data } = await shareTemplateMutation({ variables: { templateId: template.id, shareOptions } });
      return data.shareReportTemplate.shareUrl;
    },

    // Template selection
    applyPrebuiltTemplate,
    
    // Auto-save
    scheduleAutoSave,
    cancelAutoSave,
    
    // Computed properties are already included above
    
    // Setters
    setSelectedDataSource,
    setSearchTerm,
  };
};

export default useReportBuilder;