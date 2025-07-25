import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { body, validationResult, ValidationChain } from 'express-validator';
import crypto from 'crypto';
import { getCache } from '../utils/redisCache';
import { structuredLogger } from '../utils/logger';
import config from '../config';

// Interface para contexto de segurança
interface SecurityContext {
  ip: string;
  userAgent: string;
  requestId: string;
  userId?: string;
  sessionId?: string;
  fingerprint: string;
}

// Interface para evento de segurança
interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'validation' | 'rate_limit' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  context: SecurityContext;
  metadata?: Record<string, any>;
}

// Classe principal de segurança
class SecurityManager {
  private cache = getCache();
  private logger = structuredLogger.child({ service: 'security' });
  
  // Configurar Helmet com configurações personalizadas
  configureHelmet() {
    const helmetConfig = {
      contentSecurityPolicy: config.security.enableCSP ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: config.environment.isProduction ? [] : null
        }
      } : false,
      
      hsts: config.security.enableHSTS ? {
        maxAge: 31536000, // 1 ano
        includeSubDomains: true,
        preload: true
      } : false,
      
      frameguard: config.security.enableFrameGuard ? {
        action: 'deny' as const
      } : false,
      
      xssFilter: config.security.enableXSSProtection,
      
      noSniff: true,
      
      referrerPolicy: false,
      
      permittedCrossDomainPolicies: false,
      
