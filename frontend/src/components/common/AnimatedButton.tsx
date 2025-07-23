import React from 'react';
import {
  Button,
  IconButton,
  ButtonProps,
  IconButtonProps,
  alpha,
  useTheme,
  keyframes,
} from '@mui/material';

// Animações personalizadas
const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.4);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(25, 118, 210, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
`;

const bounceAnimation = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-8px);
  }
  60% {
    transform: translateY(-4px);
  }
`;

const shakeAnimation = keyframes`
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-2px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(2px);
  }
`;

interface AnimatedButtonProps extends ButtonProps {
  animationType?: 'pulse' | 'bounce' | 'shake' | 'glow' | 'none';
  isAnimating?: boolean;
  hoverEffect?: boolean;
}

interface AnimatedIconButtonProps extends IconButtonProps {
  animationType?: 'pulse' | 'bounce' | 'shake' | 'glow' | 'none';
  isAnimating?: boolean;
  hoverEffect?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  animationType = 'none',
  isAnimating = false,
  hoverEffect = true,
  sx,
  children,
  ...props
}) => {
  const theme = useTheme();

  const getAnimation = () => {
    if (!isAnimating) return 'none';
    
    switch (animationType) {
      case 'pulse':
        return `${pulseAnimation} 1.5s infinite`;
      case 'bounce':
        return `${bounceAnimation} 1s infinite`;
      case 'shake':
        return `${shakeAnimation} 0.5s ease-in-out`;
      case 'glow':
        return 'none';
      default:
        return 'none';
    }
  };

  const getHoverStyles = () => {
    if (!hoverEffect) return {};
    
    return {
      '&:hover': {
        transform: 'translateY(-2px) scale(1.02)',
        boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.3)}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      '&:active': {
        transform: 'translateY(0) scale(0.98)',
        transition: 'all 0.1s ease-out',
      },
    };
  };

  const getGlowStyles = () => {
    if (animationType !== 'glow' || !isAnimating) return {};
    
    return {
      boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.6)}`,
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 'inherit',
        background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.light, 0.1)})`,
        animation: `${pulseAnimation} 2s infinite`,
        zIndex: -1,
      },
    };
  };

  return (
    <Button
      {...props}
      sx={{
        position: 'relative',
        animation: getAnimation(),
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...getHoverStyles(),
        ...getGlowStyles(),
        ...sx,
      }}
    >
      {children}
    </Button>
  );
};

export const AnimatedIconButton = React.forwardRef<HTMLButtonElement, AnimatedIconButtonProps>((
  {
    animationType = 'none',
    isAnimating = false,
    hoverEffect = true,
    sx,
    children,
    ...props
  },
  ref
) => {
  const theme = useTheme();

  const getAnimation = () => {
    if (!isAnimating) return 'none';
    
    switch (animationType) {
      case 'pulse':
        return `${pulseAnimation} 1.5s infinite`;
      case 'bounce':
        return `${bounceAnimation} 1s infinite`;
      case 'shake':
        return `${shakeAnimation} 0.5s ease-in-out`;
      case 'glow':
        return 'none';
      default:
        return 'none';
    }
  };

  const getHoverStyles = () => {
    if (!hoverEffect) return {};
    
    return {
      '&:hover': {
        transform: 'scale(1.1) rotate(5deg)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      '&:active': {
        transform: 'scale(0.95)',
        transition: 'all 0.1s ease-out',
      },
    };
  };

  const getGlowStyles = () => {
    if (animationType !== 'glow' || !isAnimating) return {};
    
    return {
      boxShadow: `0 0 15px ${alpha(theme.palette.primary.main, 0.5)}`,
      '&::before': {
        content: '""',
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderRadius: '50%',
        background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.primary.light, 0.2)})`,
        animation: `${pulseAnimation} 2s infinite`,
        zIndex: -1,
      },
    };
  };

  return (
    <IconButton
      ref={ref}
      {...props}
      sx={{
        position: 'relative',
        animation: getAnimation(),
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...getHoverStyles(),
        ...getGlowStyles(),
        ...sx,
      }}
    >
      {children}
    </IconButton>
  );
});

AnimatedIconButton.displayName = 'AnimatedIconButton';

export default AnimatedButton;