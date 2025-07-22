import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from '../projects/entities/task.entity';
import { Repository, LessThan } from 'typeorm';
import { NotificationType } from './enums/notification-type.enum';
import { Logger } from '@nestjs/common';

describe('NotificationsScheduler', () => {
  let scheduler: NotificationsScheduler;
  let notificationsService: NotificationsService;
  let notificationsGateway: NotificationsGateway;
  let tasksRepository: Repository<Task>;

  const mockNotificationsService = {
    deleteOldNotifications: jest.fn(),
  };

  const mockNotificationsGateway = {
    sendNotification: jest.fn(),
  };

  const mockTasksRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsScheduler,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTasksRepository,
        },
      ],
    }).compile();

    scheduler = module.get<NotificationsScheduler>(NotificationsScheduler);
    notificationsService = module.get<NotificationsService>(NotificationsService);
    notificationsGateway = module.get<NotificationsGateway>(NotificationsGateway);
    tasksRepository = module.get<Repository<Task>>(getRepositoryToken(Task));

    // Mock Logger methods
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('cleanupOldNotifications', () => {
    it('should call deleteOldNotifications and log success', async () => {
      mockNotificationsService.deleteOldNotifications.mockResolvedValue(5);

      await scheduler.cleanupOldNotifications();

      expect(mockNotificationsService.deleteOldNotifications).toHaveBeenCalledWith(30);
      expect(Logger.prototype.log).toHaveBeenCalled();
    });

    it('should handle errors and log them', async () => {
      mockNotificationsService.deleteOldNotifications.mockRejectedValue(new Error('Test error'));

      await scheduler.cleanupOldNotifications();

      expect(mockNotificationsService.deleteOldNotifications).toHaveBeenCalledWith(30);
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('checkUpcomingDeadlines', () => {
    it('should notify users about tasks due tomorrow and next week', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 5);

      const mockTasksDueTomorrow = [
        {
          id: 'task-1',
          title: 'Task due tomorrow',
          dueDate: tomorrow,
          completed: false,
          assignee: { id: 'user-1' },
          section: {
            project: {
              owner: { id: 'owner-1' },
            },
          },
        },
      ];

      const mockTasksDueNextWeek = [
        {
          id: 'task-2',
          title: 'Task due next week',
          dueDate: nextWeek,
          completed: false,
          assignee: { id: 'user-2' },
          section: {
            project: {
              owner: { id: 'owner-2' },
            },
          },
        },
      ];

      // Mock the find method to return different results based on call count
      mockTasksRepository.find
        .mockResolvedValueOnce(mockTasksDueTomorrow) // First call for tomorrow
        .mockResolvedValueOnce(mockTasksDueNextWeek); // Second call for next week

      await scheduler.checkUpcomingDeadlines();

      // Should have called find twice (once for tomorrow, once for next week)
      expect(mockTasksRepository.find).toHaveBeenCalledTimes(2);
      
      // Should have sent notifications for tasks due tomorrow
      expect(mockNotificationsGateway.sendNotification).toHaveBeenCalledWith(
        'user-1',
        NotificationType.DEADLINE_APPROACHING,
        'A tarefa "Task due tomorrow" vence amanhã!',
        { id: 'task-1', type: 'task' }
      );

      // Should have sent notifications for tasks due next week
      expect(mockNotificationsGateway.sendNotification).toHaveBeenCalledWith(
        'user-2',
        NotificationType.DEADLINE_APPROACHING,
        expect.stringContaining('A tarefa "Task due next week" vence em'),
        { id: 'task-2', type: 'task' }
      );
    });

    it('should handle errors and log them', async () => {
      mockTasksRepository.find.mockRejectedValue(new Error('Test error'));

      await scheduler.checkUpcomingDeadlines();

      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('checkOverdueTasks', () => {
    it('should notify users about overdue tasks', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockOverdueTasks = [
        {
          id: 'task-3',
          title: 'Overdue task',
          dueDate: yesterday,
          completed: false,
          assignee: { id: 'user-3' },
          section: {
            project: {
              owner: { id: 'owner-3' },
            },
          },
        },
      ];

      mockTasksRepository.find.mockResolvedValue(mockOverdueTasks);

      await scheduler.checkOverdueTasks();

      expect(mockTasksRepository.find).toHaveBeenCalledTimes(1);
      expect(mockNotificationsGateway.sendNotification).toHaveBeenCalledWith(
        'user-3',
        NotificationType.DEADLINE_APPROACHING,
        'A tarefa "Overdue task" está atrasada!',
        { id: 'task-3', type: 'task' }
      );
      expect(Logger.prototype.log).toHaveBeenCalled();
    });

    it('should handle errors and log them', async () => {
      mockTasksRepository.find.mockRejectedValue(new Error('Test error'));

      await scheduler.checkOverdueTasks();

      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should not log if no overdue tasks are found', async () => {
      mockTasksRepository.find.mockResolvedValue([]);

      await scheduler.checkOverdueTasks();

      expect(mockTasksRepository.find).toHaveBeenCalledTimes(1);
      expect(mockNotificationsGateway.sendNotification).not.toHaveBeenCalled();
    });
  });
});