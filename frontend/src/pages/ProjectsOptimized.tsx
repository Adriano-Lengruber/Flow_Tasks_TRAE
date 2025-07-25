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
  LinearProgress,
  Chip,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import TaskIcon from '@mui/icons-material/Task';
import { Link } from 'react-router-dom';
import useToast from '../hooks/useToast';
import Toast from '../components/common/Toast';
import ResponsiveContainer from '../components/common/ResponsiveContainer';
import PaginatedList from '../components/common/PaginatedList';
import { GET_PROJECTS_PAGINATED } from '../graphql/optimized-queries';

const CREATE_PROJECT = gql`
  mutation CreateProject($name: String!, $description: String, $startDate: DateTime, $endDate: DateTime) {
    createProject(createProjectInput: { name: $name, description: $description, startDate: $startDate, endDate: $endDate }) {
      id
      name
      description
      startDate
      endDate
    }
  }
`;

const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    removeProject(id: $id)
  }
`;

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  sections: Array<{
    id: string;
    name: string;
    tasks: Array<{
      id: string;
      completed: boolean;
    }>;
  }>;
}

const ProjectsOptimized: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const { showToast, toast, hideToast } = useToast();

  const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT, {
    onCompleted: () => {
      showToast('Projeto criado com sucesso!', 'success');
      handleClose();
      // Refetch será feito automaticamente pelo cache
    },
    onError: (error) => {
      showToast(`Erro ao criar projeto: ${error.message}`, 'error');
    },
    // Atualizar cache otimisticamente
    update: (cache, { data: { createProject } }) => {
      cache.modify({
        fields: {
          projectsPaginated(existing = { items: [], total: 0 }) {
            return {
              ...existing,
              items: [createProject, ...existing.items],
              total: existing.total + 1,
            };
          },
        },
      });
    },
  });

  const [deleteProject] = useMutation(DELETE_PROJECT, {
    onCompleted: () => {
      showToast('Projeto excluído com sucesso!', 'success');
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
    },
    onError: (error) => {
      showToast(`Erro ao excluir projeto: ${error.message}`, 'error');
    },
    // Atualizar cache removendo o projeto
    update: (cache, { data: { removeProject } }, { variables }) => {
      if (removeProject) {
        cache.modify({
          fields: {
            projectsPaginated(existing = { items: [], total: 0 }) {
              return {
                ...existing,
                items: existing.items.filter((project: Project) => project.id !== variables?.id),
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
    setEditingProject(null);
    setFormData({ name: '', description: '', startDate: '', endDate: '' });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showToast('Nome do projeto é obrigatório', 'error');
      return;
    }

    try {
      await createProject({
        variables: {
          name: formData.name,
          description: formData.description || null,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        },
      });
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
    }
  };

  const handleDelete = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      try {
        await deleteProject({ variables: { id: projectToDelete } });
      } catch (error) {
        console.error('Erro ao excluir projeto:', error);
      }
    }
  };

  // Calcular estatísticas do projeto
  const getProjectStats = (project: Project) => {
    const totalTasks = project.sections.reduce((acc, section) => acc + section.tasks.length, 0);
    const completedTasks = project.sections.reduce(
      (acc, section) => acc + section.tasks.filter(task => task.completed).length,
      0
    );
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return { totalTasks, completedTasks, progress };
  };

  // Renderizar item do projeto
  const renderProjectItem = (project: Project, index: number) => {
    const stats = getProjectStats(project);
    
    return (
      <Grid item xs={12} sm={6} md={4} key={project.id}>
        <Card 
          sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 3,
            },
          }}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            <Box display="flex" alignItems="center" mb={1}>
              <FolderIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h2" noWrap>
                {project.name}
              </Typography>
            </Box>
            
            {project.description && (
              <Typography 
                variant="body2" 
                color="textSecondary" 
                sx={{ 
                  mb: 2,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {project.description}
              </Typography>
            )}

            {/* Estatísticas */}
            <Box mb={2}>
              <Box display="flex" alignItems="center" mb={1}>
                <TaskIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">
                  {stats.completedTasks}/{stats.totalTasks} tarefas
                </Typography>
                <Chip 
                  label={`${Math.round(stats.progress)}%`}
                  size="small"
                  color={stats.progress === 100 ? 'success' : 'primary'}
                  sx={{ ml: 'auto' }}
                />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={stats.progress} 
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>

            <Typography variant="caption" color="textSecondary">
              {project.sections.length} {project.sections.length === 1 ? 'seção' : 'seções'}
            </Typography>
          </CardContent>
          
          <CardActions>
            <Button 
              size="small" 
              component={Link} 
              to={`/projects/${project.id}`}
              variant="contained"
              sx={{ mr: 1 }}
            >
              Abrir
            </Button>
            
            <Box sx={{ ml: 'auto' }}>
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => setEditingProject(project)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excluir">
                <IconButton 
                  size="small" 
                  onClick={() => handleDelete(project.id)}
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
      <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Nenhum projeto encontrado
      </Typography>
      <Typography variant="body2" color="textSecondary" mb={3}>
        Crie seu primeiro projeto para começar a organizar suas tarefas
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpen(true)}
      >
        Criar Primeiro Projeto
      </Button>
    </Box>
  );

  return (
    <ResponsiveContainer>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Meus Projetos
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Novo Projeto
        </Button>
      </Box>

      {/* Lista paginada de projetos */}
      <PaginatedList<Project>
        query={GET_PROJECTS_PAGINATED}
        dataPath="projectsPaginated"
        pageSize={12}
        renderItem={renderProjectItem}
        renderEmpty={renderEmpty}
        enableInfiniteScroll={true}
        enablePrefetch={true}
      />

      {/* Dialog para criar/editar projeto */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome do Projeto"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
          <TextField
            margin="dense"
            label="Data de Início"
            type="date"
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Data de Fim"
            type="date"
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={creating}
          >
            {creating ? 'Criando...' : (editingProject ? 'Salvar' : 'Criar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      <Toast {...toast} onClose={hideToast} />
    </ResponsiveContainer>
  );
};

export default ProjectsOptimized;