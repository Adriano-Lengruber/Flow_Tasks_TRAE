import { Request, Response, NextFunction } from 'express';
import { getAuditService, AuditAction, AuditContext } from '../services/auditService';
import { structuredLogger } from '../utils/logger';
import { extractUserFromToken } from '../utils/auth';
import crypto from 'crypto';

// Interface para configuração de auditoria
interface AuditConfig {
  enabled: boolean;
  excludePaths?: string[];
  excludeMethods?: string[];
  includeBody?: boolean;
  includeQuery?: boolean;
  includeHeaders?: string[];
  sensitiveFields?: string[];
  maxBodySize?: number;
}

// Interface para mapeamento de rotas
interface RouteMapping {
  method: string;
  path: string;
  action: AuditAction;
  resource: string;
  getResourceId?: (req: Request) => string;
  getDetails?: (req: Request, res: Response) => Record<string, any>;
  getChanges?: (req: Request, res: Response, oldData?: any) => any[];
}

// Configuração padrão
const defaultConfig: AuditConfig = {
  enabled: true,
  excludePaths: ['/health', '/metrics', '/favicon.ico'],
  excludeMethods: ['OPTIONS'],
  includeBody: true,
  includeQuery: true,
  includeHeaders: ['user-agent', 'x-forwarded-for', 'x-real-ip'],
  sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization'],
  maxBodySize: 10000 // 10KB
};

// Mapeamentos de rotas para ações de auditoria
const routeMappings: RouteMapping[] = [
  // Autenticação
  {
    method: 'POST',
    path: '/auth/login',
    action: 'user.login',
    resource: 'user',
    getResourceId: (req) => req.body?.email || 'unknown',
    getDetails: (req) => ({
      email: req.body?.email,
      rememberMe: req.body?.rememberMe
    })
  },
  {
    method: 'POST',
    path: '/auth/logout',
    action: 'user.logout',
    resource: 'user',
    getResourceId: (req) => req.user?.id || 'unknown'
  },
  {
    method: 'POST',
    path: '/auth/register',
    action: 'user.register',
    resource: 'user',
    getResourceId: (req) => req.body?.email || 'unknown',
    getDetails: (req) => ({
      email: req.body?.email,
      name: req.body?.name
    })
  },
  
  // Usuários
  {
    method: 'PUT',
    path: '/users/:id/password',
    action: 'user.password_change',
    resource: 'user',
    getResourceId: (req) => req.params.id
  },
  {
    method: 'PUT',
    path: '/users/:id',
    action: 'user.profile_update',
    resource: 'user',
    getResourceId: (req) => req.params.id,
    getDetails: (req) => ({
      updatedFields: Object.keys(req.body)
    })
  },
  {
    method: 'DELETE',
    path: '/users/:id',
    action: 'user.delete',
    resource: 'user',
    getResourceId: (req) => req.params.id
  },
  
  // Projetos
  {
    method: 'POST',
    path: '/projects',
    action: 'project.create',
    resource: 'project',
    getResourceId: (req) => (req as any).locals?.createdId || 'unknown',
    getDetails: (req) => ({
      name: req.body?.name,
      description: req.body?.description
    })
  },
  {
    method: 'PUT',
    path: '/projects/:id',
    action: 'project.update',
    resource: 'project',
    getResourceId: (req) => req.params.id,
    getDetails: (req) => ({
      updatedFields: Object.keys(req.body)
    })
  },
  {
    method: 'DELETE',
    path: '/projects/:id',
    action: 'project.delete',
    resource: 'project',
    getResourceId: (req) => req.params.id
  },
  {
    method: 'POST',
    path: '/projects/:id/members',
    action: 'project.member_add',
    resource: 'project',
    getResourceId: (req) => req.params.id,
    getDetails: (req) => ({
      memberId: req.body?.userId,
      role: req.body?.role
    })
  },
  {
    method: 'DELETE',
    path: '/projects/:id/members/:memberId',
    action: 'project.member_remove',
    resource: 'project',
    getResourceId: (req) => req.params.id,
    getDetails: (req) => ({
      memberId: req.params.memberId
    })
  },
  
  // Tarefas
  {
    method: 'POST',
    path: '/projects/:projectId/tasks',
    action: 'task.create',
    resource: 'task',
    getResourceId: (req) => (req as any).locals?.createdId || 'unknown',
    getDetails: (req) => ({
      projectId: req.params.projectId,
      title: req.body?.title,
      priority: req.body?.priority
    })
  },
  {
    method: 'PUT',
    path: '/tasks/:id',
    action: 'task.update',
    resource: 'task',
    getResourceId: (req) => req.params.id,
    getDetails: (req) => ({
      updatedFields: Object.keys(req.body)
    })
  },
  {
    method: 'DELETE',
    path: '/tasks/:id',
    action: 'task.delete',
    resource: 'task',
    getResourceId: (req) => req.params.id
  },
  {
    method: 'PUT',
    path: '/tasks/:id/assign',
    action: 'task.assign',
    resource: 'task',
    getResourceId: (req) => req.params.id,
    getDetails: (req) => ({
      assigneeId: req.body?.assigneeId
    })
  },
  {
    method: 'PUT',
    path: '/tasks/:id/complete',
    action: 'task.complete',
    resource: 'task',
    getResourceId: (req) => req.params.id
  },
  
  // Comentários
  {
    method: 'POST',
    path: '/tasks/:taskId/comments',
    action: 'comment.create',
    resource: 'comment',
    getResourceId: (req) => (req as any).locals?.createdId || 'unknown',
    getDetails: (req) => ({
      taskId: req.params.taskId,
      contentLength: req.body?.content?.length || 0
    })
  },
  {
    method: 'PUT',
    path: '/comments/:id',
    action: 'comment.update',
    resource: 'comment',
    getResourceId: (req) => req.params.id
  },
  {
    method: 'DELETE',
    path: '/comments/:id',
    action: 'comment.delete',
    resource: 'comment',
    getResourceId: (req) => req.params.id
  },
  
  // Arquivos
  {
    method: 'POST',
    path: '/upload',
    action: 'file.upload',
    resource: 'file',
    getResourceId: (req) => (req as any).locals?.fileId || 'unknown',
    getDetails: (req) => ({
      fileName: (req as any).file?.originalname,
      fileSize: (req as any).file?.size,
      mimeType: (req as any).file?.mimetype
    })
  },
  {
    method: 'GET',
    path: '/files/:id/download',
    action: 'file.download',
    resource: 'file',
    getResourceId: (req) => req.params.id
  },
  {
    method: 'DELETE',
    path: '/files/:id',
    action: 'file.delete',
    resource: 'file',
    getResourceId: (req) => req.params.id
  }
];

