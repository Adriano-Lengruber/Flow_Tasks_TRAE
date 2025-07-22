import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreferences)
    private preferencesRepository: Repository<NotificationPreferences>,
  ) {}

  async getPreferencesForUser(userId: string): Promise<NotificationPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences if none exist
      preferences = this.preferencesRepository.create({
        userId,
        taskAssigned: true,
        taskCompleted: true,
        taskMoved: true,
        taskComment: true,
        projectCreated: true,
        projectUpdated: true,
        deadlineApproaching: true,
        emailNotifications: true,
        pushNotifications: true,
      });
      await this.preferencesRepository.save(preferences);
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    preferencesData: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    let preferences = await this.getPreferencesForUser(userId);
    
    // Update only the fields that are provided
    Object.assign(preferences, preferencesData);
    
    return this.preferencesRepository.save(preferences);
  }

  async shouldNotifyUser(userId: string, notificationType: keyof Omit<NotificationPreferences, 'id' | 'user' | 'userId' | 'createdAt' | 'updatedAt' | 'emailNotifications' | 'pushNotifications'>): Promise<boolean> {
    const preferences = await this.getPreferencesForUser(userId);
    return preferences[notificationType] === true;
  }

  async createDefaultPreferencesForUser(user: User): Promise<NotificationPreferences> {
    const preferences = this.preferencesRepository.create({
      userId: user.id,
      user,
    });
    return this.preferencesRepository.save(preferences);
  }
}