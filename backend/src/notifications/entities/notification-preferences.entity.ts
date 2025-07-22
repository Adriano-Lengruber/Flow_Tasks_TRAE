import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@ObjectType()
@Entity('notification_preferences')
export class NotificationPreferences {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => User)
  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Field(() => Boolean, { defaultValue: true })
  @Column({ default: true })
  taskAssigned: boolean;

  @Field(() => Boolean, { defaultValue: true })
  @Column({ default: true })
  taskCompleted: boolean;

  @Field(() => Boolean, { defaultValue: true })
  @Column({ default: true })
  taskMoved: boolean;

  @Field(() => Boolean, { defaultValue: true })
  @Column({ default: true })
  taskComment: boolean;

  @Field(() => Boolean, { defaultValue: true })
  @Column({ default: true })
  projectCreated: boolean;

  @Field(() => Boolean, { defaultValue: true })
  @Column({ default: true })
  projectUpdated: boolean;

  @Field(() => Boolean, { defaultValue: true })
  @Column({ default: true })
  deadlineApproaching: boolean;

  @Field(() => Boolean, { defaultValue: true })
  @Column({ default: true })
  emailNotifications: boolean;

  @Field(() => Boolean, { defaultValue: true })
  @Column({ default: true })
  pushNotifications: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}