import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';

export interface Notification {
  id: string;
  type: string;
  message: string;
  entityId?: string;
  entityType?: string;
  createdAt: Date;
  read: boolean;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  clearNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, token } = useAuth();

  // Conectar ao WebSocket quando o usuário estiver autenticado
  useEffect(() => {
    if (!user || !token) return;

    const socketInstance = io('http://localhost:3000/notifications', {
      auth: { token },
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('Conectado ao servidor de notificações');
    });

    socketInstance.on('disconnect', () => {
      console.log('Desconectado do servidor de notificações');
    });

    socketInstance.on('notifications', (data: Notification[]) => {
      setNotifications(data);
    });

    socketInstance.on('notification', (data: Notification) => {
      setNotifications(prev => [data, ...prev]);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user, token]);

  // Entrar em salas de projetos quando necessário
  const joinProjectRoom = (projectId: string) => {
    if (socket) {
      socket.emit('joinProject', { projectId });
    }
  };

  // Sair de salas de projetos quando necessário
  const leaveProjectRoom = (projectId: string) => {
    if (socket) {
      socket.emit('leaveProject', { projectId });
    }
  };

  // Marcar notificação como lida
  const markAsRead = (notificationId: string) => {
    if (socket) {
      socket.emit('markAsRead', { notificationId });
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    }
  };

  // Limpar todas as notificações
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Calcular o número de notificações não lidas
  const unreadCount = notifications.filter(notification => !notification.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};