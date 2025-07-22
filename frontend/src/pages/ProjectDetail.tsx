import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
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
  DragEndEvent
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

// Interface para o componente TaskItem
interface TaskItemProps {
  id: string;
  task: any;
  sectionId: string;
  canEdit: boolean;
  handleToggleComplete: (task: any) => void;
  handleOpenMenu: (event: React.MouseEvent<HTMLElement>, taskId: string) => void;
  handleOpenCommentDialog: (taskId: string) => void;
  handleOpenTaskDetail: (task: any) => void;
}

// Componente TaskItem simplificado
const TaskItem = ({ id, task, sectionId, canEdit, handleToggleComplete, handleOpenMenu, handleOpenCommentDialog, handleOpenTaskDetail }: TaskItemProps) => {
  return (
    <Card
      sx={{
        mb: 2,
        opacity: task.completed ? 0.7 : 1,
        bgcolor: task.completed ? 'action.hover' : 'background.paper',
      }}
    >
      <CardContent sx={{ pb: 1 }}>
                   <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box display="flex" alignItems="flex-start" sx={{ width: '100%' }}>
            <Checkbox
              checked={task.completed}
              onChange={() => {
                // Criar uma cópia da tarefa com o ID correto
                const taskWithCorrectId = {
                  ...task,
                  id: task.id.includes(':') ? task.id.split(':')[0] : task.id
                };
                handleToggleComplete(taskWithCorrectId);
              }}
              sx={{ mt: -0.5, ml: -1 }}
              disabled={!canEdit}
            />
            <Box sx={{ width: '100%' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  textDecoration: task.completed ? 'line-through' : 'none',
                  wordBreak: 'break-word',
                }}
              >
                {task.title}
              </Typography>
              {task.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {task.description}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              // Extrair o ID da tarefa do formato 'taskId:sectionId'
              const taskId = task.id.includes(':') ? task.id.split(':')[0] : task.id;
              handleOpenMenu(e, taskId);
            }}
            sx={{ ml: 1 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
          {task.priority && (
            <Chip
              label={task.priority}
              size="small"
              color={
                task.priority === 'HIGH'
                  ? 'error'
                  : task.priority === 'MEDIUM'
                  ? 'warning'
                  : 'info'
              }
              variant="outlined"
            />
          )}
          {task.dueDate && (
            <Chip
              label={format(new Date(task.dueDate), 'dd/MM/yyyy')}
              size="small"
              color="default"
              variant="outlined"
            />
          )}
          {task.assignee && (
            <Chip
              label={task.assignee.username}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
      <CardActions sx={{ pt: 0 }}>
        <Button
          size="small"
          startIcon={<CommentIcon />}
          onClick={() => handleOpenCommentDialog(task.id.includes(':') ? task.id.split(':')[0] : task.id)}
        >
          {task.comments?.length || 0} Comentários
        </Button>
        <Button
          size="small"
          onClick={() => handleOpenTaskDetail(task)}
          sx={{ ml: 'auto' }}
        >
          Detalhes
        </Button>
      </CardActions>
    </Card>
  );
};

const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      description
      createdAt
      owner {
        id
        username
        email
      }
      members {
        id
        username
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
            username
          }
          comments {
            id
            content
            createdAt
            author {
              id
              username
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
        username
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
        username
      }
    }
  }
`;

const MOVE_TASK = gql`
  mutation MoveTask($id: ID!, $sectionId: ID!) {
    moveTask(id: $id, sectionId: $sectionId) {
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
        username
      }
    }
  }
`;

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
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

  // Configuração dos sensores para o DndContext
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    // Se os IDs são diferentes, o item foi movido
    if (active.id !== over.id) {
      // Extrair o ID da tarefa e o ID da seção
      const activeId = String(active.id);
      const overId = String(over.id);
      
      // Verificar se é uma movimentação entre seções
      // O formato do ID será 'taskId:sectionId'
      const [taskId, sourceSectionId] = activeId.split(':');
      const [_, targetSectionId] = overId.split(':');
      
      // Se a seção de destino é diferente da seção de origem
      if (sourceSectionId !== targetSectionId) {
        moveTask({
          variables: {
            id: taskId,
            sectionId: targetSectionId,
          },
        });
      }
      // Aqui poderia ser implementada a reordenação dentro da mesma seção
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">Erro ao carregar projeto: {error.message}</Typography>;
  if (!data?.project) return <Typography>Projeto não encontrado</Typography>;

  const { project } = data;
  const sortedSections = [...project.sections].sort((a, b) => a.order - b.order);
  const isOwner = project.owner.id === user?.id;
  const isMember = project.members.some((member: any) => member.id === user?.id);
  const canEdit = isOwner || isMember;

  const projectMembers = [project.owner, ...project.members];

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
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              sx={{ mr: 1 }}
              disabled={!isOwner}
            >
              Gerenciar Membros
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenSectionDialog(true)}
              disabled={!canEdit}
            >
              Nova Seção
            </Button>
          </Box>
        </Box>

        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <Grid container spacing={2}>
            {sortedSections.map((section) => (
              <Grid item xs={12} md={4} key={section.id}>
                <Paper
                  sx={{
                    p: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.default',
                  }}
                  elevation={1}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">{section.name}</Typography>
                    <Box>
                      <Tooltip title="Adicionar Tarefa">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenTaskDialog(section.id)}
                          disabled={!canEdit}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir Seção">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteSection(section.id)}
                          disabled={!canEdit}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Box sx={{ flexGrow: 1, minHeight: '200px' }}>
                    {section.tasks.length === 0 ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: 'center', mt: 2 }}
                      >
                        Nenhuma tarefa nesta seção
                      </Typography>
                    ) : (
                      <SortableContext
                        items={section.tasks.map((task: any) => `${task.id}:${section.id}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {section.tasks.map((task: any) => (
                          <TaskItem 
                            key={`${task.id}:${section.id}`} 
                            id={`${task.id}:${section.id}`} 
                            task={task} 
                            sectionId={section.id}
                            canEdit={canEdit}
                            handleToggleComplete={handleToggleComplete}
                            handleOpenMenu={handleOpenMenu}
                            handleOpenCommentDialog={handleOpenCommentDialog}
                            handleOpenTaskDetail={handleOpenTaskDetail}
                          />
                        ))}
                      </SortableContext>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DndContext>
      </Box>

      {/* Diálogo para criar seção */}
      <Dialog open={openSectionDialog} onClose={() => setOpenSectionDialog(false)}>
        <DialogTitle>Nova Seção</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome da Seção"
            fullWidth
            variant="outlined"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSectionDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleCreateSection}
            variant="contained"
            disabled={!sectionName.trim()}
          >
            Criar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para criar tarefa */}
      <Dialog open={openTaskDialog} onClose={() => setOpenTaskDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Tarefa</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Título"
            fullWidth
            variant="outlined"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Descrição"
            fullWidth
            variant="outlined"
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Data de Vencimento"
            type="date"
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={taskForm.dueDate}
            onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            margin="dense"
            label="Prioridade"
            fullWidth
            variant="outlined"
            value={taskForm.priority}
            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="LOW">Baixa</MenuItem>
            <MenuItem value="MEDIUM">Média</MenuItem>
            <MenuItem value="HIGH">Alta</MenuItem>
          </TextField>
          <TextField
            select
            margin="dense"
            label="Responsável"
            fullWidth
            variant="outlined"
            value={taskForm.assigneeId}
            onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
          >
            <MenuItem value="">Nenhum</MenuItem>
            {projectMembers.map((member: any) => (
              <MenuItem key={member.id} value={member.id}>
                {member.username}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTaskDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleCreateTask}
            variant="contained"
            disabled={!taskForm.title.trim()}
          >
            Criar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para detalhes da tarefa */}
      <Dialog
        open={openTaskDetailDialog}
        onClose={() => setOpenTaskDetailDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Detalhes da Tarefa</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Título"
            fullWidth
            variant="outlined"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            required
            sx={{ mb: 2 }}
            disabled={!canEdit}
          />
          <TextField
            margin="dense"
            label="Descrição"
            fullWidth
            variant="outlined"
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mb: 2 }}
            disabled={!canEdit}
          />
          <TextField
            margin="dense"
            label="Data de Vencimento"
            type="date"
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={taskForm.dueDate}
            onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
            sx={{ mb: 2 }}
            disabled={!canEdit}
          />
          <TextField
            select
            margin="dense"
            label="Prioridade"
            fullWidth
            variant="outlined"
            value={taskForm.priority}
            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
            sx={{ mb: 2 }}
            disabled={!canEdit}
          >
            <MenuItem value="LOW">Baixa</MenuItem>
            <MenuItem value="MEDIUM">Média</MenuItem>
            <MenuItem value="HIGH">Alta</MenuItem>
          </TextField>
          <TextField
            select
            margin="dense"
            label="Responsável"
            fullWidth
            variant="outlined"
            value={taskForm.assigneeId}
            onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
            sx={{ mb: 2 }}
            disabled={!canEdit}
          >
            <MenuItem value="">Nenhum</MenuItem>
            {projectMembers.map((member: any) => (
              <MenuItem key={member.id} value={member.id}>
                {member.username}
              </MenuItem>
            ))}
          </TextField>
          <Box display="flex" alignItems="center">
            <Checkbox
              checked={taskForm.completed}
              onChange={(e) => setTaskForm({ ...taskForm, completed: e.target.checked })}
              disabled={!canEdit}
            />
            <Typography>Concluída</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTaskDetailDialog(false)}>Cancelar</Button>
          {canEdit && (
            <Button
              onClick={handleUpdateTask}
              variant="contained"
              disabled={!taskForm.title.trim()}
            >
              Salvar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Diálogo para comentários */}
      <Dialog
        open={openCommentDialog}
        onClose={() => setOpenCommentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Comentários</DialogTitle>
        <DialogContent>
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
                      <Typography variant="subtitle2">{comment.author.username}</Typography>
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
          <TextField
            label="Adicionar comentário"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCommentDialog(false)}>Fechar</Button>
          <Button
            onClick={handleCreateComment}
            variant="contained"
            disabled={!commentContent.trim()}
          >
            Comentar
          </Button>
        </DialogActions>
      </Dialog>

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