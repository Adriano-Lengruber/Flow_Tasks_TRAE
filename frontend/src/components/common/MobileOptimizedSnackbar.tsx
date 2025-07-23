import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  AlertProps,
  SnackbarProps,
  IconButton,
  Button,
  Box,
  Typography,
  Slide,
  Fade,
  useTheme,
  useMediaQuery,
  alpha,
  LinearProgress,
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Error,
  Warning,
  Info,
  Wifi,
  WifiOff,
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';

type SnackbarVariant = 'success' | 'error' | 'warning' | 'info' | 'offline' | 'online';

interface MobileOptimizedSnackbarProps extends Omit<SnackbarProps, 'message'> {
  message: React.ReactNode;
  variant?: SnackbarVariant;
  
  // Configurações mobile
  mobilePosition?: 'top' | 'bottom' | 'center';
  fullWidth?: boolean;
  showProgress?: boolean;
  swipeToClose?: boolean;
  
  // Ações
  action?: React.ReactNode;
  actionLabel?: string;
  onActionClick?: () => void;
  showCloseButton?: boolean;
  
  // Comportamento
  persistent?: boolean;
  pauseOnHover?: boolean;
  pauseOnFocus?: boolean;
  
  // Customização
  icon?: React.ReactNode;
  hideIcon?: boolean;
  elevation?: number;
}

const SlideUpTransition = React.forwardRef<unknown, TransitionProps & { children: React.ReactElement }>(
  function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
  }
);

const SlideDownTransition = React.forwardRef<unknown, TransitionProps & { children: React.ReactElement }>(
  function Transition(props, ref) {
    return <Slide direction="down" ref={ref} {...props} />;
  }
);

const FadeTransition = React.forwardRef<unknown, TransitionProps & { children: React.ReactElement }>(
  function Transition(props, ref) {
    return <Fade ref={ref} {...props} />;
  }
);

const getVariantIcon = (variant: SnackbarVariant) => {
  switch (variant) {
    case 'success': return <CheckCircle />;
    case 'error': return <Error />;
    case 'warning': return <Warning />;
    case 'info': return <Info />;
    case 'online': return <Wifi />;
    case 'offline': return <WifiOff />;
    default: return <Info />;
  }
};

