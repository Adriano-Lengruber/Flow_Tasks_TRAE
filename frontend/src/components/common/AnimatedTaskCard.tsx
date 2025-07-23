import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Checkbox,
  Chip,
  IconButton,
  alpha,
  useTheme,
  Grow,
  Slide,
  Fade,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CommentIcon from '@mui/icons-material/Comment';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnimatedTaskCardProps {
  task: any;
  canEdit: boolean;
  handleToggleComplete: (task: any) => void;
  handleOpenMenu: (event: React.MouseEvent<HTMLElement>, taskId: string) => void;
  handleOpenCommentDialog: (taskId: string) => void;
  handleOpenTaskDetail: (task: any) => void;
  animationType?: 'grow' | 'slide' | 'fade';
  delay?: number;
}

const AnimatedTaskCard: React.FC<AnimatedTaskCardProps> = ({
  task,
  canEdit,
  handleToggleComplete,
  handleOpenMenu,
  handleOpenCommentDialog,
  handleOpenTaskDetail,
  animationType = 'grow',
  delay = 0,
}) => {
  const theme = useTheme();
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

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

  const TaskCardContent = (
    <Card
      sx={{
        mb: 2,
        opacity: task.completed ? 0.7 : 1,
        bgcolor: task.completed ? 'action.hover' : 'background.paper',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
        },
        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          bgcolor: getPriorityColor(task.priority),
          transition: 'width 0.3s ease',
        },
        '&:hover::before': {
          width: '6px',
        },
      }}
      onClick={() => handleOpenTaskDetail(task)}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography
            variant="subtitle2"
            sx={{
              textDecoration: task.completed ? 'line-through' : 'none',
              color: task.completed ? 'text.secondary' : 'text.primary',
              fontWeight: 500,
              lineHeight: 1.3,
              flex: 1,
              mr: 1,
            }}
          >
            {task.title}
          </Typography>
          {canEdit && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenMenu(e, task.id);
              }}
              sx={{
                opacity: 0.7,
                transition: 'opacity 0.2s ease',
                '&:hover': { opacity: 1 },
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {task.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
              fontSize: '0.875rem',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {task.description}
          </Typography>
        )}

        <Box display="flex" flexWrap="wrap" gap={1} mt={1.5}>
          <Chip
            label={task.priority}
            size="small"
            sx={{
              bgcolor: alpha(getPriorityColor(task.priority), 0.1),
              color: getPriorityColor(task.priority),
              fontWeight: 500,
              fontSize: '0.75rem',
              height: 24,
            }}
          />
          {task.dueDate && (
            <Chip
              label={format(new Date(task.dueDate), 'dd/MM', { locale: ptBR })}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.75rem',
                height: 24,
              }}
            />
          )}
          {task.assignee && (
            <Chip
              label={task.assignee.name}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.75rem',
                height: 24,
              }}
            />
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0, pb: 1.5, px: 2 }}>
        <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
          <Box display="flex" alignItems="center">
            <Checkbox
              checked={task.completed}
              onChange={(e) => {
                e.stopPropagation();
                handleToggleComplete(task);
              }}
              size="small"
              disabled={!canEdit}
              sx={{
                p: 0.5,
                '&.Mui-checked': {
                  color: theme.palette.success.main,
                },
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ ml: 0.5, fontSize: '0.75rem' }}
            >
              {task.completed ? 'Concluída' : 'Pendente'}
            </Typography>
          </Box>
          {task.comments && task.comments.length > 0 && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCommentDialog(task.id);
              }}
              sx={{
                opacity: 0.7,
                transition: 'opacity 0.2s ease',
                '&:hover': { opacity: 1 },
              }}
            >
              <CommentIcon fontSize="small" />
              <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
                {task.comments.length}
              </Typography>
            </IconButton>
          )}
        </Box>
      </CardActions>
    </Card>
  );

  switch (animationType) {
    case 'slide':
      return (
        <Slide direction="up" in={isVisible} timeout={300 + delay}>
          <div>{TaskCardContent}</div>
        </Slide>
      );
    case 'fade':
      return (
        <Fade in={isVisible} timeout={400 + delay}>
          <div>{TaskCardContent}</div>
        </Fade>
      );
    case 'grow':
    default:
      return (
        <Grow in={isVisible} timeout={350 + delay}>
          <div>{TaskCardContent}</div>
        </Grow>
      );
  }
};

export default AnimatedTaskCard;