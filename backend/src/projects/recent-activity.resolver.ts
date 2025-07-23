import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { RecentActivity } from './entities/recent-activity.entity';
import { RecentActivityService } from './recent-activity.service';

@Resolver(() => RecentActivity)
export class RecentActivityResolver {
  constructor(private readonly recentActivityService: RecentActivityService) {}

  @Query(() => [RecentActivity], { name: 'recentActivities' })
  @UseGuards(JwtAuthGuard)
  async recentActivities(
    @CurrentUser() user: User,
    @Args('limit', { type: () => Number, defaultValue: 10 }) limit: number,
  ): Promise<RecentActivity[]> {
    return this.recentActivityService.getRecentActivities(user, limit);
  }
}