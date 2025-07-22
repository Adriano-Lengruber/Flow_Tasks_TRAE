import { Test, TestingModule } from '@nestjs/testing';
import { CommentsResolver } from './comments.resolver';
import { CommentsService } from './comments.service';
import { CreateCommentInput } from './dto/create-comment.input';
import { UpdateCommentInput } from './dto/update-comment.input';
import { Comment } from './entities/comment.entity';
import { User } from '../auth/entities/user.entity';

describe('CommentsResolver', () => {
  let resolver: CommentsResolver;
  let commentsService: CommentsService;

  const mockCommentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsResolver,
        {
          provide: CommentsService,
          useValue: mockCommentsService,
        },
      ],
    }).compile();

    resolver = module.get<CommentsResolver>(CommentsResolver);
    commentsService = module.get<CommentsService>(CommentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createComment', () => {
    it('should create a comment', async () => {
      const mockUser: Partial<User> = { id: 'user-id', email: 'test@example.com', name: 'Test User' };
      const createCommentInput: CreateCommentInput = {
        content: 'Test comment',
        taskId: 'task-id',
      };
      const mockComment = {
        id: 'comment-id',
        content: 'Test comment',
        author: mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCommentsService.create.mockResolvedValue(mockComment);

      const result = await resolver.createComment(createCommentInput, mockUser as User);

      expect(commentsService.create).toHaveBeenCalledWith(createCommentInput, mockUser);
      expect(result).toEqual(mockComment);
    });
  });

  describe('findAll', () => {
    it('should return an array of comments for a task', async () => {
      const taskId = 'task-id';
      const mockComments = [
        { id: 'comment-1', content: 'Comment 1' },
        { id: 'comment-2', content: 'Comment 2' },
      ];

      mockCommentsService.findAll.mockResolvedValue(mockComments);

      const result = await resolver.findAll(taskId);

      expect(commentsService.findAll).toHaveBeenCalledWith(taskId);
      expect(result).toEqual(mockComments);
    });
  });

  describe('findOne', () => {
    it('should return a single comment', async () => {
      const commentId = 'comment-id';
      const mockComment = { id: commentId, content: 'Test comment' };

      mockCommentsService.findOne.mockResolvedValue(mockComment);

      const result = await resolver.findOne(commentId);

      expect(commentsService.findOne).toHaveBeenCalledWith(commentId);
      expect(result).toEqual(mockComment);
    });
  });

  describe('updateComment', () => {
    it('should update a comment', async () => {
      const mockUser: Partial<User> = { id: 'user-id', email: 'test@example.com', name: 'Test User' };
      const updateCommentInput: UpdateCommentInput = {
        id: 'comment-id',
        content: 'Updated comment',
      };
      const mockUpdatedComment = {
        id: 'comment-id',
        content: 'Updated comment',
        author: mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCommentsService.update.mockResolvedValue(mockUpdatedComment);

      const result = await resolver.updateComment(updateCommentInput, mockUser as User);

      expect(commentsService.update).toHaveBeenCalledWith(updateCommentInput.id, updateCommentInput, mockUser);
      expect(result).toEqual(mockUpdatedComment);
    });
  });

  describe('removeComment', () => {
    it('should remove a comment', async () => {
      const mockUser: Partial<User> = { id: 'user-id', email: 'test@example.com', name: 'Test User' };
      const commentId = 'comment-id';

      mockCommentsService.remove.mockResolvedValue(true);

      const result = await resolver.removeComment(commentId, mockUser as User);

      expect(commentsService.remove).toHaveBeenCalledWith(commentId, mockUser);
      expect(result).toBe(true);
    });
  });
});