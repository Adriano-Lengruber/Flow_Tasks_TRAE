import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsResolver } from './projects.resolver';
import { RecentActivityResolver } from './recent-activity.resolver';
import { RecentActivityService } from './recent-activity.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Section } from './entities/section.entity';
import { Task } from './entities/task.entity';
import { RecentActivity } from './entities/recent-activity.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutomationsModule } from '../automations/automations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Section, Task, RecentActivity]),
    NotificationsModule,
    AutomationsModule,
  ],
  providers: [ProjectsResolver, RecentActivityResolver, ProjectsService, RecentActivityService],
  exports: [ProjectsService],
})
export class ProjectsModule {}