import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ProjectsService } from './projects.service';
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
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@Resolver(() => Project)
@UseGuards(JwtAuthGuard)
export class ProjectsResolver {
  constructor(private readonly projectsService: ProjectsService) {}

  // Project resolvers
  @Mutation(() => Project)
  createProject(
    @Args('createProjectInput') createProjectInput: CreateProjectInput,
    @CurrentUser() user: User,
  ): Promise<Project> {
    return this.projectsService.createProject(createProjectInput, user);
  }

  @Query(() => [Project], { name: 'projects' })
  findAllProjects(@CurrentUser() user: User): Promise<Project[]> {
    return this.projectsService.findAllProjects(user);
  }

  @Query(() => Project, { name: 'project' })
  findProjectById(@Args('id', { type: () => ID }) id: string): Promise<Project> {
    return this.projectsService.findProjectById(id);
  }

  @Mutation(() => Project)
  updateProject(@Args('updateProjectInput') updateProjectInput: UpdateProjectInput): Promise<Project> {
    return this.projectsService.updateProject(updateProjectInput);
  }

  @Mutation(() => Boolean)
  removeProject(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.projectsService.removeProject(id);
  }

  // Section resolvers
  @Mutation(() => Section)
  createSection(@Args('createSectionInput') createSectionInput: CreateSectionInput): Promise<Section> {
    return this.projectsService.createSection(createSectionInput);
  }

  @Query(() => Section, { name: 'section' })
  findSectionById(@Args('id', { type: () => ID }) id: string): Promise<Section> {
    return this.projectsService.findSectionById(id);
  }

  @Mutation(() => Section)
  updateSection(@Args('updateSectionInput') updateSectionInput: UpdateSectionInput): Promise<Section> {
    return this.projectsService.updateSection(updateSectionInput);
  }

  @Mutation(() => Boolean)
  removeSection(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.projectsService.removeSection(id);
  }

  // Task resolvers
  @Mutation(() => Task)
  createTask(@Args('createTaskInput') createTaskInput: CreateTaskInput): Promise<Task> {
    return this.projectsService.createTask(createTaskInput);
  }

  @Query(() => Task, { name: 'task' })
  findTaskById(@Args('id', { type: () => ID }) id: string): Promise<Task> {
    return this.projectsService.findTaskById(id);
  }

  @Mutation(() => Task)
  updateTask(@Args('updateTaskInput') updateTaskInput: UpdateTaskInput): Promise<Task> {
    return this.projectsService.updateTask(updateTaskInput);
  }

  @Mutation(() => Boolean)
  removeTask(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.projectsService.removeTask(id);
  }

  @Mutation(() => Task)
  moveTask(@Args('moveTaskInput') moveTaskInput: MoveTaskInput): Promise<Task> {
    return this.projectsService.moveTask(moveTaskInput);
  }

  @Mutation(() => Task)
  moveTaskToSection(
    @Args('id', { type: () => ID }) id: string,
    @Args('sectionId', { type: () => ID }) sectionId: string
  ): Promise<Task> {
    return this.projectsService.moveTaskToSection(id, sectionId);
  }
}