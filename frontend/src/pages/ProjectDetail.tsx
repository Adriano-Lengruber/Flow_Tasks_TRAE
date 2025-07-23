import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Typography,
  Box,
  Paper,
  Grid,
  CircularProgress,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Checkbox,
  Chip,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay as DndKitDragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CommentIcon from '@mui/icons-material/Comment';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import DragOverlay from '../components/common/DragOverlay';
import DropZone from '../components/common/DropZone';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import DragFeedback from '../components/common/DragFeedback';
import KanbanSkeleton from '../components/common/KanbanSkeleton';
import ResponsiveContainer, { useResponsiveStyles } from '../components/common/ResponsiveContainer';
import ResponsiveModal from '../components/common/ResponsiveModal';
import { MobileOptimizedTextField } from '../components/common/MobileOptimizedForm';
import { TouchOptimizedButton } from '../components/common/TouchOptimizedButton';
import SortableTaskItem from '../components/common/SortableTaskItem';
import SortableSection from '../components/common/SortableSection';
import useDragAndDrop from '../hooks/useDragAndDrop';
import useToast from '../hooks/useToast';

// TaskItem component removed - now using SortableTaskItem

const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      description
      createdAt
      owner {
        id
        name
        email
      }
      sections {
        id
        name
        order
        tasks {
          id
          title
          description
          dueDate
          priority
          completed
          assignee {
            id
            name
          }
          comments {
            id
            content
            createdAt
            author {
              id
              name
            }
          }
        }
      }
    }
  }
`;

const CREATE_SECTION = gql`
  mutation CreateSection($projectId: ID!, $name: String!) {
    createSection(createSectionInput: { projectId: $projectId, name: $name }) {
      id
      name
      order
    }
  }
`;

const CREATE_TASK = gql`
  mutation CreateTask($sectionId: ID!, $title: String!, $description: String, $dueDate: DateTime, $priority: String, $assigneeId: ID) {
    createTask(
      createTaskInput: {
        sectionId: $sectionId
        title: $title
        description: $description
        dueDate: $dueDate
        priority: $priority
        assigneeId: $assigneeId
      }
    ) {
      id
      title
      description
      dueDate
      priority
      completed
      assignee {
        id
        name
      }
    }
  }
`;

const UPDATE_TASK = gql`
  mutation UpdateTask($id: ID!, $title: String, $description: String, $dueDate: DateTime, $priority: String, $completed: Boolean, $assigneeId: ID) {
    updateTask(
      updateTaskInput: {
        id: $id
        title: $title
        description: $description
        dueDate: $dueDate
        priority: $priority
        completed: $completed
        assigneeId: $assigneeId
      }
    ) {
      id
      title
      description
      dueDate
      priority
      completed
      assignee {
        id
        name
      }
    }
  }
`;

const MOVE_TASK = gql`
  mutation MoveTaskToSection($id: ID!, $sectionId: ID!) {
    moveTaskToSection(id: $id, sectionId: $sectionId) {
      id
      section {
        id
      }
    }
  }
`;

const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    removeTask(id: $id)
  }
`;

const DELETE_SECTION = gql`
  mutation DeleteSection($id: ID!) {
    removeSection(id: $id)
  }
`;

