import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Automation } from './automation.entity';
import { User } from '../../auth/entities/user.entity';

export enum ExecutionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

registerEnumType(ExecutionStatus, {
  name: 'ExecutionStatus',
  description: 'Status de execução da automação'
});

@ObjectType()
@Entity()
export class AutomationLog {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => Automation)
  @ManyToOne(() => Automation, { nullable: false })
  automation: Automation;

  @Field(() => ExecutionStatus)
  @Column({ type: 'varchar' })
  status: ExecutionStatus;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  triggerData?: string; // Dados que dispararam a automação

  @Field(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  actionResult?: string; // Resultado da ação executada

  @Field({ nullable: true })
  @Column({ nullable: true })
  relatedTaskId?: string; // Tarefa relacionada ao trigger/ação

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { nullable: true })
  triggeredBy?: User; // Usuário que causou o trigger

  @Field()
  @CreateDateColumn()
  executedAt: Date;

  @Field(() => Number)
  @Column({ type: 'int', default: 0 })
  executionTimeMs: number; // Tempo de execução em milissegundos
}