import { EventEmitter } from 'events';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { getCache } from '../utils/redisCache';
import { structuredLogger } from '../utils/logger';
import config from '../config';
import jwt from 'jsonwebtoken';

// Interfaces para notificações
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  userId: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: NotificationChannel[];
  variables?: string[];
}

interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms: boolean;
  types: Record<NotificationType, boolean>;
  quietHours?: {
    start: string; // HH:mm
    end: string;   // HH:mm
    timezone: string;
  };
}

interface SocketUser {
  userId: string;
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
  rooms: string[];
}

// Tipos de notificação
type NotificationType = 
  | 'task_assigned'
  | 'task_completed'
  | 'task_overdue'
  | 'project_created'
  | 'project_updated'
  | 'comment_added'
  | 'mention'
  | 'deadline_reminder'
  | 'system_maintenance'
  | 'security_alert'
  | 'welcome'
  | 'password_changed'
  | 'login_alert';

// Canais de notificação
type NotificationChannel = 'email' | 'push' | 'in_app' | 'sms' | 'webhook';

// Classe principal do serviço de notificações
class NotificationService extends EventEmitter {
  private io: SocketIOServer;
  private prisma: PrismaClient;
  private cache = getCache();
  private logger = structuredLogger.child({ service: 'notifications' });
  private connectedUsers = new Map<string, SocketUser>();
  private templates = new Map<NotificationType, NotificationTemplate>();
  
  constructor(server: HTTPServer, prisma: PrismaClient) {
    super();
    this.prisma = prisma;
    this.setupSocketIO(server);
    this.setupTemplates();
    this.setupEventListeners();
  }
  
