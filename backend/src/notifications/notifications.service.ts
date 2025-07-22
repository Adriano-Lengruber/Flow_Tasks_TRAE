import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';
import { User } from '../auth/entities/user.entity';
import { NotificationPreferencesService } from './notification-preferences.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(forwardRef(() => NotificationPreferencesService))
    private preferencesService: NotificationPreferencesService,
  ) {}

  async addNotification(
    userId: string,
    type: NotificationType,
    message: string,
    entityId?: string,
    entityType?: string,
  ): Promise<Notification | null> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    // Verificar as preferências do usuário para este tipo de notificação
    const shouldNotify = await this.shouldSendNotification(userId, type);
    if (!shouldNotify) {
      return null; // Não criar notificação se o usuário desativou este tipo
    }

    const notification = this.notificationsRepository.create({
      type,
      message,
      entityId,
      entityType,
      user,
      read: false,
    });

    const savedNotification = await this.notificationsRepository.save(notification);

    // Limitar o número de notificações por usuário (manter apenas as 100 mais recentes)
    const userNotificationsCount = await this.notificationsRepository.count({
      where: { user: { id: userId } },
    });

    if (userNotificationsCount > 100) {
      const oldestNotifications = await this.notificationsRepository.find({
        where: { user: { id: userId } },
        order: { createdAt: 'ASC' },
        take: userNotificationsCount - 100,
      });

      await this.notificationsRepository.remove(oldestNotifications);
    }

    return savedNotification;
  }

  async getNotificationsForUser(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { user: { id: userId }, read: false },
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const result = await this.notificationsRepository.update(
      { id: notificationId, user: { id: userId } },
      { read: true },
    );
    return result.affected > 0;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    const result = await this.notificationsRepository.update(
      { user: { id: userId }, read: false },
      { read: true },
    );
    return result.affected > 0;
  }

  async clearNotifications(userId: string): Promise<boolean> {
    const result = await this.notificationsRepository.delete({
      user: { id: userId },
    });
    return result.affected > 0;
  }

  async deleteOldNotifications(daysOld = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationsRepository.delete({
      createdAt: { $lt: cutoffDate } as any,
    });

    return result.affected || 0;
  }

  private async shouldSendNotification(userId: string, type: NotificationType): Promise<boolean> {
    // Mapear tipos de notificação para campos nas preferências
    const preferenceMap: Record<NotificationType, keyof any> = {
      [NotificationType.TASK_ASSIGNED]: 'taskAssigned',
      [NotificationType.TASK_COMPLETED]: 'taskCompleted',
      [NotificationType.TASK_MOVED]: 'taskMoved',
      [NotificationType.TASK_COMMENT]: 'taskComment',
      [NotificationType.PROJECT_CREATED]: 'projectCreated',
      [NotificationType.PROJECT_UPDATED]: 'projectUpdated',
      [NotificationType.DEADLINE_APPROACHING]: 'deadlineApproaching',
      [NotificationType.SYSTEM]: 'pushNotifications', // Notificações do sistema sempre usam a configuração geral
    };

    const preferenceField = preferenceMap[type];
    if (!preferenceField) {
      return true; // Se não houver mapeamento específico, permitir a notificação
    }

    return this.preferencesService.shouldNotifyUser(userId, preferenceField as any);
  }
}