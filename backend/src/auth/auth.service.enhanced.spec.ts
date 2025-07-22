import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserInput } from './dto/create-user.input';
import { LoginInput } from './dto/login.input';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('AuthService - Enhanced Tests', () => {
  let service: AuthService;
  let userRepository: MockRepository<User>;
  let jwtService: JwtService;

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const validCreateUserInput: CreateUserInput = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should successfully create a new user', async () => {
      const hashedPassword = 'hashed-password';
      const mockUser = {
        id: 'user-id',
        email: validCreateUserInput.email,
        name: validCreateUserInput.name,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      const result = await service.signup(validCreateUserInput);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: validCreateUserInput.email },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(validCreateUserInput.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: validCreateUserInput.email,
        password: hashedPassword,
        name: validCreateUserInput.name,
      });
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        user: mockUser,
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      const existingUser = {
        id: 'existing-user-id',
        email: validCreateUserInput.email,
        name: 'Existing User',
      };

      userRepository.findOne.mockResolvedValue(existingUser as any);

      await expect(service.signup(validCreateUserInput)).rejects.toThrow(
        ConflictException
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: validCreateUserInput.email },
      });
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should handle database errors during user creation', async () => {
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      userRepository.create.mockReturnValue({} as any);
      userRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.signup(validCreateUserInput)).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle bcrypt hashing errors', async () => {
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockRejectedValue(new Error('Hashing failed') as never);

      await expect(service.signup(validCreateUserInput)).rejects.toThrow(
        'Hashing failed'
      );
    });
  });

  describe('login', () => {
    const validLoginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'user-id',
      email: validLoginInput.email,
      password: 'hashed-password',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully login with valid credentials', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.login(validLoginInput);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: validLoginInput.email },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        validLoginInput.password,
        mockUser.password
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        user: mockUser,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(validLoginInput)).rejects.toThrow(
        UnauthorizedException
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: validLoginInput.email },
      });
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(validLoginInput)).rejects.toThrow(
        UnauthorizedException
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: validLoginInput.email },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        validLoginInput.password,
        mockUser.password
      );
    });

    it('should handle database errors during login', async () => {
      userRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.login(validLoginInput)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle bcrypt comparison errors', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockRejectedValue(new Error('Bcrypt error') as never);

      await expect(service.login(validLoginInput)).rejects.toThrow(
        'Bcrypt error'
      );
    });
  });

  describe('validateUser', () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return user when credentials are valid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(result).toEqual({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashed-password');
      expect(result).toBeNull();
    });

    it('should handle database errors during validation', async () => {
      userRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.validateUser('test@example.com', 'password123')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle empty email gracefully', async () => {
      const invalidInput: CreateUserInput = {
        email: '',
        password: 'password123',
        name: 'Test User',
      };

      userRepository.findOne.mockResolvedValue(null);

      // This should be handled by validation pipes in real scenario
      // but testing service behavior
      await expect(service.signup(invalidInput)).resolves.toBeDefined();
    });

    it('should handle very long passwords', async () => {
      const longPasswordInput: CreateUserInput = {
        email: 'test@example.com',
        password: 'a'.repeat(1000), // Very long password
        name: 'Test User',
      };

      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-long-password' as never);
      userRepository.create.mockReturnValue({} as any);
      userRepository.save.mockResolvedValue({} as any);

      await expect(service.signup(longPasswordInput)).resolves.toBeDefined();
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(longPasswordInput.password, 10);
    });

    it('should handle special characters in email and name', async () => {
      const specialCharInput: CreateUserInput = {
        email: 'test+special@example.com',
        password: 'password123',
        name: 'Test User with Special Chars: àáâãäåæçèéêë',
      };

      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      userRepository.create.mockReturnValue({} as any);
      userRepository.save.mockResolvedValue({} as any);

      await expect(service.signup(specialCharInput)).resolves.toBeDefined();
    });

    it('should handle concurrent signup attempts for same email', async () => {
      const input: CreateUserInput = {
        email: 'concurrent@example.com',
        password: 'password123',
        name: 'Concurrent User',
      };

      // First call finds no user, second call should find user created by first
      userRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-id', email: input.email } as any);
      
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      userRepository.create.mockReturnValue({} as any);
      userRepository.save.mockResolvedValue({} as any);

      // First signup should succeed
      await expect(service.signup(input)).resolves.toBeDefined();
      
      // Second signup should fail
      await expect(service.signup(input)).rejects.toThrow(ConflictException);
    });
  });
});