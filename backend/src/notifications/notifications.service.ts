import { Injectable } from '@nestjs/common';
import { NotificationType } from './enums/notification-type.enum';

@Injectable()
export class NotificationsService {
  private readonly notifications: Map<string, Notification[]> = new Map();

  addNotification(userId: string, notification: Notification): void {
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId).push(notification);
    
    // Limitar o número de notificações armazenadas por usuário
    const userNotifications = this.notifications.get(userId);
    if (userNotifications.length > 100) {
      this.notifications.set(userId, userNotifications.slice(-100));
    }
  }

  getNotificationsForUser(userId: string): Notification[] {
    return this.notifications.get(userId) || [];
  }

  markAsRead(userId: string, notificationId: string): void {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  clearNotifications(userId: string): void {
    this.notifications.set(userId, []);
  }
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  entityId?: string;
  entityType?: string;
  createdAt: Date;
  read: boolean;
}