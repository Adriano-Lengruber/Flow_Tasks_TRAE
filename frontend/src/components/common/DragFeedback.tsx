import React from 'react';
import {
  Box,
  Typography,
  Fade,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface DragFeedbackProps {
  isVisible: boolean;
  status: 'dragging' | 'success' | 'error' | 'processing';
  message?: string;
}

const DragFeedback: React.FC<DragFeedbackProps> = ({
  isVisible,
  status,
  message,
}) => {
  const theme = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'dragging':
        return {
          icon: <DragIndicatorIcon sx={{ fontSize: 24 }} />,
          color: theme.palette.primary.main,
          message: message || 'Movendo tarefa...',
        };
      case 'processing':
        return {
          icon: <CircularProgress size={24} />,
          color: theme.palette.info.main,
          message: message || 'Processando...',
        };
      case 'success':
        return {
          icon: <CheckCircleIcon sx={{ fontSize: 24 }} />,
          color: theme.palette.success.main,
          message: message || 'Tarefa movida com sucesso!',
        };
      case 'error':
        return {
          icon: <ErrorIcon sx={{ fontSize: 24 }} />,
          color: theme.palette.error.main,
          message: message || 'Erro ao mover tarefa',
        };
      default:
        return {
          icon: <DragIndicatorIcon sx={{ fontSize: 24 }} />,
          color: theme.palette.primary.main,
          message: message || '',
        };
    }
  };

  const { icon, color, message: statusMessage } = getStatusConfig();

  return (
    <Fade in={isVisible} timeout={{ enter: 200, exit: 300 }}>
      <Box
        sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(12px)',
          borderRadius: 3,
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          boxShadow: `0 12px 40px ${alpha(color, 0.3)}`,
          border: `2px solid ${alpha(color, 0.2)}`,
          minWidth: 200,
          animation: status === 'dragging' ? 'pulse 2s infinite' : 'none',
          '@keyframes pulse': {
            '0%': {
              transform: 'translate(-50%, -50%) scale(1)',
              boxShadow: `0 12px 40px ${alpha(color, 0.3)}`,
            },
            '50%': {
              transform: 'translate(-50%, -50%) scale(1.02)',
              boxShadow: `0 16px 50px ${alpha(color, 0.4)}`,
            },
            '100%': {
              transform: 'translate(-50%, -50%) scale(1)',
              boxShadow: `0 12px 40px ${alpha(color, 0.3)}`,
            },
          },
        }}
      >
        <Box
          sx={{
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.primary,
            fontWeight: 500,
          }}
        >
          {statusMessage}
        </Typography>
      </Box>
    </Fade>
  );
};

export default DragFeedback;