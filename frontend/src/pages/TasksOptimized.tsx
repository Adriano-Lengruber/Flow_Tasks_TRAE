import React, { useState, useMemo } from 'react';
import { useMutation, gql } from '@apollo/client';
import {
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  IconButton,
  Tooltip,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import TaskIcon from '@mui/icons-material/Task';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import { useParams } from 'react-router-dom';
import useToast from '../hooks/useToast';
import Toast from '../components/common/Toast';
import ResponsiveContainer from '../components/common/ResponsiveContainer';
import PaginatedList from '../components/common/PaginatedList';
import { GET_TASKS_PAGINATED } from '../graphql/optimized-queries';

const CREATE_TASK = gql`
  mutation CreateTask(
    $title: String!
    $description: String
    $priority: String
    $dueDate: DateTime
    $sectionId: ID!
  ) {
    createTask(
      createTaskInput: {
        title: $title
        description: $description
        priority: $priority
        dueDate: $dueDate
        sectionId: $sectionId
      }
    ) {
      id
      title
      description
      priority
      dueDate
      completed
      createdAt
      section {
        id
        name
      }
      assignedTo {
        id
        name
        email
      }
    }
  }
`;

const UPDATE_TASK = gql`
  mutation UpdateTask(
    $id: ID!
    $title: String
    $description: String
    $priority: String
    $dueDate: DateTime
    $completed: Boolean
  ) {
    updateTask(
      id: $id
      updateTaskInput: {
        title: $title
        description: $description
        priority: $priority
        dueDate: $dueDate
        completed: $completed
      }
    ) {
      id
      title
      description
      priority
      dueDate
      completed
      updatedAt
    }
  }
`;

const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    removeTask(id: $id)
  }
