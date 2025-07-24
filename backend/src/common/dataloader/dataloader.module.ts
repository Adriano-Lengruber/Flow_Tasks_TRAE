import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Section } from '../../projects/entities/section.entity';
import { Task } from '../../projects/entities/task.entity';
import { SectionsDataLoader } from './sections.dataloader';
import { TasksDataLoader } from './tasks.dataloader';

@Module({
  imports: [TypeOrmModule.forFeature([Section, Task])],
  providers: [SectionsDataLoader, TasksDataLoader],
  exports: [SectionsDataLoader, TasksDataLoader],
})
export class DataLoaderModule {}