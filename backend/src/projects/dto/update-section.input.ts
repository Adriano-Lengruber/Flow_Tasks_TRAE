import { CreateSectionInput } from './create-section.input';
import { InputType, Field, PartialType, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';

@InputType()
export class UpdateSectionInput extends PartialType(CreateSectionInput) {
  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  id: string;
}