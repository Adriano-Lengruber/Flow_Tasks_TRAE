import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateAutomationDto } from './create-automation.dto';

@InputType()
export class UpdateAutomationDto extends PartialType(CreateAutomationDto) {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}