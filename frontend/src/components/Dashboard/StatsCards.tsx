import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  Schedule,
  TrendingUp,
  Group,
  Folder,
} from '@mui/icons-material';

interface StatsData {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  teamMembers: number;
}

interface StatsCardsProps {
  data: StatsData;
  loading?: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({ data, loading = false }) => {
  const theme = useTheme();

  const completionRate = data.totalTasks > 0 
    ? Math.round((data.completedTasks / data.totalTasks) * 100) 
    : 0;

  const stats = [
    {
      title: 'Projetos Ativos',
      value: data.totalProjects,
      icon: <Folder />,
      color: theme.palette.primary.main,
      bgColor: alpha(theme.palette.primary.main, 0.1),
      subtitle: 'Total de projetos',
    },
    {
      title: 'Tarefas Totais',
      value: data.totalTasks,
      icon: <Assignment />,
      color: theme.palette.info.main,
      bgColor: alpha(theme.palette.info.main, 0.1),
      subtitle: 'Em todos os projetos',
    },
    {
      title: 'Taxa de Conclusão',
      value: `${completionRate}%`,
      icon: <TrendingUp />,
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.1),
      subtitle: `${data.completedTasks} de ${data.totalTasks} concluídas`,
      progress: completionRate,
    },
    {
      title: 'Membros da Equipe',
      value: data.teamMembers,
      icon: <Group />,
      color: theme.palette.secondary.main,
      bgColor: alpha(theme.palette.secondary.main, 0.1),
      subtitle: 'Colaboradores ativos',
    },
  ];

  return (
    <Grid container spacing={3}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card
            sx={{
              height: '100%',
              background: `linear-gradient(135deg, ${stat.bgColor} 0%, ${alpha(stat.color, 0.05)} 100%)`,
              border: `1px solid ${alpha(stat.color, 0.1)}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 25px ${alpha(stat.color, 0.15)}`,
                border: `1px solid ${alpha(stat.color, 0.2)}`,
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: stat.color,
                      mb: 0.5,
                      fontSize: { xs: '1.75rem', sm: '2rem' },
                    }}
                  >
                    {loading ? '...' : stat.value}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                      mb: 0.5,
                      fontSize: { xs: '0.9rem', sm: '1rem' },
                    }}
                  >
                    {stat.title}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(stat.color, 0.1),
                    color: stat.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {React.cloneElement(stat.icon, { fontSize: 'medium' })}
                </Box>
              </Box>
              
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: stat.progress !== undefined ? 1 : 0 }}
              >
                {stat.subtitle}
              </Typography>
              
              {stat.progress !== undefined && (
                <Box>
                  <LinearProgress
                    variant="determinate"
                    value={stat.progress}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: alpha(stat.color, 0.1),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: stat.color,
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
      
      {/* Cards de status adiccionais */}
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Chip
            icon={<CheckCircle />}
            label={`${data.completedTasks} Concluídas`}
            sx={{
              bgcolor: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.main,
              fontWeight: 600,
              '& .MuiChip-icon': {
                color: theme.palette.success.main,
              },
            }}
          />
          <Chip
            icon={<Schedule />}
            label={`${data.pendingTasks} Pendentes`}
            sx={{
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              color: theme.palette.warning.main,
              fontWeight: 600,
              '& .MuiChip-icon': {
                color: theme.palette.warning.main,
              },
            }}
          />
          {data.overdueTasks > 0 && (
            <Chip
              icon={<Schedule />}
              label={`${data.overdueTasks} Atrasadas`}
              sx={{
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                fontWeight: 600,
                '& .MuiChip-icon': {
                  color: theme.palette.error.main,
                },
              }}
            />
          )}
        </Box>
      </Grid>
    </Grid>
  );
};

export default StatsCards;