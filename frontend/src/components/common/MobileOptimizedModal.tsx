import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogProps,
  IconButton,
  useTheme,
  useMediaQuery,
  Slide,
  Paper,
  Box,
  Typography,
  alpha,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';

// Transição otimizada para mobile
const SlideTransition = React.forwardRef<
  unknown,
  TransitionProps & { children: React.ReactElement }
>(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface MobileOptimizedModalProps extends Omit<DialogProps, 'fullScreen'> {
  title?: string;
  onClose?: () => void;
  actions?: React.ReactNode;
  showCloseButton?: boolean;
  mobileFullScreen?: boolean;
}

export const MobileOptimizedModal: React.FC<MobileOptimizedModalProps> = ({
  title,
  onClose,
  actions,
  showCloseButton = true,
  mobileFullScreen = true,
  children,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      {...props}
      fullScreen={isMobile && mobileFullScreen}
      TransitionComponent={SlideTransition}
      PaperProps={{
        sx: {
          ...(isMobile && mobileFullScreen
            ? {
                margin: 0,
                borderRadius: 0,
                maxHeight: '100vh',
                height: '100vh',
              }
            : {
                margin: isSmallMobile ? 1 : 3,
                borderRadius: 3,
                maxWidth: isSmallMobile ? 'calc(100vw - 16px)' : '90vw',
                maxHeight: isSmallMobile ? 'calc(100vh - 16px)' : '90vh',
              }),
          overflow: 'hidden',
        },
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backgroundColor: alpha(theme.palette.common.black, 0.7),
          backdropFilter: 'blur(4px)',
        },
        ...props.sx,
      }}
    >
      {title && (
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? 2 : 3,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            minHeight: 64, // Touch target adequado
          }}
        >
          <Typography
            variant={isMobile ? 'h6' : 'h5'}
            component="h2"
            sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {title}
          </Typography>
          {showCloseButton && onClose && (
            <IconButton
              onClick={onClose}
              sx={{
                minHeight: 48, // Touch target adequado
                minWidth: 48,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.action.hover, 0.08),
                },
                '&:active': {
                  transform: 'scale(0.95)',
                  transition: 'transform 0.1s ease',
                },
              }}
              aria-label="Fechar modal"
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
      )}
      
      <DialogContent
        sx={{
          padding: isMobile ? 2 : 3,
          paddingTop: title ? (isMobile ? 2 : 3) : (isMobile ? 2 : 3),
          overflow: 'auto',
          // Scroll suave em mobile
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': {
            width: 4,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(theme.palette.text.secondary, 0.3),
            borderRadius: 2,
          },
        }}
      >
        {children}
      </DialogContent>
      
      {actions && (
        <DialogActions
          sx={{
            padding: isMobile ? 2 : 3,
            paddingTop: isMobile ? 1 : 2,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            gap: 1,
            flexDirection: isSmallMobile ? 'column' : 'row',
            '& > *': {
              ...(isSmallMobile && {
                width: '100%',
                minHeight: 48, // Touch target adequado
              }),
            },
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default MobileOptimizedModal;