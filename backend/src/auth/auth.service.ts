import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { LoginInput } from './dto/login.input';
import { AuthPayload } from './dto/auth.payload';
import { CreateUserInput } from './dto/create-user.input';
import { NotificationPreferencesService } from '../notifications/notification-preferences.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private notificationPreferencesService: NotificationPreferencesService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginInput: LoginInput): Promise<AuthPayload> {
    const user = await this.validateUser(loginInput.email, loginInput.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { email: user.email, sub: user.id };
    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async signup(createUserInput: CreateUserInput): Promise<AuthPayload> {
    const { email, password, name } = createUserInput;

    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.usersRepository.create({
      email,
      password: hashedPassword,
      name,
    });

    const savedUser = await this.usersRepository.save(newUser);

    // Criar preferências de notificação padrão para o novo usuário
    await this.notificationPreferencesService.createDefaultPreferencesForUser(savedUser);

    const payload = { email: savedUser.email, sub: savedUser.id };
    return {
      accessToken: this.jwtService.sign(payload),
      user: savedUser,
    };
  }
}
