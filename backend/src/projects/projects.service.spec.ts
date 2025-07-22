import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Section } from './entities/section.entity';
import { Task } from './entities/task.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { User } from '../auth/entities/user.entity';
import { NotificationType } from '../notifications/enums/notification-type.enum';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  })),
});

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepository: MockRepository<Project>;
  let sectionRepository: MockRepository<Section>;
  let taskRepository: MockRepository<Task>;
  let notificationsGateway: NotificationsGateway;

  beforeEach(async () => {
    const mockNotificationsGateway = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
      broadcastProjectUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Section),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Task),
          useValue: createMockRepository(),
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectRepository = module.get<MockRepository>(getRepositoryToken(Project));
    sectionRepository = module.get<MockRepository>(getRepositoryToken(Section));
    taskRepository = module.get<MockRepository>(getRepositoryToken(Task));
    notificationsGateway = module.get<NotificationsGateway>(NotificationsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProject', () => {
    it('should create a project with default sections', async () => {
      const mockUser: Partial<User> = { id: 'user-id', email: 'test@example.com' };
      const createProjectInput = { name: 'Test Project', description: 'Test Description' };
      
      const mockProject = {
        id: 'project-id',
        ...createProjectInput,
        owner: mockUser,
        sections: [],
      };
      
      const mockSections = [
        { id: 'section-1', name: 'To Do', order: 0 },
        { id: 'section-2', name: 'In Progress', order: 1 },
        { id: 'section-3', name: 'Done', order: 2 },
      ];
      
      projectRepository.create.mockReturnValue(mockProject);
      sectionRepository.create.mockImplementation((data) => data);
      projectRepository.save.mockResolvedValue({
        ...mockProject,
        sections: mockSections,
      });
      
      const result = await service.createProject(createProjectInput, mockUser as User);
      
      expect(projectRepository.create).toHaveBeenCalledWith({
        ...createProjectInput,
        owner: mockUser,
      });
      
      expect(sectionRepository.create).toHaveBeenCalledTimes(3);
      expect(projectRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...mockProject,
        sections: expect.arrayContaining([
          expect.objectContaining({ name: 'To Do' }),
          expect.objectContaining({ name: 'In Progress' }),
          expect.objectContaining({ name: 'Done' }),
        ]),
      }));
      
      expect(result).toEqual(expect.objectContaining({
        id: 'project-id',
        name: 'Test Project',
        sections: expect.arrayContaining([
          expect.objectContaining({ name: 'To Do' }),
          expect.objectContaining({ name: 'In Progress' }),
          expect.objectContaining({ name: 'Done' }),
        ]),
      }));
    });
  });

  describe('findAllProjects', () => {
    it('should return all projects for a user', async () => {
      const mockUser: Partial<User> = { id: 'user-id', email: 'test@example.com' };
      const mockProjects = [
        { id: 'project-1', name: 'Project 1', owner: mockUser },
        { id: 'project-2', name: 'Project 2', owner: mockUser },
      ];
      
      projectRepository.find.mockResolvedValue(mockProjects);
      
      const result = await service.findAllProjects(mockUser as User);
      
      expect(projectRepository.find).toHaveBeenCalledWith({
        where: { owner: { id: mockUser.id } },
        relations: ['sections', 'sections.tasks'],
      });
      
      expect(result).toEqual(mockProjects);
    });
  });

  describe('findProjectById', () => {
    it('should return a project if it exists', async () => {
      const mockProject = { id: 'project-id', name: 'Test Project' };
      projectRepository.findOne.mockResolvedValue(mockProject);
      
      const result = await service.findProjectById('project-id');
      
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-id' },
        relations: ['sections', 'sections.tasks'],
      });
      
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      projectRepository.findOne.mockResolvedValue(null);
      
      await expect(service.findProjectById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTask', () => {
    it('should create a task and send notification if assignee is provided', async () => {
      const mockSection = { id: 'section-id', name: 'To Do' };
      const createTaskInput = {
        title: 'Test Task',
        description: 'Test Description',
        sectionId: 'section-id',
        assigneeId: 'user-id',
      };
      
      const mockTask = {
        id: 'task-id',
        ...createTaskInput,
        section: mockSection,
      };
      
      sectionRepository.findOne.mockResolvedValue(mockSection);
      taskRepository.findOne.mockResolvedValue(null); // No existing tasks
      taskRepository.create.mockReturnValue(mockTask);
      taskRepository.save.mockResolvedValue(mockTask);
      
      const result = await service.createTask(createTaskInput);
      
      expect(sectionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'section-id' },
        relations: ['tasks'],
      });
      
      expect(taskRepository.create).toHaveBeenCalledWith({
        ...createTaskInput,
        order: 0, // First task in section
        section: mockSection,
      });
      
      expect(taskRepository.save).toHaveBeenCalledWith(mockTask);
      
      expect(notificationsGateway.sendNotification).toHaveBeenCalledWith(
        'user-id',
        NotificationType.TASK_ASSIGNED,
        `Uma nova tarefa foi atribuída a você: ${mockTask.title}`,
        { id: mockTask.id, type: 'task' }
      );
      
      expect(result).toEqual(mockTask);
    });
  });

  describe('moveTask', () => {
    it('should move a task to a different section and update order', async () => {
      const originalSection = { id: 'section-1', name: 'To Do' };
      const targetSection = { id: 'section-2', name: 'In Progress' };
      
      const mockTask = {
        id: 'task-id',
        title: 'Test Task',
        section: originalSection,
        order: 1,
        assignee: { id: 'user-id' },
      };
      
      const moveTaskInput = {
        taskId: 'task-id',
        targetSectionId: 'section-2',
        newOrder: 0,
      };
      
      taskRepository.findOne.mockResolvedValue(mockTask);
      sectionRepository.findOne.mockResolvedValue(targetSection);
      projectRepository.findOne.mockResolvedValue({
        id: 'project-id',
        owner: { id: 'owner-id' },
      });
      
      const updatedTask = {
        ...mockTask,
        section: targetSection,
        order: 0,
      };
      
      taskRepository.save.mockResolvedValue(updatedTask);
      
      const result = await service.moveTask(moveTaskInput);
      
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-id' },
        relations: ['section', 'assignee'],
      });
      
      expect(sectionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'section-2' },
        relations: ['tasks'],
      });
      
      expect(taskRepository.createQueryBuilder).toHaveBeenCalled();
      
      expect(taskRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: 'task-id',
        section: targetSection,
        order: 0,
      }));
      
      expect(notificationsGateway.sendNotification).toHaveBeenCalledWith(
        'user-id',
        NotificationType.TASK_MOVED,
        `A tarefa "${mockTask.title}" foi movida para ${targetSection.name}`,
        { id: mockTask.id, type: 'task' }
      );
      
      expect(notificationsGateway.broadcastProjectUpdate).toHaveBeenCalledWith(
        'project-id',
        expect.objectContaining({
          type: 'TASK_MOVED',
          taskId: 'task-id',
          fromSection: 'section-1',
          toSection: 'section-2',
        })
      );
      
      expect(result).toEqual(updatedTask);
    });
  });
});