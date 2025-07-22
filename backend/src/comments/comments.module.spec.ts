import { Test } from '@nestjs/testing';
import { CommentsModule } from './comments.module';
import { CommentsService } from './comments.service';
import { CommentsResolver } from './comments.resolver';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { Task } from '../projects/entities/task.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';

describe('CommentsModule', () => {
  let module: any;

  beforeEach(async () => {
    const testModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        CommentsResolver,
        {
          provide: getRepositoryToken(Comment),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: NotificationsGateway,
          useValue: {
            sendNotificationToUser: jest.fn(),
          },
        },
      ],
    }).compile();

    module = testModule;
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have CommentsService', () => {
    const service = module.get(CommentsService);
    expect(service).toBeDefined();
  });

  it('should have CommentsResolver', () => {
    const resolver = module.get(CommentsResolver);
    expect(resolver).toBeDefined();
  });
});