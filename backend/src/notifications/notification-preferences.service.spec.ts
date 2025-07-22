import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferencesService } from './notification-preferences.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let preferencesRepository: Repository<NotificationPreferences>;

  const mockPreferencesRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesService,
        {
          provide: getRepositoryToken(NotificationPreferences),
          useValue: mockPreferencesRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationPreferencesService>(NotificationPreferencesService);
    preferencesRepository = module.get<Repository<NotificationPreferences>>(getRepositoryToken(NotificationPreferences));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPreferencesForUser', () => {
    it('should return existing preferences if found', async () => {
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

      mockPreferencesRepository.findOne.mockResolvedValue(mockPreferences);

      const result = await service.getPreferencesForUser('user-id');

      expect(mockPreferencesRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
      });
      expect(result).toEqual(mockPreferences);
      expect(mockPreferencesRepository.create).not.toHaveBeenCalled();
      expect(mockPreferencesRepository.save).not.toHaveBeenCalled();
    });

    it('should create default preferences if none exist', async () => {
      const mockDefaultPreferences = {
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

      mockPreferencesRepository.findOne.mockResolvedValue(null);
      mockPreferencesRepository.create.mockReturnValue(mockDefaultPreferences);
      mockPreferencesRepository.save.mockResolvedValue({
        id: 'new-pref-id',
        ...mockDefaultPreferences,
      });

      const result = await service.getPreferencesForUser('user-id');

      expect(mockPreferencesRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
      });
      expect(mockPreferencesRepository.create).toHaveBeenCalledWith(mockDefaultPreferences);
      expect(mockPreferencesRepository.save).toHaveBeenCalledWith(mockDefaultPreferences);
      expect(result).toEqual(mockDefaultPreferences);
    });
  });

  describe('updatePreferences', () => {
    it('should update and return preferences', async () => {
      const existingPreferences = {
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

      const updateData = {
        taskAssigned: false,
        emailNotifications: false,
      };

      const updatedPreferences = {
        ...existingPreferences,
        ...updateData,
      };

      jest.spyOn(service, 'getPreferencesForUser').mockResolvedValue(existingPreferences as NotificationPreferences);
      mockPreferencesRepository.save.mockResolvedValue(updatedPreferences);

      const result = await service.updatePreferences('user-id', updateData);

      expect(service.getPreferencesForUser).toHaveBeenCalledWith('user-id');
      expect(mockPreferencesRepository.save).toHaveBeenCalledWith(updatedPreferences);
      expect(result).toEqual(updatedPreferences);
    });
  });

  describe('shouldNotifyUser', () => {
    it('should return true if the notification type is enabled', async () => {
      const mockPreferences = {
        taskAssigned: true,
        taskCompleted: false,
      } as NotificationPreferences;

      jest.spyOn(service, 'getPreferencesForUser').mockResolvedValue(mockPreferences);

      const result = await service.shouldNotifyUser('user-id', 'taskAssigned');

      expect(service.getPreferencesForUser).toHaveBeenCalledWith('user-id');
      expect(result).toBe(true);
    });

    it('should return false if the notification type is disabled', async () => {
      const mockPreferences = {
        taskAssigned: true,
        taskCompleted: false,
      } as NotificationPreferences;

      jest.spyOn(service, 'getPreferencesForUser').mockResolvedValue(mockPreferences);

      const result = await service.shouldNotifyUser('user-id', 'taskCompleted');

      expect(service.getPreferencesForUser).toHaveBeenCalledWith('user-id');
      expect(result).toBe(false);
    });
  });

  describe('createDefaultPreferencesForUser', () => {
    it('should create and return default preferences for a new user', async () => {
      const mockUser = { id: 'user-id' } as User;
      const mockPreferences = {
        userId: 'user-id',
        user: mockUser,
      };

      mockPreferencesRepository.create.mockReturnValue(mockPreferences);
      mockPreferencesRepository.save.mockResolvedValue({
        id: 'new-pref-id',
        ...mockPreferences,
      });

      const result = await service.createDefaultPreferencesForUser(mockUser);

      expect(mockPreferencesRepository.create).toHaveBeenCalledWith({
        userId: 'user-id',
        user: mockUser,
      });
      expect(mockPreferencesRepository.save).toHaveBeenCalledWith(mockPreferences);
      expect(result).toEqual({
        id: 'new-pref-id',
        ...mockPreferences,
      });
    });
  });
});