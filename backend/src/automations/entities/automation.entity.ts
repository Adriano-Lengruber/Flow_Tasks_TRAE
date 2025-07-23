import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';

export enum TriggerType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  TASK_MOVED = 'TASK_MOVED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_DUE_DATE = 'TASK_DUE_DATE',
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_COMPLETED = 'PROJECT_COMPLETED'
}

export enum ActionType {
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  ASSIGN_TASK = 'ASSIGN_TASK',
  MOVE_TASK = 'MOVE_TASK',
  CREATE_TASK = 'CREATE_TASK',
  UPDATE_TASK_PRIORITY = 'UPDATE_TASK_PRIORITY',
  SEND_EMAIL = 'SEND_EMAIL'
}

registerEnumType(TriggerType, {
  name: 'TriggerType',
  description: 'Tipos de gatilhos disponíveis para automações'
});

registerEnumType(ActionType, {
  name: 'ActionType',
  description: 'Tipos de ações disponíveis para automações'
});

@ObjectType()
@Entity()
export class Automation {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field(() => TriggerType)
  @Column({ type: 'varchar' })
  triggerType: TriggerType;

  @Field(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  triggerConditions?: string; // JSON string com condições específicas

  @Field(() => ActionType)
  @Column({ type: 'varchar' })
  actionType: ActionType;

  @Field(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  actionParameters?: string; // JSON string com parâmetros da ação

  @Field(() => Boolean)
  @Column({ default: true })
  isActive: boolean;

  @Field(() => User)
  @ManyToOne(() => User, { nullable: false })
  createdBy: User;

  @Field(() => Project, { nullable: true })
  @ManyToOne(() => Project, { nullable: true })
  project?: Project; // Automação específica para um projeto ou global

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => Number)
  @Column({ default: 0 })
  executionCount: number; // Contador de execuções

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastExecutedAt?: Date;
}