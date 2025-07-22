import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateNotificationPreferencesInput } from './dto/update-notification-preferences.input';

@Resolver(() => NotificationPreferences)
export class NotificationPreferencesResolver {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Query(() => NotificationPreferences, { name: 'notificationPreferences' })
  async getPreferences(@Context() context) {
    const userId = context.req.user.id;
    return this.preferencesService.getPreferencesForUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => NotificationPreferences)
  async updateNotificationPreferences(
    @Context() context,
    @Args('updateNotificationPreferencesInput') updateInput: UpdateNotificationPreferencesInput,
  ) {
    const userId = context.req.user.id;
    return this.preferencesService.updatePreferences(userId, updateInput);
  }
}