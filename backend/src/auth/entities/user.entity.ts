import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { NotificationPreferences } from '../../notifications/entities/notification-preferences.entity';

@ObjectType()
@Entity()
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  email: string;

  @Column()
  password?: string;

  @Field()
  @Column({ nullable: true })
  name?: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => [Project], { nullable: true })
  @OneToMany(() => Project, (project) => project.owner)
  projects?: Project[];

  @Field(() => NotificationPreferences, { nullable: true })
  @OneToOne(() => NotificationPreferences, (preferences) => preferences.user, { eager: true })
  notificationPreferences?: NotificationPreferences;
}