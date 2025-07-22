import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { Section } from './entities/section.entity';
import { Task } from './entities/task.entity';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { CreateSectionInput } from './dto/create-section.input';
import { UpdateSectionInput } from './dto/update-section.input';
import { CreateTaskInput } from './dto/create-task.input';
import { UpdateTaskInput } from './dto/update-task.input';
import { MoveTaskInput } from './dto/move-task.input';
import { User } from '../auth/entities/user.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Section)
    private sectionsRepository: Repository<Section>,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    private notificationsGateway: NotificationsGateway,
  ) {}

  // Project methods
  async createProject(createProjectInput: CreateProjectInput, user: User): Promise<Project> {
    const project = this.projectsRepository.create({
      ...createProjectInput,
      owner: user,
    });

    // Create default sections
    const defaultSections = ['To Do', 'In Progress', 'Done'];
    project.sections = defaultSections.map((name, index) => 
      this.sectionsRepository.create({
        name,
        order: index,
        project,
      })
    );

    return this.projectsRepository.save(project);
  }

  async findAllProjects(user: User): Promise<Project[]> {
    return this.projectsRepository.find({
      where: { owner: { id: user.id } },
      relations: ['sections', 'sections.tasks'],
    });
  }

  async findProjectById(id: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['sections', 'sections.tasks'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async updateProject(updateProjectInput: UpdateProjectInput): Promise<Project> {
    const project = await this.findProjectById(updateProjectInput.id);
    Object.assign(project, updateProjectInput);
    return this.projectsRepository.save(project);
  }

  async removeProject(id: string): Promise<boolean> {
    const result = await this.projectsRepository.delete(id);
    return result.affected > 0;
  }

  // Section methods
  async createSection(createSectionInput: CreateSectionInput): Promise<Section> {
    const project = await this.findProjectById(createSectionInput.projectId);
    
    // If order is not provided, place at the end
    if (createSectionInput.order === undefined) {
      const lastSection = await this.sectionsRepository.findOne({
        where: { project: { id: project.id } },
        order: { order: 'DESC' },
      });
      createSectionInput.order = lastSection ? lastSection.order + 1 : 0;
    }

    const section = this.sectionsRepository.create({
      ...createSectionInput,
      project,
    });

    return this.sectionsRepository.save(section);
  }

  async findSectionById(id: string): Promise<Section> {
    const section = await this.sectionsRepository.findOne({
      where: { id },
      relations: ['tasks'],
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    return section;
  }

  async updateSection(updateSectionInput: UpdateSectionInput): Promise<Section> {
    const section = await this.findSectionById(updateSectionInput.id);
    Object.assign(section, updateSectionInput);
    return this.sectionsRepository.save(section);
  }

  async removeSection(id: string): Promise<boolean> {
    const result = await this.sectionsRepository.delete(id);
    return result.affected > 0;
  }

  // Task methods
  async createTask(createTaskInput: CreateTaskInput): Promise<Task> {
    const section = await this.findSectionById(createTaskInput.sectionId);
    
    // If order is not provided, place at the end
    if (createTaskInput.order === undefined) {
      const lastTask = await this.tasksRepository.findOne({
        where: { section: { id: section.id } },
        order: { order: 'DESC' },
      });
      createTaskInput.order = lastTask ? lastTask.order + 1 : 0;
    }

    const task = this.tasksRepository.create({
      ...createTaskInput,
      section,
    });

    const savedTask = await this.tasksRepository.save(task);
    
    // Notificar sobre a criação da tarefa se houver um assignee
    if (createTaskInput.assigneeId) {
      this.notificationsGateway.sendNotification(
        createTaskInput.assigneeId,
        NotificationType.TASK_ASSIGNED,
        `Uma nova tarefa foi atribuída a você: ${savedTask.title}`,
        { id: savedTask.id, type: 'task' }
      );
    }
    
    return savedTask;
  }

  async findTaskById(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['section', 'assignee'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async updateTask(updateTaskInput: UpdateTaskInput): Promise<Task> {
    const task = await this.findTaskById(updateTaskInput.id);
    const previousAssigneeId = task.assignee?.id;
    const wasCompleted = task.completed;
    
    // Handle section change if sectionId is provided
    if (updateTaskInput.sectionId && updateTaskInput.sectionId !== task.section.id) {
      const newSection = await this.findSectionById(updateTaskInput.sectionId);
      task.section = newSection;
    }
    
    Object.assign(task, updateTaskInput);
    const updatedTask = await this.tasksRepository.save(task);
    
    // Notificar sobre mudança de responsável
    if (updateTaskInput.assigneeId && updateTaskInput.assigneeId !== previousAssigneeId) {
      this.notificationsGateway.sendNotification(
        updateTaskInput.assigneeId,
        NotificationType.TASK_ASSIGNED,
        `A tarefa "${updatedTask.title}" foi atribuída a você`,
        { id: updatedTask.id, type: 'task' }
      );
    }
    
    // Notificar sobre conclusão da tarefa
    if (!wasCompleted && updatedTask.completed) {
      // Notificar o criador do projeto ou outros interessados
      const section = await this.findSectionById(updatedTask.section.id);
      const project = await this.findProjectById(section.project.id);
      
      this.notificationsGateway.sendNotification(
        project.owner.id,
        NotificationType.TASK_COMPLETED,
        `A tarefa "${updatedTask.title}" foi concluída`,
        { id: updatedTask.id, type: 'task' }
      );
      
      // Broadcast para todos no projeto
      this.notificationsGateway.broadcastProjectUpdate(project.id, {
        type: 'TASK_COMPLETED',
        taskId: updatedTask.id,
        taskTitle: updatedTask.title
      });
    }
    
    return updatedTask;
  }

  async removeTask(id: string): Promise<boolean> {
    const result = await this.tasksRepository.delete(id);
    return result.affected > 0;
  }

  async moveTask(moveTaskInput: MoveTaskInput): Promise<Task> {
    const { taskId, targetSectionId, newOrder } = moveTaskInput;
    const task = await this.findTaskById(taskId);
    const originalSectionId = task.section.id;
    const targetSection = await this.findSectionById(targetSectionId);
    
    // Update task's section and order
    task.section = targetSection;
    task.order = newOrder;
    
    // Reorder other tasks in the target section
    await this.tasksRepository
      .createQueryBuilder()
      .update(Task)
      .set({ order: () => 'order + 1' })
      .where('section_id = :sectionId AND order >= :newOrder AND id != :taskId', {
        sectionId: targetSectionId,
        newOrder,
        taskId,
      })
      .execute();
    
    const updatedTask = await this.tasksRepository.save(task);
    
    // Notificar sobre a movimentação da tarefa se a seção mudou
    if (originalSectionId !== targetSectionId) {
      // Notificar o responsável pela tarefa, se houver
      if (task.assignee) {
        this.notificationsGateway.sendNotification(
          task.assignee.id,
          NotificationType.TASK_MOVED,
          `A tarefa "${task.title}" foi movida para ${targetSection.name}`,
          { id: task.id, type: 'task' }
        );
      }
      
      // Broadcast para todos no projeto
      const section = await this.findSectionById(targetSectionId);
      const project = await this.projectsRepository.findOne({
        where: { sections: { id: targetSectionId } },
        relations: ['owner'],
      });
      
      if (project) {
        this.notificationsGateway.broadcastProjectUpdate(project.id, {
          type: 'TASK_MOVED',
          taskId: task.id,
          taskTitle: task.title,
          fromSection: originalSectionId,
          toSection: targetSectionId
        });
      }
    }
    
    return updatedTask;
  }
}