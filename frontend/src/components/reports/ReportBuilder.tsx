import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import CollaborationPanel from '../collaboration/CollaborationPanel';
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
  Database
} from 'lucide-react';

// Tipos e interfaces
interface ReportField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  source: string;
  label: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  format?: string;
}

interface ReportFilter {
  id: string;
  fieldId: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
  label: string;
}

interface ReportVisualization {
  type: 'table' | 'bar' | 'line' | 'pie' | 'metric';
  config: {
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
    title?: string;
    showLegend?: boolean;
    colors?: string[];
  };
}

interface Report {
  id?: string;
  name: string;
  description: string;
  fields: ReportField[];
  filters: ReportFilter[];
  visualization: ReportVisualization;
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
  template: 'custom' | 'sales' | 'financial' | 'operational' | 'analytics';
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  isPublic?: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  role: 'owner' | 'editor' | 'viewer';
}

interface ReportBuilderProps {
  initialReport?: Report;
  onSave?: (report: Report) => void;
  onGenerate?: (report: Report) => void;
  onExport?: (report: Report, format: 'pdf' | 'excel' | 'csv') => void;
  onShare?: (report: Report) => void;
  availableFields?: ReportField[];
  currentUser?: User;
}

const TEMPLATES = {
  custom: { name: 'Personalizado', icon: Settings },
  sales: { name: 'Vendas', icon: BarChart3 },
  financial: { name: 'Financeiro', icon: PieChart },
  operational: { name: 'Operacional', icon: Database },
  analytics: { name: 'Analytics', icon: LineChart }
};

