import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../projects/entities/task.entity';
import { User } from '../auth/entities/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

describe('Projects Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GraphQL Schema Validation', () => {
    it('should have Project type in schema', async () => {
      const schemaQuery = `
        query {
          __type(name: "Project") {
            name
            fields {
              name
              type {
                name
              }
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: schemaQuery,
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.__type).toBeDefined();
      expect(response.body.data.__type.name).toBe('Project');
    });

    it('should have Task type in schema', async () => {
      const schemaQuery = `
        query {
          __type(name: "Task") {
            name
            fields {
              name
              type {
                name
              }
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: schemaQuery,
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.__type).toBeDefined();
      expect(response.body.data.__type.name).toBe('Task');
    });
  });
});