import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Switch,
  Label,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,

  RadioGroup,
  RadioGroupItem,
  Textarea,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../ui';
import {
  BarChart3,
  LineChart,
  PieChart,
  Table,
  Target,
  Settings,
  Palette,
  Layout,
  Eye,
  Grid,
  Layers,
  Type,
  Hash,
  Calendar,
  TrendingUp,
  RotateCcw,
  Download,
  Share2,
  Copy,
  Info,
  AlertCircle,
  CheckCircle,
  Zap,
  Maximize,
  Minimize,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  X,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  type VisualizationConfig,
  type VisualizationType,
  type TemplateField,
} from '../../graphql/reportBuilder';


interface VisualizationConfigurationProps {
  config: VisualizationConfig;
  onConfigChange: (config: VisualizationConfig) => void;
  availableFields: TemplateField[];
  readOnly?: boolean;
}

const VISUALIZATION_TYPES: Array<{
  type: VisualizationType;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  supportedFields: string[];
  features: string[];
}> = [
  {
    type: 'table',
    name: 'Tabela',
    description: 'Exibição em formato de tabela com linhas e colunas',
    icon: Table,
    supportedFields: ['all'],
    features: ['Ordenação', 'Paginação', 'Filtros', 'Exportação'],
  },
  {
    type: 'bar',
    name: 'Gráfico de Barras',
    description: 'Gráfico de barras verticais ou horizontais',
    icon: BarChart3,
    supportedFields: ['categorical', 'numerical'],
    features: ['Agrupamento', 'Empilhamento', 'Cores personalizadas'],
  },
  {
    type: 'line',
    name: 'Gráfico de Linha',
    description: 'Gráfico de linha para tendências temporais',
    icon: LineChart,
    supportedFields: ['temporal', 'numerical'],
    features: ['Múltiplas séries', 'Área preenchida', 'Pontos de dados'],
  },
  {
    type: 'pie',
    name: 'Gráfico de Pizza',
    description: 'Gráfico circular para distribuição de categorias',
    icon: PieChart,
    supportedFields: ['categorical', 'numerical'],
    features: ['Donut', 'Legendas', 'Porcentagens'],
  },
  {
    type: 'metric',
    name: 'Métrica',
    description: 'Exibição de valor único com destaque',
    icon: Target,
    supportedFields: ['numerical'],
    features: ['Comparação', 'Tendência', 'Formatação'],
  },
];

const COLOR_PALETTES = {
  default: {
    name: 'Padrão',
    colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
  },
  business: {
    name: 'Negócios',
    colors: ['#1E40AF', '#DC2626', '#059669', '#D97706', '#7C3AED', '#DB2777'],
  },
  pastel: {
    name: 'Pastel',
    colors: ['#93C5FD', '#FCA5A5', '#86EFAC', '#FDE68A', '#C4B5FD', '#F9A8D4'],
  },
  dark: {
    name: 'Escuro',
    colors: ['#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB'],
  },
  vibrant: {
    name: 'Vibrante',
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
  },
};

const CHART_THEMES = {
  light: {
    name: 'Claro',
    background: '#FFFFFF',
    text: '#1F2937',
    grid: '#F3F4F6',
    border: '#E5E7EB',
  },
  dark: {
    name: 'Escuro',
    background: '#1F2937',
    text: '#F9FAFB',
    grid: '#374151',
    border: '#4B5563',
  },
  minimal: {
    name: 'Minimalista',
    background: '#FAFAFA',
    text: '#2D3748',
    grid: '#E2E8F0',
    border: '#CBD5E0',
  },
};

const RESPONSIVE_BREAKPOINTS = {
  mobile: { name: 'Mobile', width: 375, icon: Smartphone },
  tablet: { name: 'Tablet', width: 768, icon: Tablet },
  desktop: { name: 'Desktop', width: 1024, icon: Monitor },
};

