import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsResolver } from './projects.resolver';
import { ProjectsService } from './projects.service';
import { User } from '../auth/entities/user.entity';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { CreateSectionInput } from './dto/create-section.input';
import { UpdateSectionInput } from './dto/update-section.input';
import { CreateTaskInput } from './dto/create-task.input';
import { UpdateTaskInput } from './dto/update-task.input';
import { MoveTaskInput } from './dto/move-task.input';

describe('ProjectsResolver', () => {
  let resolver: ProjectsResolver;
  let projectsService: ProjectsService;

  beforeEach(async () => {
    const mockProjectsService = {
      createProject: jest.fn(),
      findAllProjects: jest.fn(),
      findProjectById: jest.fn(),
      updateProject: jest.fn(),
      removeProject: jest.fn(),
      createSection: jest.fn(),
      findSectionById: jest.fn(),
      updateSection: jest.fn(),
      removeSection: jest.fn(),
      createTask: jest.fn(),
      findTaskById: jest.fn(),
      updateTask: jest.fn(),
      removeTask: jest.fn(),
      moveTask: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsResolver,
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    resolver = module.get<ProjectsResolver>(ProjectsResolver);
    projectsService = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createProject', () => {
    it('should call projectsService.createProject with correct parameters', async () => {
      const mockUser: Partial<User> = { id: 'user-id', email: 'test@example.com' };
      const createProjectInput: CreateProjectInput = {
        name: 'Test Project',
        description: 'Test Description',
      };
      const mockProject = {
        id: 'project-id',
        ...createProjectInput,
        owner: mockUser,
      };

      jest.spyOn(projectsService, 'createProject').mockResolvedValue(mockProject as any);

      const result = await resolver.createProject(createProjectInput, mockUser as User);

      expect(projectsService.createProject).toHaveBeenCalledWith(createProjectInput, mockUser);
      expect(result).toEqual(mockProject);
    });
  });

  describe('findAllProjects', () => {
    it('should call projectsService.findAllProjects with correct user', async () => {
      const mockUser: Partial<User> = { id: 'user-id', email: 'test@example.com' };
      const mockProjects = [
        { id: 'project-1', name: 'Project 1' },
        { id: 'project-2', name: 'Project 2' },
      ];

      jest.spyOn(projectsService, 'findAllProjects').mockResolvedValue(mockProjects as any);

      const result = await resolver.findAllProjects(mockUser as User);

      expect(projectsService.findAllProjects).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockProjects);
    });
  });

  describe('findProjectById', () => {
    it('should call projectsService.findProjectById with correct id', async () => {
      const mockProject = { id: 'project-id', name: 'Test Project' };

      jest.spyOn(projectsService, 'findProjectById').mockResolvedValue(mockProject as any);

      const result = await resolver.findProjectById('project-id');

      expect(projectsService.findProjectById).toHaveBeenCalledWith('project-id');
      expect(result).toEqual(mockProject);
    });
  });

  describe('updateProject', () => {
    it('should call projectsService.updateProject with correct input', async () => {
      const updateProjectInput: UpdateProjectInput = {
        id: 'project-id',
        name: 'Updated Project',
      };
      const mockUpdatedProject = {
        id: 'project-id',
        name: 'Updated Project',
        description: 'Test Description',
      };

      jest.spyOn(projectsService, 'updateProject').mockResolvedValue(mockUpdatedProject as any);

      const result = await resolver.updateProject(updateProjectInput);

      expect(projectsService.updateProject).toHaveBeenCalledWith(updateProjectInput);
      expect(result).toEqual(mockUpdatedProject);
    });
  });

  describe('createTask', () => {
    it('should call projectsService.createTask with correct input', async () => {
      const createTaskInput: CreateTaskInput = {
        title: 'Test Task',
        description: 'Test Description',
        sectionId: 'section-id',
        assigneeId: 'user-id',
      };
      const mockTask = {
        id: 'task-id',
        ...createTaskInput,
      };

      jest.spyOn(projectsService, 'createTask').mockResolvedValue(mockTask as any);

      const result = await resolver.createTask(createTaskInput);

      expect(projectsService.createTask).toHaveBeenCalledWith(createTaskInput);
      expect(result).toEqual(mockTask);
    });
  });

  describe('moveTask', () => {
    it('should call projectsService.moveTask with correct input', async () => {
      const moveTaskInput: MoveTaskInput = {
        taskId: 'task-id',
        targetSectionId: 'section-id',
        newOrder: 0,
      };
      const mockTask = {
        id: 'task-id',
        title: 'Test Task',
        section: { id: 'section-id' },
        order: 0,
      };

      jest.spyOn(projectsService, 'moveTask').mockResolvedValue(mockTask as any);

      const result = await resolver.moveTask(moveTaskInput);

      expect(projectsService.moveTask).toHaveBeenCalledWith(moveTaskInput);
      expect(result).toEqual(mockTask);
    });
  });
});