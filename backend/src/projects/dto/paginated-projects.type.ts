import { ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from '../../common/dto/paginated-response.type';
import { Project } from '../entities/project.entity';

@ObjectType()
export class PaginatedProjects extends PaginatedResponse(Project) {}