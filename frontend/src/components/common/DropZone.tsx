import React from 'react';
import {
  Box,
  Typography,
  alpha,
  useTheme,
  Fade,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface DropZoneProps {
  isOver: boolean;
  canDrop: boolean;
  sectionName: string;
  isEmpty?: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ 
  isOver, 
  canDrop, 
  sectionName, 
  isEmpty = false 
}) => {
  const theme = useTheme();

  const getDropZoneStyles = () => {
    if (isOver && canDrop) {
      return {
        bgcolor: alpha(theme.palette.success.main, 0.1),
        borderColor: theme.palette.success.main,
        borderStyle: 'dashed',
        borderWidth: 2,
        transform: 'scale(1.02)',
      };
    }
    
    if (isOver && !canDrop) {
      return {
        bgcolor: alpha(theme.palette.error.main, 0.1),
        borderColor: theme.palette.error.main,
        borderStyle: 'dashed',
        borderWidth: 2,
      };
    }
    
    if (canDrop) {
      return {
        bgcolor: alpha(theme.palette.primary.main, 0.05),
        borderColor: alpha(theme.palette.primary.main, 0.3),
        borderStyle: 'dashed',
        borderWidth: 1,
      };
    }
    
    return {
      bgcolor: 'transparent',
      borderColor: 'transparent',
      borderStyle: 'solid',
      borderWidth: 1,
    };
  };

  const getIconColor = () => {
    if (isOver && canDrop) return theme.palette.success.main;
    if (isOver && !canDrop) return theme.palette.error.main;
    if (canDrop) return theme.palette.primary.main;
    return theme.palette.grey[400];
  };

  const getMessage = () => {
    if (isOver && canDrop) return `Soltar em ${sectionName}`;
    if (isOver && !canDrop) return 'Não é possível soltar aqui';
    if (canDrop) return `Arraste uma tarefa para ${sectionName}`;
    return isEmpty ? 'Nenhuma tarefa nesta seção' : '';
  };

  return (
    <Fade in={canDrop || isEmpty} timeout={200}>
      <Box
        sx={{
          minHeight: isEmpty ? 120 : 60,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 2,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          mx: 1,
          my: 1,
          ...getDropZoneStyles(),
        }}
      >
        <AddIcon
          sx={{
            fontSize: isEmpty ? 48 : 32,
            color: getIconColor(),
            opacity: canDrop ? 1 : 0.3,
            transition: 'all 0.2s ease-in-out',
            transform: isOver && canDrop ? 'scale(1.2)' : 'scale(1)',
          }}
        />
        
        {(canDrop || isEmpty) && (
          <Typography
            variant={isEmpty ? 'body2' : 'caption'}
            sx={{
              color: getIconColor(),
              textAlign: 'center',
              mt: 1,
              fontWeight: isOver && canDrop ? 600 : 400,
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {getMessage()}
          </Typography>
        )}
      </Box>
    </Fade>
  );
};

export default DropZone;