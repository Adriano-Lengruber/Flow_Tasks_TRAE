import { ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from '../../common/dto/paginated-response.type';
import { Task } from '../entities/task.entity';

@ObjectType()
export class PaginatedTasks extends PaginatedResponse(Task) {}