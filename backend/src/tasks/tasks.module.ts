import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../projects/entities/task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
  ],
  exports: [
    TypeOrmModule,
  ],
})
export class TasksModule {}