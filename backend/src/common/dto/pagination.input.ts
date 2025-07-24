import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsPositive, Max } from 'class-validator';

@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsPositive()
  offset?: number = 0;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsPositive()
  @Max(100) // Limita a 100 itens por página
  limit?: number = 20;
}