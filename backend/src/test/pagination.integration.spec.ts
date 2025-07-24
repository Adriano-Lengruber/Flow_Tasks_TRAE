import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { JwtService } from '@nestjs/jwt';

describe('Pagination Integration Tests', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let jwtService: JwtService;
  let authToken: string;
  let testUser: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    projectRepository = moduleFixture.get<Repository<Project>>(getRepositoryToken(Project));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Criar usuário de teste
    testUser = userRepository.create({
      email: `pagination-test-${Date.now()}@example.com`,
      password: 'hashedpassword',
      name: 'Pagination Test User',
    });
    await userRepository.save(testUser);

    // Gerar token JWT
    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });
  });

  afterAll(async () => {
    // Limpar dados de teste
    await projectRepository.delete({ owner: { id: testUser.id } });
    await userRepository.delete(testUser.id);
    await app.close();
  });

  describe('Projects Pagination', () => {
    beforeEach(async () => {
      // Criar projetos de teste
      const projects = [];
      for (let i = 1; i <= 25; i++) {
        projects.push(
          projectRepository.create({
            name: `Pagination Project ${i}`,
            description: `Description ${i}`,
            owner: testUser,
          })
        );
      }
      await projectRepository.save(projects);
    });

    afterEach(async () => {
      // Limpar projetos após cada teste
      await projectRepository.delete({ owner: { id: testUser.id } });
    });

    it('should return paginated projects with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            query {
              projectsPaginated {
                items {
                  id
                  name
                  description
                }
                total
                hasMore
                offset
                limit
              }
            }
          `,
        })
        .expect(200);

      expect(response.body.data.projectsPaginated).toBeDefined();
      expect(response.body.data.projectsPaginated.items.length).toBeLessThanOrEqual(20); // Default limit
      expect(response.body.data.projectsPaginated.total).toBeGreaterThanOrEqual(25);
      expect(response.body.data.projectsPaginated.offset).toBe(0);
      expect(response.body.data.projectsPaginated.limit).toBe(20);
    });

    it('should return paginated projects with custom pagination', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            query {
              projectsPaginated(pagination: { offset: 10, limit: 5 }) {
                items {
                  id
                  name
                }
                total
                hasMore
                offset
                limit
              }
            }
          `,
        })
        .expect(200);

      expect(response.body.data.projectsPaginated).toBeDefined();
      expect(response.body.data.projectsPaginated.items.length).toBeLessThanOrEqual(5);
      expect(response.body.data.projectsPaginated.total).toBeGreaterThanOrEqual(25);
      expect(response.body.data.projectsPaginated.offset).toBe(10);
      expect(response.body.data.projectsPaginated.limit).toBe(5);
    });

    it('should return pagination structure correctly', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            query {
              projectsPaginated(pagination: { offset: 0, limit: 5 }) {
                items {
                  id
                  name
                }
                total
                hasMore
                offset
                limit
              }
            }
          `,
        })
        .expect(200);

      expect(response.body.data.projectsPaginated).toBeDefined();
      expect(response.body.data.projectsPaginated.items.length).toBeLessThanOrEqual(5);
      expect(response.body.data.projectsPaginated.total).toBeGreaterThanOrEqual(25);
      expect(response.body.data.projectsPaginated.offset).toBe(0);
      expect(response.body.data.projectsPaginated.limit).toBe(5);
      expect(typeof response.body.data.projectsPaginated.hasMore).toBe('boolean');
    });
  });
});