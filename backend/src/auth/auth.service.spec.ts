import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { NotificationPreferencesService } from '../notifications/notification-preferences.service';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: MockRepository<User>;
  let jwtService: JwtService;
  let notificationPreferencesService: NotificationPreferencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('test-token'),
          },
        },
        {
          provide: NotificationPreferencesService,
          useValue: {
            createDefaultPreferencesForUser: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<MockRepository>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    notificationPreferencesService = module.get<NotificationPreferencesService>(
      NotificationPreferencesService,
    );

    // Mock bcrypt
    jest.spyOn(bcrypt, 'compare').mockImplementation((password, hash) => 
      Promise.resolve(password === 'correct-password')
    );
    jest.spyOn(bcrypt, 'hash').mockImplementation(() => 
      Promise.resolve('hashed-password')
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user if email and password are valid', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
      };
      userRepository.findOne.mockResolvedValue(mockUser);
      
      const result = await service.validateUser('test@example.com', 'correct-password');
      
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', 'hashed-password');
      expect(result).toEqual({
        id: 'user-id',
        email: 'test@example.com',
      });
    });

    it('should return null if user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      
      const result = await service.validateUser('nonexistent@example.com', 'password');
      
      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
      };
      userRepository.findOne.mockResolvedValue(mockUser);
      
      const result = await service.validateUser('test@example.com', 'wrong-password');
      
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user if credentials are valid', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
      };
      
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
      
      const result = await service.login({
        email: 'test@example.com',
        password: 'correct-password',
      });
      
      expect(service.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'correct-password',
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: mockUser.email,
        sub: mockUser.id,
      });
      expect(result).toEqual({
        accessToken: 'test-token',
        user: mockUser,
      });
    });

    it('should throw UnauthorizedException if credentials are invalid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);
      
      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('signup', () => {
    it('should create a new user and return access token and user', async () => {
      const mockUser = {
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'New User',
      };
      
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue({
        ...mockUser,
        password: 'hashed-password',
      });
      userRepository.save.mockResolvedValue(mockUser);
      
      const result = await service.signup({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });
      
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'hashed-password',
        name: 'New User',
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(notificationPreferencesService.createDefaultPreferencesForUser).toHaveBeenCalledWith(
        mockUser,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: mockUser.email,
        sub: mockUser.id,
      });
      expect(result).toEqual({
        accessToken: 'test-token',
        user: mockUser,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'existing-id' });
      
      await expect(
        service.signup({
          email: 'existing@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
      
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });
});
