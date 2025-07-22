import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferencesResolver } from './notification-preferences.resolver';
import { Notification } from './entities/notification.entity';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { User } from '../auth/entities/user.entity';
import { Task } from '../projects/entities/task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreferences, User, Task]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION_TIME'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    NotificationsGateway, 
    NotificationsService, 
    NotificationsResolver, 
    NotificationsScheduler,
    NotificationPreferencesService,
    NotificationPreferencesResolver
  ],
  exports: [NotificationsService, NotificationsGateway, NotificationPreferencesService],
})
export class NotificationsModule {}