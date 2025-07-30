import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Alert,
  AlertDescription,
  Progress,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui';
import {
  Save,
  Play,
  Share2,
  Download,
  Settings,
  Eye,
  EyeOff,
  Users,
  History,
  Copy,
  Trash2,
  MoreHorizontal,
  ArrowLeft,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Maximize,
  Minimize,
  Grid,
  Layout,
  Database,
  Filter,
  BarChart3,
  FileText,
  Palette,
  Code,
  Globe,
  Lock,
  Unlock,
  Star,
  Heart,
  Bookmark,
  Tag,
  Calendar,
  User,
  Building,
  Target,
  TrendingUp,
  PieChart,
  LineChart,
  Table,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// Import our custom components
import { AdvancedReportBuilder } from '../components/reports/AdvancedReportBuilder';
import { TemplateManager } from '../components/reports/TemplateManager';
import { FieldConfiguration } from '../components/reports/FieldConfiguration';
import { FilterConfiguration } from '../components/reports/FilterConfiguration';
import { VisualizationConfiguration } from '../components/reports/VisualizationConfiguration';
import { ReportVisualization } from '../components/reports/ReportVisualization';
import { CollaborationPanel } from '../components/reports/CollaborationPanel';
import { useReportBuilder } from '../hooks/useReportBuilder';
import {
  type ReportTemplate,
  type TemplateField,
  type TemplateFilter,
  type VisualizationConfig,
  type BuilderField,
  type DataSource,
} from '../graphql/reportBuilder';

interface ReportBuilderPageProps {
  mode?: 'create' | 'edit' | 'view';
}

const LAYOUT_MODES = {
  builder: {
    name: 'Construtor',
    description: 'Interface de construção drag-and-drop',
    icon: Grid,
  },
  preview: {
    name: 'Visualização',
    description: 'Prévia do relatório',
    icon: Eye,
  },
  split: {
    name: 'Dividido',
    description: 'Construtor e visualização lado a lado',
    icon: Layout,
  },
};

const SAVE_STATUS = {
  saved: { icon: CheckCircle, color: 'text-green-600', label: 'Salvo' },
  saving: { icon: Loader2, color: 'text-blue-600', label: 'Salvando...' },
  unsaved: { icon: AlertCircle, color: 'text-yellow-600', label: 'Não salvo' },
  error: { icon: AlertCircle, color: 'text-red-600', label: 'Erro ao salvar' },
};

export const ReportBuilderPage: React.FC<ReportBuilderPageProps> = ({
  mode = 'create',
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Layout and UI state
  const [layoutMode, setLayoutMode] = useState<'builder' | 'preview' | 'split'>('builder');
  const [activeTab, setActiveTab] = useState('fields');
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Report builder hook
  const {
    // State
    template,
    fields,
    filters,
    visualization,
    dataSources,
    previewData,
    isLoading,
    isSaving,
    saveStatus,
    validationErrors,
    
    // Actions
    loadTemplate,
    saveTemplate,
    updateTemplate,
    addField,
    removeField,
    updateField,
    reorderFields,
    addFilter,
    removeFilter,
    updateFilter,
    updateVisualization,
    generatePreview,
    exportTemplate,
    shareTemplate,
    duplicateTemplate,
    
    // Auto-save
    scheduleAutoSave,
    cancelAutoSave,
  } = useReportBuilder({ templateId: id });
  
  // Current user (mock data - in real app, get from auth context)
  const currentUser = {
    id: '1',
    name: 'João Silva',
    email: 'joao@empresa.com',
    avatar: '/avatars/joao.jpg',
    role: 'owner' as const,
    status: 'online' as const,
    permissions: ['read', 'write', 'delete', 'share', 'manage_permissions'],
  };
  
  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  
  // Initialize page
  useEffect(() => {
    // Load template if editing
    
    
    // Set layout from URL params
    const layoutParam = searchParams.get('layout');
    if (layoutParam && layoutParam in LAYOUT_MODES) {
      setLayoutMode(layoutParam as any);
    }
    
    // Enable auto-save for edit mode
    if (mode === 'edit') {
      scheduleAutoSave();
    }
    
    return () => {
    cancelAutoSave();
  };
}, [id, mode, searchParams, loadTemplate, scheduleAutoSave, cancelAutoSave]);
  
  // Update URL when layout changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('layout', layoutMode);
    setSearchParams(newParams, { replace: true });
  }, [layoutMode, searchParams, setSearchParams]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'p':
            e.preventDefault();
            handlePreview();
            break;
          case 'Enter':
            e.preventDefault();
            handleGenerate();
            break;
          case 'Escape':
            if (isFullscreen) {
              setIsFullscreen(false);
            }
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);
  
  // Handlers
  const handleSave = useCallback(async () => {
    try {
      await saveTemplate();
      toast.success('Relatório salvo com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar relatório');
    }
  }, [saveTemplate]);
  
  const handlePreview = useCallback(async () => {
    try {
      await generatePreview();
      if (layoutMode === 'builder') {
        setLayoutMode('preview');
      }
    } catch (error) {
      toast.error('Erro ao gerar visualização');
    }
  }, [generatePreview, layoutMode]);
  
  const handleGenerate = useCallback(async () => {
    try {
      const result = await exportTemplate({ type: 'JSON', includeData: true, includeMetadata: false });
      toast.success('Relatório gerado com sucesso');
      // Handle download or display
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    }
  }, [exportTemplate]);
  
  const handleShare = useCallback(async () => {
    try {
      const shareUrl = await shareTemplate({
        permissions: ['VIEW'],
        requiresAuth: false,
        allowedUsers: [],
        allowedDomains: []
      });
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link de compartilhamento copiado');
    } catch (error) {
      toast.error('Erro ao compartilhar relatório');
    }
  }, [shareTemplate]);
  
  const handleDuplicate = useCallback(async () => {
  if (!template.id) {
    toast.error('No template ID available');
    return;
  }
  try {
    const newTemplate = await duplicateTemplate(template.id);
    navigate(`/reports/builder/${newTemplate.id}`);
    toast.success('Relatório duplicado com sucesso');
  } catch (error) {
    toast.error('Erro ao duplicar relatório');
  }
}, [duplicateTemplate, navigate, template.id]);
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDraggedItem(event.active.data.current);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setDraggedItem(null);
      return;
    }
    
    // Handle field reordering
    if (active.id !== over.id) {
      const oldIndex = fields.findIndex((f: TemplateField) => f.id === active.id);
      const newIndex = fields.findIndex((f: TemplateField) => f.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderFields(oldIndex, newIndex);
      }
    }
    
    setActiveId(null);
    setDraggedItem(null);
  };
  
  // Get current save status
  const currentSaveStatus = SAVE_STATUS[saveStatus as keyof typeof SAVE_STATUS];
  const SaveStatusIcon = currentSaveStatus.icon;
  
  // Validation summary
  const hasErrors = validationErrors.length > 0;
  const errorCount = validationErrors.length;
  
  // Progress calculation
  const getProgress = () => {
    let completed = 0;
    const total = 4;
    
    if (fields.length > 0) completed++;
    if (filters.length > 0) completed++;
    if (visualization.type) completed++;
    if (template?.name) completed++;
    
    return (completed / total) * 100;
  };
  
  return (
    <TooltipProvider>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className={`h-screen flex flex-col bg-gray-50 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left side */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/reports')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                
                <Separator orientation="vertical" className="h-6" />
                
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/reports">Relatórios</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {mode === 'create' ? 'Novo Relatório' : template?.name || 'Carregando...'}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                
                {/* Progress */}
                <div className="flex items-center gap-2">
                  <Progress value={getProgress()} className="w-20" />
                  <span className="text-xs text-gray-500">
                    {Math.round(getProgress())}%
                  </span>
                </div>
                
                {/* Save Status */}
                <div className="flex items-center gap-2">
                  <SaveStatusIcon 
                    className={`h-4 w-4 ${currentSaveStatus.color} ${
                      saveStatus === 'saving' ? 'animate-spin' : ''
                    }`} 
                  />
                  <span className={`text-sm ${currentSaveStatus.color}`}>
                    {currentSaveStatus.label}
                  </span>
                </div>
                
                {/* Validation Errors */}
                {hasErrors && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errorCount} erro{errorCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              
              {/* Right side */}
              <div className="flex items-center gap-2">
                {/* Layout Toggle */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                  {Object.entries(LAYOUT_MODES).map(([key, layout]) => {
                    const Icon = layout.icon;
                    return (
                      <Tooltip key={key}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={layoutMode === key ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setLayoutMode(key as any)}
                            className="h-8 w-8 p-0"
                          >
                            <Icon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-center">
                            <div className="font-medium">{layout.name}</div>
                            <div className="text-xs text-gray-500">{layout.description}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
                
                <Separator orientation="vertical" className="h-6" />
                
                {/* Actions */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplateManager(true)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Gerenciar Templates</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCollaboration(!showCollaboration)}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Colaboração</TooltipContent>
                </Tooltip>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Visualizar
                </Button>
                
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || hasErrors}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
                
                {/* More Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleGenerate}>
                      <Play className="h-4 w-4 mr-2" />
                      Gerar Relatório
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsFullscreen(!isFullscreen)}>
                      {isFullscreen ? (
                        <Minimize className="h-4 w-4 mr-2" />
                      ) : (
                        <Maximize className="h-4 w-4 mr-2" />
                      )}
                      {isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          
          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Builder Panel */}
            {(layoutMode === 'builder' || layoutMode === 'split') && (
              <div className={`bg-white border-r border-gray-200 flex flex-col ${
                layoutMode === 'split' ? 'w-1/2' : 'flex-1'
              }`}>
                {/* Builder Tabs */}
                <div className="border-b border-gray-200">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full justify-start rounded-none border-0 bg-transparent p-0">
                      <TabsTrigger 
                        value="fields" 
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Campos
                        {fields.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {fields.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="filters"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        Filtros
                        {filters.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {filters.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="visualization"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Visualização
                      </TabsTrigger>
                      <TabsTrigger 
                        value="settings"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configurações
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                {/* Tab Content */}
                <div className="flex-1 overflow-hidden">
                  <Tabs value={activeTab} className="h-full">
                    <TabsContent value="fields" className="h-full m-0 p-4">
                      <FieldConfiguration
                        fields={fields}
                        availableFields={dataSources.flatMap((ds: DataSource) => ds.fields)}
                        onFieldAdd={addField}
                        onFieldRemove={removeField}
                        onFieldUpdate={(updatedField) => {
                          const { id, ...config } = updatedField;
                          updateField(id, config);
                        }}
                        onFieldsReorder={reorderFields}
                        readOnly={mode === 'view'}
                      />
                    </TabsContent>
                    
                    <TabsContent value="filters" className="h-full m-0 p-4">
                      <FilterConfiguration
                        filters={filters}
                        availableFields={fields}
                        onFilterAdd={addFilter}
                        onFilterRemove={removeFilter}
                        onFilterUpdate={updateFilter}
                        onFiltersChange={() => {}}
                        readOnly={mode === 'view'}
                      />
                    </TabsContent>
                    
                    <TabsContent value="visualization" className="h-full m-0 p-4">
                      <VisualizationConfiguration
                        config={visualization}
                        onConfigChange={updateVisualization}
                        availableFields={fields}
                        readOnly={mode === 'view'}
                      />
                    </TabsContent>
                    
                    <TabsContent value="settings" className="h-full m-0 p-4">
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Informações Gerais</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Nome do Relatório</label>
                              <input
                                type="text"
                                value={template?.name || ''}
                                onChange={(e) => updateTemplate({ name: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="Digite o nome do relatório"
                                disabled={mode === 'view'}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Descrição</label>
                              <textarea
                                value={template?.description || ''}
                                onChange={(e) => updateTemplate({ description: e.target.value })}
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                                rows={3}
                                placeholder="Descreva o propósito do relatório"
                                disabled={mode === 'view'}
                              />
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Validation Errors */}
                        {hasErrors && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="space-y-1">
                                <div className="font-medium">Erros de Validação:</div>
                                <ul className="list-disc list-inside space-y-1">
                                  {validationErrors.map((error, index) => (
                                    <li key={index} className="text-sm">{error.message}</li>
                                  ))}
                                </ul>
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
            
            {/* Preview Panel */}
            {(layoutMode === 'preview' || layoutMode === 'split') && (
              <div className={`bg-gray-50 flex flex-col ${
                layoutMode === 'split' ? 'w-1/2' : 'flex-1'
              }`}>
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Visualização</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreview}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Atualizar
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1 p-4 overflow-auto">
                  {previewData ? (
                    <ReportVisualization
                      data={previewData}
                      visualization={visualization}
                      fields={fields}
                      className="h-full"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Configure os campos e clique em "Visualizar" para ver o relatório</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Collaboration Panel */}
            {showCollaboration && (
              <CollaborationPanel
                reportId={id || 'new'}
                currentUser={currentUser}
                isVisible={showCollaboration}
                onToggle={() => setShowCollaboration(!showCollaboration)}
                readOnly={mode === 'view'}
              />
            )}
          </div>
          
          {/* Template Manager Dialog */}
          <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
            <DialogContent className="max-w-6xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Gerenciar Templates</DialogTitle>
              </DialogHeader>
              <TemplateManager
                onSelectTemplate={(template: ReportTemplate) => {
                  loadTemplate(template);
                  setShowTemplateManager(false);
                }}
                selectedTemplateId={id}
              />
            </DialogContent>
          </Dialog>
          
          {/* Drag Overlay */}
          <DragOverlay>
            {draggedItem && (
              <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">
                    {draggedItem.displayName || draggedItem.name}
                  </span>
                </div>
              </div>
            )}
          </DragOverlay>
        </div>
      </DndContext>
    </TooltipProvider>
  );
};

export default ReportBuilderPage;