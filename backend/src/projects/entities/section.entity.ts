import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from './project.entity';
import { Task } from './task.entity';

@ObjectType()
@Entity()
export class Section {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field()
  @Column({ default: 0 })
  order: number;

  @Field(() => Project)
  @ManyToOne(() => Project, (project) => project.sections, { onDelete: 'CASCADE' })
  project: Project;

  @Field(() => [Task], { nullable: true })
  @OneToMany(() => Task, (task) => task.section, {
    cascade: true,
  })
  tasks?: Task[];

  @Field()
  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Field()
  @Column({ default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}