import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Task as TaskIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  SmartToy as AutomationIcon,
  Timeline as TimelineIcon,
  AdminPanelSettings as AdminIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { NotificationsList } from '../Notifications/NotificationsList';
import ThemeToggle from '../common/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';

const drawerWidth = 240;

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Projetos', icon: <AssignmentIcon />, path: '/projects' },
    { text: 'Tarefas', icon: <TaskIcon />, path: '/tasks' },
    { text: 'Gantt', icon: <TimelineIcon />, path: '/gantt' },
    { text: 'Automações', icon: <AutomationIcon />, path: '/automations' },
    { text: 'Métricas', icon: <AnalyticsIcon />, path: '/metrics' },
    { text: 'Equipe', icon: <PeopleIcon />, path: '/team' },
    { text: 'Preferências de Notificação', icon: <NotificationsIcon />, path: '/notification-preferences' },
    { text: 'Admin Dashboard', icon: <AdminIcon />, path: '/admin' },
    { text: 'Configurações', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <div>
      <Box sx={{ 
        p: { xs: 2, sm: 2 }, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: { xs: 56, sm: 64 }, // Altura responsiva
      }}>
        <Typography 
          variant="h6" 
          noWrap 
          component="div"
          sx={{
            fontSize: { xs: '1.1rem', sm: '1.25rem' },
            fontWeight: 600,
          }}
        >
          Fusion Flow
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: { xs: 1, sm: 1 } }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem 
              button 
              key={item.text} 
              component={Link} 
              to={item.path}
              onClick={isMobile ? handleDrawerToggle : undefined}
              sx={{
                minHeight: { xs: 56, sm: 48 }, // Touch target maior em mobile
                borderRadius: { xs: 12, sm: 8 }, // Bordas mais arredondadas em mobile
                mx: { xs: 0.5, sm: 1 },
                mb: 0.5,
                px: { xs: 2, sm: 2 },
                backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                color: isActive ? theme.palette.primary.main : 'inherit',
                '&:hover': {
                  backgroundColor: isActive 
                    ? alpha(theme.palette.primary.main, 0.16)
                    : alpha(theme.palette.action.hover, 0.08),
                },
                '&:active': {
                  transform: 'scale(0.98)', // Feedback visual para touch
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <ListItemIcon 
                sx={{
                  color: isActive ? theme.palette.primary.main : 'inherit',
                  minWidth: { xs: 40, sm: 56 }, // Espaçamento responsivo
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  fontWeight: isActive ? 600 : 400,
                }}
              />
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <List sx={{ px: { xs: 1, sm: 1 } }}>
        <ListItem 
          button 
          onClick={logout}
          sx={{
            minHeight: { xs: 56, sm: 48 }, // Touch target maior em mobile
            borderRadius: { xs: 12, sm: 8 }, // Bordas mais arredondadas em mobile
            mx: { xs: 0.5, sm: 1 },
            mb: 0.5,
            px: { xs: 2, sm: 2 },
            '&:hover': {
              backgroundColor: alpha(theme.palette.error.main, 0.08),
              color: theme.palette.error.main,
            },
            '&:active': {
              transform: 'scale(0.98)', // Feedback visual para touch
              backgroundColor: alpha(theme.palette.error.main, 0.12),
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <ListItemIcon 
            sx={{
              minWidth: { xs: 40, sm: 56 }, // Espaçamento responsivo
            }}
          >
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Sair"
            primaryTypographyProps={{
              fontSize: { xs: '0.9rem', sm: '1rem' },
            }}
          />
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          height: { xs: 56, sm: 64 }, // Altura responsiva
        }}
      >
        <Toolbar 
          sx={{
            minHeight: { xs: 56, sm: 64 }, // Altura mínima responsiva
            px: { xs: 2, sm: 3 }, // Padding horizontal responsivo
          }}
        >
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: { xs: 1, sm: 2 }, 
              display: { md: 'none' },
              minHeight: { xs: 44, sm: 48 }, // Touch target responsivo
              minWidth: { xs: 44, sm: 48 },
              borderRadius: { xs: 12, sm: 8 }, // Bordas mais arredondadas em mobile
              '&:hover': {
                backgroundColor: alpha(theme.palette.common.white, 0.1),
              },
              '&:active': {
                transform: 'scale(0.95)',
                backgroundColor: alpha(theme.palette.common.white, 0.2),
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <MenuIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              fontWeight: 600,
            }}
          >
            Fusion Flow
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 0.5, sm: 1 }, // Gap responsivo
          }}>
            <ThemeToggle />
            {user && <NotificationsList />}
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        {/* Drawer para dispositivos móveis */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        {/* Drawer permanente para desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // Altura da AppBar
          mb: { xs: '72px', md: 0 }, // Espaço para bottom navigation no mobile
        }}
      >
        {children}
      </Box>
      <BottomNavigation visible={isMobile} />
    </Box>
  );
};