import React, { useState, useRef, useEffect } from 'react';
import {
  Tooltip,
  TooltipProps,
  Popper,
  Paper,
  Typography,
  ClickAwayListener,
  useTheme,
  useMediaQuery,
  alpha,
  Fade,
  Box,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface MobileOptimizedTooltipProps extends Omit<TooltipProps, 'title'> {
  title: React.ReactNode;
  children: React.ReactElement;
  
  // Configurações mobile
  mobileVariant?: 'tooltip' | 'popover' | 'none';
  touchDelay?: number;
  touchDuration?: number;
  showOnLongPress?: boolean;
  
  // Customização
  maxWidth?: number | string;
  fontSize?: string;
  padding?: number | string;
  backgroundColor?: string;
  textColor?: string;
  
  // Comportamento
  persistent?: boolean;
  clickToShow?: boolean;
  preventTouchDefault?: boolean;
}

const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .MuiTooltip-tooltip`]: {
    backgroundColor: alpha(theme.palette.grey[900], 0.95),
    color: theme.palette.common.white,
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '8px 12px',
    borderRadius: 8,
    maxWidth: 280,
    textAlign: 'center',
    lineHeight: 1.4,
    boxShadow: theme.shadows[8],
    backdropFilter: 'blur(8px)',
    border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
    // Melhor legibilidade em mobile
    [theme.breakpoints.down('md')]: {
      fontSize: '0.9375rem',
      padding: '10px 16px',
      maxWidth: 'calc(100vw - 32px)',
      borderRadius: 12,
    },
  },
  [`& .MuiTooltip-arrow`]: {
    color: alpha(theme.palette.grey[900], 0.95),
    '&::before': {
      border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
    },
  },
}));

const MobilePopover = styled(Paper)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.grey[900], 0.95),
  color: theme.palette.common.white,
  padding: '12px 16px',
  borderRadius: 12,
  maxWidth: 'calc(100vw - 32px)',
  fontSize: '0.9375rem',
  fontWeight: 500,
  lineHeight: 1.4,
  textAlign: 'center',
  boxShadow: theme.shadows[12],
  backdropFilter: 'blur(12px)',
  border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
  zIndex: theme.zIndex.tooltip + 1,
}));

export const MobileOptimizedTooltip: React.FC<MobileOptimizedTooltipProps> = ({
  title,
  children,
  mobileVariant = 'popover',
  touchDelay = 500,
  touchDuration = 2000,
  showOnLongPress = true,
  maxWidth = 280,
  fontSize,
  padding,
  backgroundColor,
  textColor,
  persistent = false,
  clickToShow = false,
  preventTouchDefault = true,
  placement = 'top',
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressRef = useRef(false);

  // Determinar variante baseada no dispositivo
  const getVariant = () => {
    if (!isMobile) return 'tooltip';
    return mobileVariant;
  };

  // Limpar timeouts
  const clearTimeouts = () => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  // Mostrar tooltip/popover
  const showTooltip = (element: HTMLElement) => {
    setAnchorEl(element);
    setOpen(true);
    
    // Auto-hide após duração especificada (apenas se não for persistente)
    if (!persistent && touchDuration > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        setOpen(false);
      }, touchDuration);
    }
  };

  // Esconder tooltip/popover
  const hideTooltip = () => {
    setOpen(false);
    setAnchorEl(null);
    clearTimeouts();
  };

  // Handlers para touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || !showOnLongPress) return;
    
    if (preventTouchDefault) {
      e.preventDefault();
    }
    
    longPressRef.current = false;
    clearTimeouts();
    
    touchTimeoutRef.current = setTimeout(() => {
      longPressRef.current = true;
      showTooltip(e.currentTarget as HTMLElement);
    }, touchDelay);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    clearTimeouts();
    
    // Se foi um tap rápido e clickToShow está habilitado
    if (!longPressRef.current && clickToShow) {
      if (open) {
        hideTooltip();
      } else {
        showTooltip(e.currentTarget as HTMLElement);
      }
    }
  };

  const handleTouchCancel = () => {
    clearTimeouts();
  };

  // Handlers para mouse events (desktop)
  const handleMouseEnter = (e: React.MouseEvent) => {
    if (isMobile) return;
    showTooltip(e.currentTarget as HTMLElement);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    hideTooltip();
  };

  // Click handler
  const handleClick = (e: React.MouseEvent) => {
    if (clickToShow) {
      e.preventDefault();
      if (open) {
        hideTooltip();
      } else {
        showTooltip(e.currentTarget as HTMLElement);
      }
    }
  };

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, []);

  const variant = getVariant();

  // Não renderizar tooltip em mobile se variant for 'none'
  if (variant === 'none') {
    return children;
  }

  // Clonar children com event handlers
  const childrenWithHandlers = React.cloneElement(children, {
    onTouchStart: (e: React.TouchEvent) => {
      handleTouchStart(e);
      if (children.props.onTouchStart) {
        children.props.onTouchStart(e);
      }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      handleTouchEnd(e);
      if (children.props.onTouchEnd) {
        children.props.onTouchEnd(e);
      }
    },
    onTouchCancel: (e: React.TouchEvent) => {
      handleTouchCancel();
      if (children.props.onTouchCancel) {
        children.props.onTouchCancel(e);
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter(e);
      if (children.props.onMouseEnter) {
        children.props.onMouseEnter(e);
      }
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      if (children.props.onMouseLeave) {
        children.props.onMouseLeave(e);
      }
    },
    onClick: (e: React.MouseEvent) => {
      handleClick(e);
      if (children.props.onClick) {
        children.props.onClick(e);
      }
    },
  });

  // Renderizar como tooltip padrão (desktop)
  if (variant === 'tooltip') {
    return (
      <StyledTooltip
        title={title}
        placement={placement}
        {...props}
        componentsProps={{
          tooltip: {
            sx: {
              ...(maxWidth && { maxWidth }),
              ...(fontSize && { fontSize }),
              ...(padding && { padding }),
              ...(backgroundColor && { backgroundColor }),
              ...(textColor && { color: textColor }),
            },
          },
        }}
      >
        {children}
      </StyledTooltip>
    );
  }

  // Renderizar como popover (mobile)
  return (
    <>
      {childrenWithHandlers}
      
      <Popper
        open={open}
        anchorEl={anchorEl}
        placement={placement}
        transition
        style={{ zIndex: theme.zIndex.tooltip + 1 }}
        modifiers={[
          {
            name: 'preventOverflow',
            options: {
              boundary: 'viewport',
              padding: 16,
            },
          },
          {
            name: 'flip',
            options: {
              fallbackPlacements: ['top', 'bottom', 'left', 'right'],
            },
          },
        ]}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={200}>
            <ClickAwayListener onClickAway={persistent ? () => {} : hideTooltip}>
              <MobilePopover
                sx={{
                  ...(maxWidth && { maxWidth }),
                  ...(fontSize && { fontSize }),
                  ...(padding && { padding }),
                  ...(backgroundColor && { backgroundColor }),
                  ...(textColor && { color: textColor }),
                }}
              >
                {typeof title === 'string' ? (
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'inherit',
                      fontSize: 'inherit',
                      fontWeight: 'inherit',
                      lineHeight: 'inherit',
                    }}
                  >
                    {title}
                  </Typography>
                ) : (
                  title
                )}
                
                {/* Indicador visual para fechar (apenas se persistente) */}
                {persistent && (
                  <Box
                    sx={{
                      mt: 1,
                      pt: 1,
                      borderTop: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                      fontSize: '0.75rem',
                      opacity: 0.7,
                    }}
                  >
                    Toque fora para fechar
                  </Box>
                )}
              </MobilePopover>
            </ClickAwayListener>
          </Fade>
        )}
      </Popper>
    </>
  );
};

export default MobileOptimizedTooltip;