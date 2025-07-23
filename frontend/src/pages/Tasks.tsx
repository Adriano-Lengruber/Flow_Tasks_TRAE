import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Typography,
  Box,
  Paper,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import useToast from '../hooks/useToast';

const GET_ALL_TASKS = gql`
  query GetAllTasks {
    projects {
      id
      name
      owner {
        id
        name
        email
      }
      sections {
        id
        name
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
        }
      }
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

const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    removeTask(id: $id)
  }
`;

const Tasks: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
    sectionId: '',
    assigneeId: ''
  });

  const { data, loading, error, refetch } = useQuery(GET_ALL_TASKS);

  const [createTask] = useMutation(CREATE_TASK, {
    onCompleted: () => {
      showToast('Tarefa criada com sucesso!', 'success');
      setOpenDialog(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      showToast(`Erro ao criar tarefa: ${error.message}`, 'error');
    }
  });

  const [updateTask] = useMutation(UPDATE_TASK, {
    onCompleted: () => {
      showToast('Tarefa atualizada com sucesso!', 'success');
      setOpenDialog(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      showToast(`Erro ao atualizar tarefa: ${error.message}`, 'error');
    }
  });

  const [deleteTask] = useMutation(DELETE_TASK, {
    onCompleted: () => {
      showToast('Tarefa excluída com sucesso!', 'success');
      refetch();
    },
    onError: (error) => {
      showToast(`Erro ao excluir tarefa: ${error.message}`, 'error');
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      priority: 'MEDIUM',
      sectionId: '',
      assigneeId: ''
    });
    setEditingTask(null);
  };

  const handleOpenDialog = (task?: any) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        priority: task.priority,
        sectionId: task.section?.id || '',
        assigneeId: task.assignee?.id || ''
      });
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.sectionId) {
      showToast('Título e seção são obrigatórios', 'error');
      return;
    }

    const variables = {
      title: formData.title,
      description: formData.description || null,
      dueDate: formData.dueDate || null,
      priority: formData.priority,
      sectionId: formData.sectionId,
      assigneeId: formData.assigneeId || null
    };

    if (editingTask) {
      updateTask({
        variables: {
          id: editingTask.id,
          ...variables
        }
      });
    } else {
      createTask({ variables });
    }
  };

  const handleDelete = (taskId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      deleteTask({ variables: { id: taskId } });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'Alta';
      case 'MEDIUM': return 'Média';
      case 'LOW': return 'Baixa';
      default: return priority;
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">Erro ao carregar tarefas: {error.message}</Typography>;

  const allTasks = data?.projects?.flatMap((project: any) => 
    project.sections.flatMap((section: any) => 
      section.tasks.map((task: any) => ({
        ...task,
        projectName: project.name,
        sectionName: section.name,
        section: section
      }))
    )
  ) || [];

  const allSections = data?.projects?.flatMap((project: any) => 
    project.sections.map((section: any) => ({
      ...section,
      projectName: project.name
    }))
  ) || [];

  const allUsers = data?.projects?.flatMap((project: any) => project.owner ? [project.owner] : []) || [];

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Gerenciar Tarefas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nova Tarefa
        </Button>
      </Box>

      <Grid container spacing={3}>
        {allTasks.map((task: any) => (
          <Grid item xs={12} sm={6} md={4} key={task.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {task.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {task.description}
                </Typography>
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Chip
                    label={getPriorityLabel(task.priority)}
                    color={getPriorityColor(task.priority) as any}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  {task.completed && (
                    <Chip
                      label="Concluída"
                      color="success"
                      size="small"
                      sx={{ mr: 1 }}
                    />
                  )}
                </Box>
                <Typography variant="caption" display="block">
                  Projeto: {task.projectName}
                </Typography>
                <Typography variant="caption" display="block">
                  Seção: {task.sectionName}
                </Typography>
                {task.assignee && (
                  <Typography variant="caption" display="block">
                    Responsável: {task.assignee.name}
                  </Typography>
                )}
                {task.dueDate && (
                  <Typography variant="caption" display="block">
                    Vencimento: {format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <IconButton
                  size="small"
                  onClick={() => handleOpenDialog(task)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(task.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {allTasks.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <Typography variant="h6" color="text.secondary">
            Nenhuma tarefa encontrada
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Crie sua primeira tarefa clicando no botão "Nova Tarefa"
          </Typography>
        </Paper>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Título"
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
            <InputLabel>Seção</InputLabel>
            <Select
              value={formData.sectionId}
              label="Seção"
              onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
            >
              {allSections.map((section: any) => (
                <MenuItem key={section.id} value={section.id}>
                  {section.projectName} - {section.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Prioridade</InputLabel>
            <Select
              value={formData.priority}
              label="Prioridade"
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <MenuItem value="LOW">Baixa</MenuItem>
              <MenuItem value="MEDIUM">Média</MenuItem>
              <MenuItem value="HIGH">Alta</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Responsável</InputLabel>
            <Select
              value={formData.assigneeId}
              label="Responsável"
              onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
            >
              <MenuItem value="">Nenhum</MenuItem>
              {allUsers.map((user: any) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Data de Vencimento"
            type="date"
            fullWidth
            variant="outlined"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingTask ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Tasks;