      crossOriginEmbedderPolicy: false // Pode causar problemas com GraphQL Playground
    };
    
    return helmet(helmetConfig);
  }
  
  // Rate limiting adaptativo
  createAdaptiveRateLimit() {
    return rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: async (req: Request) => {
        const context = this.getSecurityContext(req);
        
        // Usuários autenticados têm limite maior
        if (context.userId) {
          return config.rateLimit.maxRequests * 2;
        }
        
        // IPs suspeitos têm limite menor
        const suspiciousScore = await this.getSuspiciousScore(context.ip);
        if (suspiciousScore > 0.7) {
          return Math.floor(config.rateLimit.maxRequests * 0.5);
        }
        
        return config.rateLimit.maxRequests;
      },
      
      keyGenerator: (req: Request) => {
        const context = this.getSecurityContext(req);
        return context.userId || context.ip;
      },
      
      handler: (req: Request, res: Response) => {
        const context = this.getSecurityContext(req);
        
        this.logSecurityEvent({
          type: 'rate_limit',
          severity: 'medium',
          description: 'Rate limit exceeded',
          context,
          metadata: {
            limit: config.rateLimit.maxRequests,
            windowMs: config.rateLimit.windowMs
          }
        });
        
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
        });
      },
      
      standardHeaders: config.rateLimit.standardHeaders,
      legacyHeaders: config.rateLimit.legacyHeaders,
      skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
      skipFailedRequests: config.rateLimit.skipFailedRequests
    });
  }
  
  // Slow down para requisições suspeitas
  createSlowDown(): any {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutos
      delayAfter: 10, // Começar a atrasar após 10 requisições
      delayMs: 500, // Atraso inicial de 500ms
      maxDelayMs: 20000, // Atraso máximo de 20 segundos
      
      keyGenerator: (req: Request) => {
        const context = this.getSecurityContext(req);
        return context.ip;
      },
      
      onLimitReached: (req: Request) => {
        const context = this.getSecurityContext(req);
        
        this.logSecurityEvent({
          type: 'rate_limit',
          severity: 'medium',
          description: 'Slow down limit reached',
          context
        });
      }
    } as any);
  }
  
  // Validação de entrada
  createInputValidation(validations: ValidationChain[]) {
    return [
      ...validations,
      (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
          const context = this.getSecurityContext(req);
          
          this.logSecurityEvent({
            type: 'validation',
            severity: 'low',
            description: 'Input validation failed',
            context,
            metadata: {
              errors: errors.array(),
              body: this.sanitizeRequestBody(req.body)
            }
          });
          
          return res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: errors.array()
          });
        }
        
        next();
      }
    ];
  }
  
  // Detecção de atividade suspeita
  async detectSuspiciousActivity() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const context = this.getSecurityContext(req);
      
      try {
        // Verificar padrões suspeitos
        const suspiciousPatterns = await this.checkSuspiciousPatterns(req, context);
        
        if (suspiciousPatterns.length > 0) {
          await this.handleSuspiciousActivity(suspiciousPatterns, context);
        }
        
        // Atualizar score de suspeita
        await this.updateSuspiciousScore(context.ip, suspiciousPatterns.length);
        
        next();
      } catch (error) {
        this.logger.error('Error in suspicious activity detection', error as Error, { context });
        next(); // Não bloquear em caso de erro
      }
    };
  }
  
  // Verificar padrões suspeitos
  private async checkSuspiciousPatterns(req: Request, context: SecurityContext): Promise<string[]> {
    const patterns: string[] = [];
    
    // 1. Múltiplos User-Agents do mesmo IP
    const userAgentKey = `suspicious:ua:${context.ip}`;
    const userAgents = await this.cache.get(userAgentKey) || [];
    if (!userAgents.includes(context.userAgent)) {
      userAgents.push(context.userAgent);
      await this.cache.set(userAgentKey, userAgents, 3600);
      
      if (userAgents.length > 5) {
        patterns.push('multiple_user_agents');
      }
    }
    
    // 2. Requisições muito rápidas
    const requestKey = `suspicious:req:${context.ip}`;
    const lastRequest = await this.cache.get(requestKey);
    const now = Date.now();
    
    if (lastRequest && (now - lastRequest) < 100) { // Menos de 100ms
      patterns.push('rapid_requests');
    }
    
    await this.cache.set(requestKey, now, 60);
    
    // 3. Tentativas de SQL Injection
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
      /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i
    ];
    
    const checkSql = (value: string) => {
      return sqlPatterns.some(pattern => pattern.test(value));
    };
    
    if (req.query && Object.values(req.query).some(val => 
      typeof val === 'string' && checkSql(val))) {
      patterns.push('sql_injection_attempt');
    }
    
    if (req.body && typeof req.body === 'object') {
      const bodyStr = JSON.stringify(req.body);
      if (checkSql(bodyStr)) {
        patterns.push('sql_injection_attempt');
      }
    }
    
    // 4. Tentativas de XSS
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];
    
    const checkXss = (value: string) => {
      return xssPatterns.some(pattern => pattern.test(value));
    };
    
    if (req.query && Object.values(req.query).some(val => 
      typeof val === 'string' && checkXss(val))) {
      patterns.push('xss_attempt');
    }
    
    // 5. Tentativas de Path Traversal
    const pathTraversalPattern = /(\.\.\/)|(\.\.\\)/;
    const url = req.url;
    
    if (pathTraversalPattern.test(url)) {
      patterns.push('path_traversal_attempt');
    }
    
    // 6. Headers suspeitos
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip'];
    const forwardedIps = suspiciousHeaders
      .map(header => req.headers[header])
      .filter(Boolean)
      .flatMap(header => typeof header === 'string' ? header.split(',') : [])
      .map(ip => ip.trim());
    
    if (forwardedIps.length > 3) {
      patterns.push('suspicious_forwarded_headers');
    }
    
    return patterns;
  }
  
  // Lidar com atividade suspeita
  private async handleSuspiciousActivity(patterns: string[], context: SecurityContext) {
    const severity = this.calculateSeverity(patterns);
    
    this.logSecurityEvent({
      type: 'suspicious_activity',
      severity,
      description: `Suspicious patterns detected: ${patterns.join(', ')}`,
      context,
      metadata: { patterns }
    });
    
    // Aumentar score de suspeita
    await this.incrementSuspiciousScore(context.ip, patterns.length);
    
    // Bloquear temporariamente se muito suspeito
    if (severity === 'critical') {
      await this.temporaryBlock(context.ip, 3600); // 1 hora
    }
  }
  
  // Calcular severidade baseada nos padrões
  private calculateSeverity(patterns: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalPatterns = ['sql_injection_attempt', 'xss_attempt', 'path_traversal_attempt'];
    const highPatterns = ['rapid_requests', 'suspicious_forwarded_headers'];
    
    if (patterns.some(p => criticalPatterns.includes(p))) {
      return 'critical';
    }
    
    if (patterns.some(p => highPatterns.includes(p)) || patterns.length > 3) {
      return 'high';
    }
    
    if (patterns.length > 1) {
      return 'medium';
    }
    
    return 'low';
  }
  
  // Obter contexto de segurança
  private getSecurityContext(req: Request): SecurityContext {
    const ip = this.getClientIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';
    const requestId = (req as any).requestId || 'unknown';
    const userId = (req as any).user?.id;
    const sessionId = (req as any).sessionId;
    
    // Criar fingerprint único
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${ip}:${userAgent}:${req.headers.accept || ''}:${req.headers['accept-language'] || ''}`)
      .digest('hex')
      .substring(0, 16);
    
    return {
      ip,
      userAgent,
      requestId,
      userId,
      sessionId,
      fingerprint
    };
  }
  
  // Obter IP do cliente
  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           'unknown';
  }
  
  // Sanitizar corpo da requisição para logs
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }
    
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...body };
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
  
  // Obter score de suspeita
  private async getSuspiciousScore(ip: string): Promise<number> {
    const score = await this.cache.get(`suspicious:score:${ip}`);
    return score || 0;
  }
  
  // Atualizar score de suspeita
  private async updateSuspiciousScore(ip: string, increment: number) {
    const key = `suspicious:score:${ip}`;
    const currentScore = await this.getSuspiciousScore(ip);
    const newScore = Math.min(currentScore + (increment * 0.1), 1);
    
    await this.cache.set(key, newScore, 3600); // 1 hora
  }
  
  // Incrementar score de suspeita
  private async incrementSuspiciousScore(ip: string, increment: number) {
    const key = `suspicious:score:${ip}`;
    const currentScore = await this.getSuspiciousScore(ip);
    const newScore = Math.min(currentScore + (increment * 0.2), 1);
    
    await this.cache.set(key, newScore, 7200); // 2 horas
  }
  
  // Bloquear temporariamente
  private async temporaryBlock(ip: string, duration: number) {
    const key = `blocked:${ip}`;
    await this.cache.set(key, true, duration);
    
    this.logger.security('IP temporarily blocked', 'high', {
      ip,
      duration,
      reason: 'suspicious_activity'
    });
  }
  
  // Verificar se IP está bloqueado
  async isBlocked(ip: string): Promise<boolean> {
    const blocked = await this.cache.get(`blocked:${ip}`);
    return !!blocked;
  }
  
  // Middleware para verificar bloqueio
  checkBlocked() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = this.getClientIP(req);
      
      if (await this.isBlocked(ip)) {
        this.logSecurityEvent({
          type: 'authentication',
          severity: 'high',
          description: 'Blocked IP attempted access',
          context: this.getSecurityContext(req)
        });
        
        return res.status(403).json({
          error: 'Access Denied',
          message: 'Your IP has been temporarily blocked due to suspicious activity'
        });
      }
      
      next();
    };
  }
  
  // Log de evento de segurança
  private logSecurityEvent(event: SecurityEvent) {
    this.logger.security(event.description, event.severity, {
      type: event.type,
      context: event.context,
      metadata: event.metadata
    });
  }
  
  // Validações comuns
  static commonValidations = {
    email: body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format'),
    
    password: body('password')
      .isLength({ min: config.auth.passwordMinLength })
      .withMessage(`Password must be at least ${config.auth.passwordMinLength} characters`)
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    
    name: body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces'),
    
    id: body('id')
      .isUUID()
      .withMessage('Invalid ID format'),
    
    title: body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    
    description: body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters')
  };
}

// Singleton instance
const securityManager = new SecurityManager();

// Middleware function
export const securityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar se IP está bloqueado
    const ip = securityManager['getClientIP'](req);
    const isBlocked = await securityManager.isBlocked(ip);
    
    if (isBlocked) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Your IP has been temporarily blocked due to suspicious activity'
      });
    }
    
    // Detectar atividade suspeita
    const suspiciousActivityMiddleware = await securityManager.detectSuspiciousActivity();
    await new Promise<void>((resolve) => {
      suspiciousActivityMiddleware(req, res, () => resolve());
    });
    
    next();
  } catch (error) {
    console.error('Security middleware error:', error);
    next();
  }
};

// Exportações
export {
  SecurityManager,
  SecurityContext,
  SecurityEvent,
  securityManager
};

export default securityManager;