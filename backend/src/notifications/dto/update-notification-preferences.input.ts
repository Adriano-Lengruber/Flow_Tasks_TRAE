import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateNotificationPreferencesInput {
  @Field(() => Boolean, { nullable: true })
  taskAssigned?: boolean;

  @Field(() => Boolean, { nullable: true })
  taskCompleted?: boolean;

  @Field(() => Boolean, { nullable: true })
  taskMoved?: boolean;

  @Field(() => Boolean, { nullable: true })
  taskComment?: boolean;

  @Field(() => Boolean, { nullable: true })
  projectCreated?: boolean;

  @Field(() => Boolean, { nullable: true })
  projectUpdated?: boolean;

  @Field(() => Boolean, { nullable: true })
  deadlineApproaching?: boolean;

  @Field(() => Boolean, { nullable: true })
  emailNotifications?: boolean;

  @Field(() => Boolean, { nullable: true })
  pushNotifications?: boolean;
}