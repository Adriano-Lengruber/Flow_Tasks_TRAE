import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { Task } from '../projects/entities/task.entity';
import { User } from '../auth/entities/user.entity';
import { CreateCommentInput } from './dto/create-comment.input';
import { UpdateCommentInput } from './dto/update-comment.input';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('CommentsService', () => {
  let service: CommentsService;
  let commentsRepository: MockRepository<Comment>;
  let tasksRepository: MockRepository<Task>;
  let notificationsGateway: jest.Mocked<NotificationsGateway>;

  beforeEach(async () => {
    const mockCommentsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const mockTasksRepository = {
      findOne: jest.fn(),
    };

    const mockNotificationsGateway = {
      sendNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(Comment),
          useValue: mockCommentsRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTasksRepository,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    commentsRepository = module.get(getRepositoryToken(Comment));
    tasksRepository = module.get(getRepositoryToken(Task));
    notificationsGateway = module.get(NotificationsGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a comment and notify task assignee and project owner', async () => {
      const mockUser: Partial<User> = { id: 'user-id', name: 'Test User', email: 'test@example.com' };
      const mockAssignee: Partial<User> = { id: 'assignee-id', name: 'Assignee User', email: 'assignee@example.com' };
      const mockProjectOwner: Partial<User> = { id: 'owner-id', name: 'Owner User', email: 'owner@example.com' };
      
      const createCommentInput: CreateCommentInput = {
        content: 'Test comment',
        taskId: 'task-id',
      };
      
      const mockTask = {
        id: 'task-id',
        title: 'Test Task',
        assignee: mockAssignee,
        section: {
          project: {
            owner: mockProjectOwner,
          },
        },
      };
      
      const mockComment = {
        id: 'comment-id',
        content: 'Test comment',
        author: mockUser,
        task: mockTask,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      tasksRepository.findOne.mockResolvedValue(mockTask);
      commentsRepository.create.mockReturnValue(mockComment);
      commentsRepository.save.mockResolvedValue(mockComment);

      const result = await service.create(createCommentInput, mockUser as User);

      expect(tasksRepository.findOne).toHaveBeenCalledWith({
        where: { id: createCommentInput.taskId },
        relations: ['section', 'section.project', 'section.project.owner', 'assignee'],
      });
      expect(commentsRepository.create).toHaveBeenCalledWith({
        content: createCommentInput.content,
        author: mockUser,
        task: mockTask,
      });
      expect(commentsRepository.save).toHaveBeenCalledWith(mockComment);
      expect(notificationsGateway.sendNotification).toHaveBeenCalledTimes(2);
      expect(notificationsGateway.sendNotification).toHaveBeenCalledWith(
        mockAssignee.id,
        NotificationType.TASK_COMMENT,
        `${mockUser.name} comentou na tarefa "${mockTask.title}"`,
        { id: mockTask.id, type: 'task' }
      );
      expect(notificationsGateway.sendNotification).toHaveBeenCalledWith(
        mockProjectOwner.id,
        NotificationType.TASK_COMMENT,
        `${mockUser.name} comentou na tarefa "${mockTask.title}"`,
        { id: mockTask.id, type: 'task' }
      );
      expect(result).toEqual(mockComment);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const mockUser: Partial<User> = { id: 'user-id', name: 'Test User' };
      const createCommentInput: CreateCommentInput = {
        content: 'Test comment',
        taskId: 'non-existent-task-id',
      };

      tasksRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createCommentInput, mockUser as User)).rejects.toThrow(
        new NotFoundException(`Tarefa com ID ${createCommentInput.taskId} não encontrada`)
      );
    });

    it('should not notify the author if they are the assignee', async () => {
      const mockUser: Partial<User> = { id: 'user-id', name: 'Test User', email: 'test@example.com' };
      const mockProjectOwner: Partial<User> = { id: 'owner-id', name: 'Owner User', email: 'owner@example.com' };
      
      const createCommentInput: CreateCommentInput = {
        content: 'Test comment',
        taskId: 'task-id',
      };
      
      const mockTask = {
        id: 'task-id',
        title: 'Test Task',
        assignee: mockUser, // User is the assignee
        section: {
          project: {
            owner: mockProjectOwner,
          },
        },
      };
      
      const mockComment = {
        id: 'comment-id',
        content: 'Test comment',
        author: mockUser,
        task: mockTask,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      tasksRepository.findOne.mockResolvedValue(mockTask);
      commentsRepository.create.mockReturnValue(mockComment);
      commentsRepository.save.mockResolvedValue(mockComment);

      await service.create(createCommentInput, mockUser as User);

      // Should only notify project owner, not the author/assignee
      expect(notificationsGateway.sendNotification).toHaveBeenCalledTimes(1);
      expect(notificationsGateway.sendNotification).toHaveBeenCalledWith(
        mockProjectOwner.id,
        NotificationType.TASK_COMMENT,
        `${mockUser.name} comentou na tarefa "${mockTask.title}"`,
        { id: mockTask.id, type: 'task' }
      );
    });
  });

  describe('findAll', () => {
    it('should return all comments for a task', async () => {
      const taskId = 'task-id';
      const mockComments = [
        { id: 'comment-1', content: 'Comment 1' },
        { id: 'comment-2', content: 'Comment 2' },
      ];

      commentsRepository.find.mockResolvedValue(mockComments);

      const result = await service.findAll(taskId);

      expect(commentsRepository.find).toHaveBeenCalledWith({
        where: { task: { id: taskId } },
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual(mockComments);
    });
  });

  describe('findOne', () => {
    it('should return a comment by id', async () => {
      const commentId = 'comment-id';
      const mockComment = { id: commentId, content: 'Test comment' };

      commentsRepository.findOne.mockResolvedValue(mockComment);

      const result = await service.findOne(commentId);

      expect(commentsRepository.findOne).toHaveBeenCalledWith({
        where: { id: commentId },
        relations: ['author', 'task'],
      });
      expect(result).toEqual(mockComment);
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      const commentId = 'non-existent-comment-id';

      commentsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(commentId)).rejects.toThrow(
        new NotFoundException(`Comentário com ID ${commentId} não encontrado`)
      );
    });
  });

  describe('update', () => {
    it('should update a comment when user is the author', async () => {
      const mockUser: Partial<User> = { id: 'user-id', name: 'Test User' };
      const commentId = 'comment-id';
      const updateCommentInput: UpdateCommentInput = {
        id: commentId,
        content: 'Updated comment',
      };
      
      const mockComment = {
        id: commentId,
        content: 'Original comment',
        author: { id: mockUser.id },
      };
      
      const updatedComment = {
        ...mockComment,
        content: updateCommentInput.content,
      };

      commentsRepository.findOne.mockResolvedValue(mockComment);
      commentsRepository.save.mockResolvedValue(updatedComment);

      const result = await service.update(commentId, updateCommentInput, mockUser as User);

      expect(commentsRepository.findOne).toHaveBeenCalled();
      expect(commentsRepository.save).toHaveBeenCalledWith({
        ...mockComment,
        content: updateCommentInput.content,
      });
      expect(result).toEqual(updatedComment);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      const mockUser: Partial<User> = { id: 'user-id', name: 'Test User' };
      const commentId = 'comment-id';
      const updateCommentInput: UpdateCommentInput = {
        id: commentId,
        content: 'Updated comment',
      };
      
      const mockComment = {
        id: commentId,
        content: 'Original comment',
        author: { id: 'different-user-id' }, // Different user is the author
      };

      commentsRepository.findOne.mockResolvedValue(mockComment);

      await expect(service.update(commentId, updateCommentInput, mockUser as User)).rejects.toThrow(
        new ForbiddenException('Você não tem permissão para editar este comentário')
      );
      expect(commentsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a comment when user is the author', async () => {
      const mockUser: Partial<User> = { id: 'user-id', name: 'Test User' };
      const commentId = 'comment-id';
      
      const mockComment = {
        id: commentId,
        content: 'Test comment',
        author: { id: mockUser.id },
      };

      commentsRepository.findOne.mockResolvedValue(mockComment);
      commentsRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove(commentId, mockUser as User);

      expect(commentsRepository.findOne).toHaveBeenCalled();
      expect(commentsRepository.delete).toHaveBeenCalledWith(commentId);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      const mockUser: Partial<User> = { id: 'user-id', name: 'Test User' };
      const commentId = 'comment-id';
      
      const mockComment = {
        id: commentId,
        content: 'Test comment',
        author: { id: 'different-user-id' }, // Different user is the author
      };

      commentsRepository.findOne.mockResolvedValue(mockComment);

      await expect(service.remove(commentId, mockUser as User)).rejects.toThrow(
        new ForbiddenException('Você não tem permissão para excluir este comentário')
      );
      expect(commentsRepository.delete).not.toHaveBeenCalled();
    });

    it('should return false when comment deletion fails', async () => {
      const mockUser: Partial<User> = { id: 'user-id', name: 'Test User' };
      const commentId = 'comment-id';
      
      const mockComment = {
        id: commentId,
        content: 'Test comment',
        author: { id: mockUser.id },
      };

      commentsRepository.findOne.mockResolvedValue(mockComment);
      commentsRepository.delete.mockResolvedValue({ affected: 0 });

      const result = await service.remove(commentId, mockUser as User);

      expect(commentsRepository.findOne).toHaveBeenCalled();
      expect(commentsRepository.delete).toHaveBeenCalledWith(commentId);
      expect(result).toBe(false);
    });
  });
});