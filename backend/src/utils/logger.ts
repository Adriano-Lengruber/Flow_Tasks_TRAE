import winston from 'winston';
import { Request, Response } from 'express';
import { performance } from 'perf_hooks';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Interface para contexto de log
interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  operation?: string;
  duration?: number;
  service?: string;
  metadata?: Record<string, any>;
}

// Interface para métricas de performance
interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

// Configuração do Winston
const createLogger = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
  
  // Formato personalizado para logs
  const customFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        hostname: os.hostname(),
        pid: process.pid,
        ...meta
      };
      
      return JSON.stringify(logEntry);
    })
  );
  
  // Formato para desenvolvimento
  const devFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
      format: 'HH:mm:ss.SSS'
    }),
    winston.format.printf(({ timestamp, level, message, requestId, operation, duration, ...meta }) => {
      let logMessage = `${timestamp} [${level}]`;
      
      if (requestId && typeof requestId === 'string') {
        logMessage += ` [${requestId.substring(0, 8)}]`;
      }
      
      if (operation) {
        logMessage += ` [${operation}]`;
      }
      
      logMessage += ` ${message}`;
      
      if (duration !== undefined) {
        logMessage += ` (${duration}ms)`;
      }
      
      if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta)}`;
      }
      
      return logMessage;
    })
  );
  
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isDevelopment ? devFormat : customFormat
    })
  ];
  
  // Adicionar transporte de arquivo em produção
  if (!isDevelopment) {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: customFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: customFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10
      })
    );
  }
  
  return winston.createLogger({
    level: logLevel,
    format: customFormat,
    transports,
    exitOnError: false
  });
};

// Instância do logger
const logger = createLogger();

// Classe para logging estruturado
class StructuredLogger {
  private context: LogContext = {};
  
  constructor(context: LogContext = {}) {
    this.context = context;
  }
  
  // Criar novo logger com contexto
  child(context: LogContext): StructuredLogger {
    return new StructuredLogger({ ...this.context, ...context });
  }
  
  // Métodos de logging
  debug(message: string, meta: Record<string, any> = {}) {
    logger.debug(message, { ...this.context, ...meta });
  }
  
  info(message: string, meta: Record<string, any> = {}) {
    logger.info(message, { ...this.context, ...meta });
  }
  
  warn(message: string, meta: Record<string, any> = {}) {
    logger.warn(message, { ...this.context, ...meta });
  }
  
  error(message: string, error?: Error, meta: Record<string, any> = {}) {
    const errorMeta = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : {};
    
    logger.error(message, { ...this.context, ...errorMeta, ...meta });
  }
  
  // Log de performance
  performance(operation: string, duration: number, meta: Record<string, any> = {}) {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      performance: true,
      ...meta
    });
  }
  
  // Log de auditoria
  audit(action: string, resource: string, meta: Record<string, any> = {}) {
    this.info(`Audit: ${action} on ${resource}`, {
      audit: true,
      action,
      resource,
      ...meta
    });
  }
  
  // Log de segurança
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', meta: Record<string, any> = {}) {
    const logMethod = severity === 'critical' || severity === 'high' ? 'error' : 
                     severity === 'medium' ? 'warn' : 'info';
    
    logger[logMethod](`Security: ${event}`, {
      ...this.context,
      security: true,
      event,
      severity,
      ...meta
    });
  }
  
  // Log de métricas de negócio
  business(metric: string, value: number, unit: string, meta: Record<string, any> = {}) {
    this.info(`Business Metric: ${metric}`, {
      business: true,
      metric,
      value,
      unit,
      ...meta
    });
  }
}

// Middleware para logging de requisições
class RequestLogger {
  private performanceMetrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000;
  
  // Middleware principal
  middleware() {
    return (req: Request, res: Response, next: Function) => {
      const requestId = uuidv4();
      const startTime = performance.now();
      const startCpuUsage = process.cpuUsage();
      
      // Adicionar requestId ao request
      (req as any).requestId = requestId;
      
      // Criar logger para esta requisição
      const requestLogger = new StructuredLogger({
        requestId,
        operation: `${req.method} ${req.path}`
      });
      
      // Adicionar logger ao request
      (req as any).logger = requestLogger;
      
      // Log de início da requisição
      requestLogger.info('Request started', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: this.getClientIP(req),
        headers: this.sanitizeHeaders(req.headers)
      });
      
      // Interceptar resposta
      const originalSend = res.send;
      res.send = function(body) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        const endCpuUsage = process.cpuUsage(startCpuUsage);
        const memoryUsage = process.memoryUsage();
        
        // Log de fim da requisição
        requestLogger.info('Request completed', {
          statusCode: res.statusCode,
          duration,
          responseSize: Buffer.byteLength(body || '', 'utf8'),
          memoryUsage: {
            rss: memoryUsage.rss,
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal
          },
          cpuUsage: {
            user: endCpuUsage.user,
            system: endCpuUsage.system
          }
        });
        
        // Armazenar métricas de performance
        const metrics: PerformanceMetrics = {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          timestamp: Date.now(),
          userAgent: req.get('User-Agent'),
          ip: this.getClientIP(req),
          memoryUsage,
          cpuUsage: endCpuUsage
        };
        
        this.addPerformanceMetric(metrics);
        
        // Log de performance se for lenta
        if (duration > 1000) {
          requestLogger.warn('Slow request detected', {
            duration,
            threshold: 1000
          });
        }
        
        return originalSend.call(this, body);
      }.bind(this);
      
      next();
    };
  }
  
  // Obter IP do cliente
  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }
  
  // Sanitizar headers sensíveis
  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
  
  // Adicionar métrica de performance
  private addPerformanceMetric(metric: PerformanceMetrics) {
    this.performanceMetrics.push(metric);
    
    // Manter apenas as últimas métricas
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetrics);
    }
  }
  
  // Obter métricas de performance
  getPerformanceMetrics(limit = 100): PerformanceMetrics[] {
    return this.performanceMetrics.slice(-limit);
  }
  
  // Obter estatísticas de performance
  getPerformanceStats() {
    if (this.performanceMetrics.length === 0) {
      return null;
    }
    
    const durations = this.performanceMetrics.map(m => m.duration);
    const statusCodes = this.performanceMetrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    return {
      totalRequests: this.performanceMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: this.percentile(durations, 0.95),
      p99Duration: this.percentile(durations, 0.99),
      statusCodes,
      slowRequests: this.performanceMetrics.filter(m => m.duration > 1000).length
    };
  }
  
  // Calcular percentil
  private percentile(arr: number[], p: number): number {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
  
  // Middleware para log de erros
  errorMiddleware() {
    return (error: Error, req: Request, res: Response, next: Function) => {
      const requestLogger = (req as any).logger || new StructuredLogger();
      
      requestLogger.error('Request error', error, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: this.getClientIP(req)
      });
      
      next(error);
    };
  }
}

// Função para criar timer de performance
function createTimer(operation: string, logger?: StructuredLogger) {
  const startTime = performance.now();
  
  return {
    end: (meta: Record<string, any> = {}) => {
      const duration = Math.round(performance.now() - startTime);
      
      if (logger) {
        logger.performance(operation, duration, meta);
      }
      
      return duration;
    }
  };
}

// Decorador para logging automático de métodos
function LogMethod(operation?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyName}`;
    
    descriptor.value = async function (...args: any[]) {
      const logger = new StructuredLogger({ operation: operationName });
      const timer = createTimer(operationName, logger);
      
      try {
        logger.debug(`Starting ${operationName}`, { args: args.length });
        
        const result = await method.apply(this, args);
        
        timer.end({ success: true });
        logger.debug(`Completed ${operationName}`);
        
        return result;
      } catch (error) {
        timer.end({ success: false });
        logger.error(`Failed ${operationName}`, error as Error);
        throw error;
      }
    };
    
    return descriptor;
  };
}

// Instâncias globais
const structuredLogger = new StructuredLogger();
const requestLogger = new RequestLogger();

// Exports
export {
  StructuredLogger,
  RequestLogger,
  LogContext,
  PerformanceMetrics,
  createTimer,
  LogMethod,
  structuredLogger,
  requestLogger
};

export default structuredLogger;