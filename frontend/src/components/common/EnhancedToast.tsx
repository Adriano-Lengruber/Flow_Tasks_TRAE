import React from 'react';
import {
  Snackbar,
  Alert,
  AlertProps,
  Slide,
  SlideProps,
  Grow,
  Fade,
  Box,
  Typography,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  Close,
} from '@mui/icons-material';

type TransitionType = 'slide' | 'grow' | 'fade';
type ToastPosition = {
  vertical: 'top' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
};

interface EnhancedToastProps {
  open: boolean;
  message: string;
  severity?: AlertProps['severity'];
  duration?: number;
  position?: ToastPosition;
  transition?: TransitionType;
  showIcon?: boolean;
  showCloseButton?: boolean;
  onClose: () => void;
  action?: React.ReactNode;
  emoji?: string;
}

const TransitionSlide = (props: SlideProps) => {
  return <Slide {...props} direction="up" />;
};

const getIcon = (severity: AlertProps['severity']) => {
  switch (severity) {
    case 'success':
      return <CheckCircle />;
    case 'error':
      return <Error />;
    case 'warning':
      return <Warning />;
    case 'info':
    default:
      return <Info />;
  }
};

const getTransitionComponent = (transition: TransitionType) => {
  switch (transition) {
    case 'slide':
      return TransitionSlide;
    case 'grow':
      return Grow;
    case 'fade':
      return Fade;
    default:
      return TransitionSlide;
  }
};

export const EnhancedToast: React.FC<EnhancedToastProps> = ({
  open,
  message,
  severity = 'info',
  duration = 4000,
  position = { vertical: 'bottom', horizontal: 'left' },
  transition = 'slide',
  showIcon = true,
  showCloseButton = true,
  onClose,
  action,
  emoji,
}) => {
  const theme = useTheme();
  const TransitionComponent = getTransitionComponent(transition);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    onClose();
  };

  const getAlertStyles = () => {
    const baseStyles = {
      borderRadius: 2,
      boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`,
      backdropFilter: 'blur(8px)',
      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      minWidth: 300,
      maxWidth: 500,
    };

    // Adicionar estilos específicos por severity
    switch (severity) {
      case 'success':
        return {
          ...baseStyles,
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)}, ${alpha(theme.palette.success.light, 0.05)})`,
          borderColor: alpha(theme.palette.success.main, 0.3),
        };
      case 'error':
        return {
          ...baseStyles,
          background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)}, ${alpha(theme.palette.error.light, 0.05)})`,
          borderColor: alpha(theme.palette.error.main, 0.3),
        };
      case 'warning':
        return {
          ...baseStyles,
          background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)}, ${alpha(theme.palette.warning.light, 0.05)})`,
          borderColor: alpha(theme.palette.warning.main, 0.3),
        };
      case 'info':
      default:
        return {
          ...baseStyles,
          background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)}, ${alpha(theme.palette.info.light, 0.05)})`,
          borderColor: alpha(theme.palette.info.main, 0.3),
        };
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={handleClose}
      anchorOrigin={position}
      TransitionComponent={TransitionComponent}
      sx={{
        '& .MuiSnackbarContent-root': {
          padding: 0,
          backgroundColor: 'transparent',
          boxShadow: 'none',
        },
      }}
    >
      <Alert
        severity={severity}
        onClose={showCloseButton ? handleClose : undefined}
        icon={showIcon ? getIcon(severity) : false}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {action}
            {showCloseButton && (
              <IconButton
                size="small"
                onClick={handleClose}
                sx={{
                  color: 'inherit',
                  opacity: 0.7,
                  '&:hover': {
                    opacity: 1,
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <Close fontSize="small" />
              </IconButton>
            )}
          </Box>
        }
        sx={getAlertStyles()}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {emoji && (
            <Typography
              component="span"
              sx={{
                fontSize: '1.2em',
                lineHeight: 1,
              }}
            >
              {emoji}
            </Typography>
          )}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            {message}
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
};

// Hook para usar o toast de forma mais fácil
export const useEnhancedToast = () => {
  const [toastState, setToastState] = React.useState<{
    open: boolean;
    message: string;
    severity: AlertProps['severity'];
    emoji?: string;
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showToast = React.useCallback(
    (
      message: string,
      severity: AlertProps['severity'] = 'info',
      emoji?: string
    ) => {
      setToastState({
        open: true,
        message,
        severity,
        emoji,
      });
    },
    []
  );

  const hideToast = React.useCallback(() => {
    setToastState((prev) => ({ ...prev, open: false }));
  }, []);

  const showSuccess = React.useCallback(
    (message: string, emoji?: string) => {
      showToast(message, 'success', emoji || '✅');
    },
    [showToast]
  );

  const showError = React.useCallback(
    (message: string, emoji?: string) => {
      showToast(message, 'error', emoji || '❌');
    },
    [showToast]
  );

  const showWarning = React.useCallback(
    (message: string, emoji?: string) => {
      showToast(message, 'warning', emoji || '⚠️');
    },
    [showToast]
  );

  const showInfo = React.useCallback(
    (message: string, emoji?: string) => {
      showToast(message, 'info', emoji || 'ℹ️');
    },
    [showToast]
  );

  return {
    toastState,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

export default EnhancedToast;