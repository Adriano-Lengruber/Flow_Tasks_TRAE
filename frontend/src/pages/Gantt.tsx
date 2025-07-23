import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Toolbar,
  IconButton,
  Tooltip
} from '@mui/material';
import { Refresh as RefreshIcon, Timeline as TimelineIcon } from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import { GET_PROJECTS } from '../graphql/projects';
import GanttView from '../components/Gantt/GanttView';
import ResponsiveContainer from '../components/common/ResponsiveContainer';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const GanttPage: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  const { data: projectsData, loading: projectsLoading, refetch } = useQuery(GET_PROJECTS, {
    fetchPolicy: 'cache-and-network'
  });

  const handleProjectChange = (event: any) => {
    setSelectedProjectId(event.target.value);
  };

  const handleRefresh = () => {
    refetch();
  };

  if (projectsLoading) {
    return (
      <ResponsiveContainer>
        <LoadingSkeleton variant="dashboard" count={1} />
      </ResponsiveContainer>
    );
  }

  const projects = projectsData?.projects || [];

  return (
    <ResponsiveContainer>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TimelineIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Visualização Gantt
          </Typography>
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Visualize o cronograma dos seus projetos e tarefas em formato de gráfico de Gantt.
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Toolbar sx={{ px: 0, minHeight: 'auto !important' }}>
              <FormControl sx={{ minWidth: 200, mr: 2 }}>
                <InputLabel>Projeto</InputLabel>
                <Select
                  value={selectedProjectId}
                  label="Projeto"
                  onChange={handleProjectChange}
                >
                  <MenuItem value="all">Todos os Projetos</MenuItem>
                  {projects.map((project: any) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ flexGrow: 1 }} />

              <Tooltip title="Atualizar">
                <IconButton onClick={handleRefresh} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Toolbar>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 0 }}>
            <GanttView 
              projectId={selectedProjectId === 'all' ? undefined : selectedProjectId}
              height={600}
            />
          </CardContent>
        </Card>
      </Box>
    </ResponsiveContainer>
  );
};

export default GanttPage;