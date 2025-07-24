import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task } from '../../projects/entities/task.entity';
import DataLoader from 'dataloader';

@Injectable()
export class TasksDataLoader {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
  ) {}

  createLoader(): DataLoader<string, Task[]> {
    return new DataLoader<string, Task[]>(async (sectionIds: readonly string[]) => {
      const tasks = await this.tasksRepository.find({
        where: { section: { id: In([...sectionIds]) } },
        relations: ['assignee', 'comments'],
        order: { createdAt: 'ASC' },
      });

      // Agrupar tarefas por sectionId
      const tasksBySectionId = new Map<string, Task[]>();
      
      tasks.forEach(task => {
        const sectionId = task.section.id;
        if (!tasksBySectionId.has(sectionId)) {
          tasksBySectionId.set(sectionId, []);
        }
        tasksBySectionId.get(sectionId)!.push(task);
      });

      // Retornar na mesma ordem dos sectionIds
      return sectionIds.map(sectionId => tasksBySectionId.get(sectionId) || []);
    });
  }
}