// Classe principal do middleware de auditoria
class AuditMiddleware {
  private config: AuditConfig;
  private logger = structuredLogger.child({ service: 'audit' });
  private routeCache = new Map<string, RouteMapping>();
  
  constructor(config: Partial<AuditConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.buildRouteCache();
  }
  
  // Construir cache de rotas
  private buildRouteCache() {
    routeMappings.forEach(mapping => {
      const key = `${mapping.method}:${mapping.path}`;
      this.routeCache.set(key, mapping);
    });
  }
  
  // Middleware principal
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }
      
      // Verificar se deve ser excluído
      if (this.shouldExclude(req)) {
        return next();
      }
      
      // Gerar ID da requisição
      const requestId = crypto.randomUUID();
      req.requestId = requestId;
      
      // Capturar dados da requisição
      const startTime = Date.now();
      const originalSend = res.send;
      let responseBody: any;
      let statusCode: number;
      
      // Interceptar resposta
      res.send = function(body: any) {
        responseBody = body;
        statusCode = res.statusCode;
        return originalSend.call(this, body);
      };
      
      // Continuar com a requisição
      res.on('finish', async () => {
        try {
          await this.logRequest(req, res, {
            requestId,
            responseBody,
            statusCode,
            duration: Date.now() - startTime
          });
        } catch (error) {
          this.logger.error('Failed to log audit trail', error as Error, {
            requestId,
            path: req.path,
            method: req.method
          });
        }
      });
      
      next();
    };
  }
  
  // Verificar se deve excluir da auditoria
  private shouldExclude(req: Request): boolean {
    // Excluir por método
    if (this.config.excludeMethods?.includes(req.method)) {
      return true;
    }
    
    // Excluir por caminho
    if (this.config.excludePaths?.some(path => req.path.startsWith(path))) {
      return true;
    }
    
    return false;
  }
  
  // Registrar requisição
  private async logRequest(
    req: Request,
    res: Response,
    metadata: {
      requestId: string;
      responseBody: any;
      statusCode: number;
      duration: number;
    }
  ) {
    const mapping = this.findRouteMapping(req);
    if (!mapping) {
      // Log genérico para rotas não mapeadas
      await this.logGenericRequest(req, res, metadata);
      return;
    }
    
    // Extrair contexto do usuário
    const context = await this.extractAuditContext(req);
    
    // Obter ID do recurso
    const resourceId = mapping.getResourceId ? mapping.getResourceId(req) : 'unknown';
    
    // Obter detalhes
    const details = {
      ...this.extractRequestDetails(req),
      ...metadata,
      ...(mapping.getDetails ? mapping.getDetails(req, res) : {})
    };
    
    // Obter mudanças (se aplicável)
    const changes = mapping.getChanges ? mapping.getChanges(req, res) : undefined;
    
    // Registrar no serviço de auditoria
    const auditService = getAuditService();
    await auditService.log(
      mapping.action,
      mapping.resource,
      resourceId,
      context,
      details,
      changes
    );
  }
  
  // Log genérico para rotas não mapeadas
  private async logGenericRequest(
    req: Request,
    res: Response,
    metadata: {
      requestId: string;
      responseBody: any;
      statusCode: number;
      duration: number;
    }
  ) {
    // Log apenas para ações importantes não mapeadas
    if (req.method === 'GET' || res.statusCode < 400) {
      return;
    }
    
    const context = await this.extractAuditContext(req);
    const details = {
      ...this.extractRequestDetails(req),
      ...metadata,
      unmappedRoute: true
    };
    
    const auditService = getAuditService();
    
    // Determinar ação baseada no status
    let action: AuditAction;
    if (res.statusCode === 401) {
      action = 'api.unauthorized_access';
    } else if (res.statusCode === 429) {
      action = 'api.rate_limit_exceeded';
    } else {
      return; // Não registrar outras ações genéricas
    }
    
    await auditService.log(
      action,
      'api',
      req.path,
      context,
      details
    );
  }
  
  // Encontrar mapeamento de rota
  private findRouteMapping(req: Request): RouteMapping | undefined {
    // Busca exata primeiro
    const exactKey = `${req.method}:${req.path}`;
    let mapping = this.routeCache.get(exactKey);
    
    if (mapping) {
      return mapping;
    }
    
    // Busca por padrão
    for (const [key, routeMapping] of this.routeCache) {
      const [method, pattern] = key.split(':');
      
      if (method !== req.method) {
        continue;
      }
      
      if (this.matchesPattern(req.path, pattern)) {
        return routeMapping;
      }
    }
    
    return undefined;
  }
  
  // Verificar se o caminho corresponde ao padrão
  private matchesPattern(path: string, pattern: string): boolean {
    // Converter padrão Express para regex
    const regexPattern = pattern
      .replace(/:[^/]+/g, '[^/]+') // :id -> [^/]+
      .replace(/\*/g, '.*'); // * -> .*
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }
  
  // Extrair contexto de auditoria
  private async extractAuditContext(req: Request): Promise<AuditContext> {
    let userId: string | undefined;
    let sessionId: string | undefined;
    
    // Tentar extrair usuário do token
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const user = extractUserFromToken({ headers: { authorization: `Bearer ${token}` } } as Request);
        userId = user?.id;
        // sessionId não está disponível no AuthUser
      }
    } catch (error) {
      // Ignorar erros de token inválido
    }
    
    // Extrair IP
    const ip = this.extractClientIP(req);
    
    // Extrair User-Agent
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    return {
      userId,
      sessionId,
      ip,
      userAgent,
      requestId: req.requestId,
      operation: `${req.method} ${req.path}`
    };
  }
  
  // Extrair IP do cliente
  private extractClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim();
  }
  
  // Extrair detalhes da requisição
  private extractRequestDetails(req: Request): Record<string, any> {
    const details: Record<string, any> = {
      method: req.method,
      path: req.path,
      url: req.url
    };
    
    // Incluir query parameters
    if (this.config.includeQuery && Object.keys(req.query).length > 0) {
      details.query = this.sanitizeData(req.query);
    }
    
    // Incluir body
    if (this.config.includeBody && req.body) {
      const bodyStr = JSON.stringify(req.body);
      if (bodyStr.length <= (this.config.maxBodySize || 10000)) {
        details.body = this.sanitizeData(req.body);
      } else {
        details.body = { _truncated: true, size: bodyStr.length };
      }
    }
    
    // Incluir headers específicos
    if (this.config.includeHeaders?.length) {
      details.headers = {};
      this.config.includeHeaders.forEach(header => {
        if (req.headers[header]) {
          details.headers[header] = req.headers[header];
        }
      });
    }
    
    return details;
  }
  
  // Sanitizar dados sensíveis
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const sanitized = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.config.sensitiveFields?.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        (sanitized as any)[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        (sanitized as any)[key] = this.sanitizeData(value);
      } else {
        (sanitized as any)[key] = value;
      }
    }
    
    return sanitized;
  }
  
  // Adicionar mapeamento de rota personalizado
  addRouteMapping(mapping: RouteMapping) {
    const key = `${mapping.method}:${mapping.path}`;
    this.routeCache.set(key, mapping);
    routeMappings.push(mapping);
  }
  
  // Atualizar configuração
  updateConfig(updates: Partial<AuditConfig>) {
    this.config = { ...this.config, ...updates };
  }
}