export const VisualizationConfiguration: React.FC<VisualizationConfigurationProps> = ({
  config,
  onConfigChange,
  availableFields,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState('type');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [previewBreakpoint, setPreviewBreakpoint] = useState('desktop');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Get current visualization type info
  const currentVisualization = VISUALIZATION_TYPES.find(v => v.type === config.type);
  const CurrentIcon = currentVisualization?.icon || BarChart3;

  // Filter fields by type
  const numericalFields = availableFields.filter(f => 
    ['number', 'currency', 'percentage'].includes(f.type)
  );
  const categoricalFields = availableFields.filter(f => 
    ['string', 'boolean'].includes(f.type)
  );
  const temporalFields = availableFields.filter(f => 
    ['date', 'datetime'].includes(f.type)
  );

  const handleConfigUpdate = (updates: Partial<VisualizationConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const handleTypeChange = (type: VisualizationType) => {
    // Reset configuration when type changes
    const newConfig: VisualizationConfig = {
      type,
      title: config.title || '',
      showLegend: true,
      showGrid: true,
      responsive: true,
      colors: COLOR_PALETTES.default.colors,
      theme: 'light',
      ...getDefaultConfigForType(type),
    };
    onConfigChange(newConfig);
  };

  const getDefaultConfigForType = (type: VisualizationType): Partial<VisualizationConfig> => {
    switch (type) {
      case 'table':
        return {
          pagination: { enabled: true, pageSize: 10 },
          sorting: { enabled: true, defaultSort: null },
          striped: true,
          bordered: true,
          compact: false,
        };
      case 'bar':
        return {
          orientation: 'vertical',
          stacked: false,
          showValues: false,
          barWidth: 0.8,
        };
      case 'line':
        return {
          smooth: true,
          showPoints: true,
          filled: false,
          strokeWidth: 2,
        };
      case 'pie':
        return {
          donut: false,
          showLabels: true,
          showPercentages: true,
          innerRadius: 0,
        };
      case 'metric':
        return {
          showTrend: true,
          showComparison: false,
          fontSize: 'large',
          alignment: 'center',
        };
      default:
        return {};
    }
  };

  const handleColorChange = (color: string) => {
    const newColors = [...(config.colors || COLOR_PALETTES.default.colors)];
    newColors[selectedColorIndex] = color;
    handleConfigUpdate({ colors: newColors });
  };

  const addColor = () => {
    const newColors = [...(config.colors || COLOR_PALETTES.default.colors), '#3B82F6'];
    handleConfigUpdate({ colors: newColors });
  };

  const removeColor = (index: number) => {
    if ((config.colors?.length || 0) <= 1) {
      toast.error('Deve haver pelo menos uma cor');
      return;
    }
    const newColors = config.colors?.filter((_, i) => i !== index) || [];
    handleConfigUpdate({ colors: newColors });
  };

  const applyColorPalette = (palette: typeof COLOR_PALETTES.default) => {
    handleConfigUpdate({ colors: palette.colors });
    toast.success(`Paleta "${palette.name}" aplicada`);
  };

  const resetToDefaults = () => {
    const defaultConfig = {
      ...config,
      ...getDefaultConfigForType(config.type),
      colors: COLOR_PALETTES.default.colors,
      theme: 'light' as const,
    };
    onConfigChange(defaultConfig);
    toast.success('Configurações restauradas para o padrão');
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CurrentIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Configuração de Visualização
              </h3>
              <p className="text-sm text-gray-600">
                {currentVisualization?.description || 'Configure a visualização do relatório'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetToDefaults} disabled={readOnly}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Padrão
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Visualizar
            </Button>
          </div>
        </div>

        {/* Configuration Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="type">Tipo</TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="data">Dados</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
          </TabsList>

          {/* Type Selection */}
          <TabsContent value="type" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Tipo de Visualização
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {VISUALIZATION_TYPES.map((viz) => {
                    const Icon = viz.icon;
                    const isSelected = config.type === viz.type;
                    
                    return (
                      <Card
                        key={viz.type}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'ring-2 ring-blue-500 bg-blue-50'
                            : 'hover:shadow-md hover:ring-1 hover:ring-gray-300'
                        } ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                        onClick={() => !readOnly && handleTypeChange(viz.type)}
                      >
                        <CardContent className="p-4">
                          <div className="text-center space-y-3">
                            <div className={`mx-auto w-12 h-12 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <Icon className={`h-6 w-6 ${
                                isSelected ? 'text-blue-600' : 'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{viz.name}</h4>
                              <p className="text-xs text-gray-500 mt-1">{viz.description}</p>
                            </div>
                            <div className="flex flex-wrap gap-1 justify-center">
                              {viz.features.slice(0, 2).map((feature) => (
                                <Badge key={feature} variant="outline" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                              {viz.features.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{viz.features.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance" className="space-y-4">
            {/* Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Cores e Tema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Theme Selection */}
                <div>
                  <Label className="text-sm font-medium">Tema</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {Object.entries(CHART_THEMES).map(([key, theme]) => (
                      <Button
                        key={key}
                        variant={config.theme === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleConfigUpdate({ theme: key as any })}
                        disabled={readOnly}
                        className="justify-start"
                      >
                        <div
                          className="w-4 h-4 rounded mr-2 border"
                          style={{ backgroundColor: theme.background, borderColor: theme.border }}
                        />
                        {theme.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Color Palettes */}
                <div>
                  <Label className="text-sm font-medium">Paletas Predefinidas</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                      <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        onClick={() => applyColorPalette(palette)}
                        disabled={readOnly}
                        className="justify-start h-auto p-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {palette.colors.slice(0, 4).map((color, idx) => (
                              <div
                                key={idx}
                                className="w-3 h-3 rounded-full border border-gray-300"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <span className="text-xs">{palette.name}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Colors */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Cores Personalizadas</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addColor}
                      disabled={readOnly || (config.colors?.length || 0) >= 10}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(config.colors || COLOR_PALETTES.default.colors).map((color, index) => (
                      <div key={index} className="relative group">
                        <Popover open={showColorPicker && selectedColorIndex === index}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-10 h-10 p-0 border-2"
                              style={{ backgroundColor: color }}
                              onClick={() => {
                                if (!readOnly) {
                                  setSelectedColorIndex(index);
                                  setShowColorPicker(!showColorPicker);
                                }
                              }}
                              disabled={readOnly}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3">
                            <div className="w-48 h-32 bg-gray-100 rounded flex items-center justify-center text-sm text-gray-500">
                              Color picker não disponível
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <Input
                                value={color}
                                onChange={(e) => handleColorChange(e.target.value)}
                                className="h-8 text-sm font-mono"
                                placeholder="#000000"
                              />
                              <Button
                                size="sm"
                                onClick={() => setShowColorPicker(false)}
                              >
                                OK
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                        {!readOnly && (config.colors?.length || 0) > 1 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeColor(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visual Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Opções Visuais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div>
                    <Label className="text-sm font-medium">Título</Label>
                    <Input
                      value={config.title || ''}
                      onChange={(e) => handleConfigUpdate({ title: e.target.value })}
                      placeholder="Título da visualização"
                      disabled={readOnly}
                    />
                  </div>

                  {/* Subtitle */}
                  <div>
                    <Label className="text-sm font-medium">Subtítulo</Label>
                    <Input
                      value={config.subtitle || ''}
                      onChange={(e) => handleConfigUpdate({ subtitle: e.target.value })}
                      placeholder="Subtítulo (opcional)"
                      disabled={readOnly}
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showLegend"
                      checked={config.showLegend !== false}
                      onCheckedChange={(checked: boolean) => handleConfigUpdate({ showLegend: checked })}
                      disabled={readOnly}
                    />
                    <Label htmlFor="showLegend" className="text-sm">Mostrar legenda</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showGrid"
                      checked={config.showGrid !== false}
                      onCheckedChange={(checked: boolean) => handleConfigUpdate({ showGrid: checked })}
                      disabled={readOnly}
                    />
                    <Label htmlFor="showGrid" className="text-sm">Mostrar grade</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="responsive"
                      checked={config.responsive !== false}
                      onCheckedChange={(checked: boolean) => handleConfigUpdate({ responsive: checked })}
                      disabled={readOnly}
                    />
                    <Label htmlFor="responsive" className="text-sm">Responsivo</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Configuration */}
          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Configuração de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Field Mappings based on visualization type */}
                {config.type === 'bar' || config.type === 'line' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Eixo X (Categoria)</Label>
                      <Select
                        value={config.xAxis || ''}
                        onValueChange={(value) => handleConfigUpdate({ xAxis: value })}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...categoricalFields, ...temporalFields].map((field) => (
                            <SelectItem key={field.id} value={field.name}>
                              {field.label || field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Eixo Y (Valor)</Label>
                      <Select
                        value={config.yAxis || ''}
                        onValueChange={(value) => handleConfigUpdate({ yAxis: value })}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {numericalFields.map((field) => (
                            <SelectItem key={field.id} value={field.name}>
                              {field.label || field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : config.type === 'pie' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Campo de Categoria</Label>
                      <Select
                        value={config.categoryField || ''}
                        onValueChange={(value) => handleConfigUpdate({ categoryField: value })}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoricalFields.map((field) => (
                            <SelectItem key={field.id} value={field.name}>
                              {field.label || field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Campo de Valor</Label>
                      <Select
                        value={config.valueField || ''}
                        onValueChange={(value) => handleConfigUpdate({ valueField: value })}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {numericalFields.map((field) => (
                            <SelectItem key={field.id} value={field.name}>
                              {field.label || field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : config.type === 'metric' ? (
                  <div>
                    <Label className="text-sm font-medium">Campo de Métrica</Label>
                    <Select
                      value={config.metricField || ''}
                      onValueChange={(value) => handleConfigUpdate({ metricField: value })}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um campo" />
                      </SelectTrigger>
                      <SelectContent>
                        {numericalFields.map((field) => (
                          <SelectItem key={field.id} value={field.name}>
                            {field.label || field.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {/* Data Limits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Limite de Registros</Label>
                    <Input
                      type="number"
                      value={config.dataLimit || ''}
                      onChange={(e) => handleConfigUpdate({ dataLimit: parseInt(e.target.value) || undefined })}
                      placeholder="Sem limite"
                      min="1"
                      max="10000"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Ordenação Padrão</Label>
                    <Select
                      value={config.defaultSort || ''}
                      onValueChange={(value) => handleConfigUpdate({ defaultSort: value || undefined })}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sem ordenação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sem ordenação</SelectItem>
                        {availableFields.map((field) => (
                          <React.Fragment key={field.id}>
                            <SelectItem value={`${field.name}_asc`}>
                              {field.label || field.name} (Crescente)
                            </SelectItem>
                            <SelectItem value={`${field.name}_desc`}>
                              {field.label || field.name} (Decrescente)
                            </SelectItem>
                          </React.Fragment>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Layout */}
          <TabsContent value="layout" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Layout e Dimensões
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Responsive Preview */}
                <div>
                  <Label className="text-sm font-medium">Visualização Responsiva</Label>
                  <div className="flex gap-2 mt-2">
                    {Object.entries(RESPONSIVE_BREAKPOINTS).map(([key, breakpoint]) => {
                      const Icon = breakpoint.icon;
                      return (
                        <Button
                          key={key}
                          variant={previewBreakpoint === key ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPreviewBreakpoint(key)}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {breakpoint.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Altura (px)</Label>
                    <Input
                      type="number"
                      value={config.height || ''}
                      onChange={(e) => handleConfigUpdate({ height: parseInt(e.target.value) || undefined })}
                      placeholder="Automática"
                      min="200"
                      max="1000"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Largura (px)</Label>
                    <Input
                      type="number"
                      value={config.width || ''}
                      onChange={(e) => handleConfigUpdate({ width: parseInt(e.target.value) || undefined })}
                      placeholder="Automática"
                      min="300"
                      max="2000"
                      disabled={readOnly}
                    />
                  </div>
                </div>

                {/* Margins */}
                <div>
                  <Label className="text-sm font-medium">Margens</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {['top', 'right', 'bottom', 'left'].map((side) => (
                      <div key={side}>
                        <Label className="text-xs text-gray-500 capitalize">{side}</Label>
                        <Input
                          type="number"
                          value={config.margin?.[side as keyof typeof config.margin] || ''}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            handleConfigUpdate({
                              margin: { ...config.margin, [side]: value }
                            });
                          }}
                          placeholder="0"
                          min="0"
                          max="100"
                          className="h-8 text-xs"
                          disabled={readOnly}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Configurações Avançadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type-specific advanced options */}
                {config.type === 'table' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="striped"
                          checked={config.striped !== false}
                          onCheckedChange={(checked: boolean) => handleConfigUpdate({ striped: checked })}
                          disabled={readOnly}
                        />
                        <Label htmlFor="striped" className="text-sm">Linhas alternadas</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="bordered"
                          checked={config.bordered !== false}
                          onCheckedChange={(checked: boolean) => handleConfigUpdate({ bordered: checked })}
                          disabled={readOnly}
                        />
                        <Label htmlFor="bordered" className="text-sm">Bordas</Label>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tamanho da Página</Label>
                      <Select
                        value={config.pagination?.pageSize?.toString() || '10'}
                        onValueChange={(value: string) => {
                          handleConfigUpdate({
                            pagination: { enabled: config.pagination?.enabled ?? true, pageSize: parseInt(value) }
                          });
                        }}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 10, 25, 50, 100].map((size) => (
                            <SelectItem key={size} value={size.toString()}>
                              {size} registros
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {config.type === 'bar' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Orientação</Label>
                      <RadioGroup
                        value={config.orientation || 'vertical'}
                        onValueChange={(value: string) => handleConfigUpdate({ orientation: value as 'vertical' | 'horizontal' })}
                        disabled={readOnly}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="vertical" id="vertical" />
                          <Label htmlFor="vertical" className="text-sm">Vertical</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="horizontal" id="horizontal" />
                          <Label htmlFor="horizontal" className="text-sm">Horizontal</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="stacked"
                        checked={config.stacked || false}
                        onCheckedChange={(checked: boolean) => handleConfigUpdate({ stacked: checked })}
                        disabled={readOnly}
                      />
                      <Label htmlFor="stacked" className="text-sm">Empilhado</Label>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Largura das Barras</Label>
                      <input
                        type="range"
                        value={config.barWidth || 0.8}
                        onChange={(e) => handleConfigUpdate({ barWidth: parseFloat(e.target.value) })}
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        className="w-full"
                        disabled={readOnly}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.round((config.barWidth || 0.8) * 100)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Export Options */}
                <div>
                  <Label className="text-sm font-medium">Opções de Exportação</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {['PNG', 'SVG', 'PDF', 'CSV'].map((format) => (
                      <div key={format} className="flex items-center space-x-2">
                        <Switch
                          id={`export-${format}`}
                          checked={config.exportFormats?.includes(format.toLowerCase()) || false}
                          onCheckedChange={(checked: boolean) => {
                            const formats = config.exportFormats || [];
                            const newFormats = checked
                              ? [...formats, format.toLowerCase()]
                              : formats.filter(f => f !== format.toLowerCase());
                            handleConfigUpdate({ exportFormats: newFormats });
                          }}
                          disabled={readOnly}
                        />
                        <Label htmlFor={`export-${format}`} className="text-sm">{format}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom CSS */}
                <div>
                  <Label className="text-sm font-medium">CSS Personalizado</Label>
                  <Textarea
                    value={config.customCSS || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleConfigUpdate({ customCSS: e.target.value })}
                    placeholder="/* CSS personalizado para a visualização */"
                    className="font-mono text-sm"
                    rows={4}
                    disabled={readOnly}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};

export default VisualizationConfiguration;