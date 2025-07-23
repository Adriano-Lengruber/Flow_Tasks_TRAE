import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Grid,
  useTheme,
} from '@mui/material';

interface LoadingSkeletonProps {
  variant?: 'dashboard' | 'kanban' | 'project-list' | 'task-detail';
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  variant = 'dashboard', 
  count = 3 
}) => {
  const theme = useTheme();

  const renderDashboardSkeleton = () => (
    <Grid container spacing={3}>
      {/* Estatísticas */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton variant="text" width="40%" height={32} sx={{ mt: 1 }} />
                  <Skeleton variant="text" width="80%" height={16} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>
      
      {/* Projetos recentes */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="30%" height={28} sx={{ mb: 2 }} />
            {[1, 2, 3].map((item) => (
              <Box key={item} sx={{ mb: 2 }}>
                <Skeleton variant="text" width="70%" height={20} />
                <Skeleton variant="text" width="90%" height={16} sx={{ mt: 0.5 }} />
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Skeleton variant="rounded" width={60} height={24} />
                  <Skeleton variant="rounded" width={80} height={24} />
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
      
      {/* Tarefas recentes */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
            {[1, 2, 3, 4, 5].map((item) => (
              <Box key={item} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Skeleton variant="circular" width={20} height={20} />
                  <Skeleton variant="text" width="80%" height={18} />
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderKanbanSkeleton = () => (
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
      {[1, 2, 3, 4].map((section) => (
        <Box key={section} sx={{ minWidth: 300, flex: '0 0 auto' }}>
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={24} sx={{ mb: 2 }} />
              {[1, 2, 3].map((task) => (
                <Card key={task} sx={{ mb: 1, bgcolor: 'action.hover' }}>
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Skeleton variant="text" width="90%" height={20} />
                    <Skeleton variant="text" width="70%" height={16} sx={{ mt: 0.5 }} />
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                      <Skeleton variant="rounded" width={50} height={20} />
                      <Skeleton variant="rounded" width={60} height={20} />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </Box>
      ))}
    </Box>
  );

  const renderProjectListSkeleton = () => (
    <Grid container spacing={3}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="70%" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="100%" height={16} />
              <Skeleton variant="text" width="80%" height={16} sx={{ mt: 0.5 }} />
              
              <Box sx={{ mt: 2, mb: 1 }}>
                <Skeleton variant="text" width="40%" height={14} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 1 }} />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Skeleton variant="rounded" width={60} height={24} />
                  <Skeleton variant="rounded" width={50} height={24} />
                </Box>
                <Skeleton variant="circular" width={32} height={32} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderTaskDetailSkeleton = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="80%" height={32} />
            <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }} />
          </Box>
          <Skeleton variant="circular" width={40} height={40} />
        </Box>
        
        <Skeleton variant="text" width="100%" height={16} />
        <Skeleton variant="text" width="90%" height={16} sx={{ mt: 0.5 }} />
        <Skeleton variant="text" width="70%" height={16} sx={{ mt: 0.5 }} />
        
        <Box sx={{ display: 'flex', gap: 1, mt: 2, mb: 2 }}>
          <Skeleton variant="rounded" width={80} height={28} />
          <Skeleton variant="rounded" width={70} height={28} />
          <Skeleton variant="rounded" width={90} height={28} />
        </Box>
        
        <Skeleton variant="text" width="30%" height={20} sx={{ mt: 2, mb: 1 }} />
        {[1, 2, 3].map((comment) => (
          <Box key={comment} sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="20%" height={16} />
              <Skeleton variant="text" width="90%" height={16} sx={{ mt: 0.5 }} />
              <Skeleton variant="text" width="60%" height={16} sx={{ mt: 0.5 }} />
            </Box>
          </Box>
        ))}
      </CardContent>
    </Card>
  );

  const renderSkeleton = () => {
    switch (variant) {
      case 'dashboard':
        return renderDashboardSkeleton();
      case 'kanban':
        return renderKanbanSkeleton();
      case 'project-list':
        return renderProjectListSkeleton();
      case 'task-detail':
        return renderTaskDetailSkeleton();
      default:
        return renderDashboardSkeleton();
    }
  };

  return (
    <Box sx={{ width: '100%', animation: 'pulse 1.5s ease-in-out infinite' }}>
      {renderSkeleton()}
    </Box>
  );
};

export default LoadingSkeleton;