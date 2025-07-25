import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import config, { Config } from './config';
import { structuredLogger } from './utils/logger';
import { createHealthMonitor } from './utils/healthMonitoring';
import { createRedisCache } from './utils/redisCache';
import { createMemoryCache } from './utils/memoryCache';
import {
  createAuditService,
  createNotificationService,
  createBackupService,
  createPerformanceAnalyzer,
  createIntegrationService,
  createReportService,
  createWorkflowService
} from './services';
import { securityMiddleware } from './middleware/security';
import { auditMiddleware } from './middleware/auditMiddleware';
import { rateLimitingMiddleware } from './middleware/rateLimiting';
import { createMetricsService } from './services/metricsService';
import apiRoutes from './routes';

// Interfaces
interface AppServices {
  prisma: PrismaClient;
  cache: any;
  healthMonitor: any;
  auditService: any;
  notificationService: any;
  backupService: any;
  performanceAnalyzer: any;
  integrationService: any;
  reportService: any;
  workflowService: any;
  metricsService: any;
}

// Interface removida - usando configuração importada do arquivo config

// Classe principal da aplicação
class Application {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private services: AppServices;
  private logger = structuredLogger.child({ service: 'app' });
  private isShuttingDown = false;
  
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
        cors: {
          origin: config.server.cors.origin,
          credentials: config.server.cors.credentials
        }
    });
  }
  
  // Inicializar aplicação
  async initialize(): Promise<void> {
    try {
      this.logger.info('Starting application initialization...');
      
      // Inicializar serviços
      await this.initializeServices();
      
      // Configurar middlewares
      this.setupMiddlewares();
      
      // Configurar rotas
      this.setupRoutes();
      
      // Configurar tratamento de erros
      this.setupErrorHandling();
      
      // Configurar graceful shutdown
      this.setupGracefulShutdown();
      
      this.logger.info('Application initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize application', error as Error);
      throw error;
    }
  }
  
  // Inicializar serviços
  private async initializeServices(): Promise<void> {
    this.logger.info('Initializing services...');
    
    // Inicializar Prisma
    const prisma = new PrismaClient({
      log: config.environment.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'pretty'
    });
    
    await prisma.$connect();
    this.logger.info('Database connected');
    
    // Inicializar Cache (Redis com fallback para memória)
    let cache;
    const useRedis = false; // Temporariamente desabilitado para depuração
    
    if (useRedis) {
      try {
        cache = createRedisCache({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db,
          keyPrefix: config.redis.keyPrefix
        });
        
        // Tentar conectar com timeout
        await Promise.race([
          cache.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
          )
        ]);
        this.logger.info('Redis cache connected');
      } catch (error) {
        this.logger.warn('Redis connection failed, using memory cache as fallback:', error.message);
        // Desconectar Redis se ainda estiver tentando
        if (cache && cache.disconnect) {
          try {
            await cache.disconnect();
          } catch (e) {
            // Ignorar erros de desconexão
          }
        }
        cache = createMemoryCache(300); // TTL padrão de 5 minutos
        await cache.connect();
        this.logger.info('Memory cache initialized');
      }
    } else {
      this.logger.info('Redis disabled, using memory cache');
      cache = createMemoryCache(300); // TTL padrão de 5 minutos
      await cache.connect();
      this.logger.info('Memory cache initialized');
    }
    
    // Inicializar Health Monitor
    const healthMonitor = createHealthMonitor(prisma);
    this.logger.info('Health monitor initialized');
    
    // Inicializar Audit Service
    const auditService = createAuditService(prisma);
    this.logger.info('Audit service initialized');
    
    // Inicializar Notification Service
    const notificationService = createNotificationService(this.server, prisma);
    this.logger.info('Notification service initialized');
    
    // Inicializar Backup Service
    const backupService = createBackupService(prisma);
    this.logger.info('Backup service initialized');
    
    // Inicializar Performance Analyzer
    const performanceAnalyzer = createPerformanceAnalyzer(prisma);
    this.logger.info('Performance analyzer initialized');
    
    // Inicializar Integration Service
    const integrationService = createIntegrationService(prisma);
    this.logger.info('Integration service initialized');
    
    // Inicializar Report Service
    const reportService = createReportService(prisma);
    this.logger.info('Report service initialized');
    
    // Inicializar Workflow Service
    const workflowService = createWorkflowService(prisma);
    this.logger.info('Workflow service initialized');
    
    // Inicializar Metrics Service
    const metricsService = createMetricsService(prisma);
    await metricsService.initialize();
    this.logger.info('Metrics service initialized');
    
    this.services = {
      prisma,
      cache,
      healthMonitor,
      auditService,
      notificationService,
      backupService,
      performanceAnalyzer,
      integrationService,
      reportService,
      workflowService,
      metricsService
    };
    
    this.logger.info('All services initialized successfully');
  }
  
  // Configurar middlewares
  private setupMiddlewares(): void {
    this.logger.info('Setting up middlewares...');
    
    // Middleware de segurança
    if (config.security.enableHelmet) {
      this.app.use(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
          }
        },
        crossOriginEmbedderPolicy: false
      }));
    }
    
    // CORS
    this.app.use(cors({
      origin: config.server.cors.origin,
      credentials: config.server.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));
    
    // Compressão
    this.app.use(compression());
    
    // Parsing de JSON
    this.app.use(express.json({ 
      limit: config.upload.maxFileSize,
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      }
    }));
    
    // Parsing de URL encoded
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: config.upload.maxFileSize 
    }));
    
    // Middleware de logging de requisições
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        this.logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      });
      
      next();
    });
    
    // Middleware de segurança personalizado
    this.app.use(securityMiddleware);
    
    // Middleware de rate limiting
    this.app.use(rateLimitingMiddleware);
    
    // Middleware de auditoria
    this.app.use(auditMiddleware);
    
    // Middleware para adicionar serviços ao request
    this.app.use((req: any, res, next) => {
      req.services = this.services;
      next();
    });
    
    this.logger.info('Middlewares configured successfully');
  }
  
  // Configurar rotas
  private setupRoutes(): void {
    this.logger.info('Setting up routes...');
    
    // Rota de health check
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.services.healthMonitor.getHealth();
        res.status(health.status === 'healthy' ? 200 : 503).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: (error as Error).message
        });
      }
    });
    
    // Rota de readiness
    this.app.get('/ready', async (req, res) => {
      try {
        const readiness = await this.services.healthMonitor.getReadiness();
        res.status(readiness.ready ? 200 : 503).json(readiness);
      } catch (error) {
        res.status(503).json({
          ready: false,
          error: (error as Error).message
        });
      }
    });
    
    // Rota de liveness
    this.app.get('/live', async (req, res) => {
      try {
        const liveness = await this.services.healthMonitor.getLiveness();
        res.status(liveness.alive ? 200 : 503).json(liveness);
      } catch (error) {
        res.status(503).json({
          alive: false,
          error: (error as Error).message
        });
      }
    });
    
    // Rota de métricas
    this.app.get('/metrics', async (req, res) => {
      try {
        const metrics = await this.services.performanceAnalyzer.getMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({
          error: (error as Error).message
        });
      }
    });
    
    // Rota de informações da aplicação
    this.app.get('/info', (req, res) => {
      res.json({
        name: 'Task Manager API',
        version: config.environment.version,
        environment: config.environment.nodeEnv,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        node: process.version,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      });
    });
    
    // Rotas da API
    this.app.use('/api', apiRoutes);
    
    // TODO: Implementar rotas específicas dos módulos restantes
    // this.app.use('/api/auth', authRoutes);
    // this.app.use('/api/users', userRoutes);
    // this.app.use('/api/projects', projectRoutes);
    // this.app.use('/api/tasks', taskRoutes);
    // this.app.use('/api/reports', reportRoutes);
    // this.app.use('/api/workflows', workflowRoutes);
    // this.app.use('/api/integrations', integrationRoutes);
    
    // Rota para webhooks
    this.app.post('/webhooks/:integrationId', async (req: any, res) => {
      try {
        const { integrationId } = req.params;
        const signature = req.get('X-Hub-Signature-256') || req.get('X-Signature');
        
        await this.services.integrationService.processWebhook(
          integrationId,
          req.body,
          signature
        );
        
        res.status(200).json({ success: true });
      } catch (error) {
        this.logger.error('Webhook processing failed', error as Error, {
          integrationId: req.params.integrationId
        });
        res.status(400).json({
          error: (error as Error).message
        });
      }
    });
    
    // Rota 404
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
      });
    });
    
    this.logger.info('Routes configured successfully');
  }
  
  // Configurar tratamento de erros
  private setupErrorHandling(): void {
    // Tratamento de erros não capturados
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', error);
      this.gracefulShutdown('SIGTERM');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection', new Error(String(reason)), {
        promise: promise.toString()
      });
    });
    
    // Middleware de tratamento de erros
    this.app.use((error: any, req: any, res: any, next: any) => {
      this.logger.error('Express Error', error, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Não expor detalhes do erro em produção
      const isDevelopment = config.environment.nodeEnv === 'development';
      
      res.status(error.status || 500).json({
        error: isDevelopment ? error.message : 'Internal Server Error',
        ...(isDevelopment && { stack: error.stack })
      });
    });
    
    this.logger.info('Error handling configured');
  }
  
  // Configurar graceful shutdown
  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        this.gracefulShutdown(signal);
      });
    });
    
    this.logger.info('Graceful shutdown configured');
  }
  
  // Graceful shutdown
  private async gracefulShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    
    this.logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    try {
      // Parar de aceitar novas conexões
      this.server.close(() => {
        this.logger.info('HTTP server closed');
      });
      
      // Fechar Socket.IO
      this.io.close(() => {
        this.logger.info('Socket.IO server closed');
      });
      
      // Finalizar serviços
      if (this.services) {
        await this.services.workflowService?.shutdown();
        await this.services.reportService?.shutdown();
        await this.services.integrationService?.shutdown();
        await this.services.performanceAnalyzer?.shutdown();
        await this.services.backupService?.shutdown();
        await this.services.notificationService?.shutdown();
        await this.services.auditService?.shutdown();
        await this.services.healthMonitor?.shutdown();
        
        // Fechar conexões
        await this.services.cache?.disconnect();
        await this.services.prisma?.$disconnect();
        
        this.logger.info('All services shut down successfully');
      }
      
      this.logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during graceful shutdown', error as Error);
      process.exit(1);
    }
  }
  
  // Iniciar servidor
  async start(): Promise<void> {
    try {
      await this.initialize();
      
      const port = config.server.port;
      const host = config.server.host;
      
      this.server.listen(port, host, () => {
        this.logger.info(`Server started successfully`, {
          port,
          host,
          environment: config.environment,
          nodeVersion: process.version,
          pid: process.pid
        });
        
        // Log de URLs importantes
        const baseUrl = `http://${host}:${port}`;
        this.logger.info('Available endpoints:', {
          health: `${baseUrl}/health`,
          ready: `${baseUrl}/ready`,
          live: `${baseUrl}/live`,
          metrics: `${baseUrl}/metrics`,
          info: `${baseUrl}/info`
        });
      });
    } catch (error) {
      this.logger.error('Failed to start server', error as Error);
      process.exit(1);
    }
  }
  
  // Obter instância da aplicação Express
  getApp(): express.Application {
    return this.app;
  }
  
  // Obter instância do servidor HTTP
  getServer(): any {
    return this.server;
  }
  
  // Obter instância do Socket.IO
  getIO(): SocketIOServer {
    return this.io;
  }
  
  // Obter serviços
  getServices(): AppServices {
    return this.services;
  }
}

// Função para criar e iniciar a aplicação
export async function createApp(): Promise<Application> {
  const app = new Application();
  return app;
}

// Iniciar aplicação se executado diretamente
if (require.main === module) {
  createApp()
    .then(app => app.start())
    .catch(error => {
      console.error('Failed to start application:', error);
      process.exit(1);
    });
}

export { Application, AppServices, Config };
export default Application;