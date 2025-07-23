import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Chip,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  Comment,
  PersonAdd,
  Edit,
  Delete,
  Folder,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Activity {
  id: string;
  type: 'task_created' | 'task_completed' | 'comment_added' | 'member_added' | 'task_updated' | 'task_deleted' | 'project_created';
  title: string;
  description: string;
  user: {
    name: string;
    avatar?: string;
  };
  createdAt: string;
  project?: {
    name: string;
    id: string;
  };
  task?: {
    name: string;
    id: string;
  };
}

interface RecentActivityProps {
  activities: Activity[];
  loading?: boolean;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities, loading = false }) => {
  const theme = useTheme();

  const getActivityIcon = (type: Activity['type']) => {
    const iconProps = { fontSize: 'small' as const };
    
    switch (type) {
      case 'task_created':
        return <Assignment {...iconProps} />;
      case 'task_completed':
        return <CheckCircle {...iconProps} />;
      case 'comment_added':
        return <Comment {...iconProps} />;
      case 'member_added':
        return <PersonAdd {...iconProps} />;
      case 'task_updated':
        return <Edit {...iconProps} />;
      case 'task_deleted':
        return <Delete {...iconProps} />;
      case 'project_created':
        return <Folder {...iconProps} />;
      default:
        return <Assignment {...iconProps} />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'task_created':
        return theme.palette.primary.main;
      case 'task_completed':
        return theme.palette.success.main;
      case 'comment_added':
        return theme.palette.info.main;
      case 'member_added':
        return theme.palette.secondary.main;
      case 'task_updated':
        return theme.palette.warning.main;
      case 'task_deleted':
        return theme.palette.error.main;
      case 'project_created':
        return theme.palette.primary.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getActivityTypeLabel = (type: Activity['type']) => {
    switch (type) {
      case 'task_created':
        return 'Tarefa Criada';
      case 'task_completed':
        return 'Tarefa Concluída';
      case 'comment_added':
        return 'Comentário';
      case 'member_added':
        return 'Membro Adicionado';
      case 'task_updated':
        return 'Tarefa Atualizada';
      case 'task_deleted':
        return 'Tarefa Removida';
      case 'project_created':
        return 'Projeto Criado';
      default:
        return 'Atividade';
    }
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardHeader title="Atividades Recentes" />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[...Array(5)].map((_, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: 'grey.200',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      height: 16,
                      bgcolor: 'grey.200',
                      borderRadius: 1,
                      mb: 1,
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  />
                  <Box
                    sx={{
                      height: 12,
                      bgcolor: 'grey.200',
                      borderRadius: 1,
                      width: '70%',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%', maxHeight: 600, overflow: 'hidden' }}>
      <CardHeader
        title="Atividades Recentes"
        titleTypographyProps={{
          variant: 'h6',
          fontWeight: 600,
        }}
        sx={{
          pb: 1,
          '& .MuiCardHeader-title': {
            color: 'text.primary',
          },
        }}
      />
      <CardContent sx={{ pt: 0, pb: 0, height: 'calc(100% - 64px)', overflow: 'auto' }}>
        {activities.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 200,
              color: 'text.secondary',
            }}
          >
            <Assignment sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body1">Nenhuma atividade recente</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {activities.map((activity, index) => {
              const color = getActivityColor(activity.type);
              
              return (
                <React.Fragment key={activity.id}>
                  <ListItem
                    sx={{
                      px: 0,
                      py: 2,
                      '&:hover': {
                        bgcolor: alpha(color, 0.04),
                        borderRadius: 1,
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: alpha(color, 0.1),
                          color: color,
                          width: 40,
                          height: 40,
                        }}
                        src={activity.user.avatar}
                      >
                        {activity.user.avatar ? undefined : getActivityIcon(activity.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {activity.user.name}
                          </Typography>
                          <Chip
                            label={getActivityTypeLabel(activity.type)}
                            size="small"
                            sx={{
                              bgcolor: alpha(color, 0.1),
                              color: color,
                              fontSize: '0.75rem',
                              height: 20,
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                            {activity.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activity.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            {activity.project && (
                              <Chip
                                label={activity.project.name}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 18 }}
                              />
                            )}
                            <Typography variant="caption" color="text.secondary">
                              {formatDistanceToNow(new Date(activity.createdAt), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < activities.length - 1 && (
                    <Divider sx={{ mx: 0 }} />
                  )}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;