import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

@InputType()
export class CreateCommentInput {
  @Field()
  @IsNotEmpty({ message: 'O conteúdo do comentário é obrigatório' })
  @IsString({ message: 'O conteúdo deve ser uma string' })
  @MaxLength(1000, { message: 'O comentário não pode exceder 1000 caracteres' })
  content: string;

  @Field()
  @IsUUID('4', { message: 'ID da tarefa inválido' })
  taskId: string;
}