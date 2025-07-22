import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Typography, Grid, Paper, Box, CircularProgress, Card, CardContent, CardHeader, Chip, List, ListItem, ListItemText, Divider, Button, IconButton, CardActions } from '@mui/material';
// Removidas importações desnecessárias
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CommentIcon from '@mui/icons-material/Comment';
import { useAuth } from '../hooks/useAuth';

const GET_USER_DASHBOARD = gql`
  query GetUserDashboard {
    projects {
      id
      name
      description
      sections {
        id
        name
        tasks {
          id
          title
          completed
          priority
          dueDate
        }
      }
    }
  }
`;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { loading, error, data } = useQuery(GET_USER_DASHBOARD);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">Erro ao carregar dados: {error.message}</Typography>;

  // Extrair projetos
  const projects = data?.projects || [];

  // Extrair todas as tarefas de todos os projetos
  const allTasks = projects.flatMap((project: any) =>
    project.sections.flatMap((section: any) =>
      section.tasks.map((task: any) => ({
        ...task,
        projectName: project.name,
        sectionName: section.name,
      }))
    )
  );

  // Filtrar tarefas atribuídas ao usuário atual (simulado)
  const myTasks = allTasks.filter((task: any) => !task.completed).slice(0, 5);

  // Filtrar tarefas com prazo próximo
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const upcomingTasks = allTasks
    .filter((task: any) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return !task.completed && dueDate >= today && dueDate <= nextWeek;
    })
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Bem-vindo, {user?.name || 'Usuário'}!
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Projetos Recentes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Projetos Recentes" />
            <Divider />
            <CardContent>
              {projects.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum projeto encontrado.
                </Typography>
              ) : (
                <List>
                  {projects.slice(0, 5).map((project: any) => (
                    <React.Fragment key={project.id}>
                      <ListItem button component="a" href={`/projects/${project.id}`}>
                        <ListItemText
                          primary={project.name}
                          secondary={
                            <>
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.primary"
                                noWrap
                                sx={{ display: 'block', maxWidth: '100%' }}
                              >
                                {project.description || 'Sem descrição'}
                              </Typography>
                              <Typography component="span" variant="caption">
                                {project.sections.reduce(
                                  (acc: number, section: any) => acc + section.tasks.length,
                                  0
                                )}{' '}
                                tarefas
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Minhas Tarefas */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Minhas Tarefas" />
            <Divider />
            <CardContent>
              {myTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma tarefa atribuída a você.
                </Typography>
              ) : (
                <List>
                  {myTasks.map((task: any) => (
                    <React.Fragment key={task.id}>
                      <TaskItem 
                        id={task.id} 
                        task={{
                          ...task,
                          id: task.id,
                          title: task.title,
                          description: task.description,
                          priority: task.priority,
                          dueDate: task.dueDate,
                          completed: task.completed,
                          projectName: task.projectName,
                          sectionName: task.sectionName
                        }}
                        sectionId="dashboard"
                        canEdit={false}
                        isDashboard={true}
                      />
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Tarefas com Prazo Próximo */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Prazos Próximos" />
            <Divider />
            <CardContent>
              {upcomingTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma tarefa com prazo próximo.
                </Typography>
              ) : (
                <List>
                  {upcomingTasks.map((task: any) => (
                    <React.Fragment key={task.id}>
                      <TaskItem
                        id={task.id}
                        task={{
                          ...task,
                          id: task.id,
                          title: task.title,
                          description: task.description,
                          priority: task.priority,
                          dueDate: task.dueDate,
                          completed: task.completed,
                          projectName: task.projectName,
                          sectionName: task.sectionName
                        }}
                        sectionId="upcoming"
                        canEdit={false}
                        isDashboard={true}
                      />
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Interface para o componente TaskItem
interface TaskItemProps {
  id: string;
  task: any;
  sectionId: string;
  canEdit: boolean;
  isDashboard?: boolean;
}

// Componente TaskItem simplificado
const TaskItem = ({ id, task, isDashboard = false }: TaskItemProps) => {
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
              {isDashboard && (
                <Typography component="span" variant="caption" sx={{ display: 'block', mt: 1 }}>
                  {task.projectName} &gt; {task.sectionName}
                </Typography>
              )}
            </Box>
          </Box>
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
              label={new Date(task.dueDate).toLocaleDateString()}
              size="small"
              color={new Date(task.dueDate) < new Date() ? 'error' : 'default'}
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
      {!isDashboard && (
        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 1 }}>
          <Box>
            <Button
              size="small"
              startIcon={<CommentIcon />}
            >
              Comentários
            </Button>
          </Box>
          <Box>
            <Button
              size="small"
              sx={{ ml: 'auto' }}
            >
              Detalhes
            </Button>
          </Box>
        </CardActions>
      )}
    </Card>
  );
};

export default Dashboard;