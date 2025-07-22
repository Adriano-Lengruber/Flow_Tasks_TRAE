import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber } from 'class-validator';

@InputType()
export class CreateSectionInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  projectId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  order?: number;
}