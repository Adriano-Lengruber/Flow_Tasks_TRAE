import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService, Notification } from './notifications.service';
import { NotificationType } from './enums/notification-type.enum';
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly connectedClients: Map<string, string> = new Map(); // socketId -> userId

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      this.connectedClients.set(client.id, userId);
      client.join(`user-${userId}`);

      // Enviar notificações não lidas ao conectar
      const notifications = this.notificationsService.getNotificationsForUser(userId);
      client.emit('notifications', notifications);

      console.log(`Client connected: ${client.id}, User: ${userId}`);
    } catch (error) {
      console.error('Authentication error:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedClients.get(client.id);
    if (userId) {
      client.leave(`user-${userId}`);
      this.connectedClients.delete(client.id);
      console.log(`Client disconnected: ${client.id}, User: ${userId}`);
    }
  }

  @SubscribeMessage('markAsRead')
  handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ) {
    const userId = this.connectedClients.get(client.id);
    if (userId && data.notificationId) {
      this.notificationsService.markAsRead(userId, data.notificationId);
      return { success: true };
    }
    return { success: false };
  }

  sendNotification(userId: string, type: NotificationType, message: string, entityData?: { id: string; type: string }) {
    const notification: Notification = {
      id: uuidv4(),
      type,
      message,
      entityId: entityData?.id,
      entityType: entityData?.type,
      createdAt: new Date(),
      read: false,
    };

    this.notificationsService.addNotification(userId, notification);
    this.server.to(`user-${userId}`).emit('notification', notification);
  }

  broadcastProjectUpdate(projectId: string, data: any) {
    this.server.to(`project-${projectId}`).emit('projectUpdate', data);
  }

  @SubscribeMessage('joinProject')
  handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    if (data.projectId) {
      client.join(`project-${data.projectId}`);
      return { success: true };
    }
    return { success: false };
  }

  @SubscribeMessage('leaveProject')
  handleLeaveProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    if (data.projectId) {
      client.leave(`project-${data.projectId}`);
      return { success: true };
    }
    return { success: false };
  }
}