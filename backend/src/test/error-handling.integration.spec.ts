import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { User } from '../auth/entities/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

describe('Error Handling Integration Tests', () => {
  let app: INestApplication;
  let projectRepository: Repository<Project>;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let authToken: string;
  let testUser: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    projectRepository = moduleFixture.get<Repository<Project>>(getRepositoryToken(Project));
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create test user with unique email to avoid database constraints
    const uniqueEmail = `test-${Date.now()}-${Math.random()}@example.com`;
    testUser = userRepository.create({
      email: uniqueEmail,
      password: 'hashedPassword',
      name: 'Test User',
    });
    await userRepository.save(testUser);

    // Generate auth token
    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Errors', () => {
    it('should return 401 when accessing protected route without token', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              projects {
                id
                name
              }
            }
          `,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });

    it('should return 401 when using invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          query: `
            query {
              projects {
                id
                name
              }
            }
          `,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });
  });

  describe('Validation Errors', () => {
    it('should return validation error for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              signup(createUserInput: {
                email: "invalid-email"
                password: "password123"
                name: "Test User"
              }) {
                accessToken
                user {
                  id
                  email
                }
              }
            }
          `,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('email');
    });

    it('should return validation error for short password', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              signup(createUserInput: {
                email: "test2@example.com"
                password: "123"
                name: "Test User"
              }) {
                accessToken
                user {
                  id
                  email
                }
              }
            }
          `,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('password');
    });

    it('should return validation error for empty project name', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProject(createProjectInput: {
                name: ""
                description: "Test Description"
              }) {
                id
                name
              }
            }
          `,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('name');
    });
  });

  describe('Not Found Errors', () => {
    it('should return not found error for non-existent project', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            query {
              project(id: "non-existent-id") {
                id
                name
              }
            }
          `,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('not found');
    });

    it('should return not found error when updating non-existent project', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              updateProject(updateProjectInput: {
                id: "non-existent-id"
                name: "Updated Name"
              }) {
                id
                name
              }
            }
          `,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('not found');
    });
  });

  describe('Permission Errors', () => {
    it('should prevent user from accessing another user\'s project', async () => {
      // Create another user
      const anotherUser = userRepository.create({
        email: 'another@example.com',
        password: 'hashedPassword',
        name: 'Another User',
      });
      await userRepository.save(anotherUser);

      // Create project for another user
      const project = projectRepository.create({
        name: 'Private Project',
        description: 'This is private',
        owner: anotherUser,
      });
      await projectRepository.save(project);

      // Try to access with test user's token
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            query {
              project(id: "${project.id}") {
                id
                name
              }
            }
          `,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('not found');
    });
  });

  describe('Rate Limiting and Performance', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: `
              query {
                projects {
                  id
                  name
                }
              }
            `,
          })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });
    });

    it('should handle large query responses efficiently', async () => {
      // Create multiple projects
      const projects = Array.from({ length: 50 }, (_, i) =>
        projectRepository.create({
          name: `Project ${i}`,
          description: `Description ${i}`,
          owner: testUser,
        })
      );
      await projectRepository.save(projects);

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            query {
              projects {
                id
                name
                description
                createdAt
                updatedAt
              }
            }
          `,
        })
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.data.projects).toHaveLength(50);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});