const CREATE_COMMENT = gql`
  mutation CreateComment($content: String!, $taskId: ID!) {
    createComment(createCommentInput: { content: $content, taskId: $taskId }) {
      id
      content
      createdAt
      author {
        id
        name
      }
    }
  }
`;

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { getKanbanStyles, isMobile } = useResponsiveStyles();
  
  // Estados para diálogos
  const [openSectionDialog, setOpenSectionDialog] = useState(false);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [openTaskDetailDialog, setOpenTaskDetailDialog] = useState(false);
  const [openCommentDialog, setOpenCommentDialog] = useState(false);
  
  // Estados para formulários
  const [sectionName, setSectionName] = useState('');
  const [taskForm, setTaskForm] = useState({
    id: '',
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
    completed: false,
    assigneeId: '',
    sectionId: '',
  });
  const [commentContent, setCommentContent] = useState('');
  const [currentTaskId, setCurrentTaskId] = useState('');
  
  // Estado para menu de ações
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTaskId, setMenuTaskId] = useState('');
  
  // Estado para drag and drop
  const [activeTask, setActiveTask] = useState<any>(null);
  const [dragFeedback, setDragFeedback] = useState<{
    isVisible: boolean;
    status: 'dragging' | 'success' | 'error' | 'processing';
    message?: string;
  }>({ isVisible: false, status: 'dragging' });

  const { loading, error, data, refetch } = useQuery(GET_PROJECT, {
    variables: { id },
    fetchPolicy: 'network-only',
  });

  const [createSection] = useMutation(CREATE_SECTION, {
    onCompleted: () => {
      setSectionName('');
      setOpenSectionDialog(false);
      refetch();
    },
  });

  const [createTask] = useMutation(CREATE_TASK, {
    onCompleted: () => {
      resetTaskForm();
      setOpenTaskDialog(false);
      refetch();
    },
  });

  const [updateTask] = useMutation(UPDATE_TASK, {
    onCompleted: () => {
      resetTaskForm();
      setOpenTaskDetailDialog(false);
      refetch();
    },
  });

  const [moveTask] = useMutation(MOVE_TASK, {
    onCompleted: () => refetch(),
  });

  const [deleteTask] = useMutation(DELETE_TASK, {
    onCompleted: () => refetch(),
  });

  const [deleteSection] = useMutation(DELETE_SECTION, {
    onCompleted: () => refetch(),
  });

  const [createComment] = useMutation(CREATE_COMMENT, {
    onCompleted: () => {
      setCommentContent('');
      setOpenCommentDialog(false);
      refetch();
    },
  });

  const resetTaskForm = () => {
    setTaskForm({
      id: '',
      title: '',
      description: '',
      dueDate: '',
      priority: 'MEDIUM',
      completed: false,
      assigneeId: '',
      sectionId: '',
    });
  };

  const handleCreateSection = () => {
    if (!sectionName.trim()) return;
    
    createSection({
      variables: {
        projectId: id,
        name: sectionName,
      },
    });
  };

  const handleCreateTask = () => {
    createTask({
      variables: {
        sectionId: taskForm.sectionId,
        title: taskForm.title,
        description: taskForm.description || undefined,
        dueDate: taskForm.dueDate || undefined,
        priority: taskForm.priority,
        assigneeId: taskForm.assigneeId || undefined,
      },
    });
  };

  const handleUpdateTask = () => {
    updateTask({
      variables: {
        id: taskForm.id,
        title: taskForm.title,
        description: taskForm.description || undefined,
        dueDate: taskForm.dueDate || undefined,
        priority: taskForm.priority,
        completed: taskForm.completed,
        assigneeId: taskForm.assigneeId || undefined,
      },
    });
  };

  const handleOpenTaskDialog = (sectionId: string) => {
    resetTaskForm();
    setTaskForm(prev => ({ ...prev, sectionId }));
    setOpenTaskDialog(true);
  };

  const handleOpenTaskDetail = (task: any) => {
    // Se o ID estiver no formato 'taskId:sectionId', extrair apenas o taskId
    const taskId = task.id.includes(':') ? task.id.split(':')[0] : task.id;
    
    setTaskForm({
      id: taskId,
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      priority: task.priority,
      completed: task.completed,
      assigneeId: task.assignee?.id || '',
      sectionId: '',
    });
    setOpenTaskDetailDialog(true);
  };

  const handleOpenCommentDialog = (taskId: string) => {
    // Se o ID estiver no formato 'taskId:sectionId', extrair apenas o taskId
    const actualTaskId = taskId.includes(':') ? taskId.split(':')[0] : taskId;
    setCurrentTaskId(actualTaskId);
    setOpenCommentDialog(true);
  };

  const handleCreateComment = () => {
    if (!commentContent.trim()) return;
    
    createComment({
      variables: {
        taskId: currentTaskId,
        content: commentContent,
      },
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta seção? Todas as tarefas serão removidas.')) {
      deleteSection({ variables: { id: sectionId } });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      deleteTask({ variables: { id: taskId } });
      handleCloseMenu();
    }
  };

  const handleToggleComplete = (task: any) => {
    updateTask({
      variables: {
        id: task.id,
        completed: !task.completed,
      },
    });
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, taskId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuTaskId(taskId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuTaskId('');
  };

  // Configuração dos sensores para o DndContext com otimizações mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Otimizações para touch mobile
      activationConstraint: {
        distance: isMobile ? 8 : 5, // Maior tolerância para mobile
        delay: isMobile ? 150 : 0,  // Delay para evitar conflitos com scroll
        tolerance: isMobile ? 8 : 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    // Encontrar a tarefa que está sendo arrastada
    const taskId = String(active.id).split(':')[0];
    const task = data?.project?.sections
      ?.flatMap((section: any) => section.tasks)
      ?.find((task: any) => task.id === taskId);
    
    if (task) {
      setActiveTask(task);
      setDragFeedback({
        isVisible: true,
        status: 'dragging',
        message: `Movendo "${task.title}"...`,
      });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Pode ser usado para feedback adicional durante o drag
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Limpar o estado de drag
    setActiveTask(null);
    
    if (!over) {
      setDragFeedback({ isVisible: false, status: 'dragging' });
      return;
    }
    
    // Se os IDs são diferentes, o item foi movido
    if (active.id !== over.id) {
      // Extrair o ID da tarefa e o ID da seção
      const activeId = String(active.id);
      const overId = String(over.id);
      
      // Mostrar feedback de processamento
      setDragFeedback({
        isVisible: true,
        status: 'processing',
        message: 'Processando movimentação...',
      });
      
      // Verificar se é uma movimentação entre seções
      // O formato do ID será 'taskId:sectionId'
      const [taskId, sourceSectionId] = activeId.split(':');
      
      // O overId pode ser apenas o sectionId (quando arrastando para seção vazia)
      // ou 'taskId:sectionId' (quando arrastando sobre outra tarefa)
      let targetSectionId;
      if (overId.includes(':')) {
        // Arrastando sobre outra tarefa
        const [_, overSectionId] = overId.split(':');
        targetSectionId = overSectionId;
      } else {
        // Arrastando para seção vazia (overId é apenas o sectionId)
        targetSectionId = overId;
      }
      
      // Se a seção de destino é diferente da seção de origem
      if (sourceSectionId !== targetSectionId) {
        try {
          await moveTask({
            variables: {
              id: taskId,
              sectionId: targetSectionId,
            },
          });
          
          // Mostrar feedback de sucesso
          setDragFeedback({
            isVisible: true,
            status: 'success',
            message: 'Tarefa movida com sucesso!',
          });
          
          // Esconder feedback após 2 segundos
          setTimeout(() => {
            setDragFeedback({ isVisible: false, status: 'success' });
          }, 2000);
        } catch (error) {
          // Mostrar feedback de erro
          setDragFeedback({
            isVisible: true,
            status: 'error',
            message: 'Erro ao mover tarefa',
          });
          
          // Esconder feedback após 3 segundos
          setTimeout(() => {
            setDragFeedback({ isVisible: false, status: 'error' });
          }, 3000);
        }
      } else {
        // Não houve mudança de seção
        setDragFeedback({ isVisible: false, status: 'dragging' });
      }
      // Aqui poderia ser implementada a reordenação dentro da mesma seção
    }
  };

  if (loading) return (
    <ResponsiveContainer>
      <KanbanSkeleton sectionsCount={3} tasksPerSection={4} />
    </ResponsiveContainer>
  );
  if (error) return <Typography color="error">Erro ao carregar projeto: {error.message}</Typography>;
  if (!data?.project) return <Typography>Projeto não encontrado</Typography>;

  const { project } = data;
  const sortedSections = [...project.sections].sort((a, b) => a.order - b.order);
  const isOwner = project?.owner?.id === user?.id;
  // Temporariamente habilitando edição para todos os usuários para testes
  const canEdit = true; // isOwner;

  const projectMembers = [project.owner];

  return (
    <>
      <Box sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4">{project.name}</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              {project.description || 'Sem descrição'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Criado em {format(new Date(project.createdAt), 'PPP', { locale: ptBR })}
            </Typography>
          </Box>
          <Box>
            <TouchOptimizedButton
              variant="outlined"
              startIcon={<PersonAddIcon />}
              sx={{ mr: 1 }}
              disabled={!isOwner}
            >
              Gerenciar Membros
            </TouchOptimizedButton>
            <TouchOptimizedButton
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenSectionDialog(true)}
              disabled={!canEdit}
            >
              Nova Seção
            </TouchOptimizedButton>
          </Box>
        </Box>

        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <Grid container spacing={2}>
            {sortedSections.map((section) => (
              <Grid item xs={12} md={4} key={section.id}>
                <SortableSection
                  section={section}
                  canEdit={canEdit}
                  handleOpenTaskDialog={handleOpenTaskDialog}
                  handleDeleteSection={handleDeleteSection}
                  handleToggleComplete={handleToggleComplete}
                  handleOpenMenu={handleOpenMenu}
                  handleOpenCommentDialog={handleOpenCommentDialog}
                  handleOpenTaskDetail={handleOpenTaskDetail}
                />
              </Grid>
            ))}
          </Grid>
          
          <DndKitDragOverlay>
            {activeTask ? (
              <DragOverlay task={activeTask} />
            ) : null}
          </DndKitDragOverlay>
        </DndContext>
      </Box>

      {/* Diálogo para criar seção */}
      <ResponsiveModal
        open={openSectionDialog}
        onClose={() => setOpenSectionDialog(false)}
        title="Nova Seção"
        maxWidth="sm"
        actions={
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
            <TouchOptimizedButton onClick={() => setOpenSectionDialog(false)}>
              Cancelar
            </TouchOptimizedButton>
            <TouchOptimizedButton
              onClick={handleCreateSection}
              variant="contained"
              disabled={!sectionName.trim()}
            >
              Criar
            </TouchOptimizedButton>
          </Box>
        }
      >
        <MobileOptimizedTextField
          autoFocus
          label="Nome da Seção"
          value={sectionName}
          onChange={(e) => setSectionName(e.target.value)}
          placeholder="Digite o nome da nova seção"
        />
      </ResponsiveModal>

      {/* Diálogo para criar tarefa */}
      <ResponsiveModal
        open={openTaskDialog}
        onClose={() => setOpenTaskDialog(false)}
        title="Nova Tarefa"
        maxWidth="sm"
      >
        <Box sx={{ p: 2 }}>
          <MobileOptimizedTextField
            autoFocus
            label="Título"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            required
            sx={{ mb: 2 }}
          />
          <MobileOptimizedTextField
            label="Descrição"
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <MobileOptimizedTextField
            label="Data de Vencimento"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={taskForm.dueDate}
            onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
            sx={{ mb: 2 }}
          />
          <MobileOptimizedTextField
            select
            label="Prioridade"
            value={taskForm.priority}
            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="LOW">Baixa</MenuItem>
            <MenuItem value="MEDIUM">Média</MenuItem>
            <MenuItem value="HIGH">Alta</MenuItem>
          </MobileOptimizedTextField>
          <MobileOptimizedTextField
            select
            label="Responsável"
            value={taskForm.assigneeId}
            onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
          >
            <MenuItem value="">Nenhum</MenuItem>
            {projectMembers.map((member: any) => (
              <MenuItem key={member.id} value={member.id}>
                {member.name}
              </MenuItem>
            ))}
          </MobileOptimizedTextField>
        </Box>
        <Box sx={{ p: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <TouchOptimizedButton onClick={() => setOpenTaskDialog(false)}>
            Cancelar
          </TouchOptimizedButton>
          <TouchOptimizedButton
            onClick={handleCreateTask}
            variant="contained"
            disabled={!taskForm.title.trim()}
          >
            Criar
          </TouchOptimizedButton>
        </Box>
      </ResponsiveModal>

      {/* Diálogo para detalhes da tarefa */}
      <ResponsiveModal
        open={openTaskDetailDialog}
        onClose={() => setOpenTaskDetailDialog(false)}
        title="Detalhes da Tarefa"
        maxWidth="sm"
      >
        <Box sx={{ p: 2 }}>
          <MobileOptimizedTextField
            autoFocus
            label="Título"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            required
            sx={{ mb: 2 }}
            disabled={!canEdit}
          />
          <MobileOptimizedTextField
            label="Descrição"
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mb: 2 }}
            disabled={!canEdit}
          />
          <MobileOptimizedTextField
            label="Data de Vencimento"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={taskForm.dueDate}
            onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
            sx={{ mb: 2 }}
            disabled={!canEdit}
          />
          <MobileOptimizedTextField
            select
            label="Prioridade"
            value={taskForm.priority}
            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
            sx={{ mb: 2 }}
            disabled={!canEdit}
          >
            <MenuItem value="LOW">Baixa</MenuItem>
            <MenuItem value="MEDIUM">Média</MenuItem>
            <MenuItem value="HIGH">Alta</MenuItem>
          </MobileOptimizedTextField>
          <MobileOptimizedTextField
            select
            label="Responsável"
            value={taskForm.assigneeId}
            onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
            sx={{ mb: 2 }}
            disabled={!canEdit}
          >
            <MenuItem value="">Nenhum</MenuItem>
            {projectMembers.map((member: any) => (
              <MenuItem key={member.id} value={member.id}>
                {member.name}
              </MenuItem>
            ))}
          </MobileOptimizedTextField>
          <Box display="flex" alignItems="center">
            <Checkbox
              checked={taskForm.completed}
              onChange={(e) => setTaskForm({ ...taskForm, completed: e.target.checked })}
              disabled={!canEdit}
            />
            <Typography>Concluída</Typography>
          </Box>
        </Box>
        <Box sx={{ p: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <TouchOptimizedButton onClick={() => setOpenTaskDetailDialog(false)}>
            Cancelar
          </TouchOptimizedButton>
          {canEdit && (
            <TouchOptimizedButton
              onClick={handleUpdateTask}
              variant="contained"
              disabled={!taskForm.title.trim()}
            >
              Salvar
            </TouchOptimizedButton>
          )}
        </Box>
      </ResponsiveModal>

      {/* Diálogo para comentários */}
      <ResponsiveModal
        open={openCommentDialog}
        onClose={() => setOpenCommentDialog(false)}
        title="Comentários"
        maxWidth="sm"
      >
        <Box sx={{ p: 2 }}>
          {data.project.sections
            .flatMap((section: any) => section.tasks)
            .find((task: any) => task.id === currentTaskId)?.comments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', my: 2 }}>
              Nenhum comentário ainda
            </Typography>
          ) : (
            <Box sx={{ mb: 3 }}>
              {data.project.sections
                .flatMap((section: any) => section.tasks)
                .find((task: any) => task.id === currentTaskId)?.comments
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((comment: any) => (
                  <Box key={comment.id} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="subtitle2">{comment.author.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(comment.createdAt), 'dd/MM/yyyy HH:mm')}
                      </Typography>
                    </Box>
                    <Typography variant="body2">{comment.content}</Typography>
                    <Divider sx={{ mt: 1 }} />
                  </Box>
                ))}
            </Box>
          )}
          <MobileOptimizedTextField
            label="Adicionar comentário"
            multiline
            rows={3}
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
          />
        </Box>
        <Box sx={{ p: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <TouchOptimizedButton onClick={() => setOpenCommentDialog(false)}>
            Fechar
          </TouchOptimizedButton>
          <TouchOptimizedButton
            onClick={handleCreateComment}
            variant="contained"
            disabled={!commentContent.trim()}
          >
            Comentar
          </TouchOptimizedButton>
        </Box>
      </ResponsiveModal>

      {/* Feedback visual para drag and drop */}
      <DragFeedback
        isVisible={dragFeedback.isVisible}
        status={dragFeedback.status}
        message={dragFeedback.message}
      />

      {/* Menu de ações da tarefa */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem
          onClick={() => {
            const task = data.project.sections
              .flatMap((section: any) => section.tasks)
              .find((task: any) => task.id === menuTaskId);
            handleOpenTaskDetail(task);
            handleCloseMenu();
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Editar
        </MenuItem>
        <MenuItem
          onClick={() => handleDeleteTask(menuTaskId)}
          disabled={!canEdit}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Excluir
        </MenuItem>
      </Menu>
     </>
  );
};

export default ProjectDetail;