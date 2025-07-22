import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentInput } from './dto/create-comment.input';
import { UpdateCommentInput } from './dto/update-comment.input';
import { User } from '../auth/entities/user.entity';
import { Task } from '../projects/entities/task.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(createCommentInput: CreateCommentInput, user: User): Promise<Comment> {
    const { taskId, content } = createCommentInput;
    
    // Verificar se a tarefa existe
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: ['section', 'section.project', 'section.project.owner', 'assignee'],
    });
    
    if (!task) {
      throw new NotFoundException(`Tarefa com ID ${taskId} não encontrada`);
    }
    
    // Criar o comentário
    const comment = this.commentsRepository.create({
      content,
      author: user,
      task,
    });
    
    const savedComment = await this.commentsRepository.save(comment);
    
    // Enviar notificação para o responsável pela tarefa (se não for o autor do comentário)
    if (task.assignee && task.assignee.id !== user.id) {
      await this.notificationsGateway.sendNotification(
        task.assignee.id,
        NotificationType.TASK_COMMENT,
        `${user.name} comentou na tarefa "${task.title}"`,
        { id: task.id, type: 'task' }
      );
    }
    
    // Enviar notificação para o dono do projeto (se não for o autor do comentário)
    const projectOwner = task.section.project.owner;
    if (projectOwner && projectOwner.id !== user.id && (!task.assignee || task.assignee.id !== projectOwner.id)) {
      await this.notificationsGateway.sendNotification(
        projectOwner.id,
        NotificationType.TASK_COMMENT,
        `${user.name} comentou na tarefa "${task.title}"`,
        { id: task.id, type: 'task' }
      );
    }
    
    return savedComment;
  }

  async findAll(taskId: string): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: { task: { id: taskId } },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['author', 'task'],
    });
    
    if (!comment) {
      throw new NotFoundException(`Comentário com ID ${id} não encontrado`);
    }
    
    return comment;
  }

  async update(id: string, updateCommentInput: UpdateCommentInput, user: User): Promise<Comment> {
    const comment = await this.findOne(id);
    
    // Verificar se o usuário é o autor do comentário
    if (comment.author.id !== user.id) {
      throw new ForbiddenException('Você não tem permissão para editar este comentário');
    }
    
    // Atualizar apenas o conteúdo
    if (updateCommentInput.content) {
      comment.content = updateCommentInput.content;
    }
    
    return this.commentsRepository.save(comment);
  }

  async remove(id: string, user: User): Promise<boolean> {
    const comment = await this.findOne(id);
    
    // Verificar se o usuário é o autor do comentário
    if (comment.author.id !== user.id) {
      throw new ForbiddenException('Você não tem permissão para excluir este comentário');
    }
    
    const result = await this.commentsRepository.delete(id);
    return result.affected > 0;
  }
}