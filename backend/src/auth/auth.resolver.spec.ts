import { Test, TestingModule } from '@nestjs/testing';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { CreateUserInput } from './dto/create-user.input';
import { AuthPayload } from './dto/auth.payload';

describe('AuthResolver', () => {
  let resolver: AuthResolver;
  let authService: AuthService;

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      signup: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    resolver = module.get<AuthResolver>(AuthResolver);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login with correct parameters', async () => {
      const loginInput: LoginInput = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResult: AuthPayload = {
        accessToken: 'test-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      jest.spyOn(authService, 'login').mockResolvedValue(expectedResult);

      const result = await resolver.login(loginInput);

      expect(authService.login).toHaveBeenCalledWith(loginInput);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('signup', () => {
    it('should call authService.signup with correct parameters', async () => {
      const createUserInput: CreateUserInput = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };

      const expectedResult: AuthPayload = {
        accessToken: 'new-token',
        user: {
          id: 'new-user-id',
          email: 'new@example.com',
          name: 'New User',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      jest.spyOn(authService, 'signup').mockResolvedValue(expectedResult);

      const result = await resolver.signup(createUserInput);

      expect(authService.signup).toHaveBeenCalledWith(createUserInput);
      expect(result).toEqual(expectedResult);
    });
  });
});
