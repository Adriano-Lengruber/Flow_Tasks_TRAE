import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  useTheme,
  alpha,
  Fade,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  DragHandle as DragHandleIcon,
} from '@mui/icons-material';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: 'auto' | 'half' | 'full';
  showDragHandle?: boolean;
  showCloseButton?: boolean;
  swipeToClose?: boolean;
  backdrop?: boolean;
  persistent?: boolean;
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  open,
  onClose,
  title,
  children,
  height = 'auto',
  showDragHandle = true,
  showCloseButton = true,
  swipeToClose = true,
  backdrop = true,
  persistent = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { light } = useHapticFeedback();

  // Altura do bottom sheet baseada na prop height
  const getSheetHeight = () => {
    switch (height) {
      case 'half':
        return '50vh';
      case 'full':
        return '90vh';
      default:
        return 'auto';
    }
  };

  // Configuração do swipe gesture
  const swipeGesture = useSwipeGesture({
    onSwipeDown: () => {
      if (swipeToClose && !persistent) {
        light();
        onClose();
      }
    },
    minSwipeDistance: 50,
  });

  // Handlers para drag manual
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeToClose || persistent) return;
    setIsDragging(true);
    swipeGesture.swipeHandlers.onTouchStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !swipeToClose || persistent) return;
    
    const touch = e.touches[0];
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return;

    const deltaY = touch.clientY - rect.top;
    if (deltaY > 0) {
      setDragOffset(Math.min(deltaY, 200));
    }
    
    swipeGesture.swipeHandlers.onTouchMove(e);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Se arrastou mais de 100px, fecha o sheet
    if (dragOffset > 100 && !persistent) {
      light();
      onClose();
    }
    
    setDragOffset(0);
    swipeGesture.swipeHandlers.onTouchEnd(e);
  };

  // Reset drag offset quando fecha
  useEffect(() => {
    if (!open) {
      setDragOffset(0);
      setIsDragging(false);
    }
  }, [open]);

  // Prevenir scroll do body quando aberto
  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open, isMobile]);

  if (!isMobile) {
    // Em desktop, usar um modal normal
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={persistent ? undefined : onClose}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '80vh',
          },
        }}
        ModalProps={{
          BackdropProps: {
            sx: {
              backgroundColor: backdrop ? alpha(theme.palette.common.black, 0.5) : 'transparent',
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          {title && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Typography variant="h6">{title}</Typography>
              {showCloseButton && !persistent && (
                <IconButton onClick={onClose} size="small">
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
          )}
          {children}
        </Box>
      </Drawer>
    );
  }

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={persistent ? undefined : onClose}
      PaperProps={{
        ref: sheetRef,
        sx: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: getSheetHeight(),
          maxHeight: '90vh',
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          opacity: isDragging ? Math.max(0.7, 1 - dragOffset / 200) : 1,
        },
      }}
      ModalProps={{
        BackdropProps: {
          sx: {
            backgroundColor: backdrop ? alpha(theme.palette.common.black, 0.5) : 'transparent',
          },
        },
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Drag Handle */}
        {showDragHandle && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 1,
              cursor: 'grab',
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            <DragHandleIcon
              sx={{
                color: theme.palette.grey[400],
                fontSize: 24,
              }}
            />
          </Box>
        )}

        {/* Header */}
        {title && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {showCloseButton && !persistent && (
              <IconButton
                onClick={onClose}
                size="small"
                sx={{
                  minWidth: 44,
                  minHeight: 44,
                }}
              >
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        )}

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
          }}
        >
          {children}
        </Box>
      </Box>
    </Drawer>
  );
};

export default MobileBottomSheet;