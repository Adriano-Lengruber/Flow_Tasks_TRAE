import React from 'react';
import {
  IconButton,
  Tooltip,
  Box,
  useTheme as useMuiTheme,
  styled,
  alpha,
} from '@mui/material';
import {
  LightMode,
  DarkMode,
} from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  position: 'relative',
  width: 56,
  height: 28,
  borderRadius: 14,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  padding: 0,
  overflow: 'hidden',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
  },
}));

const IconWrapper = styled(Box)<{ isdark: string }>(({ theme, isdark }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  height: '100%',
  padding: '0 4px',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 2,
    left: isdark === 'true' ? 'calc(50% - 2px)' : 2,
    width: 'calc(50% - 4px)',
    height: 'calc(100% - 4px)',
    borderRadius: 12,
    backgroundColor: theme.palette.background.paper,
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  '& .MuiSvgIcon-root': {
    fontSize: '1rem',
    zIndex: 1,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
}));

const ThemeToggle: React.FC = () => {
  const { mode, toggleMode } = useTheme();
  const muiTheme = useMuiTheme();



  const getTooltipText = () => {
    return mode === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro';
  };

  return (
    <Tooltip title={getTooltipText()} arrow placement="bottom">
      <StyledIconButton
        onClick={toggleMode}
        aria-label="Alternar tema"
      >
        <IconWrapper isdark={mode === 'dark' ? 'true' : 'false'}>
          <LightMode sx={{ color: muiTheme.palette.warning.main }} />
          <DarkMode sx={{ color: muiTheme.palette.info.main }} />
        </IconWrapper>
      </StyledIconButton>
    </Tooltip>
  );
};

export default ThemeToggle;