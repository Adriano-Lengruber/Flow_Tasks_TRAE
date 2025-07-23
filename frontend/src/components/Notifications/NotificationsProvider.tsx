import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_NOTIFICATIONS,
  GET_UNREAD_NOTIFICATIONS_COUNT,
  MARK_NOTIFICATION_AS_READ,
  MARK_ALL_NOTIFICATIONS_AS_READ,
  CLEAR_ALL_NOTIFICATIONS,
} from '../../graphql/notifications';

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
  markAllAsRead: () => void;
  clearNotifications: () => void;
  refetchNotifications: () => void;
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

  // GraphQL queries e mutations
  const { data: notificationsData, refetch: refetchNotifications } = useQuery(GET_NOTIFICATIONS, {
    skip: !user,
    fetchPolicy: 'cache-and-network',
  });

  const { data: unreadCountData } = useQuery(GET_UNREAD_NOTIFICATIONS_COUNT, {
    skip: !user,
    pollInterval: 30000, // Atualizar a cada 30 segundos
  });

  const [markNotificationAsReadMutation] = useMutation(MARK_NOTIFICATION_AS_READ);
  const [markAllNotificationsAsReadMutation] = useMutation(MARK_ALL_NOTIFICATIONS_AS_READ);
  const [clearAllNotificationsMutation] = useMutation(CLEAR_ALL_NOTIFICATIONS);

  // Sincronizar notificações do GraphQL com o estado local
  useEffect(() => {
    if (notificationsData?.notifications) {
      setNotifications(notificationsData.notifications);
    }
  }, [notificationsData]);

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

    socketInstance.on('newNotification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      // Refetch para manter sincronizado
      refetchNotifications();
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user, token, refetchNotifications]);

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
  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsReadMutation({
        variables: { notificationId },
      });
      
      // Atualizar estado local
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      
      // Também emitir via WebSocket para sincronização em tempo real
      if (socket) {
        socket.emit('markAsRead', { notificationId });
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  // Marcar todas as notificações como lidas
  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsReadMutation();
      
      // Atualizar estado local
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      refetchNotifications();
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
    }
  };

  // Limpar todas as notificações
  const clearNotifications = async () => {
    try {
      await clearAllNotificationsMutation();
      setNotifications([]);
      refetchNotifications();
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
    }
  };

  // Calcular o número de notificações não lidas
  const unreadCount = unreadCountData?.unreadNotificationsCount ?? notifications.filter(notification => !notification.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        refetchNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};