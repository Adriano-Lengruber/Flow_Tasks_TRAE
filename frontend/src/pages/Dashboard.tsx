import React from 'react';
import { useQuery, gql } from '@apollo/client';
import { Typography, Box } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ResponsiveContainer from '../components/common/ResponsiveContainer';
import StatsCards from '../components/Dashboard/StatsCards';
import RecentActivity from '../components/Dashboard/RecentActivity';

const GET_USER_PROJECTS = gql`
  query GetUserProjects {
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
          priority
          dueDate
          assignee {
            id
            name
          }
        }
      }
    }
  }
`;

const GET_USER_INFO = gql`
  query GetUserInfo {
    me {
      id
      name
      email
    }
  }
`;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: userInfo, loading: userLoading } = useQuery(GET_USER_INFO, {
    skip: !user,
  });
  const { data: projectsData, loading: projectsLoading, error } = useQuery(GET_USER_PROJECTS, {
    skip: !user,
  });

  const loading = userLoading || projectsLoading;
  
  if (loading) return (
    <ResponsiveContainer variant="dashboard">
      <LoadingSkeleton variant="dashboard" />
    </ResponsiveContainer>
  );
  if (error) return <Typography color="error">Erro ao carregar dados: {error.message}</Typography>;

  const userData = userInfo?.me;
  const projects = projectsData?.projects || [];
  const activities: any[] = []; // Temporariamente vazio até implementarmos as atividades recentes
  
  const allTasks = projects.reduce((acc: any[], project: any) => {
    const projectTasks = project.sections?.reduce((sectionAcc: any[], section: any) => {
      return sectionAcc.concat(section.tasks || []);
    }, []) || [];
    return acc.concat(projectTasks);
  }, []);
  const completedTasks = allTasks.filter((task: any) => task.completed);
  const pendingTasks = allTasks.filter((task: any) => !task.completed);
  const overdueTasks = allTasks.filter((task: any) => 
    !task.completed && task.dueDate && new Date(task.dueDate) < new Date()
  );

  const teamMembers = new Set(allTasks.map((task: any) => task.assignee?.id).filter(Boolean)).size;

  // Dados para o componente de estatísticas
  const statsData = {
    totalProjects: projects.length,
    totalTasks: allTasks.length,
    completedTasks: completedTasks.length,
    pendingTasks: pendingTasks.length,
    overdueTasks: overdueTasks.length,
    teamMembers: teamMembers,
  };

  return (
    <ResponsiveContainer variant="dashboard">
      <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
        <Typography 
          variant="h4" 
          gutterBottom
          sx={{
            fontWeight: 700,
            mb: 3,
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
          }}
        >
          Bem-vindo, {userData?.name || 'Usuário'}!
        </Typography>
        
        {/* Estatísticas Gerais */}
        <Box sx={{ mb: 4 }}>
          <StatsCards data={statsData} loading={loading} />
        </Box>

        {/* Atividades Recentes */}
        <Box sx={{ mb: 4 }}>
          <RecentActivity activities={activities} loading={loading} />
        </Box>
      </Box>
    </ResponsiveContainer>
  );
};



export default Dashboard;