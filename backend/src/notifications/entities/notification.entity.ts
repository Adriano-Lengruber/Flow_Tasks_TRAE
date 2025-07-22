import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../auth/entities/user.entity';
import { NotificationType } from '../enums/notification-type.enum';

@ObjectType()
@Entity('notifications')
export class Notification {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => NotificationType)
  @Column('text')
  type: NotificationType;

  @Field()
  @Column('text')
  message: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  entityId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  entityType?: string;

  @Field()
  @Column({ default: false })
  read: boolean;

  @Field(() => User)
  @ManyToOne(() => User, { eager: true })
  user: User;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}