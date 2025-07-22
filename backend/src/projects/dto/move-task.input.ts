import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

@InputType()
export class MoveTaskInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  taskId: string;

  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  targetSectionId: string;

  @Field()
  @IsNotEmpty()
  @IsNumber()
  newOrder: number;
}