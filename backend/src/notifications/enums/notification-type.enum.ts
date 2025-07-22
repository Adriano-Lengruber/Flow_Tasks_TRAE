import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  TASK_MOVED = 'TASK_MOVED',
  TASK_COMMENT = 'TASK_COMMENT',
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  DEADLINE_APPROACHING = 'DEADLINE_APPROACHING',
  SYSTEM = 'SYSTEM',
}

registerEnumType(NotificationType, {
  name: 'NotificationType',
  description: 'Tipos de notificações disponíveis no sistema',
});