import React from 'react';
import {
  Button,
  IconButton,
  Fab,
  ButtonProps,
  IconButtonProps,
  FabProps,
  useTheme,
  useMediaQuery,
  alpha,
  styled,
} from '@mui/material';

// Constantes para touch targets
const MIN_TOUCH_TARGET = 44; // Mínimo recomendado pelo Material Design
const COMFORTABLE_TOUCH_TARGET = 48; // Tamanho confortável

// Styled components para garantir área de toque adequada
const TouchOptimizedButtonBase = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'touchOptimized',
})<{ touchOptimized?: boolean }>(({ theme, touchOptimized }) => ({
  ...(touchOptimized && {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    padding: theme.spacing(1.5, 2),
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: COMFORTABLE_TOUCH_TARGET,
      height: COMFORTABLE_TOUCH_TARGET,
      borderRadius: '50%',
      backgroundColor: 'transparent',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: -1,
    },
    '&:active::before': {
      backgroundColor: alpha(theme.palette.action.selected, 0.12),
      transform: 'translate(-50%, -50%) scale(1.1)',
    },
    '&:hover::before': {
      backgroundColor: alpha(theme.palette.action.hover, 0.08),
    },
    // Feedback tátil visual
    '&:active': {
      transform: 'scale(0.95)',
      transition: 'transform 0.1s ease',
    },
    // Melhor espaçamento para texto
    '& .MuiButton-startIcon': {
      marginRight: theme.spacing(1),
    },
    '& .MuiButton-endIcon': {
      marginLeft: theme.spacing(1),
    },
  }),
}));

const TouchOptimizedIconButtonBase = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'touchOptimized',
})<{ touchOptimized?: boolean }>(({ theme, touchOptimized }) => ({
  ...(touchOptimized && {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    padding: theme.spacing(1),
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: COMFORTABLE_TOUCH_TARGET,
      height: COMFORTABLE_TOUCH_TARGET,
      borderRadius: '50%',
      backgroundColor: 'transparent',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: -1,
    },
    '&:active::before': {
      backgroundColor: alpha(theme.palette.action.selected, 0.12),
      transform: 'translate(-50%, -50%) scale(1.1)',
    },
    '&:hover::before': {
      backgroundColor: alpha(theme.palette.action.hover, 0.08),
    },
    '&:active': {
      transform: 'scale(0.9)',
      transition: 'transform 0.1s ease',
    },
    // Ícones maiores em mobile
    '& .MuiSvgIcon-root': {
      fontSize: '1.5rem',
    },
  }),
}));

const TouchOptimizedFabBase = styled(Fab, {
  shouldForwardProp: (prop) => prop !== 'touchOptimized',
})<{ touchOptimized?: boolean }>(({ theme, touchOptimized }) => ({
  ...(touchOptimized && {
    minHeight: 56, // FAB já tem tamanho adequado, mas garantimos
    minWidth: 56,
    '&:active': {
      transform: 'scale(0.95)',
      transition: 'transform 0.1s ease',
      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.5)}`,
    },
    // Sombra mais pronunciada para melhor feedback
    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
    '&:hover': {
      boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
    },
  }),
}));

// Props estendidas
interface TouchOptimizedButtonProps extends ButtonProps {
  touchOptimized?: boolean;
}

interface TouchOptimizedIconButtonProps extends IconButtonProps {
  touchOptimized?: boolean;
}

interface TouchOptimizedFabButtonProps extends FabProps {
  touchOptimized?: boolean;
}

// Componente principal de Button
export const TouchOptimizedButton: React.FC<TouchOptimizedButtonProps> = ({
  touchOptimized,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const shouldOptimize = touchOptimized !== undefined ? touchOptimized : isMobile;
  
  return (
    <TouchOptimizedButtonBase
      touchOptimized={shouldOptimize}
      {...props}
    />
  );
};

// Componente de IconButton
export const TouchOptimizedIconButton: React.FC<TouchOptimizedIconButtonProps> = ({
  touchOptimized,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const shouldOptimize = touchOptimized !== undefined ? touchOptimized : isMobile;
  
  return (
    <TouchOptimizedIconButtonBase
      touchOptimized={shouldOptimize}
      {...props}
    />
  );
};

// Componente de FAB
export const TouchOptimizedFab: React.FC<TouchOptimizedFabButtonProps> = ({
  touchOptimized,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const shouldOptimize = touchOptimized !== undefined ? touchOptimized : isMobile;
  
  return (
    <TouchOptimizedFabBase
      touchOptimized={shouldOptimize}
      {...props}
    />
  );
};

// Hook para verificar se deve otimizar para touch
export const useTouchOptimization = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  
  return {
    isMobile,
    isTablet,
    isTouchDevice: isMobile || isTablet,
    minTouchTarget: MIN_TOUCH_TARGET,
    comfortableTouchTarget: COMFORTABLE_TOUCH_TARGET,
  };
};

// Componente padrão (Button)
export default TouchOptimizedButton;