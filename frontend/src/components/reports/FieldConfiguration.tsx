import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui';
import {
  GripVertical,
  Plus,
  Trash2,
  Settings,
  Eye,
  EyeOff,
  Calculator,
  Filter,
  SortAsc,
  SortDesc,
  Hash,
  Type,
  Calendar,
  Clock,
  DollarSign,
  Percent,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  Target,
  Info,
  AlertCircle,
  CheckCircle,
  X,
  Copy,
  Edit,
  Search,
  ChevronDown,
  ChevronRight,
  Database,
  Layers,
  Tag,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  type BuilderField,
  type DataSource,
  type TemplateField,
  type FieldType,
} from '../../graphql/reportBuilder';

interface FieldConfigurationProps {
  availableFields: BuilderField[];
  fields?: TemplateField[];
  selectedFields?: TemplateField[];
  onFieldAdd?: (field: BuilderField) => void;
  onFieldRemove?: (id: string) => void;
  onFieldUpdate?: (field: TemplateField) => void;
  onFieldsChange?: (fields: TemplateField[]) => void;
  onFieldsReorder?: (startIndex: number, endIndex: number) => void;
  dataSources?: DataSource[];
  onDataSourceChange?: (dataSource: string) => void;
  selectedDataSource?: string;
  readOnly?: boolean;
}

