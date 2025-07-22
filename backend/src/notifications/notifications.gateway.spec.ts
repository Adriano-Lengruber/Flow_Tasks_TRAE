import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';
import { NotificationType } from './enums/notification-type.enum';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let notificationsService: NotificationsService;
  let jwtService: JwtService;

  // Mock Socket.io objects
  const mockSocket = {
    id: 'socket-id',
    handshake: {
      auth: { token: 'valid-token' },
      headers: { authorization: 'Bearer valid-token' },
    },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  } as unknown as Socket;

  const mockServer = {
    to: jest.fn().mockReturnValue({
      emit: jest.fn(),
    }),
  } as unknown as Server;

  beforeEach(async () => {
    const mockNotificationsService = {
      getNotificationsForUser: jest.fn().mockResolvedValue([]),
      addNotification: jest.fn().mockImplementation((userId, type, message, entityId, entityType) => {
        return Promise.resolve({
          id: 'notification-id',
          type,
          message,
          entityId,
          entityType,
          userId,
          read: false,
          createdAt: new Date(),
        });
      }),
      markAsRead: jest.fn().mockResolvedValue(true),
    };

    const mockJwtService = {
      verify: jest.fn().mockImplementation((token) => {
        if (token === 'valid-token') {
          return { sub: 'user-id', email: 'test@example.com' };
        }
        throw new Error('Invalid token');
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    notificationsService = module.get<NotificationsService>(NotificationsService);
    jwtService = module.get<JwtService>(JwtService);

    // Set the mock server
    gateway.server = mockServer;

    // Spy on console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should authenticate user and join room on valid token', async () => {
      await gateway.handleConnection(mockSocket);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(mockSocket.join).toHaveBeenCalledWith('user-user-id');
      expect(notificationsService.getNotificationsForUser).toHaveBeenCalledWith('user-id');
      expect(mockSocket.emit).toHaveBeenCalledWith('notifications', []);
    });

    it('should disconnect socket on invalid token', async () => {
      const invalidSocket = {
        ...mockSocket,
        handshake: {
          auth: { token: 'invalid-token' },
          headers: {},
        },
      } as unknown as Socket;

      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(invalidSocket);

      expect(invalidSocket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect socket if no token is provided', async () => {
      const noTokenSocket = {
        ...mockSocket,
        handshake: {
          auth: {},
          headers: {},
        },
      } as unknown as Socket;

      await gateway.handleConnection(noTokenSocket);

      expect(noTokenSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove client from room and delete from connected clients', () => {
      // Setup: simulate a connected client
      const connectedClients = new Map();
      connectedClients.set('socket-id', 'user-id');
      (gateway as any).connectedClients = connectedClients;

      gateway.handleDisconnect(mockSocket);

      expect(mockSocket.leave).toHaveBeenCalledWith('user-user-id');
      expect(connectedClients.has('socket-id')).toBe(false);
    });

    it('should do nothing if client is not in connected clients map', () => {
      // Setup: empty connected clients map
      (gateway as any).connectedClients = new Map();

      gateway.handleDisconnect(mockSocket);

      expect(mockSocket.leave).not.toHaveBeenCalled();
    });
  });

  describe('sendNotification', () => {
    it('should add notification and emit to user room', async () => {
      const mockNotification = {
        id: 'notification-id',
        type: NotificationType.TASK_ASSIGNED,
        message: 'Test notification',
        entityId: 'task-id',
        entityType: 'task',
      };

      jest.spyOn(notificationsService, 'addNotification').mockResolvedValue(mockNotification as any);

      await gateway.sendNotification(
        'user-id',
        NotificationType.TASK_ASSIGNED,
        'Test notification',
        { id: 'task-id', type: 'task' },
      );

      expect(notificationsService.addNotification).toHaveBeenCalledWith(
        'user-id',
        NotificationType.TASK_ASSIGNED,
        'Test notification',
        'task-id',
        'task',
      );

      expect(mockServer.to).toHaveBeenCalledWith('user-user-id');
      expect(mockServer.to('user-user-id').emit).toHaveBeenCalledWith(
        'notification',
        mockNotification,
      );
    });
  });

  describe('broadcastProjectUpdate', () => {
    it('should emit project update to project room', () => {
      const updateData = { type: 'TASK_MOVED', taskId: 'task-id' };

      gateway.broadcastProjectUpdate('project-id', updateData);

      expect(mockServer.to).toHaveBeenCalledWith('project-project-id');
      expect(mockServer.to('project-project-id').emit).toHaveBeenCalledWith(
        'projectUpdate',
        updateData,
      );
    });
  });

  describe('handleMarkAsRead', () => {
    it('should mark notification as read if user is authenticated', async () => {
      // Setup: simulate a connected client
      const connectedClients = new Map();
      connectedClients.set('socket-id', 'user-id');
      (gateway as any).connectedClients = connectedClients;

      const result = await gateway.handleMarkAsRead(mockSocket, { notificationId: 'notification-id' });

      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        'user-id',
        'notification-id',
      );
      expect(result).toEqual({ success: true });
    });

    it('should return failure if user is not authenticated', async () => {
      // Setup: empty connected clients map
      (gateway as any).connectedClients = new Map();

      const result = await gateway.handleMarkAsRead(mockSocket, { notificationId: 'notification-id' });

      expect(notificationsService.markAsRead).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false });
    });
  });

  describe('handleJoinProject', () => {
    it('should join project room if project ID is provided', () => {
      const result = gateway.handleJoinProject(mockSocket, { projectId: 'project-id' });

      expect(mockSocket.join).toHaveBeenCalledWith('project-project-id');
      expect(result).toEqual({ success: true });
    });

    it('should return failure if project ID is not provided', () => {
      const result = gateway.handleJoinProject(mockSocket, { projectId: '' });

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false });
    });
  });

  describe('handleLeaveProject', () => {
    it('should leave project room if project ID is provided', () => {
      const result = gateway.handleLeaveProject(mockSocket, { projectId: 'project-id' });

      expect(mockSocket.leave).toHaveBeenCalledWith('project-project-id');
      expect(result).toEqual({ success: true });
    });

    it('should return failure if project ID is not provided', () => {
      const result = gateway.handleLeaveProject(mockSocket, { projectId: '' });

      expect(mockSocket.leave).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false });
    });
  });
});