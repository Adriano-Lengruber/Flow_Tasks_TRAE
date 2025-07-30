import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Share2,
  Download,
  Upload,
  Star,
  Heart,
  Eye,
  Calendar,
  User,
  Tag,
  BarChart3,
  Table,
  PieChart,
  LineChart,
  Target,
  TrendingUp,
  DollarSign,
  Briefcase,
  Activity,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  GET_REPORT_TEMPLATES,
  DELETE_TEMPLATE,
  CLONE_TEMPLATE,
  FAVORITE_TEMPLATE,
  SHARE_TEMPLATE,
  EXPORT_TEMPLATE,
  type ReportTemplate,
  type TemplateSearchInput,
} from '../../graphql/reportBuilder';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TemplateManagerProps {
  onSelectTemplate?: (template: ReportTemplate) => void;
  onCreateNew?: () => void;
  selectedTemplateId?: string;
  showActions?: boolean;
  mode?: 'select' | 'manage';
}

const TEMPLATE_CATEGORIES = {
  sales: { name: 'Vendas', icon: TrendingUp, color: 'bg-green-100 text-green-800' },
  financial: { name: 'Financeiro', icon: DollarSign, color: 'bg-blue-100 text-blue-800' },
  operational: { name: 'Operacional', icon: Briefcase, color: 'bg-purple-100 text-purple-800' },
  analytics: { name: 'Analytics', icon: Activity, color: 'bg-orange-100 text-orange-800' },
  custom: { name: 'Personalizado', icon: Settings, color: 'bg-gray-100 text-gray-800' },
};

const VISUALIZATION_ICONS = {
  table: Table,
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  metric: Target,
};

