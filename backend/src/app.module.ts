import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CommentsModule } from './comments/comments.module';
import { AutomationsModule } from './automations/automations.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true, // Habilita o playground GraphQL para desenvolvimento
      context: ({ req }) => ({ req }), // Passa o objeto de requisição para o contexto GraphQL
      subscriptions: {
        'graphql-ws': true, // Habilita subscriptions GraphQL
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get('DB_TYPE') || 'better-sqlite3';
        
        if (dbType === 'postgres') {
          return {
            type: 'postgres',
            host: configService.get('POSTGRES_HOST'),
            port: +configService.get('POSTGRES_PORT'),
            username: configService.get('POSTGRES_USER'),
            password: configService.get('POSTGRES_PASSWORD'),
            database: configService.get('POSTGRES_DB'),
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true, // Não usar em produção
          };
        } else {
          return {
            type: 'better-sqlite3',
            database: configService.get('DB_NAME') || 'database.sqlite',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: false, // Desabilitado temporariamente para evitar conflitos
          };
        }
      },
    }),
    AuthModule,
    ProjectsModule,
    NotificationsModule,
    CommentsModule,
    AutomationsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
