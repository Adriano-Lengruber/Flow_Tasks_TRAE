import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

// Carregar variáveis de ambiente
dotenv.config();

// Schema de validação para configuração
const configSchema = z.object({
  // Configurações do servidor
  server: z.object({
    port: z.number().min(1).max(65535).default(4000),
    host: z.string().default('localhost'),
    cors: z.object({
      origin: z.union([z.string(), z.array(z.string()), z.boolean()]).default(true),
      credentials: z.boolean().default(true)
    })
  }),
  
  // Configurações do banco de dados
  database: z.object({
    url: z.string().url(),
    maxConnections: z.number().min(1).default(10),
    connectionTimeout: z.number().min(1000).default(30000),
    queryTimeout: z.number().min(1000).default(10000),
    logQueries: z.boolean().default(false),
    slowQueryThreshold: z.number().min(100).default(1000)
  }),
  
  // Configurações do Redis
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().min(1).max(65535).default(6379),
    password: z.string().optional(),
    db: z.number().min(0).default(0),
    maxRetriesPerRequest: z.number().min(1).default(3),
    retryDelayOnFailover: z.number().min(100).default(100),
    enableOfflineQueue: z.boolean().default(false),
    lazyConnect: z.boolean().default(true),
    keepAlive: z.number().min(1000).default(30000),
    family: z.number().min(4).max(6).default(4),
    keyPrefix: z.string().default('trae:'),
    compression: z.boolean().default(true)
  }),
  
  // Configurações de autenticação
  auth: z.object({
    jwtSecret: z.string().min(32),
    jwtExpiresIn: z.string().default('7d'),
    refreshTokenExpiresIn: z.string().default('30d'),
    bcryptRounds: z.number().min(10).max(15).default(12),
    sessionTimeout: z.number().min(300000).default(3600000), // 1 hora
    maxLoginAttempts: z.number().min(3).default(5),
    lockoutDuration: z.number().min(300000).default(900000), // 15 minutos
    passwordMinLength: z.number().min(8).default(8),
    requirePasswordComplexity: z.boolean().default(true)
  }),
  
  // Configurações de rate limiting
  rateLimit: z.object({
    windowMs: z.number().min(60000).default(900000), // 15 minutos
    maxRequests: z.number().min(1).default(100),
    skipSuccessfulRequests: z.boolean().default(false),
    skipFailedRequests: z.boolean().default(false),
    standardHeaders: z.boolean().default(true),
    legacyHeaders: z.boolean().default(false)
  }),
  
  // Configurações de upload
  upload: z.object({
    maxFileSize: z.number().min(1024).default(10 * 1024 * 1024), // 10MB
    allowedMimeTypes: z.array(z.string()).default([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/json'
    ]),
    uploadDir: z.string().default('./uploads'),
    tempDir: z.string().default('./temp'),
    cleanupInterval: z.number().min(3600000).default(86400000) // 24 horas
  }),
  
  // Configurações de email
  email: z.object({
    provider: z.enum(['smtp', 'sendgrid', 'mailgun']).default('smtp'),
    smtp: z.object({
      host: z.string().optional(),
      port: z.number().min(1).max(65535).optional(),
      secure: z.boolean().default(false),
      auth: z.object({
        user: z.string().optional(),
        pass: z.string().optional()
      }).optional()
    }).optional(),
    from: z.string().email().default('noreply@trae.dev'),
    templates: z.object({
      welcome: z.string().default('welcome'),
      resetPassword: z.string().default('reset-password'),
      emailVerification: z.string().default('email-verification')
    })
  }),
  
  // Configurações de logging
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'simple']).default('json'),
    enableConsole: z.boolean().default(true),
    enableFile: z.boolean().default(false),
    logDir: z.string().default('./logs'),
    maxFileSize: z.number().min(1024).default(10 * 1024 * 1024), // 10MB
    maxFiles: z.number().min(1).default(5),
    enableRequestLogging: z.boolean().default(true),
    enablePerformanceLogging: z.boolean().default(true),
    enableErrorTracking: z.boolean().default(true)
  }),
  
  // Configurações de monitoramento
  monitoring: z.object({
    enableHealthCheck: z.boolean().default(true),
    enableMetrics: z.boolean().default(true),
    metricsInterval: z.number().min(5000).default(30000), // 30 segundos
    enableAPM: z.boolean().default(false),
    apmServiceName: z.string().default('trae-backend'),
    enableTracing: z.boolean().default(false)
  }),
  
  // Configurações de cache
  cache: z.object({
    defaultTTL: z.number().min(60).default(3600), // 1 hora
    maxKeys: z.number().min(100).default(10000),
    enableCompression: z.boolean().default(true),
    enableMetrics: z.boolean().default(true),
    keyPrefix: z.string().default('cache:'),
    strategies: z.object({
      user: z.number().min(60).default(1800), // 30 minutos
      project: z.number().min(60).default(3600), // 1 hora
      task: z.number().min(60).default(900), // 15 minutos
      session: z.number().min(60).default(1800) // 30 minutos
    })
  }),
  
  // Configurações de segurança
  security: z.object({
    enableHelmet: z.boolean().default(true),
    enableCSP: z.boolean().default(true),
    enableHSTS: z.boolean().default(true),
    enableXSSProtection: z.boolean().default(true),
    enableFrameGuard: z.boolean().default(true),
    trustedProxies: z.array(z.string()).default([]),
    encryptionKey: z.string().min(32).optional(),
    enableAuditLog: z.boolean().default(true)
  }),
  
  // Configurações do ambiente
  environment: z.object({
    nodeEnv: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    isDevelopment: z.boolean(),
    isProduction: z.boolean(),
    isTest: z.boolean(),
    version: z.string().default('1.0.0'),
    buildNumber: z.string().optional(),
    deploymentDate: z.string().optional()
  }),
  
  // Configurações de GraphQL
  graphql: z.object({
    introspection: z.boolean().default(true),
    playground: z.boolean().default(true),
    enableTracing: z.boolean().default(false),
    enableCaching: z.boolean().default(true),
    maxQueryDepth: z.number().min(1).default(10),
    maxQueryComplexity: z.number().min(100).default(1000),
    enableQueryWhitelist: z.boolean().default(false),
    enablePersistedQueries: z.boolean().default(false)
  }),
  
  // Configurações de features
  features: z.object({
    enableRegistration: z.boolean().default(true),
    enableEmailVerification: z.boolean().default(false),
    enableTwoFactorAuth: z.boolean().default(false),
    enableSocialLogin: z.boolean().default(false),
    enableFileUpload: z.boolean().default(true),
    enableNotifications: z.boolean().default(true),
    enableAnalytics: z.boolean().default(false),
    enableBetaFeatures: z.boolean().default(false)
  })
});

