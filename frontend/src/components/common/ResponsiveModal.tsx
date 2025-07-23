import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  Box,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  alpha,
  Slide,
  Fade,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { TransitionProps } from '@mui/material/transitions';
import { MobileOptimizedModal } from './MobileOptimizedModal';

interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
  disableBackdropClick?: boolean;
  showCloseButton?: boolean;
}

// Transição personalizada para bottom sheet
const SlideUpTransition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullScreen = false,
  disableBackdropClick = false,
  showCloseButton = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleClose = () => {
    onClose();
  };

  // Usar MobileOptimizedModal para melhor experiência mobile
  return (
    <MobileOptimizedModal
      open={open}
      onClose={handleClose}
      title={title}
      actions={actions}
      showCloseButton={showCloseButton}
      mobileFullScreen={fullScreen}
      maxWidth={maxWidth}
      disableEscapeKeyDown={disableBackdropClick}
    >
      {children}
    </MobileOptimizedModal>
  );
};

export default ResponsiveModal;