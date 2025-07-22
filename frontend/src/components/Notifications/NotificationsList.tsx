import React, { useState } from 'react';
import { Badge, Box, IconButton, Menu, MenuItem, Typography, Divider } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNotifications, Notification } from './NotificationsProvider';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationItem: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const { markAsRead } = useNotifications();

  const handleClick = () => {
    markAsRead(notification.id);
    // Aqui poderia navegar para a entidade relacionada
    // se notification.entityId e notification.entityType estiverem definidos
    onClose();
  };

  return (
    <MenuItem
      onClick={handleClick}
      sx={{
        backgroundColor: notification.read ? 'transparent' : 'rgba(25, 118, 210, 0.08)',
        borderLeft: notification.read ? 'none' : '3px solid #1976d2',
        display: 'block',
        width: '100%',
        maxWidth: '400px',
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
        {notification.message}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: ptBR })}
      </Typography>
    </MenuItem>
  );
};

export const NotificationsList: React.FC = () => {
  const { notifications, unreadCount, clearNotifications } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleClearAll = () => {
    clearNotifications();
    handleClose();
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-controls={open ? 'notifications-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        id="notifications-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'notifications-button',
          sx: { width: '400px', maxHeight: '500px' },
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notificações</Typography>
          {notifications.length > 0 && (
            <Typography
              variant="caption"
              color="primary"
              sx={{ cursor: 'pointer' }}
              onClick={handleClearAll}
            >
              Limpar todas
            </Typography>
          )}
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma notificação
            </Typography>
          </Box>
        ) : (
          notifications.map((notification) => (
            <React.Fragment key={notification.id}>
              <NotificationItem notification={notification} onClose={handleClose} />
              <Divider />
            </React.Fragment>
          ))
        )}
      </Menu>
    </>
  );
};