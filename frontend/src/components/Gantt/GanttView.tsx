import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
  useTheme
} from '@mui/material';
import { useQuery } from '@apollo/client';
import { GET_PROJECTS, GET_PROJECT } from '../../graphql/projects';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GanttTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  type: 'project' | 'section' | 'task';
  level: number;
  status?: string;
}

interface GanttViewProps {
  projectId?: string;
  height?: number;
}

const GanttView: React.FC<GanttViewProps> = ({ projectId, height = 600 }) => {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [timelineStart, setTimelineStart] = useState<Date>(new Date());
  const [timelineEnd, setTimelineEnd] = useState<Date>(new Date());
  const theme = useTheme();

  const { data, loading, error } = useQuery(projectId ? GET_PROJECT : GET_PROJECTS, {
    variables: projectId ? { id: projectId } : undefined,
    fetchPolicy: 'cache-and-network'
  });

  useEffect(() => {
    if (data?.projects || data?.project) {
      const projects = data.projects || [data.project];
      const ganttTasks: GanttTask[] = [];
      let minDate = new Date();
      let maxDate = new Date();

      projects.forEach((project: any) => {
        // Adicionar projeto como tarefa pai
        const projectStartDate = project.createdAt ? new Date(project.createdAt) : new Date();
        let projectEndDate = project.updatedAt ? new Date(project.updatedAt) : new Date();
        
        // Garantir que a data de fim seja pelo menos 30 dias após o início
        if (projectEndDate <= projectStartDate) {
          projectEndDate = new Date(projectStartDate);
          projectEndDate.setDate(projectStartDate.getDate() + 30);
        }

        // Calcular progresso do projeto baseado nas tarefas
        let totalTasks = 0;
        let completedTasks = 0;
        
        if (project.sections) {
          project.sections.forEach((section: any) => {
            if (section.tasks) {
              totalTasks += section.tasks.length;
              completedTasks += section.tasks.filter((task: any) => task.completed).length;
            }
          });
        }
        
        const projectProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        ganttTasks.push({
          id: project.id,
          name: project.name,
          startDate: projectStartDate,
          endDate: projectEndDate,
          progress: projectProgress,
          type: 'project',
          level: 0
        });

        // Atualizar datas mínima e máxima
        if (projectStartDate < minDate) minDate = projectStartDate;
        if (projectEndDate > maxDate) maxDate = projectEndDate;

        // Adicionar seções como tarefas filhas
        if (project.sections) {
          project.sections.forEach((section: any, sectionIndex: number) => {
            const sectionStartDate = new Date(projectStartDate);
            sectionStartDate.setDate(projectStartDate.getDate() + (sectionIndex * 7)); // Espaçar seções por semana
            
            const sectionEndDate = new Date(sectionStartDate);
            sectionEndDate.setDate(sectionStartDate.getDate() + 14); // 2 semanas por seção

            // Calcular progresso da seção
            const sectionTotalTasks = section.tasks ? section.tasks.length : 0;
            const sectionCompletedTasks = section.tasks ? section.tasks.filter((task: any) => task.completed).length : 0;
            const sectionProgress = sectionTotalTasks > 0 ? Math.round((sectionCompletedTasks / sectionTotalTasks) * 100) : 0;

            ganttTasks.push({
              id: section.id,
              name: section.name,
              startDate: sectionStartDate,
              endDate: sectionEndDate,
              progress: sectionProgress,
              type: 'section',
              level: 1
            });

            // Adicionar tarefas
            if (section.tasks) {
              section.tasks.forEach((task: any, taskIndex: number) => {
                const taskStartDate = new Date(sectionStartDate);
                taskStartDate.setDate(taskStartDate.getDate() + (taskIndex * 2)); // Espaçar tarefas
                
                let taskEndDate: Date;
                if (task.dueDate) {
                  taskEndDate = new Date(task.dueDate);
                } else {
                  taskEndDate = new Date(taskStartDate);
                  taskEndDate.setDate(taskStartDate.getDate() + 3); // 3 dias por padrão
                }

                // Calcular progresso baseado no campo completed
                const progress = task.completed ? 100 : 0;

                ganttTasks.push({
                  id: task.id,
                  name: task.title,
                  startDate: taskStartDate,
                  endDate: taskEndDate,
                  progress,
                  type: 'task',
                  level: 2,
                  status: task.completed ? 'COMPLETED' : 'TODO'
                });
              });
            }
          });
        }
      });

      setTasks(ganttTasks);
      setTimelineStart(minDate);
      setTimelineEnd(maxDate);
    }
  }, [data]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return theme.palette.success.main;
      case 'IN_PROGRESS':
        return theme.palette.warning.main;
      case 'TODO':
      default:
        return theme.palette.grey[400];
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return '📁';
      case 'section':
        return '📋';
      case 'task':
        return '📝';
      default:
        return '•';
    }
  };

  const calculatePosition = (startDate: Date, endDate: Date) => {
    const totalDays = differenceInDays(timelineEnd, timelineStart);
    const startOffset = differenceInDays(startDate, timelineStart);
    const duration = differenceInDays(endDate, startDate);
    
    const left = (startOffset / totalDays) * 100;
    const width = Math.max((duration / totalDays) * 100, 2); // Mínimo 2% de largura
    
    return { left: `${left}%`, width: `${width}%` };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={height}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Erro ao carregar dados do Gantt: {error.message}
      </Alert>
    );
  }

  if (tasks.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Nenhum projeto encontrado para exibir no Gantt
        </Typography>
      </Paper>
    );
  }

  const totalDays = differenceInDays(timelineEnd, timelineStart);
  const timelineColumns = [];
  
  // Gerar colunas da timeline (por semana)
  for (let i = 0; i <= totalDays; i += 7) {
    const date = new Date(timelineStart);
    date.setDate(timelineStart.getDate() + i);
    timelineColumns.push(date);
  }

  return (
    <Paper sx={{ height, overflow: 'auto' }}>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 300, maxWidth: 300, position: 'sticky', left: 0, zIndex: 3, backgroundColor: theme.palette.background.paper }}>
                Tarefa
              </TableCell>
              <TableCell sx={{ minWidth: 100, position: 'sticky', left: 300, zIndex: 3, backgroundColor: theme.palette.background.paper }}>
                Progresso
              </TableCell>
              {timelineColumns.map((date, index) => (
                <TableCell key={index} sx={{ minWidth: 100, textAlign: 'center' }}>
                  {format(date, 'dd/MM', { locale: ptBR })}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => {
              const position = calculatePosition(task.startDate, task.endDate);
              
              return (
                <TableRow key={task.id}>
                  <TableCell 
                    sx={{ 
                      position: 'sticky', 
                      left: 0, 
                      zIndex: 2, 
                      backgroundColor: theme.palette.background.paper,
                      paddingLeft: `${task.level * 20 + 16}px`
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        {getTypeIcon(task.type)}
                      </Typography>
                      <Typography 
                        variant={task.type === 'project' ? 'subtitle1' : 'body2'}
                        sx={{ 
                          fontWeight: task.type === 'project' ? 'bold' : 'normal',
                          fontSize: task.type === 'project' ? '1rem' : '0.875rem'
                        }}
                      >
                        {task.name}
                      </Typography>
                      {task.status && (
                        <Chip 
                          label={task.status} 
                          size="small" 
                          sx={{ 
                            ml: 1, 
                            height: 20,
                            backgroundColor: getStatusColor(task.status),
                            color: 'white',
                            fontSize: '0.7rem'
                          }} 
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ position: 'sticky', left: 300, zIndex: 2, backgroundColor: theme.palette.background.paper }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 80 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={task.progress} 
                        sx={{ 
                          flexGrow: 1, 
                          mr: 1,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: theme.palette.grey[200],
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getStatusColor(task.status)
                          }
                        }} 
                      />
                      <Typography variant="caption">
                        {task.progress}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell 
                    colSpan={timelineColumns.length} 
                    sx={{ 
                      position: 'relative', 
                      padding: '8px 0',
                      height: 40
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: task.type === 'project' ? 20 : task.type === 'section' ? 16 : 12,
                        backgroundColor: getStatusColor(task.status),
                        borderRadius: 1,
                        opacity: 0.8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...position
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'white', 
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          textShadow: '1px 1px 1px rgba(0,0,0,0.5)'
                        }}
                      >
                        {differenceInDays(task.endDate, task.startDate)}d
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default GanttView;