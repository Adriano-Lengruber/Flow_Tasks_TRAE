import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Tooltip,
  alpha,
  useTheme,
  useMediaQuery,
  Fade,
} from '@mui/material';
import { AnimatedIconButton } from './AnimatedButton';
import ProcessingIndicator from './ProcessingIndicator';
import {
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SortableTaskItem from './SortableTaskItem';

interface SortableSectionProps {
  section: {
    id: string;
    name: string;
    tasks: any[];
  };
  canEdit: boolean;
  handleOpenTaskDialog: (sectionId: string) => void;
  handleDeleteSection: (sectionId: string) => void;
  handleToggleComplete: (task: any) => void;
  handleOpenMenu: (event: React.MouseEvent<HTMLElement>, taskId: string) => void;
  handleOpenCommentDialog: (taskId: string) => void;
  handleOpenTaskDetail: (task: any) => void;
  isProcessing?: boolean;
}

const SortableSection: React.FC<SortableSectionProps> = ({
  section,
  canEdit,
  handleOpenTaskDialog,
  handleDeleteSection,
  handleToggleComplete,
  handleOpenMenu,
  handleOpenCommentDialog,
  handleOpenTaskDetail,
  isProcessing = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { setNodeRef, isOver, active } = useDroppable({
    id: section.id,
    data: {
      type: 'section',
      sectionId: section.id,
    },
  });

  const isDraggingTask = active?.data.current?.type === 'task';
  const isValidDropTarget = isDraggingTask && isOver;

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        p: { xs: 1.5, sm: 2 },
        height: isMobile ? 'auto' : '100%',
        minHeight: { xs: '300px', sm: '400px', md: '500px' },
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isValidDropTarget 
          ? alpha(theme.palette.primary.main, 0.08)
          : 'background.default',
        border: isValidDropTarget 
          ? `3px solid ${theme.palette.primary.main}`
          : isDraggingTask
          ? `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`
          : '2px dashed transparent',
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        position: 'relative',
        overflow: 'hidden',
        transform: isValidDropTarget ? (isMobile ? 'scale(1.02)' : 'scale(1.03)') : 'scale(1)',
        opacity: isProcessing ? 0.7 : 1,
        '&::before': isValidDropTarget ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at center, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
          animation: 'pulse 2s infinite',
          zIndex: 0,
        } : {},
        '@keyframes pulse': {
          '0%': {
            opacity: 0.3,
            transform: 'scale(1)',
          },
          '50%': {
            opacity: 0.7,
            transform: 'scale(1.01)',
          },
          '100%': {
            opacity: 0.3,
            transform: 'scale(1)',
          },
        },
      }}
      elevation={isValidDropTarget ? 4 : 1}
    >
      {/* Indicador visual de drop zone ativo */}
      <Fade in={isValidDropTarget} timeout={{ enter: 300, exit: 200 }}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            pointerEvents: 'none',
            backdropFilter: 'blur(2px)',
          }}
        >
          <Box
            sx={{
              bgcolor: theme.palette.primary.main,
              color: 'white',
              px: 4,
              py: 2,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
              transform: 'scale(1.05)',
              animation: 'bounce 1s infinite',
              '@keyframes bounce': {
                '0%, 20%, 50%, 80%, 100%': {
                  transform: 'scale(1.05) translateY(0)',
                },
                '40%': {
                  transform: 'scale(1.05) translateY(-8px)',
                },
                '60%': {
                  transform: 'scale(1.05) translateY(-4px)',
                },
              },
            }}
          >
            <AddIcon sx={{ fontSize: 24 }} />
            <Box>
              <Typography variant="body1" fontWeight="bold">
                Soltar aqui
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                em "{section.name}"
              </Typography>
            </Box>
          </Box>
        </Box>
      </Fade>

      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={{ xs: 1.5, sm: 2 }}
        sx={{ zIndex: 2, position: 'relative' }}
      >
        <Typography 
          variant={isSmallMobile ? 'subtitle1' : 'h6'} 
          sx={{ 
            fontWeight: 'medium',
            fontSize: { xs: '1rem', sm: '1.25rem' },
            lineHeight: 1.2,
          }}
        >
          {section.name}
          <Typography 
            component="span" 
            variant="caption" 
            sx={{ 
              ml: { xs: 0.5, sm: 1 }, 
              color: 'text.secondary',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              px: { xs: 0.5, sm: 1 },
              py: 0.25,
              borderRadius: 1,
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
            }}
          >
            {section.tasks.length}
          </Typography>
        </Typography>
        <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 } }}>
          <Tooltip title="Adicionar Tarefa">
            <AnimatedIconButton
              size={isMobile ? 'medium' : 'small'}
              onClick={() => handleOpenTaskDialog(section.id)}
              disabled={!canEdit}
              animationType="bounce"
              isAnimating={false}
              hoverEffect={true}
              sx={{
                minWidth: { xs: 40, sm: 'auto' },
                minHeight: { xs: 40, sm: 'auto' },
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                },
              }}
            >
              <AddIcon fontSize={isMobile ? 'medium' : 'small'} />
            </AnimatedIconButton>
          </Tooltip>
          <Tooltip title="Excluir Seção">
            <AnimatedIconButton
              size={isMobile ? 'medium' : 'small'}
              color="error"
              onClick={() => handleDeleteSection(section.id)}
              disabled={!canEdit}
              animationType="shake"
              isAnimating={false}
              hoverEffect={true}
              sx={{
                minWidth: { xs: 40, sm: 'auto' },
                minHeight: { xs: 40, sm: 'auto' },
                '&:hover': {
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                },
              }}
            >
              <DeleteIcon fontSize={isMobile ? 'medium' : 'small'} />
            </AnimatedIconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box 
        sx={{ 
          flexGrow: 1, 
          minHeight: { xs: '150px', sm: '200px', md: '250px' },
          zIndex: 2,
          position: 'relative',
          overflowY: isMobile ? 'visible' : 'auto',
          maxHeight: isMobile ? 'none' : '70vh',
          // Scroll personalizado para desktop
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: alpha(theme.palette.grey[300], 0.3),
            borderRadius: 3,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(theme.palette.grey[500], 0.5),
            borderRadius: 3,
            '&:hover': {
              backgroundColor: alpha(theme.palette.grey[600], 0.7),
            },
          },
        }}
      >
        {/* Indicador de processamento */}
        <ProcessingIndicator
          isVisible={isProcessing}
          message="Processando tarefa..."
          variant="overlay"
          size="medium"
          color="primary"
        />
        {section.tasks.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: { xs: '120px', sm: '150px' },
              border: `2px dashed ${alpha(theme.palette.grey[400], 0.5)}`,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.grey[50], 0.5),
              transition: 'all 0.3s ease-in-out',
              p: { xs: 1, sm: 2 },
            }}
          >
            <AddIcon 
              sx={{ 
                fontSize: { xs: 32, sm: 40 }, 
                color: alpha(theme.palette.grey[400], 0.7),
                mb: { xs: 0.5, sm: 1 },
              }} 
            />
            <Typography
              variant={isSmallMobile ? 'caption' : 'body2'}
              color="text.secondary"
              sx={{ 
                textAlign: 'center',
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                lineHeight: 1.3,
              }}
            >
              Nenhuma tarefa nesta seção
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ 
                textAlign: 'center', 
                mt: { xs: 0.25, sm: 0.5 },
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                lineHeight: 1.2,
                px: 1,
              }}
            >
              {isMobile ? 'Toque em + para criar' : 'Arraste uma tarefa aqui ou clique em + para criar'}
            </Typography>
          </Box>
        ) : (
          <SortableContext
            items={section.tasks.map((task: any) => `${task.id}:${section.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {section.tasks.map((task: any) => (
              <SortableTaskItem
                key={`${task.id}:${section.id}`}
                id={`${task.id}:${section.id}`}
                task={task}
                sectionId={section.id}
                canEdit={canEdit}
                handleToggleComplete={handleToggleComplete}
                handleOpenMenu={handleOpenMenu}
                handleOpenCommentDialog={handleOpenCommentDialog}
                handleOpenTaskDetail={handleOpenTaskDetail}
              />
            ))}
          </SortableContext>
        )}
      </Box>
    </Paper>
  );
};

export default SortableSection;