// Middleware para detectar falhas de login
export function auditFailedLogin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(body: any) {
      // Verificar se é uma falha de login
      if (res.statusCode === 401 && req.path === '/auth/login') {
        // Registrar falha de login
        const auditService = getAuditService();
        const context: AuditContext = {
          ip: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          requestId: req.requestId
        };
        
        auditService.log(
          'security.failed_login',
          'user',
          req.body?.email || 'unknown',
          context,
          {
            email: req.body?.email,
            reason: 'invalid_credentials'
          }
        ).catch(error => {
          structuredLogger.error('Failed to log failed login', error as Error);
        });
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
}

// Middleware para detectar atividade suspeita
export function auditSuspiciousActivity() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const suspiciousPatterns = [
      /\b(union|select|insert|update|delete|drop|create|alter)\b/i, // SQL Injection
      /<script[^>]*>.*?<\/script>/i, // XSS
      /\.\.[\/\\]/g, // Path Traversal
      /\b(eval|exec|system|shell_exec)\b/i // Code Injection
    ];
    
    const checkData = (data: any): boolean => {
      if (typeof data === 'string') {
        return suspiciousPatterns.some(pattern => pattern.test(data));
      }
      
      if (typeof data === 'object' && data !== null) {
        return Object.values(data).some(value => checkData(value));
      }
      
      return false;
    };
    
    // Verificar query, body e headers
    const suspicious = (
      checkData(req.query) ||
      checkData(req.body) ||
      checkData(req.headers)
    );
    
    if (suspicious) {
      const auditService = getAuditService();
      const context: AuditContext = {
        ip: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        requestId: req.requestId
      };
      
      auditService.log(
        'security.suspicious_activity',
        'security',
        req.path,
        context,
        {
          method: req.method,
          path: req.path,
          suspiciousContent: true
        }
      ).catch(error => {
        structuredLogger.error('Failed to log suspicious activity', error as Error);
      });
    }
    
    next();
  };
}

// Criar instância do middleware
export function createAuditMiddleware(config?: Partial<AuditConfig>): AuditMiddleware {
  return new AuditMiddleware(config);
}

// Instância padrão do middleware
const auditMiddlewareInstance = new AuditMiddleware();
export const auditMiddleware = auditMiddlewareInstance.middleware();

export {
  AuditMiddleware,
  AuditConfig,
  RouteMapping
};

export default AuditMiddleware;