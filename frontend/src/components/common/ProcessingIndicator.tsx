import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Fade,
  Backdrop,
  useTheme,
  alpha,
  keyframes,
} from '@mui/material';

// Animação de pulso para o indicador
const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
`;

// Animação de ondas para o fundo
const waveAnimation = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.1;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
`;

interface ProcessingIndicatorProps {
  isVisible: boolean;
  message?: string;
  variant?: 'backdrop' | 'inline' | 'overlay';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  showWaves?: boolean;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  isVisible,
  message = 'Processando...',
  variant = 'backdrop',
  size = 'medium',
  color = 'primary',
  showWaves = true,
}) => {
  const theme = useTheme();

  const getSizeValues = () => {
    switch (size) {
      case 'small':
        return { progress: 24, container: 80, fontSize: '0.875rem' };
      case 'large':
        return { progress: 48, container: 120, fontSize: '1.125rem' };
      case 'medium':
      default:
        return { progress: 32, container: 100, fontSize: '1rem' };
    }
  };

  const { progress, container, fontSize } = getSizeValues();

  const getColorValue = () => {
    switch (color) {
      case 'secondary':
        return theme.palette.secondary.main;
      case 'success':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'error':
        return theme.palette.error.main;
      case 'primary':
      default:
        return theme.palette.primary.main;
    }
  };

  const colorValue = getColorValue();

  const renderContent = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        position: 'relative',
        width: container,
        height: container,
        animation: `${pulseAnimation} 2s ease-in-out infinite`,
      }}
    >
      {/* Ondas de fundo animadas */}
      {showWaves && (
        <>
          <Box
            sx={{
              position: 'absolute',
              width: progress * 2,
              height: progress * 2,
              borderRadius: '50%',
              border: `2px solid ${alpha(colorValue, 0.3)}`,
              animation: `${waveAnimation} 2s ease-out infinite`,
              animationDelay: '0s',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: progress * 2,
              height: progress * 2,
              borderRadius: '50%',
              border: `2px solid ${alpha(colorValue, 0.2)}`,
              animation: `${waveAnimation} 2s ease-out infinite`,
              animationDelay: '0.5s',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: progress * 2,
              height: progress * 2,
              borderRadius: '50%',
              border: `2px solid ${alpha(colorValue, 0.1)}`,
              animation: `${waveAnimation} 2s ease-out infinite`,
              animationDelay: '1s',
            }}
          />
        </>
      )}

      {/* Indicador de progresso */}
      <CircularProgress
        size={progress}
        sx={{
          color: colorValue,
          zIndex: 1,
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))',
        }}
      />

      {/* Mensagem */}
      {message && (
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            fontSize,
            fontWeight: 500,
            textAlign: 'center',
            zIndex: 1,
            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );

  if (variant === 'backdrop') {
    return (
      <Backdrop
        open={isVisible}
        sx={
          {
            zIndex: theme.zIndex.modal + 1,
            backgroundColor: alpha(theme.palette.background.default, 0.8),
            backdropFilter: 'blur(4px)',
          } as any
        }
      >
        <Fade in={isVisible} timeout={300}>
          <Box>{renderContent()}</Box>
        </Fade>
      </Backdrop>
    );
  }

  if (variant === 'overlay') {
    return (
      <Fade in={isVisible} timeout={300}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(theme.palette.background.default, 0.9),
            backdropFilter: 'blur(2px)',
            zIndex: 10,
            borderRadius: 'inherit',
          }}
        >
          {renderContent()}
        </Box>
      </Fade>
    );
  }

  // variant === 'inline'
  return (
    <Fade in={isVisible} timeout={300}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        {renderContent()}
      </Box>
    </Fade>
  );
};

export default ProcessingIndicator;