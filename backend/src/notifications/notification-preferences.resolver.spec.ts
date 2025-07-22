import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferencesResolver } from './notification-preferences.resolver';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesInput } from './dto/update-notification-preferences.input';

describe('NotificationPreferencesResolver', () => {
  let resolver: NotificationPreferencesResolver;
  let preferencesService: NotificationPreferencesService;

  const mockPreferencesService = {
    getPreferencesForUser: jest.fn(),
    updatePreferences: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesResolver,
        {
          provide: NotificationPreferencesService,
          useValue: mockPreferencesService,
        },
      ],
    }).compile();

    resolver = module.get<NotificationPreferencesResolver>(NotificationPreferencesResolver);
    preferencesService = module.get<NotificationPreferencesService>(NotificationPreferencesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('getPreferences', () => {
    it('should return preferences for the user', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockContext = { req: { user: mockUser } };
      const mockPreferences = {
        id: 'pref-id',
        userId: 'user-id',
        taskAssigned: true,
        taskCompleted: true,
        taskMoved: true,
        taskComment: true,
        projectCreated: true,
        projectUpdated: true,
        deadlineApproaching: true,
        emailNotifications: true,
        pushNotifications: true,
      };

      mockPreferencesService.getPreferencesForUser.mockResolvedValue(mockPreferences);

      const result = await resolver.getPreferences(mockContext);

      expect(preferencesService.getPreferencesForUser).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(mockPreferences);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update and return preferences', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockContext = { req: { user: mockUser } };
      
      const updateInput: UpdateNotificationPreferencesInput = {
        taskAssigned: false,
        emailNotifications: false,
      };

      const updatedPreferences = {
        id: 'pref-id',
        userId: 'user-id',
        taskAssigned: false,
        taskCompleted: true,
        taskMoved: true,
        taskComment: true,
        projectCreated: true,
        projectUpdated: true,
        deadlineApproaching: true,
        emailNotifications: false,
        pushNotifications: true,
      };

      mockPreferencesService.updatePreferences.mockResolvedValue(updatedPreferences);

      const result = await resolver.updateNotificationPreferences(mockContext, updateInput);

      expect(preferencesService.updatePreferences).toHaveBeenCalledWith('user-id', updateInput);
      expect(result).toEqual(updatedPreferences);
    });
  });
});