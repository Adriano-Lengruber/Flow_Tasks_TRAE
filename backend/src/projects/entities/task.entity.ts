import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Section } from './section.entity';
import { User } from '../../auth/entities/user.entity';
import { Comment } from '../../comments/entities/comment.entity';

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

registerEnumType(TaskPriority, {
  name: 'TaskPriority',
});

@ObjectType()
@Entity()
export class Task {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  title: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field(() => TaskPriority)
  @Column({
    type: 'text',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Field()
  @Column({ default: false })
  completed: boolean;

  @Field()
  @Column({ default: 0 })
  order: number;

  @Field(() => Section)
  @ManyToOne(() => Section, (section) => section.tasks, { onDelete: 'CASCADE' })
  section: Section;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { nullable: true })
  assignee?: User;

  @Field(() => Date, { nullable: true })
  @Column({ nullable: true })
  dueDate?: Date;

  @Field(() => [Comment], { nullable: true })
  @OneToMany(() => Comment, comment => comment.task, { cascade: true })
  comments: Comment[];

  @Field()
  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Field()
  @Column({ default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}