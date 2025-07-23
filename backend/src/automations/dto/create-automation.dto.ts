import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, IsUUID } from 'class-validator';
import { TriggerType, ActionType } from '../entities/automation.entity';

@InputType()
export class CreateAutomationDto {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => TriggerType)
  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  triggerConditions?: string;

  @Field(() => ActionType)
  @IsEnum(ActionType)
  actionType: ActionType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  actionParameters?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}