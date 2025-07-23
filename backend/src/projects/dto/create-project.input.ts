import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

@InputType()
export class CreateProjectInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}