import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Switch,
  Alert,
  AlertDescription,
} from '../ui';
import {
  Plus,
  Trash2,
  Save,
  Play,
  Download,
  Share2,
  Settings,
  Filter,
  BarChart3,
  Table,
  PieChart,
  LineChart,
  Calendar,
  Clock,
  Users,
  Eye,
  Copy,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileText,
  Database,
  Layers,
  Grid,
  Palette,
  Zap,
  Star,
  Heart,
  TrendingUp,
  BarChart,
  Activity,
  Target,
  DollarSign,
  ShoppingCart,
  Package,
  Briefcase,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// GraphQL Queries
const GET_DATA_SOURCES = gql`
  query GetDataSources {
    availableDataSources {
      id
      name
      type
      description
      fields {
        id
        name
        type
        source
        label
        description
        aggregations
        formats
      }
    }
  }
`;

const GET_PREBUILT_TEMPLATES = gql`
  query GetPrebuiltTemplates {
    prebuiltTemplates {
      id
      name
      description
      category
      thumbnail
      tags
      usageCount
      rating
      visualization {
        type
        config
      }
    }
  }
`;

const CREATE_TEMPLATE = gql`
  mutation CreateReportTemplate($input: CreateTemplateInput!) {
    createReportTemplate(input: $input) {
      id
      name
      description
      category
      createdAt
    }
  }
`;

const GENERATE_REPORT = gql`
  mutation GenerateReportFromTemplate($templateId: ID!) {
    generateReportFromTemplate(templateId: $templateId) {
      id
      name
      createdAt
    }
  }
`;

// Types
interface BuilderField {
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

interface ReportFilter {
  id: string;
  fieldId: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
  label: string;
}

interface VisualizationConfig {
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

interface ReportTemplate {
  id?: string;
  name: string;
  description: string;
  category: 'sales' | 'financial' | 'operational' | 'analytics' | 'custom';
  fields: BuilderField[];
  filters: ReportFilter[];
  visualization: VisualizationConfig;
  isPublic?: boolean;
  tags?: string[];
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  description?: string;
  fields: BuilderField[];
}

// Constants
const TEMPLATE_CATEGORIES = {
  sales: { name: 'Vendas', icon: TrendingUp, color: 'bg-green-100 text-green-800' },
  financial: { name: 'Financeiro', icon: DollarSign, color: 'bg-blue-100 text-blue-800' },
  operational: { name: 'Operacional', icon: Briefcase, color: 'bg-purple-100 text-purple-800' },
  analytics: { name: 'Analytics', icon: Activity, color: 'bg-orange-100 text-orange-800' },
  custom: { name: 'Personalizado', icon: Settings, color: 'bg-gray-100 text-gray-800' },
};

const VISUALIZATION_TYPES = {
  table: { name: 'Tabela', icon: Table, description: 'Dados em formato tabular' },
  bar: { name: 'Gráfico de Barras', icon: BarChart3, description: 'Comparação entre categorias' },
  line: { name: 'Gráfico de Linha', icon: LineChart, description: 'Tendências ao longo do tempo' },
  pie: { name: 'Gráfico de Pizza', icon: PieChart, description: 'Distribuição proporcional' },
  metric: { name: 'Métrica', icon: Target, description: 'Valor único destacado' },
};

const DEFAULT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
];

export const AdvancedReportBuilder: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState('design');
  const [template, setTemplate] = useState<ReportTemplate>({
    name: '',
    description: '',
    category: 'custom',
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
  });
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // GraphQL
  const { data: dataSourcesData, loading: loadingDataSources } = useQuery(GET_DATA_SOURCES);
  const { data: templatesData, loading: loadingTemplates } = useQuery(GET_PREBUILT_TEMPLATES);
  const [createTemplate, { loading: creatingTemplate }] = useMutation(CREATE_TEMPLATE);
  const [generateReport, { loading: generatingReport }] = useMutation(GENERATE_REPORT);

  // Computed values
  const dataSources: DataSource[] = dataSourcesData?.availableDataSources || [];
  const prebuiltTemplates = templatesData?.prebuiltTemplates || [];
  const selectedSource = dataSources.find(ds => ds.id === selectedDataSource);
  const availableFields = selectedSource?.fields || [];
  
  const filteredFields = useMemo(() => {
    if (!searchTerm) return availableFields;
    return availableFields.filter(field => 
      field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableFields, searchTerm]);

  // Validation
  const validateTemplate = useCallback(() => {
    const errors: string[] = [];

    if (!template.name.trim()) {
      errors.push('Nome do relatório é obrigatório');
    }

    if (template.fields.length === 0) {
      errors.push('Pelo menos um campo deve ser selecionado');
    }

    if (template.visualization.type === 'bar' || template.visualization.type === 'line') {
      if (!template.visualization.xAxis || !template.visualization.yAxis) {
        errors.push('Gráficos de barras e linha requerem eixos X e Y');
      }
    }

    if (template.visualization.type === 'pie' && !template.visualization.groupBy) {
      errors.push('Gráfico de pizza requer campo de agrupamento');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [template]);

  useEffect(() => {
    validateTemplate();
  }, [validateTemplate]);

  // Handlers
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === 'available-fields' && destination.droppableId === 'selected-fields') {
      const field = availableFields.find(f => f.id === draggableId);
      if (field && !template.fields.find(f => f.id === field.id)) {
        setTemplate(prev => ({
          ...prev,
          fields: [...prev.fields, { ...field }]
        }));
      }
    } else if (source.droppableId === 'selected-fields' && destination.droppableId === 'selected-fields') {
      const newFields = Array.from(template.fields);
      const [reorderedField] = newFields.splice(source.index, 1);
      newFields.splice(destination.index, 0, reorderedField);

      setTemplate(prev => ({
        ...prev,
        fields: newFields
      }));
    }
  };

  const removeField = (fieldId: string) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }));
  };

  const updateFieldConfig = (fieldId: string, config: Partial<BuilderField>) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(f => 
        f.id === fieldId ? { ...f, ...config } : f
      )
    }));
  };

  const addFilter = () => {
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
  };

  const removeFilter = (filterId: string) => {
    setTemplate(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== filterId)
    }));
  };

  const updateFilter = (filterId: string, updates: Partial<ReportFilter>) => {
    setTemplate(prev => ({
      ...prev,
      filters: prev.filters.map(f => 
        f.id === filterId ? { ...f, ...updates } : f
      )
    }));
  };

  const handleSaveTemplate = async () => {
    if (!validateTemplate()) {
      toast.error('Corrija os erros antes de salvar');
      return;
    }

    try {
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

      const result = await createTemplate({ variables: { input } });
      toast.success('Template salvo com sucesso!');
      setTemplate(prev => ({ ...prev, id: result.data.createReportTemplate.id }));
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast.error('Erro ao salvar template');
    }
  };

  const handleGeneratePreview = async () => {
    if (!validateTemplate()) {
      toast.error('Corrija os erros antes de gerar preview');
      return;
    }

    setIsGenerating(true);
    try {
      // Simular dados de preview
      const mockData = [
        { id: 1, name: 'João Silva', email: 'joao@email.com', total_sales: 15000, category: 'Eletrônicos', created_at: '2024-01-15' },
        { id: 2, name: 'Maria Santos', email: 'maria@email.com', total_sales: 22000, category: 'Roupas', created_at: '2024-01-16' },
        { id: 3, name: 'Pedro Costa', email: 'pedro@email.com', total_sales: 18500, category: 'Livros', created_at: '2024-01-17' },
        { id: 4, name: 'Ana Oliveira', email: 'ana@email.com', total_sales: 31000, category: 'Eletrônicos', created_at: '2024-01-18' },
        { id: 5, name: 'Carlos Lima', email: 'carlos@email.com', total_sales: 12800, category: 'Esportes', created_at: '2024-01-19' },
      ];

      setTimeout(() => {
        setPreviewData(mockData);
        setIsGenerating(false);
        setActiveTab('preview');
        toast.success('Preview gerado com sucesso!');
      }, 2000);
    } catch (error) {
      setIsGenerating(false);
      console.error('Erro ao gerar preview:', error);
      toast.error('Erro ao gerar preview');
    }
  };

  const applyPrebuiltTemplate = (prebuiltTemplate: any) => {
    setTemplate({
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
    });
    setShowTemplateDialog(false);
    toast.success('Template aplicado com sucesso!');
  };

  return (
    <TooltipProvider>
      <div className="h-screen flex bg-gray-50">
        {/* Sidebar - Campos Disponíveis */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-3">Campos Disponíveis</h2>
            
            {/* Seletor de Fonte de Dados */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Fonte de Dados</label>
              <Select value={selectedDataSource} onValueChange={setSelectedDataSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar fonte" />
                </SelectTrigger>
                <SelectContent>
                  {dataSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span>{source.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Busca */}
            <Input
              placeholder="Buscar campos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-3"
            />

            {/* Templates Pré-construídos */}
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full mb-3">
                  <Zap className="h-4 w-4 mr-2" />
                  Templates Prontos
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Templates Pré-construídos</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {prebuiltTemplates.map((tmpl: any) => {
                    const category = TEMPLATE_CATEGORIES[tmpl.category.toLowerCase() as keyof typeof TEMPLATE_CATEGORIES];
                    const Icon = category?.icon || Settings;
                    
                    return (
                      <Card key={tmpl.id} className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => applyPrebuiltTemplate(tmpl)}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${category?.color || 'bg-gray-100'}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{tmpl.name}</h3>
                              <p className="text-sm text-gray-600 line-clamp-2">{tmpl.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  <span className="text-xs">{tmpl.rating}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart className="h-3 w-3 text-red-500" />
                                  <span className="text-xs">{tmpl.usageCount}</span>
                                </div>
                              </div>
                              {tmpl.tags && tmpl.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {tmpl.tags.slice(0, 2).map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista de Campos */}
          <div className="flex-1 overflow-y-auto p-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="available-fields">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {filteredFields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 bg-white border rounded-lg cursor-move transition-all ${
                              snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{field.label}</div>
                                <div className="text-xs text-gray-500 truncate">{field.name}</div>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {field.type}
                                </Badge>
                              </div>
                            </div>
                            {field.description && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {field.description}
                              </p>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {filteredFields.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        {selectedDataSource ? 'Nenhum campo encontrado' : 'Selecione uma fonte de dados'}
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        {/* Área Principal */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {template.name || 'Novo Relatório'}
                  </h1>
                  <p className="text-gray-600">
                    {template.description || 'Builder de relatórios avançado'}
                  </p>
                </div>
                {validationErrors.length > 0 && (
                  <Alert className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {validationErrors.length} erro(s) encontrado(s)
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleGeneratePreview}
                  disabled={isGenerating || validationErrors.length > 0}
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Preview
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  disabled={creatingTemplate || validationErrors.length > 0}
                >
                  {creatingTemplate ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-4 bg-white border-b">
                <TabsTrigger value="design" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="filters" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </TabsTrigger>
                <TabsTrigger value="visualization" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Visualização
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Design Tab */}
                <TabsContent value="design" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Configurações Básicas */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Configurações Básicas</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Nome do Relatório</label>
                          <Input
                            value={template.name}
                            onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: Relatório de Vendas Mensal"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Descrição</label>
                          <Input
                            value={template.description}
                            onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descreva o propósito do relatório"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Categoria</label>
                          <Select
                            value={template.category}
                            onValueChange={(value) => setTemplate(prev => ({ ...prev, category: value as any }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(TEMPLATE_CATEGORIES).map(([key, category]) => {
                                const Icon = category.icon;
                                return (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4" />
                                      {category.name}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Público</label>
                          <Switch
                            checked={template.isPublic}
                            onCheckedChange={(checked: boolean) => setTemplate(prev => ({ ...prev, isPublic: checked }))}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Campos Selecionados */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Campos Selecionados</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <DragDropContext onDragEnd={handleDragEnd}>
                          <Droppable droppableId="selected-fields">
                            {(provided) => (
                              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                {template.fields.map((field, index) => (
                                  <Draggable key={field.id} draggableId={field.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`p-3 bg-gray-50 border rounded-lg ${
                                          snapshot.isDragging ? 'shadow-lg' : ''
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <Grid className="h-4 w-4 text-gray-400" />
                                            <div>
                                              <div className="font-medium text-sm">{field.label}</div>
                                              <div className="text-xs text-gray-500">{field.name}</div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline">{field.type}</Badge>
                                            {field.aggregations && field.aggregations.length > 0 && (
                                              <Select
                                                value={field.aggregation || ''}
                                                onValueChange={(value) => updateFieldConfig(field.id, { aggregation: value })}
                                              >
                                                <SelectTrigger className="w-20 h-8">
                                                  <SelectValue placeholder="Agg" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {field.aggregations.map((agg) => (
                                                    <SelectItem key={agg} value={agg}>
                                                      {agg.toUpperCase()}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            )}
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => removeField(field.id)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                                {template.fields.length === 0 && (
                                  <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                                    Arraste campos aqui
                                  </div>
                                )}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Filters Tab */}
                <TabsContent value="filters" className="space-y-6 mt-0">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Filtros</CardTitle>
                        <Button onClick={addFilter}>
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Filtro
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {template.filters.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          Nenhum filtro configurado
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {template.filters.map((filter) => (
                            <div key={filter.id} className="p-4 border rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Campo</label>
                                  <Select
                                    value={filter.fieldId}
                                    onValueChange={(value) => updateFilter(filter.id, { fieldId: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecionar campo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {template.fields.map((field) => (
                                        <SelectItem key={field.id} value={field.id}>
                                          {field.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Operador</label>
                                  <Select
                                    value={filter.operator}
                                    onValueChange={(value) => updateFilter(filter.id, { operator: value as any })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="equals">Igual a</SelectItem>
                                      <SelectItem value="contains">Contém</SelectItem>
                                      <SelectItem value="greater_than">Maior que</SelectItem>
                                      <SelectItem value="less_than">Menor que</SelectItem>
                                      <SelectItem value="between">Entre</SelectItem>
                                      <SelectItem value="in">Em</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Valor</label>
                                  <Input
                                    value={filter.value}
                                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                    placeholder="Valor do filtro"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeFilter(filter.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Visualization Tab */}
                <TabsContent value="visualization" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Tipo de Visualização */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Tipo de Visualização</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-3">
                          {Object.entries(VISUALIZATION_TYPES).map(([key, viz]) => {
                            const Icon = viz.icon;
                            return (
                              <div
                                key={key}
                                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                  template.visualization.type === key
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'hover:border-gray-300'
                                }`}
                                onClick={() => setTemplate(prev => ({
                                  ...prev,
                                  visualization: { ...prev.visualization, type: key as any }
                                }))}
                              >
                                <div className="flex items-center gap-3">
                                  <Icon className="h-6 w-6" />
                                  <div>
                                    <div className="font-medium">{viz.name}</div>
                                    <div className="text-sm text-gray-600">{viz.description}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Configurações da Visualização */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Configurações</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Título</label>
                          <Input
                            value={template.visualization.title || ''}
                            onChange={(e) => setTemplate(prev => ({
                              ...prev,
                              visualization: {
                                ...prev.visualization,
                                title: e.target.value
                              }
                            }))}
                            placeholder="Título da visualização"
                          />
                        </div>

                        {(template.visualization.type === 'bar' || template.visualization.type === 'line') && (
                          <>
                            <div>
                              <label className="block text-sm font-medium mb-2">Eixo X</label>
                              <Select
                                value={template.visualization.xAxis || ''}
                                onValueChange={(value) => setTemplate(prev => ({
                                  ...prev,
                                  visualization: {
                                    ...prev.visualization,
                                    xAxis: value
                                  }
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar campo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {template.fields.map((field) => (
                                    <SelectItem key={field.id} value={field.name}>
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Eixo Y</label>
                              <Select
                                value={template.visualization.yAxis || ''}
                                onValueChange={(value) => setTemplate(prev => ({
                                  ...prev,
                                  visualization: {
                                    ...prev.visualization,
                                    yAxis: value
                                  }
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar campo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {template.fields.filter(f => f.type === 'number').map((field) => (
                                    <SelectItem key={field.id} value={field.name}>
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}

                        {template.visualization.type === 'pie' && (
                          <div>
                            <label className="block text-sm font-medium mb-2">Agrupar por</label>
                            <Select
                              value={template.visualization.groupBy || ''}
                              onValueChange={(value) => setTemplate(prev => ({
                                ...prev,
                                visualization: {
                                  ...prev.visualization,
                                  groupBy: value
                                }
                              }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecionar campo" />
                              </SelectTrigger>
                              <SelectContent>
                                {template.fields.map((field) => (
                                  <SelectItem key={field.id} value={field.name}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Mostrar Legenda</label>
                            <Switch
                              checked={template.visualization.showLegend}
                              onCheckedChange={(checked: boolean) => setTemplate(prev => ({
                                ...prev,
                                visualization: {
                                  ...prev.visualization,
                                  showLegend: checked
                                }
                              }))}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Mostrar Grade</label>
                            <Switch
                              checked={template.visualization.showGrid}
                              onCheckedChange={(checked: boolean) => setTemplate(prev => ({
                                ...prev,
                                visualization: {
                                  ...prev.visualization,
                                  showGrid: checked
                                }
                              }))}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Animação</label>
                            <Switch
                              checked={template.visualization.animation}
                              onCheckedChange={(checked: boolean) => setTemplate(prev => ({
                                ...prev,
                                visualization: {
                                  ...prev.visualization,
                                  animation: checked
                                }
                              }))}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Responsivo</label>
                            <Switch
                              checked={template.visualization.responsive}
                              onCheckedChange={(checked: boolean) => setTemplate(prev => ({
                                ...prev,
                                visualization: {
                                  ...prev.visualization,
                                  responsive: checked
                                }
                              }))}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Preview Tab */}
                <TabsContent value="preview" className="mt-0">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Preview do Relatório</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            PDF
                          </Button>
                          <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Excel
                          </Button>
                          <Button variant="outline">
                            <Share2 className="h-4 w-4 mr-2" />
                            Compartilhar
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isGenerating ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                            <p className="text-gray-600">Gerando preview...</p>
                          </div>
                        </div>
                      ) : previewData.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-50">
                                {template.fields.map((field) => (
                                  <th key={field.id} className="border border-gray-300 px-4 py-2 text-left">
                                    {field.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.map((row, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  {template.fields.map((field) => (
                                    <td key={field.id} className="border border-gray-300 px-4 py-2">
                                      {row[field.name] || '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-12">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p>Clique em "Preview" para gerar uma visualização do relatório</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AdvancedReportBuilder;