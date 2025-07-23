import React, { useState } from 'react';
import {
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Backdrop,
  useTheme,
  useMediaQuery,
  alpha,
  Zoom,
  Tooltip,
  Box,
} from '@mui/material';
import {
  Add,
  Edit,
  Close,
} from '@mui/icons-material';

interface FabAction {
  icon: React.ReactNode;
  name: string;
  onClick: () => void;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: boolean;
  tooltip?: string;
}

interface MobileOptimizedFabProps {
  // Modo simples - apenas um botão
  icon?: React.ReactNode;
  onClick?: () => void;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  size?: 'small' | 'medium' | 'large';
  variant?: 'circular' | 'extended';
  label?: string;
  disabled?: boolean;
  tooltip?: string;
  
  // Modo SpeedDial - múltiplas ações
  actions?: FabAction[];
  speedDialIcon?: React.ReactNode;
  speedDialOpenIcon?: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  
  // Posicionamento
  position?: {
    bottom?: number | string;
    right?: number | string;
    top?: number | string;
    left?: number | string;
  };
  
  // Comportamento mobile
  hideOnScroll?: boolean;
  expandOnMobile?: boolean;
  mobilePosition?: 'bottom-right' | 'bottom-center' | 'bottom-left';
}

export const MobileOptimizedFab: React.FC<MobileOptimizedFabProps> = ({
  icon = <Add />,
  onClick,
  color = 'primary',
  size = 'large',
  variant = 'circular',
  label,
  disabled = false,
  tooltip,
  actions,
  speedDialIcon,
  speedDialOpenIcon,
  direction = 'up',
  position = { bottom: 16, right: 16 },
  hideOnScroll = true,
  expandOnMobile = true,
  mobilePosition = 'bottom-right',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Configurar posição baseada no dispositivo
  const getPosition = () => {
    if (!isMobile) return position;
    
    const mobilePositions = {
      'bottom-right': { bottom: 16, right: 16 },
      'bottom-center': { bottom: 16, left: '50%', transform: 'translateX(-50%)' },
      'bottom-left': { bottom: 16, left: 16 },
    };
    
    return mobilePositions[mobilePosition];
  };

  // Configurar tamanho baseado no dispositivo
  const getSize = () => {
    if (isMobile && expandOnMobile) {
      return size === 'small' ? 'medium' : 'large';
    }
    return size;
  };

  // Scroll listener para hide/show
  React.useEffect(() => {
    if (!hideOnScroll) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDir = () => {
      const scrollY = window.scrollY;
      
      if (Math.abs(scrollY - lastScrollY) < 5) {
        ticking = false;
        return;
      }
      
      setIsVisible(scrollY <= lastScrollY || scrollY < 100);
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDir);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [hideOnScroll]);

  const fabStyles = {
    position: 'fixed' as const,
    zIndex: theme.zIndex.speedDial,
    ...getPosition(),
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isVisible ? 'scale(1)' : 'scale(0)',
    '&:hover': {
      transform: isVisible ? 'scale(1.05)' : 'scale(0)',
    },
    '&:active': {
      transform: isVisible ? 'scale(0.95)' : 'scale(0)',
    },
    // Sombra otimizada para mobile
    boxShadow: isMobile 
      ? `0 8px 16px ${alpha(theme.palette.common.black, 0.15)}`
      : theme.shadows[6],
    // Touch target mínimo
    minWidth: isMobile ? 56 : 'auto',
    minHeight: isMobile ? 56 : 'auto',
  };

  // Renderizar FAB simples
  if (!actions || actions.length === 0) {
    const fabComponent = (
      <Fab
        color={color}
        size={getSize()}
        variant={variant}
        onClick={onClick}
        disabled={disabled}
        sx={fabStyles}
      >
        {variant === 'extended' && label ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            {label}
          </Box>
        ) : (
          icon
        )}
      </Fab>
    );

    if (tooltip && !disabled) {
      return (
        <Tooltip title={tooltip} placement="left">
          {fabComponent}
        </Tooltip>
      );
    }

    return fabComponent;
  }

  // Renderizar SpeedDial
  return (
    <>
      {speedDialOpen && isMobile && (
        <Backdrop
          open={speedDialOpen}
          sx={{
            zIndex: theme.zIndex.speedDial - 1,
            backgroundColor: alpha(theme.palette.common.black, 0.3),
          }}
          onClick={() => setSpeedDialOpen(false)}
        />
      )}
      
      <SpeedDial
        ariaLabel="Speed dial"
        sx={{
          position: 'fixed',
          ...getPosition(),
          zIndex: theme.zIndex.speedDial,
          '& .MuiSpeedDial-fab': {
            ...fabStyles,
            position: 'relative',
            // Tamanho otimizado para mobile
            width: isMobile ? 56 : 56,
            height: isMobile ? 56 : 56,
            '&:hover': {
              transform: 'scale(1.05)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          },
          '& .MuiSpeedDialAction-fab': {
            // Touch targets para ações
            width: isMobile ? 48 : 40,
            height: isMobile ? 48 : 40,
            margin: isMobile ? '8px' : '4px',
            '&:hover': {
              transform: 'scale(1.1)',
            },
            '&:active': {
              transform: 'scale(0.9)',
            },
          },
        }}
        icon={
          speedDialIcon || (
            <SpeedDialIcon
              icon={icon}
              openIcon={speedDialOpenIcon || <Close />}
            />
          )
        }
        onClose={() => setSpeedDialOpen(false)}
        onOpen={() => setSpeedDialOpen(true)}
        open={speedDialOpen}
        direction={direction}
        FabProps={{
          color,
          size: getSize(),
          disabled,
        }}
      >
        {actions.map((action, index) => {
          const actionComponent = (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.tooltip || action.name}
              tooltipPlacement={direction === 'up' ? 'left' : 'top'}
              onClick={() => {
                if (!action.disabled) {
                  action.onClick();
                  setSpeedDialOpen(false);
                }
              }}
              sx={{
                opacity: action.disabled ? 0.5 : 1,
                pointerEvents: action.disabled ? 'none' : 'auto',
                '& .MuiSpeedDialAction-staticTooltipLabel': {
                  fontSize: isMobile ? '0.875rem' : '0.75rem',
                  whiteSpace: 'nowrap',
                  backgroundColor: alpha(theme.palette.grey[900], 0.9),
                  color: theme.palette.common.white,
                  borderRadius: 1,
                  px: 1.5,
                  py: 0.5,
                },
              }}
            />
          );

          return (
            <Zoom
              key={action.name}
              in={speedDialOpen}
              timeout={{
                enter: 200 + index * 50,
                exit: 100,
              }}
              unmountOnExit
            >
              {actionComponent}
            </Zoom>
          );
        })}
      </SpeedDial>
    </>
  );
};

export default MobileOptimizedFab;