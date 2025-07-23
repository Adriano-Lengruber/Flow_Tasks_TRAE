import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { UserResolver } from './user.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User]),
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: `${configService.get<string>('JWT_EXPIRATION_TIME')}s`,
        },
      }),
    }),
  ],
  providers: [AuthResolver, UserResolver, AuthService, JwtStrategy],
})
export class AuthModule {}
