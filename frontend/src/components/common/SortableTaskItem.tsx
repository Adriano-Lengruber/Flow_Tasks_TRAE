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
} from '@mui/material';
import {
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CommentIcon from '@mui/icons-material/Comment';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SortableTaskItemProps {
  id: string;
  task: any;
  sectionId: string;
  canEdit: boolean;
  handleToggleComplete: (task: any) => void;
  handleOpenMenu: (event: React.MouseEvent<HTMLElement>, taskId: string) => void;
  handleOpenCommentDialog: (taskId: string) => void;
  handleOpenTaskDetail: (task: any) => void;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  id,
  task,
  sectionId,
  canEdit,
  handleToggleComplete,
  handleOpenMenu,
  handleOpenCommentDialog,
  handleOpenTaskDetail,
}) => {
  const theme = useTheme();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id,
    data: {
      type: 'task',
      task,
      sectionId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        mb: 2,
        opacity: isDragging ? 0.5 : task.completed ? 0.7 : 1,
        bgcolor: task.completed ? 'action.hover' : 'background.paper',
        cursor: isDragging ? 'grabbing' : 'grab',
        transform: isDragging ? 'rotate(5deg) scale(1.05)' : isOver ? 'scale(1.02)' : 'none',
        boxShadow: isDragging 
          ? `0 20px 40px ${alpha(theme.palette.primary.main, 0.5)}` 
          : isOver 
          ? `0 8px 25px ${alpha(theme.palette.primary.main, 0.3)}`
          : theme.shadows[1],
        border: isOver 
          ? `2px solid ${theme.palette.primary.main}` 
          : isDragging
          ? `2px solid ${alpha(theme.palette.primary.main, 0.3)}`
          : '1px solid transparent',
        transition: isDragging 
          ? 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.2s ease'
          : 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        position: 'relative',
        zIndex: isDragging ? 1000 : 1,
        '&:hover': {
          boxShadow: isDragging 
            ? `0 12px 30px ${alpha(theme.palette.primary.main, 0.4)}`
            : `0 6px 20px ${alpha(theme.palette.primary.main, 0.2)}`,
          transform: isDragging ? 'rotate(3deg) scale(1.02)' : 'translateY(-3px) scale(1.01)',
        },
        '&::before': isDragging ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.main, 0.05)})`,
          borderRadius: 'inherit',
          zIndex: -1,
        } : {},
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box display="flex" alignItems="flex-start" sx={{ width: '100%' }}>
            <Checkbox
              checked={task.completed}
              onChange={(e) => {
                e.stopPropagation();
                const taskWithCorrectId = {
                  ...task,
                  id: task.id.includes(':') ? task.id.split(':')[0] : task.id
                };
                handleToggleComplete(taskWithCorrectId);
              }}
              sx={{ mt: -0.5, ml: -1 }}
              disabled={!canEdit}
              onClick={(e) => e.stopPropagation()}
            />
            <Box sx={{ width: '100%' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  textDecoration: task.completed ? 'line-through' : 'none',
                  wordBreak: 'break-word',
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenTaskDetail(task);
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
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenMenu(e, task.id);
            }}
            disabled={!canEdit}
            sx={{ ml: 1 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
          {task.priority && (
            <Chip
              label={task.priority}
              size="small"
              sx={{
                bgcolor: alpha(getPriorityColor(task.priority), 0.1),
                color: getPriorityColor(task.priority),
                fontWeight: 'medium',
              }}
              variant="outlined"
            />
          )}
          {task.dueDate && (
            <Chip
              label={format(new Date(task.dueDate), 'dd/MM', { locale: ptBR })}
              size="small"
              color={new Date(task.dueDate) < new Date() ? 'error' : 'default'}
              variant="outlined"
            />
          )}
          {task.assignee && (
            <Chip
              label={task.assignee.name}
              size="small"
              variant="outlined"
              sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}
            />
          )}
        </Box>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 1 }}>
        <Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCommentDialog(task.id);
            }}
            sx={{ 
              color: task.comments?.length > 0 ? theme.palette.primary.main : 'inherit',
            }}
          >
            <CommentIcon fontSize="small" />
            {task.comments?.length > 0 && (
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                {task.comments.length}
              </Typography>
            )}
          </IconButton>
        </Box>
      </CardActions>
    </Card>
  );
};

export default SortableTaskItem;