const SORT_OPTIONS = [
  { value: 'name', label: 'Nome' },
  { value: 'createdAt', label: 'Data de Criação' },
  { value: 'updatedAt', label: 'Última Atualização' },
  { value: 'usageCount', label: 'Mais Usados' },
  { value: 'rating', label: 'Melhor Avaliados' },
];

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  onSelectTemplate,
  onCreateNew,
  selectedTemplateId,
  showActions = true,
  mode = 'manage'
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Build search input
  const searchInput: TemplateSearchInput = useMemo(() => {
    const input: TemplateSearchInput = {
      sortBy: sortBy as any,
      sortOrder,
    };

    if (searchQuery) input.query = searchQuery;
    if (selectedCategory) input.category = selectedCategory;
    if (selectedTags.length > 0) input.tags = selectedTags;
    if (showPublicOnly) input.isPublic = true;

    return input;
  }, [searchQuery, selectedCategory, selectedTags, showPublicOnly, sortBy, sortOrder]);

  // GraphQL
  const { data, loading, error, refetch } = useQuery(GET_REPORT_TEMPLATES, {
    variables: {
      search: searchInput,
      limit: 50,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network',
  });

  const [deleteTemplate, { loading: deleting }] = useMutation(DELETE_TEMPLATE, {
    onCompleted: () => {
      toast.success('Template excluído com sucesso!');
      setShowDeleteDialog(null);
      refetch();
    },
    onError: (error) => {
      console.error('Erro ao excluir template:', error);
      toast.error('Erro ao excluir template');
    },
  });

  const [cloneTemplate, { loading: cloning }] = useMutation(CLONE_TEMPLATE, {
    onCompleted: (data) => {
      toast.success('Template clonado com sucesso!');
      if (onSelectTemplate) {
        onSelectTemplate(data.cloneReportTemplate);
      }
      refetch();
    },
    onError: (error) => {
      console.error('Erro ao clonar template:', error);
      toast.error('Erro ao clonar template');
    },
  });

  const [favoriteTemplate] = useMutation(FAVORITE_TEMPLATE, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      console.error('Erro ao favoritar template:', error);
      toast.error('Erro ao favoritar template');
    },
  });

  const [shareTemplate] = useMutation(SHARE_TEMPLATE, {
    onCompleted: (data) => {
      navigator.clipboard.writeText(data.shareReportTemplate.shareUrl);
      toast.success('Link de compartilhamento copiado!');
      setShowShareDialog(null);
    },
    onError: (error) => {
      console.error('Erro ao compartilhar template:', error);
      toast.error('Erro ao compartilhar template');
    },
  });

  const [exportTemplate] = useMutation(EXPORT_TEMPLATE, {
    onCompleted: (data) => {
      window.open(data.exportReportTemplate.downloadUrl, '_blank');
      toast.success('Template exportado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao exportar template:', error);
      toast.error('Erro ao exportar template');
    },
  });

  // Data processing
  const templates = data?.reportTemplates?.templates || [];
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    templates.forEach((template: ReportTemplate) => {
      template.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (activeTab === 'favorites') {
      // Aqui você filtraria pelos favoritos do usuário
      // filtered = filtered.filter(template => template.isFavorited);
    } else if (activeTab === 'public') {
      filtered = filtered.filter((template: ReportTemplate) => template.isPublic);
    } else if (activeTab === 'mine') {
      // Aqui você filtraria pelos templates do usuário atual
      // filtered = filtered.filter(template => template.createdBy.id === currentUserId);
    }

    return filtered;
  }, [templates, activeTab]);

  // Handlers
  const handleDeleteTemplate = async (templateId: string) => {
    await deleteTemplate({ variables: { id: templateId } });
  };

  const handleCloneTemplate = async (templateId: string) => {
    await cloneTemplate({ variables: { templateId } });
  };

  const handleFavoriteTemplate = async (templateId: string) => {
    await favoriteTemplate({ variables: { templateId } });
  };

  const handleShareTemplate = async (templateId: string) => {
    await shareTemplate({
      variables: {
        templateId,
        shareOptions: {
          permissions: ['VIEW'],
          requiresAuth: false,
        },
      },
    });
  };

  const handleExportTemplate = async (templateId: string) => {
    await exportTemplate({
      variables: {
        templateId,
        format: { type: 'JSON', includeData: false, includeMetadata: true },
      },
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedTags([]);
    setShowPublicOnly(false);
    setShowFavoritesOnly(false);
  };

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar templates: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Templates de Relatórios</h2>
            <p className="text-gray-600">Gerencie e organize seus templates de relatórios</p>
          </div>
          {mode === 'manage' && (
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              {onCreateNew && (
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Template
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as categorias</SelectItem>
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

              {/* Sort */}
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <React.Fragment key={option.value}>
                      <SelectItem value={`${option.value}-desc`}>
                        {option.label} (Desc)
                      </SelectItem>
                      <SelectItem value={`${option.value}-asc`}>
                        {option.label} (Asc)
                      </SelectItem>
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button variant="outline" onClick={clearFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedTags(prev => 
                          prev.includes(tag)
                            ? prev.filter(t => t !== tag)
                            : [...prev, tag]
                        );
                      }}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="mine">Meus</TabsTrigger>
            <TabsTrigger value="favorites">Favoritos</TabsTrigger>
            <TabsTrigger value="public">Públicos</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* Templates Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded mb-4"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-4"></div>
                      <div className="flex gap-2">
                        <div className="h-6 w-16 bg-gray-200 rounded"></div>
                        <div className="h-6 w-16 bg-gray-200 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">Nenhum template encontrado</p>
                    <p className="text-sm mb-4">Tente ajustar os filtros ou criar um novo template</p>
                    {onCreateNew && (
                      <Button onClick={onCreateNew}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeiro Template
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template: ReportTemplate) => {
                  const category = TEMPLATE_CATEGORIES[template.category.toLowerCase() as keyof typeof TEMPLATE_CATEGORIES];
                  const CategoryIcon = category?.icon || Settings;
                  const VisualizationIcon = VISUALIZATION_ICONS[template.visualization.type] || BarChart3;
                  const isSelected = selectedTemplateId === template.id;

                  return (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''
                      }`}
                      onClick={() => onSelectTemplate?.(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${category?.color || 'bg-gray-100'}`}>
                              <CategoryIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {template.description}
                              </p>
                            </div>
                          </div>
                          {showActions && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  onSelectTemplate?.(template);
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  handleCloneTemplate(template.id);
                                }}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Clonar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  handleFavoriteTemplate(template.id);
                                }}>
                                  <Heart className="h-4 w-4 mr-2" />
                                  Favoritar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  setShowShareDialog(template.id);
                                }}>
                                  <Share2 className="h-4 w-4 mr-2" />
                                  Compartilhar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  handleExportTemplate(template.id);
                                }}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Exportar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    setShowDeleteDialog(template.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {/* Visualization Type */}
                          <div className="flex items-center gap-2">
                            <VisualizationIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {template.visualization.type === 'table' && 'Tabela'}
                              {template.visualization.type === 'bar' && 'Gráfico de Barras'}
                              {template.visualization.type === 'line' && 'Gráfico de Linha'}
                              {template.visualization.type === 'pie' && 'Gráfico de Pizza'}
                              {template.visualization.type === 'metric' && 'Métrica'}
                            </span>
                          </div>

                          {/* Fields Count */}
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {template.fields.length} campo(s)
                            </span>
                          </div>

                          {/* Created Info */}
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {formatDistanceToNow(new Date(template.updatedAt), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          </div>

                          {/* Tags */}
                          {template.tags && template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {template.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {template.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{template.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Status Badges */}
                          <div className="flex items-center gap-2">
                            {template.isPublic && (
                              <Badge variant="outline" className="text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                Público
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {category?.name || 'Personalizado'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <p className="text-gray-600">
              Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => showDeleteDialog && handleDeleteTemplate(showDeleteDialog)}
                disabled={deleting}
              >
                {deleting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Share Dialog */}
        <Dialog open={!!showShareDialog} onOpenChange={() => setShowShareDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Compartilhar Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                Gerar link de compartilhamento para este template?
              </p>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="requireAuth" />
                <label htmlFor="requireAuth" className="text-sm">
                  Exigir autenticação
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowShareDialog(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => showShareDialog && handleShareTemplate(showShareDialog)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Gerar Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default TemplateManager;