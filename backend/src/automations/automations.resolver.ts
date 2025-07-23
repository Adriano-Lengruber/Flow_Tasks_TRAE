import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { Automation } from './entities/automation.entity';
import { AutomationLog } from './entities/automation-log.entity';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Resolver(() => Automation)
@UseGuards(JwtAuthGuard)
export class AutomationsResolver {
  constructor(private readonly automationsService: AutomationsService) {}

  @Mutation(() => Automation)
  async createAutomation(
    @Args('createAutomationInput') createAutomationDto: CreateAutomationDto,
    @Context() context: any,
  ): Promise<Automation> {
    const userId = context.req.user.userId;
    return this.automationsService.create(createAutomationDto, userId);
  }

  @Query(() => [Automation], { name: 'automations' })
  async findAllAutomations(
    @Args('projectId', { nullable: true }) projectId?: string,
    @Context() context?: any,
  ): Promise<Automation[]> {
    const userId = context.req.user.userId;
    return this.automationsService.findAll(userId, projectId);
  }

  @Query(() => Automation, { name: 'automation' })
  async findOneAutomation(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<Automation> {
    const userId = context.req.user.userId;
    return this.automationsService.findOne(id, userId);
  }

  @Mutation(() => Automation)
  async updateAutomation(
    @Args('id') id: string,
    @Args('updateAutomationInput') updateAutomationDto: UpdateAutomationDto,
    @Context() context: any,
  ): Promise<Automation> {
    const userId = context.req.user.userId;
    return this.automationsService.update(id, updateAutomationDto, userId);
  }

  @Mutation(() => Boolean)
  async removeAutomation(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<boolean> {
    const userId = context.req.user.userId;
    await this.automationsService.remove(id, userId);
    return true;
  }

  @Mutation(() => Automation)
  async toggleAutomationActive(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<Automation> {
    const userId = context.req.user.userId;
    return this.automationsService.toggleActive(id, userId);
  }

  @Query(() => [AutomationLog], { name: 'automationLogs' })
  async getAutomationLogs(
    @Args('automationId') automationId: string,
    @Context() context: any,
  ): Promise<AutomationLog[]> {
    const userId = context.req.user.userId;
    return this.automationsService.getExecutionLogs(automationId, userId);
  }
}