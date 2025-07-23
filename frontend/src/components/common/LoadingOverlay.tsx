import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Fade,
  Backdrop,
  alpha,
  useTheme,
} from '@mui/material';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  variant?: 'backdrop' | 'inline';
  size?: 'small' | 'medium' | 'large';
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Carregando...',
  variant = 'backdrop',
  size = 'medium',
}) => {
  const theme = useTheme();

  const getSizeProps = () => {
    switch (size) {
      case 'small':
        return { size: 24, fontSize: 'body2' };
      case 'large':
        return { size: 48, fontSize: 'h6' };
      default:
        return { size: 32, fontSize: 'body1' };
    }
  };

  const { size: progressSize, fontSize } = getSizeProps();

  const LoadingContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: 3,
        borderRadius: 2,
        bgcolor: variant === 'backdrop' ? alpha(theme.palette.background.paper, 0.95) : 'transparent',
        backdropFilter: variant === 'backdrop' ? 'blur(8px)' : 'none',
        boxShadow: variant === 'backdrop' ? theme.shadows[8] : 'none',
      }}
    >
      <CircularProgress
        size={progressSize}
        thickness={4}
        sx={{
          color: theme.palette.primary.main,
          animation: 'spin 1s linear infinite',
          '@keyframes spin': {
            '0%': {
              transform: 'rotate(0deg)',
            },
            '100%': {
              transform: 'rotate(360deg)',
            },
          },
        }}
      />
      <Typography
        variant={fontSize as any}
        color="text.primary"
        sx={{
          fontWeight: 'medium',
          textAlign: 'center',
          animation: 'pulse 2s ease-in-out infinite',
          '@keyframes pulse': {
            '0%': {
              opacity: 0.6,
            },
            '50%': {
              opacity: 1,
            },
            '100%': {
              opacity: 0.6,
            },
          },
        }}
      >
        {message}
      </Typography>
    </Box>
  );

  if (variant === 'backdrop') {
    return (
      <Backdrop
        open={isVisible}
        sx={{
          zIndex: theme.zIndex.modal + 1,
          bgcolor: alpha(theme.palette.background.default, 0.7),
          backdropFilter: 'blur(4px)',
        }}
      >
        <Fade in={isVisible} timeout={{ enter: 300, exit: 200 }}>
          <div>{LoadingContent}</div>
        </Fade>
      </Backdrop>
    );
  }

  return (
    <Fade in={isVisible} timeout={{ enter: 300, exit: 200 }}>
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
          bgcolor: alpha(theme.palette.background.default, 0.8),
          zIndex: 10,
        }}
      >
        {LoadingContent}
      </Box>
    </Fade>
  );
};

export default LoadingOverlay;