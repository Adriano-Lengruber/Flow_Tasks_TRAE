import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../auth/entities/user.entity';
import { NotificationPreferencesService } from './notification-preferences.service';
import { Repository } from 'typeorm';
import { NotificationType } from './enums/notification-type.enum';
import { NotFoundException } from '@nestjs/common';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: MockRepository<Notification>;
  let userRepository: MockRepository<User>;
  let preferencesService: NotificationPreferencesService;

  beforeEach(async () => {
    const mockPreferencesService = {
      shouldNotifyUser: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
        {
          provide: NotificationPreferencesService,
          useValue: mockPreferencesService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get<MockRepository>(getRepositoryToken(Notification));
    userRepository = module.get<MockRepository>(getRepositoryToken(User));
    preferencesService = module.get<NotificationPreferencesService>(NotificationPreferencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addNotification', () => {
    it('should create a notification if user exists and preferences allow it', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockNotification = {
        id: 'notification-id',
        type: NotificationType.TASK_ASSIGNED,
        message: 'Test notification',
        entityId: 'task-id',
        entityType: 'task',
        user: mockUser,
        read: false,
        createdAt: new Date(),
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);
      notificationRepository.count.mockResolvedValue(50); // Less than 100 notifications

      jest.spyOn(preferencesService, 'shouldNotifyUser').mockResolvedValue(true);

      const result = await service.addNotification(
        'user-id',
        NotificationType.TASK_ASSIGNED,
        'Test notification',
        'task-id',
        'task',
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
      expect(preferencesService.shouldNotifyUser).toHaveBeenCalledWith(
        'user-id',
        'taskAssigned',
      );
      expect(notificationRepository.create).toHaveBeenCalledWith({
        type: NotificationType.TASK_ASSIGNED,
        message: 'Test notification',
        entityId: 'task-id',
        entityType: 'task',
        user: mockUser,
        read: false,
      });
      expect(notificationRepository.save).toHaveBeenCalledWith(mockNotification);
      expect(result).toEqual(mockNotification);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addNotification(
          'non-existent-id',
          NotificationType.TASK_ASSIGNED,
          'Test notification',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return null if user preferences disallow this notification type', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      userRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(preferencesService, 'shouldNotifyUser').mockResolvedValue(false);

      const result = await service.addNotification(
        'user-id',
        NotificationType.TASK_ASSIGNED,
        'Test notification',
      );

      expect(preferencesService.shouldNotifyUser).toHaveBeenCalledWith(
        'user-id',
        'taskAssigned',
      );
      expect(notificationRepository.create).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should remove oldest notifications if user has more than 100', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockNotification = {
        id: 'notification-id',
        type: NotificationType.TASK_ASSIGNED,
        message: 'Test notification',
        user: mockUser,
        read: false,
        createdAt: new Date(),
      };
      const oldNotifications = [
        { id: 'old-1', createdAt: new Date(Date.now() - 10000) },
        { id: 'old-2', createdAt: new Date(Date.now() - 20000) },
      ];

      userRepository.findOne.mockResolvedValue(mockUser);
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);
      notificationRepository.count.mockResolvedValue(102); // More than 100 notifications
      notificationRepository.find.mockResolvedValue(oldNotifications);

      await service.addNotification(
        'user-id',
        NotificationType.TASK_ASSIGNED,
        'Test notification',
      );

      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: { user: { id: 'user-id' } },
      });
      expect(notificationRepository.find).toHaveBeenCalledWith({
        where: { user: { id: 'user-id' } },
        order: { createdAt: 'ASC' },
        take: 2, // 102 - 100 = 2 oldest to remove
      });
      expect(notificationRepository.remove).toHaveBeenCalledWith(oldNotifications);
    });
  });

  describe('getNotificationsForUser', () => {
    it('should return notifications for a user with pagination', async () => {
      const mockNotifications = [
        { id: 'notification-1', message: 'Test 1' },
        { id: 'notification-2', message: 'Test 2' },
      ];

      notificationRepository.find.mockResolvedValue(mockNotifications);

      const result = await service.getNotificationsForUser('user-id', 10, 5);

      expect(notificationRepository.find).toHaveBeenCalledWith({
        where: { user: { id: 'user-id' } },
        order: { createdAt: 'DESC' },
        take: 10,
        skip: 5,
      });
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      notificationRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.markAsRead('user-id', 'notification-id');

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { id: 'notification-id', user: { id: 'user-id' } },
        { read: true },
      );
      expect(result).toBe(true);
    });

    it('should return false if notification was not found', async () => {
      notificationRepository.update.mockResolvedValue({ affected: 0 });

      const result = await service.markAsRead('user-id', 'non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      notificationRepository.update.mockResolvedValue({ affected: 5 });

      const result = await service.markAllAsRead('user-id');

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { user: { id: 'user-id' }, read: false },
        { read: true },
      );
      expect(result).toBe(true);
    });
  });

  describe('deleteOldNotifications', () => {
    it('should delete notifications older than specified days', async () => {
      notificationRepository.delete.mockResolvedValue({ affected: 3 });
      
      const result = await service.deleteOldNotifications(15);
      
      expect(notificationRepository.delete).toHaveBeenCalled();
      expect(result).toBe(3);
    });
  });
});