// Tipo da configuração
type Config = z.infer<typeof configSchema>;

// Função para carregar configuração
function loadConfig(): Config {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'staging' | 'production';
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';
  
  // Configuração base
  const baseConfig = {
    server: {
      port: parseInt(process.env.PORT || '4000', 10),
      host: process.env.HOST || 'localhost',
      cors: {
        origin: process.env.CORS_ORIGIN ? 
          (process.env.CORS_ORIGIN.includes(',') ? 
            process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : 
            process.env.CORS_ORIGIN
          ) : true,
        credentials: process.env.CORS_CREDENTIALS !== 'false'
      }
    },
    
    database: {
      url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/trae',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
      queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '10000', 10),
      logQueries: process.env.DB_LOG_QUERIES === 'true' || isDevelopment,
      slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000', 10)
    },
    
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
      enableOfflineQueue: process.env.REDIS_OFFLINE_QUEUE === 'true',
      lazyConnect: process.env.REDIS_LAZY_CONNECT !== 'false',
      keepAlive: parseInt(process.env.REDIS_KEEP_ALIVE || '30000', 10),
      family: parseInt(process.env.REDIS_FAMILY || '4', 10),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'trae:',
      compression: process.env.REDIS_COMPRESSION !== 'false'
    },
    
    auth: {
      jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000', 10),
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
      lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000', 10),
      passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
      requirePasswordComplexity: process.env.REQUIRE_PASSWORD_COMPLEXITY !== 'false'
    },
    
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
      skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true',
      standardHeaders: process.env.RATE_LIMIT_STANDARD_HEADERS !== 'false',
      legacyHeaders: process.env.RATE_LIMIT_LEGACY_HEADERS === 'true'
    },
    
    upload: {
      maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '10485760', 10), // 10MB
      allowedMimeTypes: process.env.UPLOAD_ALLOWED_TYPES ? 
        process.env.UPLOAD_ALLOWED_TYPES.split(',').map(s => s.trim()) : 
        ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/json'],
      uploadDir: process.env.UPLOAD_DIR || './uploads',
      tempDir: process.env.TEMP_DIR || './temp',
      cleanupInterval: parseInt(process.env.UPLOAD_CLEANUP_INTERVAL || '86400000', 10)
    },
    
    email: {
      provider: (process.env.EMAIL_PROVIDER || 'smtp') as 'smtp' | 'sendgrid' | 'mailgun',
      smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      from: process.env.EMAIL_FROM || 'noreply@trae.dev',
      templates: {
        welcome: process.env.EMAIL_TEMPLATE_WELCOME || 'welcome',
        resetPassword: process.env.EMAIL_TEMPLATE_RESET || 'reset-password',
        emailVerification: process.env.EMAIL_TEMPLATE_VERIFY || 'email-verification'
      }
    },
    
    logging: {
      level: (process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info')) as 'error' | 'warn' | 'info' | 'debug',
      format: (process.env.LOG_FORMAT || 'json') as 'json' | 'simple',
      enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
      enableFile: process.env.LOG_ENABLE_FILE === 'true' || isProduction,
      logDir: process.env.LOG_DIR || './logs',
      maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760', 10),
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
      enableRequestLogging: process.env.LOG_ENABLE_REQUESTS !== 'false',
      enablePerformanceLogging: process.env.LOG_ENABLE_PERFORMANCE !== 'false',
      enableErrorTracking: process.env.LOG_ENABLE_ERROR_TRACKING !== 'false'
    },
    
    monitoring: {
      enableHealthCheck: process.env.MONITORING_HEALTH_CHECK !== 'false',
      enableMetrics: process.env.MONITORING_METRICS !== 'false',
      metricsInterval: parseInt(process.env.MONITORING_METRICS_INTERVAL || '30000', 10),
      enableAPM: process.env.MONITORING_APM === 'true',
      apmServiceName: process.env.APM_SERVICE_NAME || 'trae-backend',
      enableTracing: process.env.MONITORING_TRACING === 'true'
    },
    
    cache: {
      defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '3600', 10),
      maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '10000', 10),
      enableCompression: process.env.CACHE_COMPRESSION !== 'false',
      enableMetrics: process.env.CACHE_METRICS !== 'false',
      keyPrefix: process.env.CACHE_KEY_PREFIX || 'cache:',
      strategies: {
        user: parseInt(process.env.CACHE_USER_TTL || '1800', 10),
        project: parseInt(process.env.CACHE_PROJECT_TTL || '3600', 10),
        task: parseInt(process.env.CACHE_TASK_TTL || '900', 10),
        session: parseInt(process.env.CACHE_SESSION_TTL || '1800', 10)
      }
    },
    
    security: {
      enableHelmet: process.env.SECURITY_HELMET !== 'false',
      enableCSP: process.env.SECURITY_CSP !== 'false',
      enableHSTS: process.env.SECURITY_HSTS !== 'false' && isProduction,
      enableXSSProtection: process.env.SECURITY_XSS !== 'false',
      enableFrameGuard: process.env.SECURITY_FRAME_GUARD !== 'false',
      trustedProxies: process.env.TRUSTED_PROXIES ? 
        process.env.TRUSTED_PROXIES.split(',').map(s => s.trim()) : [],
      encryptionKey: process.env.ENCRYPTION_KEY,
      enableAuditLog: process.env.SECURITY_AUDIT_LOG !== 'false'
    },
    
    environment: {
      nodeEnv,
      isDevelopment,
      isProduction,
      isTest,
      version: process.env.npm_package_version || '1.0.0',
      buildNumber: process.env.BUILD_NUMBER,
      deploymentDate: process.env.DEPLOYMENT_DATE
    },
    
    graphql: {
      introspection: process.env.GRAPHQL_INTROSPECTION !== 'false' || isDevelopment,
      playground: process.env.GRAPHQL_PLAYGROUND !== 'false' || isDevelopment,
      enableTracing: process.env.GRAPHQL_TRACING === 'true',
      enableCaching: process.env.GRAPHQL_CACHING !== 'false',
      maxQueryDepth: parseInt(process.env.GRAPHQL_MAX_DEPTH || '10', 10),
      maxQueryComplexity: parseInt(process.env.GRAPHQL_MAX_COMPLEXITY || '1000', 10),
      enableQueryWhitelist: process.env.GRAPHQL_QUERY_WHITELIST === 'true',
      enablePersistedQueries: process.env.GRAPHQL_PERSISTED_QUERIES === 'true'
    },
    
    features: {
      enableRegistration: process.env.FEATURE_REGISTRATION !== 'false',
      enableEmailVerification: process.env.FEATURE_EMAIL_VERIFICATION === 'true',
      enableTwoFactorAuth: process.env.FEATURE_2FA === 'true',
      enableSocialLogin: process.env.FEATURE_SOCIAL_LOGIN === 'true',
      enableFileUpload: process.env.FEATURE_FILE_UPLOAD !== 'false',
      enableNotifications: process.env.FEATURE_NOTIFICATIONS !== 'false',
      enableAnalytics: process.env.FEATURE_ANALYTICS === 'true',
      enableBetaFeatures: process.env.FEATURE_BETA === 'true'
    }
  };
  
  // Validar configuração
  try {
    return configSchema.parse(baseConfig);
  } catch (error) {
    console.error('Erro na configuração:', error);
    process.exit(1);
  }
}

// Função para validar configuração
function validateConfig(config: any): config is Config {
  try {
    configSchema.parse(config);
    return true;
  } catch {
    return false;
  }
}

// Função para criar diretórios necessários
function createRequiredDirectories(config: Config) {
  const directories = [
    config.upload.uploadDir,
    config.upload.tempDir,
    config.logging.logDir
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Carregar e exportar configuração
const config = loadConfig();

// Criar diretórios necessários
createRequiredDirectories(config);

// Validações adicionais
if (config.environment.isProduction) {
  // Validações específicas para produção
  if (config.auth.jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
    console.error('ERRO: JWT_SECRET deve ser alterado em produção!');
    process.exit(1);
  }
  
  if (!config.security.encryptionKey) {
    console.warn('AVISO: ENCRYPTION_KEY não definida em produção');
  }
}

// Log da configuração (sem dados sensíveis)
if (config.environment.isDevelopment) {
  console.log('Configuração carregada:', {
    environment: config.environment.nodeEnv,
    server: { port: config.server.port, host: config.server.host },
    database: { url: config.database.url.replace(/:\/\/.*@/, '://***@') },
    redis: { host: config.redis.host, port: config.redis.port },
    features: config.features
  });
}

export { Config, configSchema, validateConfig };
export default config;