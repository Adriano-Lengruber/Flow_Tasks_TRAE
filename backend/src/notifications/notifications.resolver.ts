import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { User } from '../auth/entities/user.entity';

@Resolver(() => Notification)
@UseGuards(JwtAuthGuard)
export class NotificationsResolver {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Query(() => [Notification], { name: 'notifications' })
  async getNotifications(
    @Context() context: any,
    @Args('limit', { type: () => Number, defaultValue: 50 }) limit: number,
    @Args('offset', { type: () => Number, defaultValue: 0 }) offset: number,
  ): Promise<Notification[]> {
    const user: User = context.req.user;
    return this.notificationsService.getNotificationsForUser(user.id, limit, offset);
  }

  @Query(() => Number, { name: 'unreadNotificationsCount' })
  async getUnreadCount(@Context() context: any): Promise<number> {
    const user: User = context.req.user;
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Mutation(() => Boolean)
  async markNotificationAsRead(
    @Context() context: any,
    @Args('notificationId') notificationId: string,
  ): Promise<boolean> {
    const user: User = context.req.user;
    return this.notificationsService.markAsRead(user.id, notificationId);
  }

  @Mutation(() => Boolean)
  async markAllNotificationsAsRead(@Context() context: any): Promise<boolean> {
    const user: User = context.req.user;
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Mutation(() => Boolean)
  async clearAllNotifications(@Context() context: any): Promise<boolean> {
    const user: User = context.req.user;
    return this.notificationsService.clearNotifications(user.id);
  }
}