import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  useTheme,
  alpha,
  Fade,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number; // Distância para ativar o refresh
  maxPullDistance?: number; // Distância máxima de pull
  refreshingText?: string;
  pullText?: string;
  releaseText?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  maxPullDistance = 120,
  refreshingText = 'Atualizando...',
  pullText = 'Puxe para atualizar',
  releaseText = 'Solte para atualizar',
}) => {
  const theme = useTheme();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startScrollTop = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    startScrollTop.current = container.scrollTop;
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || isRefreshing || touchStart === null) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStart;
    
    // Só ativar pull to refresh se estiver no topo da página
    if (deltaY > 0 && startScrollTop.current === 0) {
      e.preventDefault();
      const distance = Math.min(deltaY * 0.5, maxPullDistance);
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || isRefreshing || touchStart === null) return;
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Erro ao atualizar:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setTouchStart(null);
  };

  const getRefreshIndicatorText = () => {
    if (isRefreshing) return refreshingText;
    if (pullDistance >= threshold) return releaseText;
    return pullText;
  };

  const getRefreshIndicatorOpacity = () => {
    if (isRefreshing) return 1;
    return Math.min(pullDistance / threshold, 1);
  };

  const getRefreshIndicatorRotation = () => {
    if (isRefreshing) return 0;
    return (pullDistance / threshold) * 180;
  };

  useEffect(() => {
    // Cleanup quando o componente for desmontado
    return () => {
      setPullDistance(0);
      setIsRefreshing(false);
      setTouchStart(null);
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        height: '100%',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        transform: `translateY(${pullDistance}px)`,
        transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease' : 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Indicador de refresh */}
      <Fade in={pullDistance > 0 || isRefreshing}>
        <Box
          sx={{
            position: 'absolute',
            top: -60,
            left: 0,
            right: 0,
            height: 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            opacity: getRefreshIndicatorOpacity(),
            zIndex: 1,
          }}
        >
          <Box
            sx={
              isRefreshing
                ? {
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': {
                      '0%': {
                        transform: 'rotate(0deg)',
                      },
                      '100%': {
                        transform: 'rotate(360deg)',
                      },
                    },
                  }
                : {
                    transform: `rotate(${getRefreshIndicatorRotation()}deg)`,
                    transition: 'transform 0.2s ease',
                  }
            }
          >
            {isRefreshing ? (
              <CircularProgress size={20} thickness={4} />
            ) : (
              <RefreshIcon
                sx={{
                  fontSize: 20,
                  color: pullDistance >= threshold ? theme.palette.primary.main : theme.palette.text.secondary,
                }}
              />
            )}
          </Box>
          <Typography
            variant="caption"
            sx={{
              mt: 0.5,
              color: pullDistance >= threshold ? theme.palette.primary.main : theme.palette.text.secondary,
              fontWeight: 500,
            }}
          >
            {getRefreshIndicatorText()}
          </Typography>
        </Box>
      </Fade>
      
      {/* Conteúdo principal */}
      <Box
        sx={{
          minHeight: '100%',
          opacity: isRefreshing ? 0.7 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default PullToRefresh;