const getVariantColor = (variant: SnackbarVariant): AlertProps['severity'] => {
  switch (variant) {
    case 'success':
    case 'online':
      return 'success';
    case 'error':
    case 'offline':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
};

export const MobileOptimizedSnackbar: React.FC<MobileOptimizedSnackbarProps> = ({
  message,
  variant = 'info',
  mobilePosition = 'bottom',
  fullWidth = true,
  showProgress = false,
  swipeToClose = true,
  action,
  actionLabel,
  onActionClick,
  showCloseButton = true,
  persistent = false,
  pauseOnHover = true,
  pauseOnFocus = true,
  icon,
  hideIcon = false,
  elevation = 6,
  autoHideDuration = 6000,
  onClose,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragStart, setDragStart] = useState<number | null>(null);

  // Configurar posição baseada no dispositivo
  const getAnchorOrigin = () => {
    if (!isMobile) {
      return { vertical: 'bottom' as const, horizontal: 'left' as const };
    }
    
    switch (mobilePosition) {
      case 'top':
        return { vertical: 'top' as const, horizontal: 'center' as const };
      case 'center':
        return { vertical: 'top' as const, horizontal: 'center' as const };
      case 'bottom':
      default:
        return { vertical: 'bottom' as const, horizontal: 'center' as const };
    }
  };

  // Configurar transição baseada na posição
  const getTransitionComponent = () => {
    if (mobilePosition === 'top') return SlideDownTransition;
    if (mobilePosition === 'center') return FadeTransition;
    return SlideUpTransition;
  };

  // Progress bar para auto-hide
  useEffect(() => {
    if (!showProgress || !autoHideDuration || persistent || isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (autoHideDuration / 100));
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [showProgress, autoHideDuration, persistent, isPaused]);

  // Handlers para swipe to close
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeToClose || !isMobile) return;
    setDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeToClose || !isMobile || dragStart === null) return;
    
    const currentY = e.touches[0].clientY;
    const offset = currentY - dragStart;
    
    // Permitir swipe baseado na posição
    if (mobilePosition === 'bottom' && offset < 0) {
      setDragOffset(offset);
    } else if (mobilePosition === 'top' && offset > 0) {
      setDragOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    if (!swipeToClose || !isMobile || dragStart === null) return;
    
    // Se o usuário arrastou mais de 50px, fechar snackbar
    if (Math.abs(dragOffset) > 50) {
      onClose?.(null as any, 'timeout');
    }
    
    setDragStart(null);
    setDragOffset(0);
  };

  // Pause/resume handlers
  const handleMouseEnter = () => {
    if (pauseOnHover) setIsPaused(true);
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) setIsPaused(false);
  };

  const handleFocus = () => {
    if (pauseOnFocus) setIsPaused(true);
  };

  const handleBlur = () => {
    if (pauseOnFocus) setIsPaused(false);
  };

  const anchorOrigin = getAnchorOrigin();
  const TransitionComponent = getTransitionComponent();

  return (
    <Snackbar
      {...props}
      anchorOrigin={anchorOrigin}
      autoHideDuration={persistent ? null : autoHideDuration}
      TransitionComponent={TransitionComponent}
      onClose={onClose}
      sx={{
        // Posicionamento mobile
        ...(isMobile && {
          left: fullWidth ? 16 : 'auto',
          right: fullWidth ? 16 : 'auto',
          bottom: mobilePosition === 'bottom' ? 16 : 'auto',
          top: mobilePosition === 'top' ? 16 : 
               mobilePosition === 'center' ? '50%' : 'auto',
          transform: mobilePosition === 'center' ? 'translateY(-50%)' : 'none',
          width: fullWidth ? 'calc(100% - 32px)' : 'auto',
          maxWidth: fullWidth ? 'none' : 600,
        }),
        // Desktop positioning
        ...(!isMobile && {
          maxWidth: 600,
        }),
        '& .MuiSnackbarContent-root, & .MuiAlert-root': {
          width: '100%',
          minHeight: isMobile ? 56 : 'auto',
          borderRadius: isMobile ? 12 : 8,
          fontSize: isMobile ? '0.9375rem' : '0.875rem',
          fontWeight: 500,
          boxShadow: theme.shadows[elevation],
          backdropFilter: 'blur(8px)',
          transform: `translateY(${dragOffset}px)`,
          transition: dragStart ? 'none' : 'transform 0.3s ease-out',
          // Touch-friendly padding
          padding: isMobile ? '12px 16px' : '8px 16px',
        },
        ...props.sx,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <Alert
        severity={getVariantColor(variant)}
        icon={hideIcon ? false : (icon || getVariantIcon(variant))}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Action button */}
            {(action || (actionLabel && onActionClick)) && (
              action || (
                <Button
                  color="inherit"
                  size={isMobile ? 'medium' : 'small'}
                  onClick={onActionClick}
                  sx={
                    isMobile ? {
                      minHeight: 44,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      px: 2,
                    } : {
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }
                  }
                >
                  {actionLabel}
                </Button>
              )
            )}
            
            {/* Close button */}
            {showCloseButton && (
              <IconButton
                size={isMobile ? 'medium' : 'small'}
                aria-label="Fechar"
                color="inherit"
                onClick={(e) => onClose?.(e, 'clickaway')}
                sx={{
                  minWidth: isMobile ? 44 : 'auto',
                  minHeight: isMobile ? 44 : 'auto',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.1),
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
              >
                <Close fontSize={isMobile ? 'medium' : 'small'} />
              </IconButton>
            )}
          </Box>
        }
        sx={{
          width: '100%',
          alignItems: 'flex-start',
          '& .MuiAlert-message': {
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: showProgress ? 1 : 0,
            width: '100%',
          },
          '& .MuiAlert-icon': {
            fontSize: isMobile ? '1.5rem' : '1.25rem',
            marginRight: isMobile ? 2 : 1,
            alignSelf: 'flex-start',
            marginTop: 0.5,
          },
          '& .MuiAlert-action': {
            padding: 0,
            marginRight: 0,
            marginLeft: 'auto',
            alignSelf: 'flex-start',
          },
        }}
      >
        <Box sx={{ width: '100%' }}>
          {/* Message content */}
          {typeof message === 'string' ? (
            <Typography
              variant="body2"
              sx={{
                color: 'inherit',
                fontSize: 'inherit',
                fontWeight: 'inherit',
                lineHeight: 1.4,
              }}
            >
              {message}
            </Typography>
          ) : (
            message
          )}
          
          {/* Progress bar */}
          {showProgress && !persistent && (
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                mt: 1,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: alpha(theme.palette.common.white, 0.2),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 1.5,
                  backgroundColor: alpha(theme.palette.common.white, 0.8),
                },
              }}
            />
          )}
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default MobileOptimizedSnackbar;