interface SortableFieldProps {
  field: TemplateField;
  index: number;
  onUpdate: (field: TemplateField) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

interface AvailableFieldProps {
  field: BuilderField;
  onAdd: (field: BuilderField) => void;
  isAdded: boolean;
}

const FIELD_TYPE_ICONS = {
  string: Type,
  number: Hash,
  date: Calendar,
  datetime: Clock,
  boolean: CheckCircle,
  currency: DollarSign,
  percentage: Percent,
};

const AGGREGATION_OPTIONS = [
  { value: 'none', label: 'Nenhuma', description: 'Valor original' },
  { value: 'sum', label: 'Soma', description: 'Soma dos valores' },
  { value: 'avg', label: 'Média', description: 'Média dos valores' },
  { value: 'count', label: 'Contagem', description: 'Número de registros' },
  { value: 'min', label: 'Mínimo', description: 'Menor valor' },
  { value: 'max', label: 'Máximo', description: 'Maior valor' },
  { value: 'distinct', label: 'Únicos', description: 'Valores únicos' },
  { value: 'first', label: 'Primeiro', description: 'Primeiro valor' },
  { value: 'last', label: 'Último', description: 'Último valor' },
];

const FORMAT_OPTIONS = {
  number: [
    { value: 'default', label: 'Padrão' },
    { value: 'currency', label: 'Moeda' },
    { value: 'percentage', label: 'Porcentagem' },
    { value: 'decimal', label: 'Decimal' },
    { value: 'integer', label: 'Inteiro' },
  ],
  date: [
    { value: 'default', label: 'Padrão' },
    { value: 'short', label: 'Curta' },
    { value: 'medium', label: 'Média' },
    { value: 'long', label: 'Longa' },
    { value: 'custom', label: 'Personalizada' },
  ],
  string: [
    { value: 'default', label: 'Padrão' },
    { value: 'uppercase', label: 'MAIÚSCULA' },
    { value: 'lowercase', label: 'minúscula' },
    { value: 'capitalize', label: 'Capitalizada' },
    { value: 'truncate', label: 'Truncar' },
  ],
};

const SortableField: React.FC<SortableFieldProps> = ({
  field,
  index,
  onUpdate,
  onRemove,
  readOnly = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFormatDialog, setShowFormatDialog] = useState(false);

  const FieldIcon = FIELD_TYPE_ICONS[field.type as keyof typeof FIELD_TYPE_ICONS] || Type;

  const handleFieldUpdate = (updates: Partial<TemplateField>) => {
    onUpdate({ ...field, ...updates });
  };

  const availableAggregations = useMemo(() => {
    if (field.type === 'string') {
      return AGGREGATION_OPTIONS.filter(opt => 
        ['none', 'count', 'distinct', 'first', 'last'].includes(opt.value)
      );
    }
    if (field.type === 'number') {
      return AGGREGATION_OPTIONS;
    }
    if (field.type === 'date') {
      return AGGREGATION_OPTIONS.filter(opt => 
        ['none', 'count', 'min', 'max', 'first', 'last'].includes(opt.value)
      );
    }
    return AGGREGATION_OPTIONS.filter(opt => 
      ['none', 'count', 'first', 'last'].includes(opt.value)
    );
  }, [field.type]);

  const formatOptions = FORMAT_OPTIONS[field.type as keyof typeof FORMAT_OPTIONS] || [];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`transition-all ${
        isDragging ? 'shadow-lg ring-2 ring-blue-500' : 'hover:shadow-md'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          {!readOnly && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing mt-1 p-1 rounded hover:bg-gray-100"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
          )}

          {/* Field Icon */}
          <div className="mt-1">
            <FieldIcon className="h-5 w-5 text-gray-600" />
          </div>

          {/* Field Content */}
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{field.name}</span>
                <Badge variant="outline" className="text-xs">
                  {field.type}
                </Badge>
                {field.aggregation && field.aggregation !== 'none' && (
                  <Badge variant="secondary" className="text-xs">
                    {AGGREGATION_OPTIONS.find(opt => opt.value === field.aggregation)?.label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Visibility Toggle */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleFieldUpdate({ visible: !field.visible })}
                        disabled={readOnly}
                      >
                        {field.visible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {field.visible ? 'Ocultar campo' : 'Mostrar campo'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Advanced Settings */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                      >
                        {showAdvanced ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Configurações avançadas
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Remove Button */}
                {!readOnly && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={onRemove}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Remover campo
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>

            {/* Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Display Name */}
              <div>
                <Label className="text-xs font-medium text-gray-600">Nome de Exibição</Label>
                <Input
                  value={field.displayName || field.name}
                  onChange={(e) => handleFieldUpdate({ displayName: e.target.value })}
                  placeholder={field.name}
                  className="h-8 text-sm"
                  disabled={readOnly}
                />
              </div>

              {/* Aggregation */}
              <div>
                <Label className="text-xs font-medium text-gray-600">Agregação</Label>
                <Select
                  value={field.aggregation || 'none'}
                  onValueChange={(value) => handleFieldUpdate({ aggregation: value })}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAggregations.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="space-y-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Format */}
                  {formatOptions.length > 0 && (
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Formato</Label>
                      <div className="flex gap-2">
                        <Select
                          value={'default'}
                          onValueChange={(value) => {
                            handleFieldUpdate({ format: `type:${value}` });
                          }}
                          disabled={readOnly}
                        >
                          <SelectTrigger className="h-8 text-sm flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {formatOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Dialog open={showFormatDialog} onOpenChange={setShowFormatDialog}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 px-2">
                              <Settings className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Configurações de Formato</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {field.type === 'number' && (
                                <>
                                  <div>
                                    <Label>Casas Decimais</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="10"
                                      value={2}
                                      onChange={(e) => {
                                        const decimals = parseInt(e.target.value) || 0;
                                        handleFieldUpdate({ format: `decimals:${decimals}` });
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Label>Separador de Milhares</Label>
                                    <Switch
                                      checked={false}
                                      onCheckedChange={(checked: boolean) => {
                                        handleFieldUpdate({ format: `thousandsSeparator:${checked}` });
                                      }}
                                    />
                                  </div>
                                </>
                              )}
                              {field.type === 'date' && (
                                <div>
                                  <Label>Formato Personalizado</Label>
                                  <Input
                                    value={''}
                                    onChange={(e) => {
                                      const pattern = e.target.value;
                                      handleFieldUpdate({ format: `pattern:${pattern}` });
                                    }}
                                    placeholder="dd/MM/yyyy"
                                  />
                                </div>
                              )}
                              {field.type === 'string' && (
                                <div>
                                  <Label>Máximo de Caracteres</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={50}
                                    onChange={(e) => {
                                      const maxLength = parseInt(e.target.value) || 50;
                                      handleFieldUpdate({ format: `maxLength:${maxLength}` });
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                              <Button onClick={() => setShowFormatDialog(false)}>
                                Fechar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  )}

                  {/* Width */}
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Largura</Label>
                    <Select
                      value={field.width || 'auto'}
                      onValueChange={(value) => handleFieldUpdate({ width: value })}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automática</SelectItem>
                        <SelectItem value="small">Pequena</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="large">Grande</SelectItem>
                        <SelectItem value="full">Completa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sorting */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`sortable-${field.id}`}
                      checked={field.sortable !== false}
                      onCheckedChange={(checked: boolean) => handleFieldUpdate({ sortable: checked })}
                      disabled={readOnly}
                    />
                    <Label htmlFor={`sortable-${field.id}`} className="text-sm">
                      Permitir ordenação
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`filterable-${field.id}`}
                      checked={field.filterable !== false}
                      onCheckedChange={(checked: boolean) => handleFieldUpdate({ filterable: checked })}
                      disabled={readOnly}
                    />
                    <Label htmlFor={`filterable-${field.id}`} className="text-sm">
                      Permitir filtro
                    </Label>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs font-medium text-gray-600">Descrição</Label>
                  <Input
                    value={field.description || ''}
                    onChange={(e) => handleFieldUpdate({ description: e.target.value })}
                    placeholder="Descrição do campo..."
                    className="h-8 text-sm"
                    disabled={readOnly}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AvailableField: React.FC<AvailableFieldProps> = ({ field, onAdd, isAdded }) => {
  const FieldIcon = FIELD_TYPE_ICONS[field.type as keyof typeof FIELD_TYPE_ICONS] || Type;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isAdded ? 'opacity-50 cursor-not-allowed' : 'hover:ring-2 hover:ring-blue-200'
      }`}
      onClick={() => !isAdded && onAdd(field)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <FieldIcon className="h-4 w-4 text-gray-600" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{field.name}</div>
            <div className="text-xs text-gray-500 truncate">{field.description}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {field.type}
            </Badge>
            {isAdded ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Plus className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const FieldConfiguration: React.FC<FieldConfigurationProps> = ({
  availableFields,
  selectedFields,
  onFieldsChange,
  dataSources,
  onDataSourceChange,
  selectedDataSource,
  readOnly = false,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAvailableFields, setShowAvailableFields] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filter available fields
  const filteredAvailableFields = useMemo(() => {
    return availableFields.filter((field) => {
      const matchesSearch = field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           field.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || field.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [availableFields, searchQuery, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(availableFields.map(field => field.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [availableFields]);

  // Check if field is already added
  const isFieldAdded = (fieldName: string) => {
    return selectedFields?.some((field: TemplateField) => field.name === fieldName) || false;
  };

  // Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && selectedFields) {
      const oldIndex = selectedFields.findIndex((field: TemplateField) => field.id === active.id);
      const newIndex = selectedFields.findIndex((field: TemplateField) => field.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1 && onFieldsChange) {
        const newFields = arrayMove(selectedFields, oldIndex, newIndex);
        onFieldsChange(newFields);
      }
    }

    setActiveId(null);
  };

  const handleAddField = (builderField: BuilderField) => {
    if (isFieldAdded(builderField.name)) {
      toast.error('Campo já adicionado');
      return;
    }

    const newField: TemplateField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: builderField.name,
      displayName: builderField.displayName || builderField.name,
      type: builderField.type,
      source: builderField.source,
      label: builderField.label,
      description: builderField.description,
      aggregation: 'none',
      visible: true,
      sortable: true,
      filterable: true,
      width: 'auto',
    };

    if (!selectedFields || !onFieldsChange) return;
    onFieldsChange([...selectedFields, newField]);
    toast.success('Campo adicionado com sucesso');
  };

  const handleUpdateField = (index: number, updatedField: TemplateField) => {
    if (!selectedFields || !onFieldsChange) return;
    const newFields = [...selectedFields];
    newFields[index] = updatedField;
    onFieldsChange(newFields);
  };

  const handleRemoveField = (index: number) => {
    if (!selectedFields || !onFieldsChange) return;
    const newFields = selectedFields.filter((_: TemplateField, i: number) => i !== index);
    onFieldsChange(newFields);
    toast.success('Campo removido');
  };

  const handleClearAllFields = () => {
    if (!onFieldsChange) return;
    onFieldsChange([]);
    toast.success('Todos os campos foram removidos');
  };

  const draggedField = activeId && selectedFields ? selectedFields.find((field: TemplateField) => field.id === activeId) : null;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Data Source Selection */}
        {dataSources && dataSources.length > 0 && onDataSourceChange && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Fonte de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedDataSource} onValueChange={onDataSourceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fonte de dados" />
                </SelectTrigger>
                <SelectContent>
                  {dataSources?.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{source.name}</div>
                          <div className="text-xs text-gray-500">{source.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Fields */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Campos Disponíveis
                  <Badge variant="outline">{filteredAvailableFields.length}</Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAvailableFields(!showAvailableFields)}
                >
                  {showAvailableFields ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {showAvailableFields && (
              <CardContent className="space-y-4">
                {/* Search and Filters */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar campos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {categories.length > 0 && (
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as categorias" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas as categorias</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category || ''}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Fields List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredAvailableFields.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>Nenhum campo encontrado</p>
                    </div>
                  ) : (
                    filteredAvailableFields.map((field) => (
                      <AvailableField
                        key={field.name}
                        field={field}
                        onAdd={handleAddField}
                        isAdded={isFieldAdded(field.name)}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Selected Fields */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Campos Selecionados
                  <Badge variant="outline">{selectedFields?.length || 0}</Badge>
                </CardTitle>
                {selectedFields && selectedFields.length > 0 && !readOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllFields}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Todos
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedFields || selectedFields.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Nenhum campo selecionado</p>
                  <p className="text-sm">Adicione campos da lista ao lado para começar</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedFields?.map((field: TemplateField) => field.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedFields?.map((field: TemplateField, index: number) => (
                        <SortableField
                          key={field.id}
                          field={field}
                          index={index}
                          onUpdate={(updatedField) => handleUpdateField(index, updatedField)}
                          onRemove={() => handleRemoveField(index)}
                          readOnly={readOnly}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {draggedField && (
                      <Card className="shadow-lg ring-2 ring-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{draggedField.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {draggedField.type}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </DragOverlay>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default FieldConfiguration;