`;

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  section: {
    id: string;
    name: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
}

const TasksOptimized: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as const,
    dueDate: '',
    sectionId: '',
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [filterCompleted, setFilterCompleted] = useState<boolean | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('');

  const { showToast, toastProps } = useToast();

  const [createTask, { loading: creating }] = useMutation(CREATE_TASK, {
    onCompleted: () => {
      showToast('Tarefa criada com sucesso!', 'success');
      handleClose();
    },
    onError: (error) => {
      showToast(`Erro ao criar tarefa: ${error.message}`, 'error');
    },
    update: (cache, { data: { createTask } }) => {
      cache.modify({
        fields: {
          tasksPaginated(existing = { items: [], total: 0 }) {
            return {
              ...existing,
              items: [createTask, ...existing.items],
              total: existing.total + 1,
            };
          },
        },
      });
    },
  });

  const [updateTask] = useMutation(UPDATE_TASK, {
    onCompleted: () => {
      showToast('Tarefa atualizada com sucesso!', 'success');
    },
    onError: (error) => {
      showToast(`Erro ao atualizar tarefa: ${error.message}`, 'error');
    },
  });

  const [deleteTask] = useMutation(DELETE_TASK, {
    onCompleted: () => {
      showToast('Tarefa excluída com sucesso!', 'success');
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
    },
    onError: (error) => {
      showToast(`Erro ao excluir tarefa: ${error.message}`, 'error');
    },
    update: (cache, { data: { removeTask } }, { variables }) => {
      if (removeTask) {
        cache.modify({
          fields: {
            tasksPaginated(existing = { items: [], total: 0 }) {
              return {
                ...existing,
                items: existing.items.filter((task: Task) => task.id !== variables?.id),
                total: Math.max(0, existing.total - 1),
              };
            },
          },
        });
      }
    },
  });

  const handleClose = () => {
    setOpen(false);
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      priority: 'MEDIUM',
      dueDate: '',
      sectionId: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showToast('Título da tarefa é obrigatório', 'error');
      return;
    }

    if (!formData.sectionId) {
      showToast('Seção é obrigatória', 'error');
      return;
    }

    try {
      if (editingTask) {
        await updateTask({
          variables: {
            id: editingTask.id,
            title: formData.title,
            description: formData.description || null,
            priority: formData.priority,
            dueDate: formData.dueDate || null,
          },
        });
      } else {
        await createTask({
          variables: {
            title: formData.title,
            description: formData.description || null,
            priority: formData.priority,
            dueDate: formData.dueDate || null,
            sectionId: formData.sectionId,
          },
        });
      }
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      await updateTask({
        variables: {
          id: task.id,
          completed: !task.completed,
        },
      });
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
    }
  };

  const handleDelete = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (taskToDelete) {
      try {
        await deleteTask({ variables: { id: taskToDelete } });
      } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
      }
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      sectionId: task.section.id,
    });
    setOpen(true);
  };

  // Função para obter cor da prioridade
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'success';
      default:
        return 'default';
    }
  };

  // Função para obter texto da prioridade
  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'Alta';
      case 'MEDIUM':
        return 'Média';
      case 'LOW':
        return 'Baixa';
      default:
        return priority;
    }
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Verificar se a tarefa está atrasada
  const isOverdue = (dueDate: string, completed: boolean) => {
    if (completed || !dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  // Renderizar item da tarefa
  const renderTaskItem = (task: Task, index: number) => {
    const overdue = isOverdue(task.dueDate || '', task.completed);
    
    return (
      <Grid item xs={12} sm={6} md={4} key={task.id}>
        <Card 
          sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s, box-shadow 0.2s',
            opacity: task.completed ? 0.7 : 1,
            border: overdue ? '2px solid' : 'none',
            borderColor: overdue ? 'error.main' : 'transparent',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 3,
            },
          }}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            <Box display="flex" alignItems="flex-start" mb={1}>
              <IconButton
                size="small"
                onClick={() => handleToggleComplete(task)}
                sx={{ mr: 1, mt: -0.5 }}
              >
                {task.completed ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <RadioButtonUncheckedIcon />
                )}
              </IconButton>
              
              <Box flexGrow={1}>
                <Typography 
                  variant="h6" 
                  component="h3"
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
                    color="textSecondary" 
                    sx={{ 
                      mt: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {task.description}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Metadados */}
            <Box mt={2}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Chip
                  label={getPriorityText(task.priority)}
                  size="small"
                  color={getPriorityColor(task.priority) as any}
                  icon={task.priority === 'HIGH' ? <PriorityHighIcon /> : undefined}
                />
                
                <Chip
                  label={task.section.name}
                  size="small"
                  variant="outlined"
                />
              </Box>

              {task.dueDate && (
                <Box display="flex" alignItems="center" mb={1}>
                  <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography 
                    variant="caption" 
                    color={overdue ? 'error' : 'textSecondary'}
                  >
                    {formatDate(task.dueDate)}
                    {overdue && ' (Atrasada)'}
                  </Typography>
                </Box>
              )}

              {task.assignedTo && (
                <Box display="flex" alignItems="center">
                  <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption" color="textSecondary">
                    {task.assignedTo.name}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
          
          <CardActions>
            <Box sx={{ ml: 'auto' }}>
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => handleEdit(task)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excluir">
                <IconButton 
                  size="small" 
                  onClick={() => handleDelete(task.id)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </CardActions>
        </Card>
      </Grid>
    );
  };

  // Renderizar estado vazio
  const renderEmpty = () => (
    <Box textAlign="center" py={8}>
      <TaskIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Nenhuma tarefa encontrada
      </Typography>
      <Typography variant="body2" color="textSecondary" mb={3}>
        Crie sua primeira tarefa para começar a organizar seu trabalho
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpen(true)}
      >
        Criar Primeira Tarefa
      </Button>
    </Box>
  );

  // Variáveis da query com filtros
  const queryVariables = useMemo(() => {
    const variables: any = {};
    
    if (projectId) {
      variables.projectId = projectId;
    }
    
    if (filterCompleted !== null) {
      variables.completed = filterCompleted;
    }
    
    if (filterPriority) {
      variables.priority = filterPriority;
    }
    
    return variables;
  }, [projectId, filterCompleted, filterPriority]);

  return (
    <ResponsiveContainer>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Tarefas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Nova Tarefa
        </Button>
      </Box>

      {/* Filtros */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterCompleted === null ? '' : filterCompleted.toString()}
            label="Status"
            onChange={(e) => {
              const value = e.target.value;
              setFilterCompleted(value === '' ? null : value === 'true');
            }}
          >
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="false">Pendentes</MenuItem>
            <MenuItem value="true">Concluídas</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Prioridade</InputLabel>
          <Select
            value={filterPriority}
            label="Prioridade"
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="HIGH">Alta</MenuItem>
            <MenuItem value="MEDIUM">Média</MenuItem>
            <MenuItem value="LOW">Baixa</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Lista paginada de tarefas */}
      <PaginatedList<Task>
        query={GET_TASKS_PAGINATED}
        variables={queryVariables}
        dataPath="tasksPaginated"
        pageSize={12}
        renderItem={renderTaskItem}
        renderEmpty={renderEmpty}
        enableInfiniteScroll={true}
        enablePrefetch={true}
      />

      {/* Dialog para criar/editar tarefa */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Título da Tarefa"
            fullWidth
            variant="outlined"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Descrição"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Prioridade</InputLabel>
            <Select
              value={formData.priority}
              label="Prioridade"
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
            >
              <MenuItem value="LOW">Baixa</MenuItem>
              <MenuItem value="MEDIUM">Média</MenuItem>
              <MenuItem value="HIGH">Alta</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Data de Vencimento"
            type="date"
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="ID da Seção"
            fullWidth
            variant="outlined"
            value={formData.sectionId}
            onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
            placeholder="Digite o ID da seção"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={creating}
          >
            {creating ? 'Salvando...' : (editingTask ? 'Salvar' : 'Criar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      <Toast {...toastProps} />
    </ResponsiveContainer>
  );
};

export default TasksOptimized;