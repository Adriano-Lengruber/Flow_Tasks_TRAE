import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsResolver } from './notifications.resolver';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';

describe('NotificationsResolver', () => {
  let resolver: NotificationsResolver;
  let notificationsService: NotificationsService;

  const mockNotificationsService = {
    getNotificationsForUser: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    clearNotifications: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsResolver,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    resolver = module.get<NotificationsResolver>(NotificationsResolver);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should return notifications for the user', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockContext = { req: { user: mockUser } };
      const mockNotifications = [
        { id: 'notification-1', message: 'Test notification 1' },
        { id: 'notification-2', message: 'Test notification 2' },
      ] as Notification[];

      mockNotificationsService.getNotificationsForUser.mockResolvedValue(mockNotifications);

      const result = await resolver.getNotifications(mockContext, 50, 0);

      expect(notificationsService.getNotificationsForUser).toHaveBeenCalledWith('user-id', 50, 0);
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('getUnreadCount', () => {
    it('should return the count of unread notifications', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockContext = { req: { user: mockUser } };
      
      mockNotificationsService.getUnreadCount.mockResolvedValue(5);

      const result = await resolver.getUnreadCount(mockContext);

      expect(notificationsService.getUnreadCount).toHaveBeenCalledWith('user-id');
      expect(result).toBe(5);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockContext = { req: { user: mockUser } };
      const notificationId = 'notification-id';
      
      mockNotificationsService.markAsRead.mockResolvedValue(true);

      const result = await resolver.markNotificationAsRead(mockContext, notificationId);

      expect(notificationsService.markAsRead).toHaveBeenCalledWith('user-id', notificationId);
      expect(result).toBe(true);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockContext = { req: { user: mockUser } };
      
      mockNotificationsService.markAllAsRead.mockResolvedValue(true);

      const result = await resolver.markAllNotificationsAsRead(mockContext);

      expect(notificationsService.markAllAsRead).toHaveBeenCalledWith('user-id');
      expect(result).toBe(true);
    });
  });

  describe('clearAllNotifications', () => {
    it('should clear all notifications', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockContext = { req: { user: mockUser } };
      
      mockNotificationsService.clearNotifications.mockResolvedValue(true);

      const result = await resolver.clearAllNotifications(mockContext);

      expect(notificationsService.clearNotifications).toHaveBeenCalledWith('user-id');
      expect(result).toBe(true);
    });
  });
});