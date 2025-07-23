import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Project } from './project.entity';
import { Task } from './task.entity';

@ObjectType()
@Entity('recent_activities')
export class RecentActivity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  type: string;

  @Field()
  @Column()
  title: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Field(() => Project, { nullable: true })
  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Field(() => Task, { nullable: true })
  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}