import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Section } from './section.entity';
import { User } from '../../auth/entities/user.entity';

@ObjectType()
@Entity()
export class Project {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  @Column({ type: 'date', nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  @Field(() => [Section], { nullable: true })
  @OneToMany(() => Section, (section) => section.project, {
    cascade: true,
  })
  sections?: Section[];

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, (user) => user.projects, { nullable: true })
  owner?: User;

  @Field()
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Field()
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}