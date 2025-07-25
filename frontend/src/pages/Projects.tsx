import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Link } from 'react-router-dom';
import useToast from '../hooks/useToast';
import Toast from '../components/common/Toast';
import Loading from '../components/common/Loading';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ResponsiveContainer from '../components/common/ResponsiveContainer';

const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      name
      description
      createdAt
      sections {
        id
        name
        tasks {
          id
          title
          completed
        }
      }
    }
  }
`;

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

const Projects: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; description: string; startDate?: string; endDate?: string } | null>(null);
  const { toast, showError, showSuccess, hideToast } = useToast();

  const { loading, error, data, refetch } = useQuery(GET_PROJECTS, {
    onError: (error) => {
      showError('Erro ao carregar projetos: ' + error.message);
    },
  });

  const [createProject, { loading: createLoading }] = useMutation(CREATE_PROJECT, {
    onCompleted: () => {
      setOpenDialog(false);
      setProjectName('');
      setProjectDescription('');
      setStartDate('');
      setEndDate('');
      showSuccess('Projeto criado com sucesso!');
      refetch();
    },
    onError: (error) => {
      showError('Erro ao criar projeto: ' + error.message);
    },
  });

  const [deleteProject, { loading: deleteLoading }] = useMutation(DELETE_PROJECT, {
    onCompleted: () => {
      showSuccess('Projeto excluído com sucesso!');
      refetch();
    },
    onError: (error) => {
      showError('Erro ao excluir projeto: ' + error.message);
    },
  });

  const handleCreateProject = () => {
    if (editingProject) {
      // Implementar atualização de projeto
      setEditingProject(null);
    } else {
      createProject({
        variables: {
          name: projectName,
          description: projectDescription || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
    }
    setOpenDialog(false);
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este projeto?')) {
      deleteProject({ variables: { id } });
    }
  };

  const handleEditProject = (project: { id: string; name: string; description: string }) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || '');
    setOpenDialog(true);
  };

  const handleOpenDialog = () => {
    setEditingProject(null);
    setProjectName('');
    setProjectDescription('');
    setOpenDialog(true);
  };

  const calculateProgress = (sections: any[]) => {
    const totalTasks = sections.reduce((acc, section) => acc + section.tasks.length, 0);
    if (totalTasks === 0) return 0;

    const completedTasks = sections.reduce(
      (acc, section) => acc + section.tasks.filter((task: any) => task.completed).length,
      0
    );

    return Math.round((completedTasks / totalTasks) * 100);
  };

  if (loading) return (
    <ResponsiveContainer variant="dashboard">
      <LoadingSkeleton variant="project-list" count={6} />
    </ResponsiveContainer>
  );
  if (error) return <Typography color="error">Erro ao carregar projetos: {error.message}</Typography>;

  const projects = data?.projects || [];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Meus Projetos</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Novo Projeto
        </Button>
      </Box>

      {projects.length === 0 ? (
        <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
          Você ainda não tem projetos. Crie seu primeiro projeto clicando no botão acima.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project: any) => {
            const progress = calculateProgress(project.sections);
            const totalTasks = project.sections.reduce((acc: number, section: any) => acc + section.tasks.length, 0);

            return (
              <Grid item xs={12} sm={6} md={4} key={project.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Typography variant="h6" component="h2" gutterBottom>
                        {project.name}
                      </Typography>
                      <Box>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => handleEditProject(project)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {project.description || 'Sem descrição'}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Progresso: {progress}%
                      </Typography>
                      <LinearProgress variant="determinate" value={progress} sx={{ mt: 1, mb: 1 }} />
                      <Typography variant="caption" color="text.secondary">
                        {totalTasks} tarefas no total
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      component={Link}
                      to={`/projects/${project.id}`}
                      sx={{ ml: 'auto' }}
                    >
                      Ver Detalhes
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome do Projeto"
            type="text"
            fullWidth
            variant="outlined"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Descrição"
            type="text"
            fullWidth
            variant="outlined"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            multiline
            rows={4}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Data de Início"
            type="date"
            fullWidth
            variant="outlined"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Data de Fim"
            type="date"
            fullWidth
            variant="outlined"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleCreateProject}
            variant="contained"
            color="primary"
            disabled={!projectName || createLoading}
          >
            {createLoading ? <CircularProgress size={24} /> : editingProject ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </Box>
  );
};

export default Projects;