import React from 'react';
import {
  Backdrop,
  Box,
  Typography,
  CircularProgress,
  Fade,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
} from '@mui/icons-material';

interface FeedbackOverlayProps {
  open: boolean;
  type: 'loading' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  autoHideDuration?: number;
}

const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({
  open,
  type,
  message,
  onClose,
  autoHideDuration = 3000,
}) => {
  const theme = useTheme();

  React.useEffect(() => {
    if (open && type !== 'loading' && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [open, type, autoHideDuration, onClose]);

  const getIcon = () => {
    const iconProps = { sx: { fontSize: 48, mb: 2 } };
    
    switch (type) {
      case 'loading':
        return <CircularProgress size={48} sx={{ mb: 2 }} />;
      case 'success':
        return <CheckCircle {...iconProps} color="success" />;
      case 'error':
        return <Error {...iconProps} color="error" />;
      case 'warning':
        return <Warning {...iconProps} color="warning" />;
      case 'info':
        return <Info {...iconProps} color="info" />;
      default:
        return <CircularProgress size={48} sx={{ mb: 2 }} />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'info':
        return theme.palette.info.main;
      default:
        return theme.palette.primary.main;
    }
  };

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: theme.zIndex.modal + 1,
        bgcolor: alpha(theme.palette.background.default, 0.8),
        backdropFilter: 'blur(4px)',
      }}
      open={open}
      onClick={type !== 'loading' ? onClose : undefined}
    >
      <Fade in={open}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            borderRadius: 3,
            bgcolor: theme.palette.background.paper,
            boxShadow: theme.shadows[24],
            border: `2px solid ${alpha(getColor(), 0.2)}`,
            minWidth: 300,
            maxWidth: 400,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              bgcolor: getColor(),
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          {getIcon()}
          <Typography
            variant="h6"
            sx={{
              color: 'text.primary',
              fontWeight: 600,
              mb: type === 'loading' ? 1 : 0,
            }}
          >
            {message}
          </Typography>
          {type === 'loading' && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 1,
              }}
            >
              Por favor, aguarde...
            </Typography>
          )}
        </Box>
      </Fade>
    </Backdrop>
  );
};

export default FeedbackOverlay;