  // Configurar Socket.IO
  private setupSocketIO(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.server.cors.origin,
        credentials: config.server.cors.credentials
      },
      transports: ['websocket', 'polling']
    });
    
    // Middleware de autenticação
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }
        
        const decoded = jwt.verify(token, config.auth.jwtSecret) as any;
        const user = await this.prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, firstName: true, lastName: true }
        });
        
        if (!user) {
          return next(new Error('User not found'));
        }
        
        (socket as any).user = user;
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
    
    // Eventos de conexão
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
    
    this.logger.info('Socket.IO server initialized');
  }
  
  // Lidar com conexões
  private handleConnection(socket: Socket) {
    const user = (socket as any).user;
    
    // Registrar usuário conectado
    const socketUser: SocketUser = {
      userId: user.id,
      socketId: socket.id,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: []
    };
    
    this.connectedUsers.set(socket.id, socketUser);
    
    // Juntar-se à sala do usuário
    socket.join(`user:${user.id}`);
    socketUser.rooms.push(`user:${user.id}`);
    
    this.logger.info('User connected', {
      userId: user.id,
      socketId: socket.id
    });
    
    // Enviar notificações não lidas
    this.sendUnreadNotifications(user.id, socket);
    
    // Eventos do socket
    socket.on('join_project', (projectId: string) => {
      this.handleJoinProject(socket, projectId);
    });
    
    socket.on('leave_project', (projectId: string) => {
      this.handleLeaveProject(socket, projectId);
    });
    
    socket.on('mark_notification_read', (notificationId: string) => {
      this.markNotificationAsRead(notificationId, user.id);
    });
    
    socket.on('mark_all_read', () => {
      this.markAllNotificationsAsRead(user.id);
    });
    
    socket.on('get_notifications', (options: { page?: number; limit?: number; type?: NotificationType }) => {
      this.sendNotificationHistory(user.id, socket, options);
    });
    
    socket.on('update_preferences', (preferences: Partial<NotificationPreferences>) => {
      this.updateNotificationPreferences(user.id, preferences);
    });
    
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
    
    // Atualizar atividade
    socket.on('activity', () => {
      const socketUser = this.connectedUsers.get(socket.id);
      if (socketUser) {
        socketUser.lastActivity = new Date();
      }
    });
  }
  
  // Lidar com entrada em projeto
  private handleJoinProject(socket: Socket, projectId: string) {
    const socketUser = this.connectedUsers.get(socket.id);
    if (!socketUser) return;
    
    const room = `project:${projectId}`;
    socket.join(room);
    socketUser.rooms.push(room);
    
    this.logger.debug('User joined project room', {
      userId: socketUser.userId,
      projectId,
      room
    });
  }
  
  // Lidar com saída de projeto
  private handleLeaveProject(socket: Socket, projectId: string) {
    const socketUser = this.connectedUsers.get(socket.id);
    if (!socketUser) return;
    
    const room = `project:${projectId}`;
    socket.leave(room);
    socketUser.rooms = socketUser.rooms.filter(r => r !== room);
    
    this.logger.debug('User left project room', {
      userId: socketUser.userId,
      projectId,
      room
    });
  }
  
  // Lidar com desconexão
  private handleDisconnection(socket: Socket) {
    const socketUser = this.connectedUsers.get(socket.id);
    if (socketUser) {
      this.logger.info('User disconnected', {
        userId: socketUser.userId,
        socketId: socket.id,
        duration: Date.now() - socketUser.connectedAt.getTime()
      });
      
      this.connectedUsers.delete(socket.id);
    }
  }
  
  // Configurar templates de notificação
  private setupTemplates() {
    const templates: NotificationTemplate[] = [
      {
        type: 'task_assigned',
        title: 'Nova tarefa atribuída',
        message: 'Você foi atribuído à tarefa "{{taskTitle}}" no projeto "{{projectName}}"',
        priority: 'medium',
        channels: ['in_app', 'email'],
        variables: ['taskTitle', 'projectName']
      },
      {
        type: 'task_completed',
        title: 'Tarefa concluída',
        message: 'A tarefa "{{taskTitle}}" foi marcada como concluída por {{userName}}',
        priority: 'low',
        channels: ['in_app'],
        variables: ['taskTitle', 'userName']
      },
      {
        type: 'task_overdue',
        title: 'Tarefa em atraso',
        message: 'A tarefa "{{taskTitle}}" está em atraso desde {{overdueDate}}',
        priority: 'high',
        channels: ['in_app', 'email', 'push'],
        variables: ['taskTitle', 'overdueDate']
      },
      {
        type: 'project_created',
        title: 'Novo projeto criado',
        message: 'O projeto "{{projectName}}" foi criado e você foi adicionado como membro',
        priority: 'medium',
        channels: ['in_app', 'email'],
        variables: ['projectName']
      },
      {
        type: 'comment_added',
        title: 'Novo comentário',
        message: '{{userName}} comentou na tarefa "{{taskTitle}}"',
        priority: 'low',
        channels: ['in_app'],
        variables: ['userName', 'taskTitle']
      },
      {
        type: 'mention',
        title: 'Você foi mencionado',
        message: '{{userName}} mencionou você em "{{context}}"',
        priority: 'medium',
        channels: ['in_app', 'email'],
        variables: ['userName', 'context']
      },
      {
        type: 'deadline_reminder',
        title: 'Lembrete de prazo',
        message: 'A tarefa "{{taskTitle}}" vence em {{timeRemaining}}',
        priority: 'high',
        channels: ['in_app', 'email', 'push'],
        variables: ['taskTitle', 'timeRemaining']
      },
      {
        type: 'security_alert',
        title: 'Alerta de segurança',
        message: '{{alertMessage}}',
        priority: 'urgent',
        channels: ['in_app', 'email', 'push'],
        variables: ['alertMessage']
      },
      {
        type: 'welcome',
        title: 'Bem-vindo ao TRAE!',
        message: 'Sua conta foi criada com sucesso. Comece criando seu primeiro projeto.',
        priority: 'medium',
        channels: ['in_app', 'email'],
        variables: []
      }
    ];
    
    templates.forEach(template => {
      this.templates.set(template.type, template);
    });
    
    this.logger.info('Notification templates loaded', { count: templates.length });
  }
  
  // Configurar listeners de eventos
  private setupEventListeners() {
    // Eventos do sistema
    this.on('task:assigned', (data) => {
      this.createNotification('task_assigned', data.userId, data);
    });
    
    this.on('task:completed', (data) => {
      this.broadcastToProject('task_completed', data.projectId, data, [data.completedBy]);
    });
    
    this.on('project:created', (data) => {
      data.memberIds.forEach((userId: string) => {
        this.createNotification('project_created', userId, data);
      });
    });
    
    this.on('comment:added', (data) => {
      this.broadcastToProject('comment_added', data.projectId, data, [data.authorId]);
    });
    
    this.on('user:mentioned', (data) => {
      this.createNotification('mention', data.userId, data);
    });
    
    this.on('security:alert', (data) => {
      if (data.userId) {
        this.createNotification('security_alert', data.userId, data);
      } else {
        // Broadcast para todos os usuários
        this.broadcastToAll('security_alert', data);
      }
    });
  }
  
  // Criar notificação
  async createNotification(
    type: NotificationType,
    userId: string,
    data: Record<string, any> = {},
    options: {
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      expiresAt?: Date;
      channels?: NotificationChannel[];
    } = {}
  ): Promise<Notification> {
    const template = this.templates.get(type);
    if (!template) {
      throw new Error(`Template not found for notification type: ${type}`);
    }
    
    // Verificar preferências do usuário
    const preferences = await this.getNotificationPreferences(userId);
    if (!preferences.types[type]) {
      this.logger.debug('Notification skipped due to user preferences', { type, userId });
      return null;
    }
    
    // Verificar quiet hours
    if (await this.isInQuietHours(userId)) {
      this.logger.debug('Notification delayed due to quiet hours', { type, userId });
      // Agendar para depois do quiet hours
      await this.scheduleNotification(type, userId, data, options);
      return null;
    }
    
    // Processar template
    const processedTitle = this.processTemplate(template.title, data);
    const processedMessage = this.processTemplate(template.message, data);
    
    // Criar notificação no banco
    const notification = await this.prisma.notification.create({
      data: {
        type,
        title: processedTitle,
        message: processedMessage,
        userId
      }
    }) as any;
    
    // Enviar através dos canais apropriados
    const channels = options.channels || template.channels;
    await this.sendThroughChannels(notification, channels, preferences);
    
    this.logger.info('Notification created', {
      id: notification.id,
      type,
      userId,
      priority: notification.priority
    });
    
    return notification;
  }
  
  // Processar template com variáveis
  private processTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }
  
  // Enviar através dos canais
  private async sendThroughChannels(
    notification: Notification,
    channels: NotificationChannel[],
    preferences: NotificationPreferences
  ) {
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'in_app':
            if (preferences.inApp) {
              await this.sendInAppNotification(notification);
            }
            break;
          
          case 'email':
            if (preferences.email) {
              await this.sendEmailNotification(notification);
            }
            break;
          
          case 'push':
            if (preferences.push) {
              await this.sendPushNotification(notification);
            }
            break;
          
          case 'sms':
            if (preferences.sms) {
              await this.sendSMSNotification(notification);
            }
            break;
          
          case 'webhook':
            await this.sendWebhookNotification(notification);
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to send notification via ${channel}`, error as Error, {
          notificationId: notification.id,
          channel
        });
      }
    }
  }
  
  // Enviar notificação in-app
  private async sendInAppNotification(notification: Notification) {
    // Enviar via Socket.IO
    this.io.to(`user:${notification.userId}`).emit('notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      priority: notification.priority,
      createdAt: notification.createdAt
    });
    
    // Armazenar no cache para usuários offline
    const cacheKey = `notifications:${notification.userId}`;
    const cached = await this.cache.get(cacheKey) || [];
    cached.push(notification);
    
    // Manter apenas as últimas 50 notificações no cache
    if (cached.length > 50) {
      cached.splice(0, cached.length - 50);
    }
    
    await this.cache.set(cacheKey, cached, 86400); // 24 horas
  }
  
  // Enviar notificação por email (placeholder)
  private async sendEmailNotification(notification: Notification) {
    // TODO: Implementar envio de email
    this.logger.debug('Email notification would be sent', {
      notificationId: notification.id,
      userId: notification.userId
    });
  }
  
  // Enviar push notification (placeholder)
  private async sendPushNotification(notification: Notification) {
    // TODO: Implementar push notifications
    this.logger.debug('Push notification would be sent', {
      notificationId: notification.id,
      userId: notification.userId
    });
  }
  
  // Enviar SMS (placeholder)
  private async sendSMSNotification(notification: Notification) {
    // TODO: Implementar SMS
    this.logger.debug('SMS notification would be sent', {
      notificationId: notification.id,
      userId: notification.userId
    });
  }
  
  // Enviar webhook (placeholder)
  private async sendWebhookNotification(notification: Notification) {
    // TODO: Implementar webhooks
    this.logger.debug('Webhook notification would be sent', {
      notificationId: notification.id,
      userId: notification.userId
    });
  }
  
  // Broadcast para projeto
  async broadcastToProject(
    type: NotificationType,
    projectId: string,
    data: Record<string, any>,
    excludeUsers: string[] = []
  ) {
    // Obter membros do projeto
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          select: { userId: true }
        }
      }
    });
    
    if (!project) return;
    
    // Criar notificações para todos os membros (exceto excluídos)
    const memberIds = project.members
      .map(m => m.userId)
      .filter(userId => !excludeUsers.includes(userId));
    
    await Promise.all(
      memberIds.map(userId => 
        this.createNotification(type, userId, { ...data, projectId })
      )
    );
  }
  
  // Broadcast para todos os usuários
  async broadcastToAll(type: NotificationType, data: Record<string, any>) {
    // Enviar via Socket.IO para todos os usuários conectados
    this.io.emit('notification', {
      type,
      title: this.templates.get(type)?.title || 'Notification',
      message: this.processTemplate(this.templates.get(type)?.message || '', data),
      data,
      priority: this.templates.get(type)?.priority || 'medium',
      createdAt: new Date()
    });
  }
  
  // Enviar notificações não lidas
  private async sendUnreadNotifications(userId: string, socket: Socket) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    socket.emit('unread_notifications', notifications);
  }
  
  // Marcar notificação como lida
  async markNotificationAsRead(notificationId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        updatedAt: new Date()
      }
    });
    
    this.io.to(`user:${userId}`).emit('notification_read', { id: notificationId });
  }
  
  // Marcar todas as notificações como lidas
  async markAllNotificationsAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId
      },
      data: {
        updatedAt: new Date()
      }
    });
    
    this.io.to(`user:${userId}`).emit('all_notifications_read');
  }
  
  // Enviar histórico de notificações
  private async sendNotificationHistory(
    userId: string,
    socket: Socket,
    options: { page?: number; limit?: number; type?: NotificationType }
  ) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;
    
    const where: any = {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    };
    
    if (options.type) {
      where.type = options.type;
    }
    
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.notification.count({ where })
    ]);
    
    socket.emit('notification_history', {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }
  
  // Obter preferências de notificação
  private async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const cacheKey = `notification_preferences:${userId}`;
    let preferences = await this.cache.get(cacheKey);
    
    if (!preferences) {
      // Buscar do banco ou usar padrões
      // const userPrefs = await this.prisma.userNotificationPreferences.findUnique({
      //   where: { userId }
      // });
      const userPrefs = null;
      
      preferences = {
        userId,
        email: userPrefs?.email ?? true,
        push: userPrefs?.push ?? true,
        inApp: userPrefs?.inApp ?? true,
        sms: userPrefs?.sms ?? false,
        types: userPrefs?.types ? JSON.parse(userPrefs.types as string) : {
          task_assigned: true,
          task_completed: true,
          task_overdue: true,
          project_created: true,
          project_updated: true,
          comment_added: true,
          mention: true,
          deadline_reminder: true,
          system_maintenance: true,
          security_alert: true,
          welcome: true,
          password_changed: true,
          login_alert: true
        },
        quietHours: userPrefs?.quietHours ? JSON.parse(userPrefs.quietHours as string) : undefined
      };
      
      await this.cache.set(cacheKey, preferences, 3600); // 1 hora
    }
    
    return preferences;
  }
  
  // Atualizar preferências de notificação
  async updateNotificationPreferences(userId: string, updates: Partial<NotificationPreferences>) {
    const current = await this.getNotificationPreferences(userId);
    const updated = { ...current, ...updates };
    
    // await this.prisma.userNotificationPreferences.upsert({
    //   where: { userId },
    //   create: {
    //     userId,
    //     email: updated.email,
    //     push: updated.push,
    //     inApp: updated.inApp,
    //     sms: updated.sms,
    //     types: JSON.stringify(updated.types),
    //     quietHours: updated.quietHours ? JSON.stringify(updated.quietHours) : null
    //   },
    //   update: {
    //     email: updated.email,
    //     push: updated.push,
    //     inApp: updated.inApp,
    //     sms: updated.sms,
    //     types: JSON.stringify(updated.types),
    //     quietHours: updated.quietHours ? JSON.stringify(updated.quietHours) : null
    //   }
    // });
    
    // Atualizar cache
    const cacheKey = `notification_preferences:${userId}`;
    await this.cache.set(cacheKey, updated, 3600);
    
    this.logger.info('Notification preferences updated', { userId });
  }
  
  // Verificar se está em quiet hours
  private async isInQuietHours(userId: string): Promise<boolean> {
    const preferences = await this.getNotificationPreferences(userId);
    
    if (!preferences.quietHours) {
      return false;
    }
    
    // TODO: Implementar lógica de quiet hours com timezone
    return false;
  }
  
  // Agendar notificação
  private async scheduleNotification(
    type: NotificationType,
    userId: string,
    data: Record<string, any>,
    options: any
  ) {
    // TODO: Implementar agendamento de notificações
    this.logger.debug('Notification scheduled', { type, userId });
  }
  
  // Obter estatísticas
  async getStats() {
    const connectedUsersCount = this.connectedUsers.size;
    const roomsCount = this.io.sockets.adapter.rooms.size;
    
    return {
      connectedUsers: connectedUsersCount,
      rooms: roomsCount,
      templates: this.templates.size
    };
  }
  
  // Limpar notificações expiradas
  async cleanupExpiredNotifications() {
    const deleted = await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 dias atrás
        }
      }
    });
    
    this.logger.info('Expired notifications cleaned up', { count: deleted.count });
    return deleted.count;
  }
}

// Singleton instance
let notificationService: NotificationService;

export function createNotificationService(server: HTTPServer, prisma: PrismaClient): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService(server, prisma);
  }
  return notificationService;
}

export function getNotificationService(): NotificationService {
  if (!notificationService) {
    throw new Error('NotificationService not initialized');
  }
  return notificationService;
}

export {
  NotificationService,
  Notification,
  NotificationTemplate,
  NotificationPreferences,
  NotificationType,
  NotificationChannel
};

export default NotificationService;