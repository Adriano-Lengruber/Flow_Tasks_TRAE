import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { Task } from '../projects/entities/task.entity';
import { NotificationType } from './enums/notification-type.enum';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
  ) {}

  // Executar todos os dias às 2:00 AM para limpar notificações antigas
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldNotifications() {
    try {
      const deletedCount = await this.notificationsService.deleteOldNotifications(30);
      this.logger.log(`Limpeza automática: ${deletedCount} notificações antigas removidas`);
    } catch (error) {
      this.logger.error('Erro na limpeza de notificações antigas:', error);
    }
  }

  // Executar todos os dias às 9:00 AM para verificar deadlines
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkUpcomingDeadlines() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(23, 59, 59, 999);

      // Tarefas com deadline amanhã
      const tasksDueTomorrow = await this.tasksRepository.find({
        where: {
          dueDate: LessThan(tomorrow),
          completed: false,
        },
        relations: ['assignee', 'section', 'section.project', 'section.project.owner'],
      });

      // Tarefas com deadline na próxima semana
      const tasksDueNextWeek = await this.tasksRepository.find({
        where: {
          dueDate: LessThan(nextWeek),
          completed: false,
        },
        relations: ['assignee', 'section', 'section.project', 'section.project.owner'],
      });

      // Notificar sobre tarefas com deadline amanhã
      for (const task of tasksDueTomorrow) {
        if (task.assignee) {
          await this.notificationsGateway.sendNotification(
            task.assignee.id,
            NotificationType.DEADLINE_APPROACHING,
            `A tarefa "${task.title}" vence amanhã!`,
            { id: task.id, type: 'task' }
          );
        }

        // Notificar também o dono do projeto
        const projectOwner = task.section.project.owner;
        if (projectOwner && (!task.assignee || projectOwner.id !== task.assignee.id)) {
          await this.notificationsGateway.sendNotification(
            projectOwner.id,
            NotificationType.DEADLINE_APPROACHING,
            `A tarefa "${task.title}" vence amanhã!`,
            { id: task.id, type: 'task' }
          );
        }
      }

      // Notificar sobre tarefas com deadline na próxima semana (apenas para o responsável)
      for (const task of tasksDueNextWeek) {
        if (task.assignee) {
          const daysUntilDue = Math.ceil(
            (new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );

          await this.notificationsGateway.sendNotification(
            task.assignee.id,
            NotificationType.DEADLINE_APPROACHING,
            `A tarefa "${task.title}" vence em ${daysUntilDue} dias`,
            { id: task.id, type: 'task' }
          );
        }
      }

      this.logger.log(
        `Verificação de deadlines: ${tasksDueTomorrow.length} tarefas vencem amanhã, ${tasksDueNextWeek.length} vencem na próxima semana`
      );
    } catch (error) {
      this.logger.error('Erro na verificação de deadlines:', error);
    }
  }

  // Executar a cada hora para verificar tarefas vencidas
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueTasks() {
    try {
      const now = new Date();
      
      const overdueTasks = await this.tasksRepository.find({
        where: {
          dueDate: LessThan(now),
          completed: false,
        },
        relations: ['assignee', 'section', 'section.project', 'section.project.owner'],
      });

      for (const task of overdueTasks) {
        if (task.assignee) {
          await this.notificationsGateway.sendNotification(
            task.assignee.id,
            NotificationType.DEADLINE_APPROACHING,
            `A tarefa "${task.title}" está atrasada!`,
            { id: task.id, type: 'task' }
          );
        }
      }

      if (overdueTasks.length > 0) {
        this.logger.log(`Verificação de tarefas atrasadas: ${overdueTasks.length} tarefas encontradas`);
      }
    } catch (error) {
      this.logger.error('Erro na verificação de tarefas atrasadas:', error);
    }
  }
}