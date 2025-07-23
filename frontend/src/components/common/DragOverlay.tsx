import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DragOverlayProps {
  task: {
    id: string;
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    completed: boolean;
    assignee?: {
      name: string;
    };
  };
}

const DragOverlay: React.FC<DragOverlayProps> = ({ task }) => {
  const theme = useTheme();

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'alta':
        return theme.palette.error.main;
      case 'medium':
      case 'média':
        return theme.palette.warning.main;
      case 'low':
      case 'baixa':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Card
      sx={{
        width: 280,
        opacity: 0.9,
        transform: 'rotate(5deg)',
        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
        border: `2px solid ${theme.palette.primary.main}`,
        bgcolor: theme.palette.background.paper,
        cursor: 'grabbing',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: theme.palette.primary.main,
          borderRadius: '4px 4px 0 0',
        },
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            mb: 1,
            textDecoration: task.completed ? 'line-through' : 'none',
            opacity: task.completed ? 0.7 : 1,
          }}
        >
          {task.title}
        </Typography>
        
        {task.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, fontSize: '0.875rem' }}
          >
            {task.description.length > 60
              ? `${task.description.substring(0, 60)}...`
              : task.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
          {task.priority && (
            <Chip
              label={task.priority}
              size="small"
              sx={{
                bgcolor: alpha(getPriorityColor(task.priority), 0.1),
                color: getPriorityColor(task.priority),
                fontWeight: 500,
                fontSize: '0.75rem',
              }}
            />
          )}
          
          {task.dueDate && (
            <Chip
              label={format(new Date(task.dueDate), 'dd/MM', { locale: ptBR })}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          )}
          
          {task.assignee && (
            <Chip
              label={task.assignee.name}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default DragOverlay;