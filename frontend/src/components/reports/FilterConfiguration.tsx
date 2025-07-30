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
  Textarea,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
} from '../ui';
import {
  GripVertical,
  Plus,
  Trash2,
  Settings,
  Filter,
  Calendar,
  Clock,
  Hash,
  Type,
  CheckCircle,
  X,
  Copy,
  Edit,
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Info,
  Target,
  Layers,
  Tag,
  CalendarDays,
  Users,
  Database,
  List,
  ToggleLeft,
  ToggleRight,
  Equal,
  X as NotEqual,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight as GreaterThan,
  Search as Contains,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  type BuilderField,
  type TemplateFilter,
  type FilterOperator,
  type FieldType,
} from '../../graphql/reportBuilder';
import { DatePicker } from '../ui/date-picker';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FilterConfigurationProps {
  availableFields: BuilderField[];
  filters: TemplateFilter[];
  onFilterAdd: () => void;
  onFilterRemove: (id: string) => void;
  onFilterUpdate: (id: string, updates: Partial<TemplateFilter>) => void;
  onFiltersChange: (filters: TemplateFilter[]) => void;
  readOnly?: boolean;
}

interface SortableFilterProps {
  filter: TemplateFilter;
  index: number;
  availableFields: BuilderField[];
  onUpdate: (filter: TemplateFilter) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

const OPERATOR_CONFIGS: Record<FilterOperator, {
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  supportedTypes: FieldType[];
  requiresValue: boolean;
  allowsMultipleValues?: boolean;
}> = {
  equals: {
    label: 'Igual a',
    description: 'Valor exatamente igual',
    icon: Equal,
    supportedTypes: ['string', 'number', 'date', 'boolean'],
    requiresValue: true,
  },
  not_equals: {
    label: 'Diferente de',
    description: 'Valor diferente',
    icon: NotEqual,
    supportedTypes: ['string', 'number', 'date', 'boolean'],
    requiresValue: true,
  },
  greater_than: {
    label: 'Maior que',
    description: 'Valor maior que',
    icon: GreaterThan,
    supportedTypes: ['number', 'date'],
    requiresValue: true,
  },
  less_than: {
    label: 'Menor que',
    description: 'Valor menor que',
    icon: ChevronLeft,
    supportedTypes: ['number', 'date'],
    requiresValue: true,
  },
  greater_than_or_equal: {
    label: 'Maior ou igual',
    description: 'Valor maior ou igual',
    icon: GreaterThan,
    supportedTypes: ['number', 'date'],
    requiresValue: true,
  },
  less_than_or_equal: {
    label: 'Menor ou igual',
    description: 'Valor menor ou igual',
    icon: ChevronLeft,
    supportedTypes: ['number', 'date'],
    requiresValue: true,
  },
  contains: {
    label: 'Contém',
    description: 'Texto contém valor',
    icon: Contains,
    supportedTypes: ['string'],
    requiresValue: true,
  },
  not_contains: {
    label: 'Não contém',
    description: 'Texto não contém valor',
    icon: Contains,
    supportedTypes: ['string'],
    requiresValue: true,
  },
  starts_with: {
    label: 'Inicia com',
    description: 'Texto inicia com valor',
    icon: Type,
    supportedTypes: ['string'],
    requiresValue: true,
  },
  ends_with: {
    label: 'Termina com',
    description: 'Texto termina com valor',
    icon: Type,
    supportedTypes: ['string'],
    requiresValue: true,
  },
  in: {
    label: 'Está em',
    description: 'Valor está na lista',
    icon: List,
    supportedTypes: ['string', 'number'],
    requiresValue: true,
    allowsMultipleValues: true,
  },
  not_in: {
    label: 'Não está em',
    description: 'Valor não está na lista',
    icon: List,
    supportedTypes: ['string', 'number'],
    requiresValue: true,
    allowsMultipleValues: true,
  },
  is_null: {
    label: 'Está vazio',
    description: 'Campo está vazio',
    icon: X,
    supportedTypes: ['string', 'number', 'date', 'boolean'],
    requiresValue: false,
  },
  is_not_null: {
    label: 'Não está vazio',
    description: 'Campo não está vazio',
    icon: CheckCircle,
    supportedTypes: ['string', 'number', 'date', 'boolean'],
    requiresValue: false,
  },
  between: {
    label: 'Entre',
    description: 'Valor entre dois valores',
    icon: MoreHorizontal,
    supportedTypes: ['number', 'date'],
    requiresValue: true,
    allowsMultipleValues: true,
  },
};

const FIELD_TYPE_ICONS = {
  string: Type,
  number: Hash,
  date: Calendar,
  datetime: Clock,
  boolean: CheckCircle,
  currency: Hash,
  percentage: Hash,
};

const SortableFilter: React.FC<SortableFilterProps> = ({
  filter,
  index,
  availableFields,
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
  } = useSortable({ id: filter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showValueDialog, setShowValueDialog] = useState(false);

  // Get field info
  const selectedField = availableFields.find(f => f.name === filter.field);
  const FieldIcon = selectedField ? FIELD_TYPE_ICONS[selectedField.type as keyof typeof FIELD_TYPE_ICONS] || Type : Type;
  
  // Get available operators for the selected field type
  const availableOperators = useMemo(() => {
    if (!selectedField) return [];
    return Object.entries(OPERATOR_CONFIGS).filter(([_, config]) => 
      config.supportedTypes.includes(selectedField.type)
    );
  }, [selectedField]);

  // Get operator config
  const operatorConfig = OPERATOR_CONFIGS[filter.operator];
  const OperatorIcon = operatorConfig?.icon || Equal;

  const handleFilterUpdate = (updates: Partial<TemplateFilter>) => {
    onUpdate({ ...filter, ...updates });
  };

  const handleFieldChange = (fieldName: string) => {
    const field = availableFields.find(f => f.name === fieldName);
    if (!field) return;

    // Reset operator and value when field changes
    const availableOps = Object.entries(OPERATOR_CONFIGS).filter(([_, config]) => 
      config.supportedTypes.includes(field.type)
    );
    
    const defaultOperator = availableOps.length > 0 ? availableOps[0][0] as FilterOperator : 'equals';
    
    handleFilterUpdate({
      field: fieldName,
      operator: defaultOperator,
      value: undefined,
    });
  };

  const handleOperatorChange = (operator: FilterOperator) => {
    const config = OPERATOR_CONFIGS[operator];
    handleFilterUpdate({
      operator,
      value: config.requiresValue ? (config.allowsMultipleValues ? [] : '') : undefined,
    });
  };

  const renderValueInput = () => {
    if (!operatorConfig?.requiresValue) return null;

    const fieldType = selectedField?.type;
    const isMultiple = operatorConfig.allowsMultipleValues;
    const isBetween = filter.operator === 'between';

    if (isMultiple && !isBetween) {
      // Multiple values (in, not_in)
      const values = Array.isArray(filter.value) ? filter.value : [];
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600">Valores</Label>
          <div className="space-y-2">
            {values.map((value, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={value}
                  onChange={(e) => {
                    const newValues = [...values];
                    newValues[idx] = e.target.value;
                    handleFilterUpdate({ value: newValues });
                  }}
                  className="h-8 text-sm flex-1"
                  disabled={readOnly}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => {
                    const newValues = values.filter((_, i) => i !== idx);
                    handleFilterUpdate({ value: newValues });
                  }}
                  disabled={readOnly}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                handleFilterUpdate({ value: [...values, ''] });
              }}
              disabled={readOnly}
            >
              <Plus className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>
      );
    }

    if (isBetween) {
      // Between values
      const values = Array.isArray(filter.value) ? filter.value : ['', ''];
      const [min, max] = values;

      if (fieldType === 'date') {
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-medium text-gray-600">De</Label>
              <DatePicker
                value={min ? parseISO(min) : undefined}
                onChange={(date: Date | undefined) => {
                  const newValues = [date ? format(date, 'yyyy-MM-dd') : '', max];
                  handleFilterUpdate({ value: newValues });
                }}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Até</Label>
              <DatePicker
                value={max ? parseISO(max) : undefined}
                onChange={(date: Date | undefined) => {
                  const newValues = [min, date ? format(date, 'yyyy-MM-dd') : ''];
                  handleFilterUpdate({ value: newValues });
                }}
                disabled={readOnly}
              />
            </div>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs font-medium text-gray-600">Mínimo</Label>
            <Input
              type={fieldType === 'number' ? 'number' : 'text'}
              value={min}
              onChange={(e) => {
                const newValues = [e.target.value, max];
                handleFilterUpdate({ value: newValues });
              }}
              className="h-8 text-sm"
              disabled={readOnly}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600">Máximo</Label>
            <Input
              type={fieldType === 'number' ? 'number' : 'text'}
              value={max}
              onChange={(e) => {
                const newValues = [min, e.target.value];
                handleFilterUpdate({ value: newValues });
              }}
              className="h-8 text-sm"
              disabled={readOnly}
            />
          </div>
        </div>
      );
    }

    // Single value
    if (fieldType === 'date') {
      return (
        <div>
          <Label className="text-xs font-medium text-gray-600">Valor</Label>
          <DatePicker
            value={filter.value ? parseISO(filter.value as string) : undefined}
            onChange={(date: Date | undefined) => {
              handleFilterUpdate({ value: date ? format(date, 'yyyy-MM-dd') : '' });
            }}
            disabled={readOnly}
          />
        </div>
      );
    }

    if (fieldType === 'boolean') {
      return (
        <div>
          <Label className="text-xs font-medium text-gray-600">Valor</Label>
          <Select
            value={filter.value as string}
            onValueChange={(value) => handleFilterUpdate({ value })}
            disabled={readOnly}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Verdadeiro</SelectItem>
              <SelectItem value="false">Falso</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div>
        <Label className="text-xs font-medium text-gray-600">Valor</Label>
        <Input
          type={fieldType === 'number' ? 'number' : 'text'}
          value={filter.value as string || ''}
          onChange={(e) => handleFilterUpdate({ value: e.target.value })}
          className="h-8 text-sm"
          disabled={readOnly}
          placeholder="Digite o valor..."
        />
      </div>
    );
  };

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

          {/* Filter Icon */}
          <div className="mt-1">
            <FieldIcon className="h-5 w-5 text-gray-600" />
          </div>

          {/* Filter Content */}
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {selectedField?.displayName || filter.field}
                </span>
                <Badge variant="outline" className="text-xs">
                  <OperatorIcon className="h-3 w-3 mr-1" />
                  {operatorConfig?.label || filter.operator}
                </Badge>
                {filter.required && (
                  <Badge variant="destructive" className="text-xs">
                    Obrigatório
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
                        onClick={() => handleFilterUpdate({ visible: !filter.visible })}
                        disabled={readOnly}
                      >
                        {filter.visible !== false ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {filter.visible !== false ? 'Ocultar filtro' : 'Mostrar filtro'}
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
                        Remover filtro
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>

            {/* Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Field Selection */}
              <div>
                <Label className="text-xs font-medium text-gray-600">Campo</Label>
                <Select
                  value={filter.field}
                  onValueChange={handleFieldChange}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((field) => {
                      const Icon = FIELD_TYPE_ICONS[field.type as keyof typeof FIELD_TYPE_ICONS] || Type;
                      return (
                        <SelectItem key={field.name} value={field.name}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{field.displayName || field.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Operator Selection */}
              <div>
                <Label className="text-xs font-medium text-gray-600">Operador</Label>
                <Select
                  value={filter.operator}
                  onValueChange={handleOperatorChange}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOperators.map(([operator, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={operator} value={operator}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{config.label}</div>
                              <div className="text-xs text-gray-500">{config.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Display Name */}
              <div>
                <Label className="text-xs font-medium text-gray-600">Nome de Exibição</Label>
                <Input
                  value={filter.displayName || ''}
                  onChange={(e) => handleFilterUpdate({ displayName: e.target.value })}
                  placeholder={`Filtro de ${selectedField?.displayName || filter.field}`}
                  className="h-8 text-sm"
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* Value Input */}
            {operatorConfig?.requiresValue && (
              <div className="pt-2 border-t border-gray-200">
                {renderValueInput()}
              </div>
            )}

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="space-y-3 pt-3 border-t border-gray-200">
                {/* Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`required-${filter.id}`}
                      checked={filter.required || false}
                      onCheckedChange={(checked: boolean) => handleFilterUpdate({ required: checked })}
                      disabled={readOnly}
                    />
                    <Label htmlFor={`required-${filter.id}`} className="text-sm">
                      Filtro obrigatório
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`multiple-${filter.id}`}
                      checked={filter.allowMultiple || false}
                      onCheckedChange={(checked: boolean) => handleFilterUpdate({ allowMultiple: checked })}
                      disabled={readOnly}
                    />
                    <Label htmlFor={`multiple-${filter.id}`} className="text-sm">
                      Permitir múltiplos valores
                    </Label>
                  </div>
                </div>

                {/* Default Value */}
                <div>
                  <Label className="text-xs font-medium text-gray-600">Valor Padrão</Label>
                  <Input
                    value={filter.value as string || ''}
                    onChange={(e) => handleFilterUpdate({ value: e.target.value })}
                    placeholder="Valor padrão do filtro..."
                    className="h-8 text-sm"
                    disabled={readOnly}
                  />
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs font-medium text-gray-600">Descrição</Label>
                  <Textarea
                    value={filter.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFilterUpdate({ description: e.target.value })}
                    placeholder="Descrição do filtro..."
                    className="text-sm resize-none"
                    rows={2}
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

export const FilterConfiguration: React.FC<FilterConfigurationProps> = ({
  availableFields,
  filters,
  onFiltersChange: onFiltersChange,
  readOnly = false,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newFilterField, setNewFilterField] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFieldType, setSelectedFieldType] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filter available fields
  const filteredFields = useMemo(() => {
    return availableFields.filter((field) => {
      const matchesSearch = field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           field.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !selectedFieldType || field.type === selectedFieldType;
      return matchesSearch && matchesType;
    });
  }, [availableFields, searchQuery, selectedFieldType]);

  // Get unique field types
  const fieldTypes = useMemo(() => {
    const types = new Set(availableFields.map(field => field.type));
    return Array.from(types).sort();
  }, [availableFields]);

  // Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = filters.findIndex(filter => filter.id === active.id);
      const newIndex = filters.findIndex(filter => filter.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newFilters = arrayMove(filters, oldIndex, newIndex);
        onFiltersChange(newFilters);
      }
    }

    setActiveId(null);
  };

  const handleAddFilter = () => {
    if (!newFilterField) {
      toast.error('Selecione um campo para o filtro');
      return;
    }

    const field = availableFields.find(f => f.name === newFilterField);
    if (!field) {
      toast.error('Campo não encontrado');
      return;
    }

    // Get default operator for field type
    const availableOps = Object.entries(OPERATOR_CONFIGS).filter(([_, config]) => 
      config.supportedTypes.includes(field.type)
    );
    const defaultOperator = availableOps.length > 0 ? availableOps[0][0] as FilterOperator : 'equals';
    const operatorConfig = OPERATOR_CONFIGS[defaultOperator];

    const newFilter: TemplateFilter = {
      id: `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fieldId: field.name,
      operator: defaultOperator,
      value: operatorConfig.requiresValue ? (operatorConfig.allowsMultipleValues ? [] : '') : undefined,
      label: `Filtro de ${field.label || field.name}`,
      required: false,
    };

    onFiltersChange([...filters, newFilter]);
    setShowAddDialog(false);
    setNewFilterField('');
    toast.success('Filtro adicionado com sucesso');
  };

  const handleUpdateFilter = (index: number, updatedFilter: TemplateFilter) => {
    const newFilters = [...filters];
    newFilters[index] = updatedFilter;
    onFiltersChange(newFilters);
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    onFiltersChange(newFilters);
    toast.success('Filtro removido');
  };

  const handleClearAllFilters = () => {
    onFiltersChange([]);
    toast.success('Todos os filtros foram removidos');
  };

  const draggedFilter = activeId ? filters.find(filter => filter.id === activeId) : null;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Configuração de Filtros
              <Badge variant="outline">{filters.length}</Badge>
            </h3>
            <p className="text-sm text-gray-600">
              Configure filtros para permitir que usuários refinem os dados do relatório
            </p>
          </div>
          <div className="flex items-center gap-2">
            {filters.length > 0 && !readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllFilters}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Todos
              </Button>
            )}
            {!readOnly && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Filtro
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Filtro</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Search and Filter */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar campos..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={selectedFieldType} onValueChange={setSelectedFieldType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os tipos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos os tipos</SelectItem>
                          {fieldTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Field Selection */}
                    <div>
                      <Label>Selecione um campo</Label>
                      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                        {filteredFields.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p>Nenhum campo encontrado</p>
                          </div>
                        ) : (
                          filteredFields.map((field) => {
                            const Icon = FIELD_TYPE_ICONS[field.type as keyof typeof FIELD_TYPE_ICONS] || Type;
                            const isSelected = newFilterField === field.name;
                            const isAlreadyUsed = filters.some(f => f.fieldId === field.name);
                            
                            return (
                              <div
                                key={field.name}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50'
                                    : isAlreadyUsed
                                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => {
                                  if (!isAlreadyUsed) {
                                    setNewFilterField(isSelected ? '' : field.name);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <Icon className="h-4 w-4 text-gray-600" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                      {field.label || field.name}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                      {field.description}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {field.type}
                                    </Badge>
                                    {isAlreadyUsed && (
                                      <Badge variant="secondary" className="text-xs">
                                        Em uso
                                      </Badge>
                                    )}
                                    {isSelected && (
                                      <CheckCircle className="h-4 w-4 text-blue-600" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddFilter} disabled={!newFilterField}>
                      Adicionar Filtro
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Filters List */}
        {filters.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center text-gray-500">
                <Filter className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">Nenhum filtro configurado</p>
                <p className="text-sm mb-4">
                  Adicione filtros para permitir que usuários refinem os dados do relatório
                </p>
                {!readOnly && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Primeiro Filtro
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filters.map(filter => filter.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {filters.map((filter, index) => (
                  <SortableFilter
                    key={filter.id}
                    filter={filter}
                    index={index}
                    availableFields={availableFields}
                    onUpdate={(updatedFilter) => handleUpdateFilter(index, updatedFilter)}
                    onRemove={() => handleRemoveFilter(index)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {draggedFilter && (
                <Card className="shadow-lg ring-2 ring-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{draggedFilter.fieldId}</span>
                        <Badge variant="outline" className="text-xs">
                          {OPERATOR_CONFIGS[draggedFilter.operator]?.label || draggedFilter.operator}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </TooltipProvider>
  );
};

export default FilterConfiguration;