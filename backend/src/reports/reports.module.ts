import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report } from './entities/report.entity';
import { ReportSchedule } from './entities/report-schedule.entity';
import { ReportAnalytics } from './entities/report-analytics.entity';
import { ReportSchedulerService } from './services/report-scheduler.service';
import { ReportExportService } from './services/report-export.service';
import { ReportAnalyticsService } from './services/report-analytics.service';
import { ReportTemplateService } from './services/report-template.service';
import { ReportQueryBuilderService } from './services/report-query-builder.service';
import { ReportProcessor } from './processors/report.processor';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectsModule } from '../projects/projects.module';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([
      Report,
      ReportSchedule,
      ReportAnalytics,
    ]),
    
    // Schedule module for cron jobs
    ScheduleModule.forRoot(),
    
    // Bull queue for background processing
    BullModule.registerQueue({
      name: 'reports',
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    
    // Multer for file uploads
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'application/json',
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Tipo de arquivo não suportado'), false);
        }
      },
    }),
    
    // External modules
    EmailModule,
    UsersModule,
    TasksModule,
    ProjectsModule,
  ],
  
  controllers: [
    ReportsController,
  ],
  
  providers: [
    // Main service
    ReportsService,
    
    // Specialized services
    ReportSchedulerService,
    ReportExportService,
    ReportAnalyticsService,
    ReportTemplateService,
    ReportQueryBuilderService,
    
    // Queue processors
    ReportProcessor,
  ],
  
  exports: [
    ReportsService,
    ReportAnalyticsService,
    ReportExportService,
    TypeOrmModule,
  ],
})
export class ReportsModule {
  constructor() {
    console.log('📊 Reports Module initialized');
  }
}

export default ReportsModule;