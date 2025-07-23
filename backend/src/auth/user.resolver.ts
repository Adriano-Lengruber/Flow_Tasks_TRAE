import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from './entities/user.entity';

@Resolver(() => User)
export class UserResolver {
  @Query(() => User, { name: 'me' })
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User): Promise<User> {
    return user;
  }
}