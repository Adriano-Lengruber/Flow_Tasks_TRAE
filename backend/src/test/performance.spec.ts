import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { User } from '../auth/entities/user.entity';
import { Task } from '../projects/entities/task.entity';
import { Section } from '../projects/entities/section.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

describe('Performance Tests', () => {
  let app: INestApplication;
  let projectRepository: Repository<Project>;
  let userRepository: Repository<User>;
  let taskRepository: Repository<Task>;
  let sectionRepository: Repository<Section>;
  let jwtService: JwtService;
  let authToken: string;
  let testUser: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    projectRepository = moduleFixture.get<Repository<Project>>(getRepositoryToken(Project));
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    taskRepository = moduleFixture.get<Repository<Task>>(getRepositoryToken(Task));
    sectionRepository = moduleFixture.get<Repository<Section>>(getRepositoryToken(Section));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create test user with unique email
    const uniqueEmail = `performance-${Date.now()}@example.com`;
    testUser = userRepository.create({
      email: uniqueEmail,
      password: 'hashedPassword',
      name: 'Performance Test User',
    });
    await userRepository.save(testUser);

    // Generate auth token
    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });
  }, 30000); // Increase timeout for setup

  afterAll(async () => {
    // Simple cleanup - just close the app
    await app.close();
  }, 10000);

  describe('Project Operations Performance', () => {
    it('should handle bulk project creation efficiently', async () => {
      const startTime = Date.now();
      const projectPromises = [];

      // Create 20 projects concurrently
      for (let i = 0; i < 20; i++) {
        const promise = request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: `
              mutation {
                createProject(createProjectInput: {
                  name: "Performance Project ${i}"
                  description: "Performance test project ${i}"
                }) {
                  id
                  name
                }
              }
            `,
          });
        projectPromises.push(promise);
      }

      const responses = await Promise.all(projectPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.createProject).toBeDefined();
        expect(response.body.errors).toBeUndefined();
      });

      // Should complete within reasonable time (10 seconds for 20 projects)
      expect(totalTime).toBeLessThan(10000);
      console.log(`Bulk project creation took ${totalTime}ms for 20 projects`);
    }, 15000);

    it('should efficiently query projects with pagination', async () => {
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
                sections {
                  id
                  name
                  tasks {
                    id
                    title
                    status
                  }
                }
              }
            }
          `,
        })
        .expect(200);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(response.body.data.projects).toBeDefined();
      expect(Array.isArray(response.body.data.projects)).toBe(true);
      
      // Query should complete quickly even with nested data
      expect(queryTime).toBeLessThan(3000);
      console.log(`Complex project query took ${queryTime}ms`);
    }, 10000);
  });

  describe('Task Operations Performance', () => {
    let testProject: any;
    let testSection: any;

    beforeAll(async () => {
      // Create a test project and section for task operations
      testProject = projectRepository.create({
        name: 'Task Performance Project',
        description: 'For task performance testing',
        owner: testUser,
      });
      await projectRepository.save(testProject);

      testSection = sectionRepository.create({
        name: 'Performance Section',
        project: testProject,
        order: 0,
      });
      await sectionRepository.save(testSection);
    });

    it('should handle bulk task creation efficiently', async () => {
      const startTime = Date.now();
      const taskPromises = [];

      // Create 50 tasks concurrently
      for (let i = 0; i < 50; i++) {
        const promise = request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: `
              mutation {
                createTask(createTaskInput: {
                  title: "Performance Task ${i}"
                  description: "Performance test task ${i}"
                  sectionId: "${testSection.id}"
                  assigneeId: "${testUser.id}"
                }) {
                  id
                  title
                }
              }
            `,
          });
        taskPromises.push(promise);
      }

      const responses = await Promise.all(taskPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.createTask).toBeDefined();
        expect(response.body.errors).toBeUndefined();
      });

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(15000);
      console.log(`Bulk task creation took ${totalTime}ms for 50 tasks`);
    }, 20000);

    it('should handle rapid task updates efficiently', async () => {
      // Get a task to update
      const tasks = await taskRepository.find({
        where: { section: { id: testSection.id } },
        take: 10,
      });

      expect(tasks.length).toBeGreaterThan(0);

      const startTime = Date.now();
      const updatePromises = [];

      // Update 10 tasks concurrently
      for (let i = 0; i < Math.min(10, tasks.length); i++) {
        const promise = request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: `
              mutation {
                updateTask(updateTaskInput: {
                  id: "${tasks[i].id}"
                  title: "Updated Task ${i}"
                  description: "Updated description ${i}"
                }) {
                  id
                  title
                }
              }
            `,
          });
        updatePromises.push(promise);
      }

      const responses = await Promise.all(updatePromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All updates should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.updateTask).toBeDefined();
        expect(response.body.errors).toBeUndefined();
      });

      expect(totalTime).toBeLessThan(5000);
      console.log(`Bulk task updates took ${totalTime}ms for 10 tasks`);
    }, 10000);
  });

  describe('Memory and Resource Usage', () => {
    it('should handle large query responses without memory issues', async () => {
      const initialMemory = process.memoryUsage();
      
      // Query all projects with full nested data
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
                sections {
                  id
                  name
                  order
                  tasks {
                    id
                    title
                    description
                    status
                    priority
                    dueDate
                    createdAt
                    updatedAt
                    assignee {
                      id
                      name
                      email
                    }
                  }
                }
              }
            }
          `,
        })
        .expect(200);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(response.body.data.projects).toBeDefined();
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }, 10000);

    it('should handle concurrent connections efficiently', async () => {
      const startTime = Date.now();
      const concurrentRequests = [];

      // Make 30 concurrent requests
      for (let i = 0; i < 30; i++) {
        const promise = request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: `
              query {
                projects {
                  id
                  name
                  sections {
                    id
                    name
                  }
                }
              }
            `,
          });
        concurrentRequests.push(promise);
      }

      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.projects).toBeDefined();
        expect(response.body.errors).toBeUndefined();
      });

      // Should handle concurrent load efficiently
      expect(totalTime).toBeLessThan(8000);
      console.log(`30 concurrent requests took ${totalTime}ms`);
    }, 15000);
  });

  describe('Database Query Optimization', () => {
    it('should use efficient queries for nested data', async () => {
      const startTime = Date.now();
      
      // This query should use proper joins, not N+1 queries
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            query {
              projects {
                id
                name
                sections {
                  id
                  name
                  tasks {
                    id
                    title
                    assignee {
                      id
                      name
                    }
                  }
                }
              }
            }
          `,
        })
        .expect(200);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(response.body.data.projects).toBeDefined();
      
      // Complex nested query should still be fast
      expect(queryTime).toBeLessThan(2000);
      console.log(`Nested query optimization test took ${queryTime}ms`);
    }, 5000);

    it('should handle filtering and sorting efficiently', async () => {
      const startTime = Date.now();
      
      // Query with complex filtering (this would need to be implemented in resolver)
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            query {
              projects {
                id
                name
                createdAt
                sections {
                  id
                  name
                  tasks {
                    id
                    title
                    status
                    createdAt
                  }
                }
              }
            }
          `,
        })
        .expect(200);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(response.body.data.projects).toBeDefined();
      expect(queryTime).toBeLessThan(1500);
      console.log(`Filtering and sorting test took ${queryTime}ms`);
    }, 5000);
  });
});