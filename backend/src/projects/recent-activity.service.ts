import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecentActivity } from './entities/recent-activity.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class RecentActivityService {
  constructor(
    @InjectRepository(RecentActivity)
    private recentActivityRepository: Repository<RecentActivity>,
  ) {}

  async getRecentActivities(user: User, limit: number = 10): Promise<RecentActivity[]> {
    return this.recentActivityRepository.find({
      where: [
        { user: { id: user.id } },
        { project: { owner: { id: user.id } } }
      ],
      relations: ['user', 'project', 'task'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async createActivity(
    type: string,
    title: string,
    description: string,
    user: User,
    projectId?: string,
    taskId?: string,
  ): Promise<RecentActivity> {
    const activity = this.recentActivityRepository.create({
      type,
      title,
      description,
      user,
      project: projectId ? { id: projectId } : undefined,
      task: taskId ? { id: taskId } : undefined,
    });

    return this.recentActivityRepository.save(activity);
  }
}