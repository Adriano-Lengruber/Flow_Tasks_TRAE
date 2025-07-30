import React from 'react';
import {
  BottomNavigation as MuiBottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
  alpha,
  Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as ProjectsIcon,
  Timeline as GanttIcon,
  Assessment as ReportsIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
// import { useNotifications } from '../../hooks/useNotifications';

interface BottomNavigationProps {
  visible: boolean;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ visible }) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  // const { unreadCount } = useNotifications();
  const unreadCount = 0; // Temporário até implementar o hook

  const navigationItems = [
    {
      label: 'Dashboard',
      value: '/',
      icon: <DashboardIcon />,
    },
    {
      label: 'Projetos',
      value: '/projects',
      icon: <ProjectsIcon />,
    },
    {
      label: 'Gantt',
      value: '/gantt',
      icon: <GanttIcon />,
    },
    {
      label: 'Relatórios',
      value: '/reports/builder',
      icon: <ReportsIcon />,
    },
    {
      label: 'Notificações',
      value: '/notifications',
      icon: unreadCount > 0 ? (
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      ) : (
        <NotificationsIcon />
      ),
    },
  ];

  const getCurrentValue = () => {
    const currentPath = location.pathname;
    
    // Verificar correspondências exatas primeiro
    const exactMatch = navigationItems.find(item => item.value === currentPath);
    if (exactMatch) return exactMatch.value;
    
    // Verificar correspondências parciais para rotas aninhadas
    if (currentPath.startsWith('/projects/')) return '/projects';
    if (currentPath.startsWith('/gantt')) return '/gantt';
    if (currentPath.startsWith('/reports/')) return '/reports/builder';
    if (currentPath.startsWith('/notifications')) return '/notifications';
    
    return '/';
  };

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    navigate(newValue);
  };

  if (!visible) return null;

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        backdropFilter: 'blur(20px)',
        backgroundColor: alpha(theme.palette.background.paper, 0.95),
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.3)}, transparent)`,
        },
      }}
      elevation={0}
    >
      <MuiBottomNavigation
        value={getCurrentValue()}
        onChange={handleChange}
        sx={{
          backgroundColor: 'transparent',
          height: 72, // Aumentado para melhor touch target
          '& .MuiBottomNavigationAction-root': {
            minWidth: 64, // Touch target mínimo
            minHeight: 64, // Touch target mínimo
            padding: '8px 12px 10px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: 2,
            margin: '4px 2px',
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
              color: theme.palette.primary.main,
              transform: 'scale(1.05)',
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.75rem',
                fontWeight: 600,
              },
            },
            '&:not(.Mui-selected)': {
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.hover, 0.08),
                transform: 'scale(1.02)',
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.7rem',
              fontWeight: 500,
              transition: 'all 0.3s ease',
              marginTop: 2,
            },
            '& .MuiSvgIcon-root': {
              fontSize: '1.3rem',
              transition: 'all 0.3s ease',
            },
          },
        }}
      >
        {navigationItems.map((item) => (
          <BottomNavigationAction
            key={item.value}
            label={item.label}
            value={item.value}
            icon={item.icon}
            sx={{
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          />
        ))}
      </MuiBottomNavigation>
    </Paper>
  );
};

export default BottomNavigation;