const VISUALIZATION_TYPES = {
  table: { name: 'Tabela', icon: Table },
  bar: { name: 'Gráfico de Barras', icon: BarChart3 },
  line: { name: 'Gráfico de Linha', icon: LineChart },
  pie: { name: 'Gráfico de Pizza', icon: PieChart },
  metric: { name: 'Métrica', icon: FileText }
};

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  initialReport,
  onSave,
  onGenerate,
  onExport,
  onShare,
  availableFields = [],
  currentUser
}) => {
  const [report, setReport] = useState<Report>(
    initialReport || {
      name: '',
      description: '',
      fields: [],
      filters: [],
      visualization: {
        type: 'table',
        config: {}
      },
      template: 'custom'
    }
  );

  const [activeTab, setActiveTab] = useState('design');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Campos disponíveis simulados
  const defaultFields: ReportField[] = [
    { id: '1', name: 'id', type: 'number', source: 'users', label: 'ID do Usuário' },
    { id: '2', name: 'name', type: 'string', source: 'users', label: 'Nome' },
    { id: '3', name: 'email', type: 'string', source: 'users', label: 'Email' },
    { id: '4', name: 'created_at', type: 'date', source: 'users', label: 'Data de Criação' },
    { id: '5', name: 'total_sales', type: 'number', source: 'sales', label: 'Total de Vendas', aggregation: 'sum' },
    { id: '6', name: 'order_date', type: 'date', source: 'sales', label: 'Data do Pedido' },
    { id: '7', name: 'product_name', type: 'string', source: 'products', label: 'Nome do Produto' },
    { id: '8', name: 'category', type: 'string', source: 'products', label: 'Categoria' },
    { id: '9', name: 'price', type: 'number', source: 'products', label: 'Preço', aggregation: 'avg' },
    { id: '10', name: 'quantity', type: 'number', source: 'sales', label: 'Quantidade', aggregation: 'sum' }
  ];

  const fields = availableFields.length > 0 ? availableFields : defaultFields;

  // Usuário atual simulado
  const defaultUser: User = {
    id: 'current',
    name: 'Usuário Atual',
    email: 'usuario@empresa.com',
    status: 'online',
    role: 'owner'
  };

  const user = currentUser || defaultUser;

  // Validação do relatório
  const validateReport = useCallback(() => {
    const errors: string[] = [];

    if (!report.name.trim()) {
      errors.push('Nome do relatório é obrigatório');
    }

    if (report.fields.length === 0) {
      errors.push('Pelo menos um campo deve ser selecionado');
    }

    if (report.visualization.type === 'bar' || report.visualization.type === 'line') {
      if (!report.visualization.config.xAxis || !report.visualization.config.yAxis) {
        errors.push('Gráficos de barras e linha requerem eixos X e Y');
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [report]);

  // Efeito para validação em tempo real
  useEffect(() => {
    validateReport();
  }, [validateReport]);

  // Handlers para drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === 'available-fields' && destination.droppableId === 'selected-fields') {
      const field = fields.find(f => f.id === draggableId);
      if (field && !report.fields.find(f => f.id === field.id)) {
        setReport(prev => ({
          ...prev,
          fields: [...prev.fields, field]
        }));
      }
    } else if (source.droppableId === 'selected-fields' && destination.droppableId === 'selected-fields') {
      const newFields = Array.from(report.fields);
      const [reorderedField] = newFields.splice(source.index, 1);
      newFields.splice(destination.index, 0, reorderedField);

      setReport(prev => ({
        ...prev,
        fields: newFields
      }));
    }
  };

  // Adicionar filtro
  const addFilter = () => {
    const newFilter: ReportFilter = {
      id: Date.now().toString(),
      fieldId: '',
      operator: 'equals',
      value: '',
      label: 'Novo Filtro'
    };

    setReport(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  };

  // Remover filtro
  const removeFilter = (filterId: string) => {
    setReport(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== filterId)
    }));
  };

  // Atualizar filtro
  const updateFilter = (filterId: string, updates: Partial<ReportFilter>) => {
    setReport(prev => ({
      ...prev,
      filters: prev.filters.map(f => 
        f.id === filterId ? { ...f, ...updates } : f
      )
    }));
  };

  // Remover campo selecionado
  const removeField = (fieldId: string) => {
    setReport(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }));
  };

  // Gerar relatório
  const handleGenerate = async () => {
    if (!validateReport()) return;

    setIsGenerating(true);
    try {
      // Simular dados de preview
      const mockData = [
        { id: 1, name: 'João Silva', email: 'joao@email.com', total_sales: 15000, category: 'Eletrônicos' },
        { id: 2, name: 'Maria Santos', email: 'maria@email.com', total_sales: 22000, category: 'Roupas' },
        { id: 3, name: 'Pedro Costa', email: 'pedro@email.com', total_sales: 18500, category: 'Livros' },
        { id: 4, name: 'Ana Oliveira', email: 'ana@email.com', total_sales: 31000, category: 'Eletrônicos' },
        { id: 5, name: 'Carlos Lima', email: 'carlos@email.com', total_sales: 12800, category: 'Esportes' }
      ];

      setTimeout(() => {
        setPreviewData(mockData);
        setIsGenerating(false);
        setActiveTab('preview');
        onGenerate?.(report);
      }, 2000);
    } catch (error) {
      setIsGenerating(false);
      console.error('Erro ao gerar relatório:', error);
    }
  };

  // Salvar relatório
  const handleSave = async () => {
    if (!validateReport()) return;

    setIsSaving(true);
    try {
      const savedReport = {
        ...report,
        id: report.id || Date.now().toString(),
        updatedAt: new Date(),
        createdAt: report.createdAt || new Date(),
        createdBy: user.id
      };

      setTimeout(() => {
        setReport(savedReport);
        setIsSaving(false);
        onSave?.(savedReport);
      }, 1000);
    } catch (error) {
      setIsSaving(false);
      console.error('Erro ao salvar relatório:', error);
    }
  };

  // Aplicar template
  const applyTemplate = (template: string) => {
    let templateConfig: Partial<Report> = { template: template as any };

    switch (template) {
      case 'sales':
        templateConfig = {
          ...templateConfig,
          name: 'Relatório de Vendas',
          description: 'Análise de performance de vendas',
          fields: fields.filter(f => ['total_sales', 'order_date', 'product_name', 'quantity'].includes(f.name)),
          visualization: {
            type: 'bar',
            config: {
              xAxis: 'product_name',
              yAxis: 'total_sales',
              title: 'Vendas por Produto'
            }
          }
        };
        break;
      case 'financial':
        templateConfig = {
          ...templateConfig,
          name: 'Relatório Financeiro',
          description: 'Análise financeira detalhada',
          fields: fields.filter(f => ['total_sales', 'category', 'price'].includes(f.name)),
          visualization: {
            type: 'pie',
            config: {
              groupBy: 'category',
              title: 'Distribuição por Categoria'
            }
          }
        };
        break;
      default:
        templateConfig = {
          ...templateConfig,
          name: 'Relatório Personalizado',
          description: 'Relatório customizado'
        };
    }

    setReport(prev => ({ ...prev, ...templateConfig }));
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Painel principal */}
      <div className={`flex-1 flex flex-col ${showCollaboration ? 'mr-80' : ''} transition-all duration-300`}>
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {report.name || 'Novo Relatório'}
                </h1>
                <p className="text-gray-600">
                  {report.description || 'Construtor de relatórios avançado'}
                </p>
              </div>
              {validationErrors.length > 0 && (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">{validationErrors.length} erro(s)</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCollaboration(!showCollaboration)}
              >
                <Users className="h-4 w-4 mr-2" />
                Colaborar
              </Button>
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || validationErrors.length > 0}
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || validationErrors.length > 0}
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Gerar
              </Button>
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="mb-6">
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="filters">Filtros</TabsTrigger>
              <TabsTrigger value="visualization">Visualização</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="schedule">Agendamento</TabsTrigger>
            </TabsList>

            {/* Tab Design */}
            <TabsContent value="design" className="h-full">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Configurações básicas */}
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Nome</label>
                      <Input
                        value={report.name}
                        onChange={(e) => setReport(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nome do relatório"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Descrição</label>
                      <Input
                        value={report.description}
                        onChange={(e) => setReport(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descrição do relatório"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Template</label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(TEMPLATES).map(([key, template]) => {
                          const Icon = template.icon;
                          return (
                            <Button
                              key={key}
                              variant={report.template === key ? "default" : "outline"}
                              size="sm"
                              onClick={() => applyTemplate(key)}
                              className="flex flex-col h-16 p-2"
                            >
                              <Icon className="h-4 w-4 mb-1" />
                              <span className="text-xs">{template.name}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Campos disponíveis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Campos Disponíveis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="available-fields">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2 max-h-96 overflow-y-auto"
                          >
                            {fields.map((field, index) => (
                              <Draggable key={field.id} draggableId={field.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`p-3 bg-white border rounded-lg cursor-move hover:shadow-md transition-shadow ${
                                      snapshot.isDragging ? 'shadow-lg' : ''
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-medium text-sm">{field.label}</div>
                                        <div className="text-xs text-gray-500">
                                          {field.source}.{field.name}
                                        </div>
                                      </div>
                                      <Badge variant="outline">{field.type}</Badge>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </CardContent>
                </Card>

                {/* Campos selecionados */}
                <Card>
                  <CardHeader>
                    <CardTitle>Campos Selecionados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="selected-fields">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2 min-h-32 max-h-96 overflow-y-auto"
                          >
                            {report.fields.map((field, index) => (
                              <Draggable key={field.id} draggableId={field.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-move ${
                                      snapshot.isDragging ? 'shadow-lg' : ''
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-medium text-sm">{field.label}</div>
                                        <div className="text-xs text-gray-500">
                                          {field.source}.{field.name}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline">{field.type}</Badge>
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
                            {report.fields.length === 0 && (
                              <div className="text-center text-gray-500 py-8">
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

            {/* Tab Filtros */}
            <TabsContent value="filters">
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
                  <div className="space-y-4">
                    {report.filters.map((filter) => (
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
                                {fields.map((field) => (
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
                              onClick={() => removeFilter(filter.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {report.filters.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        Nenhum filtro configurado
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Visualização */}
            <TabsContent value="visualization">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tipo de Visualização</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(VISUALIZATION_TYPES).map(([key, viz]) => {
                        const Icon = viz.icon;
                        return (
                          <Button
                            key={key}
                            variant={report.visualization.type === key ? "default" : "outline"}
                            onClick={() => setReport(prev => ({
                              ...prev,
                              visualization: { ...prev.visualization, type: key as any }
                            }))}
                            className="flex flex-col h-20 p-4"
                          >
                            <Icon className="h-6 w-6 mb-2" />
                            <span className="text-sm">{viz.name}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Configurações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Título</label>
                      <Input
                        value={report.visualization.config.title || ''}
                        onChange={(e) => setReport(prev => ({
                          ...prev,
                          visualization: {
                            ...prev.visualization,
                            config: { ...prev.visualization.config, title: e.target.value }
                          }
                        }))}
                        placeholder="Título da visualização"
                      />
                    </div>

                    {(report.visualization.type === 'bar' || report.visualization.type === 'line') && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">Eixo X</label>
                          <Select
                            value={report.visualization.config.xAxis || ''}
                            onValueChange={(value) => setReport(prev => ({
                              ...prev,
                              visualization: {
                                ...prev.visualization,
                                config: { ...prev.visualization.config, xAxis: value }
                              }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar campo" />
                            </SelectTrigger>
                            <SelectContent>
                              {report.fields.map((field) => (
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
                            value={report.visualization.config.yAxis || ''}
                            onValueChange={(value) => setReport(prev => ({
                              ...prev,
                              visualization: {
                                ...prev.visualization,
                                config: { ...prev.visualization.config, yAxis: value }
                              }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar campo" />
                            </SelectTrigger>
                            <SelectContent>
                              {report.fields.filter(f => f.type === 'number').map((field) => (
                                <SelectItem key={field.id} value={field.name}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {report.visualization.type === 'pie' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Agrupar por</label>
                        <Select
                          value={report.visualization.config.groupBy || ''}
                          onValueChange={(value) => setReport(prev => ({
                            ...prev,
                            visualization: {
                              ...prev.visualization,
                              config: { ...prev.visualization.config, groupBy: value }
                            }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar campo" />
                          </SelectTrigger>
                          <SelectContent>
                            {report.fields.map((field) => (
                              <SelectItem key={field.id} value={field.name}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab Preview */}
            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Preview do Relatório</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => onExport?.(report, 'pdf')}>
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button variant="outline" onClick={() => onExport?.(report, 'excel')}>
                        <Download className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                      <Button variant="outline" onClick={() => onExport?.(report, 'csv')}>
                        <Download className="h-4 w-4 mr-2" />
                        CSV
                      </Button>
                      <Button variant="outline" onClick={() => onShare?.(report)}>
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
                        <p className="text-gray-600">Gerando relatório...</p>
                      </div>
                    </div>
                  ) : previewData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            {report.fields.map((field) => (
                              <th key={field.id} className="border border-gray-300 px-4 py-2 text-left">
                                {field.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              {report.fields.map((field) => (
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
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>Clique em "Gerar" para visualizar o relatório</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Agendamento */}
            <TabsContent value="schedule">
              <Card>
                <CardHeader>
                  <CardTitle>Agendamento Automático</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="schedule-enabled"
                      checked={report.schedule?.enabled || false}
                      onChange={(e) => setReport(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          enabled: e.target.checked,
                          frequency: 'daily',
                          time: '09:00',
                          recipients: []
                        }
                      }))}
                      className="h-4 w-4"
                    />
                    <label htmlFor="schedule-enabled" className="text-sm font-medium">
                      Ativar agendamento automático
                    </label>
                  </div>

                  {report.schedule?.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Frequência</label>
                        <Select
                          value={report.schedule.frequency}
                          onValueChange={(value) => setReport(prev => ({
                            ...prev,
                            schedule: {
                              ...prev.schedule!,
                              frequency: value as any
                            }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Diário</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Horário</label>
                        <Input
                          type="time"
                          value={report.schedule.time}
                          onChange={(e) => setReport(prev => ({
                            ...prev,
                            schedule: {
                              ...prev.schedule!,
                              time: e.target.value
                            }
                          }))}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">Destinatários</label>
                        <Input
                          placeholder="email1@exemplo.com, email2@exemplo.com"
                          value={report.schedule.recipients?.join(', ') || ''}
                          onChange={(e) => setReport(prev => ({
                            ...prev,
                            schedule: {
                              ...prev.schedule!,
                              recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                            }
                          }))}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Painel de colaboração */}
      {showCollaboration && (
        <div className="fixed right-0 top-0 h-full w-80 bg-white border-l shadow-lg z-40">
          <CollaborationPanel
            projectId={report.id || 'new'}
            currentUser={user}
            onInviteUser={(email, role) => {
              console.log('Convidar usuário:', email, role);
            }}
            onStartVideoCall={() => {
              console.log('Iniciar chamada de vídeo');
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ReportBuilder;