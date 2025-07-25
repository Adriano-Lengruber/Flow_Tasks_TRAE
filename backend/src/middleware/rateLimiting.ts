import { Request, Response, NextFunction } from 'express';
import { getCache } from '../utils/redisCache';

// Interface para configuração de rate limiting
interface RateLimitConfig {
  windowMs: number; // Janela de tempo em milissegundos
  maxRequests: number; // Máximo de requests por janela
  keyGenerator?: (req: Request) => string; // Função para gerar chave única
  skipSuccessfulRequests?: boolean; // Pular requests bem-sucedidos
  skipFailedRequests?: boolean; // Pular requests com erro
  onLimitReached?: (req: Request, res: Response) => void; // Callback quando limite é atingido
  message?: string; // Mensagem de erro customizada
  standardHeaders?: boolean; // Incluir headers padrão
  legacyHeaders?: boolean; // Incluir headers legados
}

// Configurações predefinidas
export const RateLimitPresets = {
  // Limite geral para APIs
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 100,
    message: 'Muitas requisições. Tente novamente em 15 minutos.'
  },
  
  // Limite para autenticação
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  
  // Limite para criação de recursos
  creation: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 10,
    message: 'Muitas criações. Aguarde 1 minuto.'
  },
  
  // Limite para uploads
  upload: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 5,
    message: 'Muitos uploads. Aguarde 1 minuto.'
  },
  
  // Limite para APIs públicas
  public: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 20,
    message: 'Limite de requisições atingido. Aguarde 1 minuto.'
  },
  
  // Limite para GraphQL
  graphql: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 50,
    message: 'Muitas queries GraphQL. Aguarde 1 minuto.'
  }
};

// Interface para informações de rate limit
interface RateLimitInfo {
  totalHits: number;
  totalHitsInWindow: number;
  remainingPoints: number;
  msBeforeNext: number;
  isFirstInWindow: boolean;
}

// Classe principal para rate limiting
class RateLimiter {
  private config: Required<RateLimitConfig>;
  private cache = getCache();
  
  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
      onLimitReached: config.onLimitReached || this.defaultOnLimitReached,
      message: config.message || 'Muitas requisições. Tente novamente mais tarde.',
      standardHeaders: config.standardHeaders !== false,
      legacyHeaders: config.legacyHeaders !== false
    };
  }
  
  private defaultKeyGenerator(req: Request): string {
    // Usar IP + User ID (se autenticado) como chave
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    return `rate_limit:${ip}:${userId}`;
  }
  
  private defaultOnLimitReached(req: Request, res: Response): void {
    console.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
  }
  
  async checkLimit(req: Request): Promise<RateLimitInfo> {
    const key = this.config.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Chave para a janela atual
    const windowKey = `${key}:${Math.floor(now / this.config.windowMs)}`;
    
    // Buscar contagem atual
    const currentCount = await this.cache.get<number>(windowKey) || 0;
    const newCount = currentCount + 1;
    
    // Salvar nova contagem
    await this.cache.set(windowKey, newCount, Math.ceil(this.config.windowMs / 1000));
    
    const remainingPoints = Math.max(0, this.config.maxRequests - newCount);
    const msBeforeNext = this.config.windowMs - (now % this.config.windowMs);
    
    return {
      totalHits: newCount,
      totalHitsInWindow: newCount,
      remainingPoints,
      msBeforeNext,
      isFirstInWindow: currentCount === 0
    };
  }
  
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const limitInfo = await this.checkLimit(req);
        
        // Adicionar headers informativos
        if (this.config.standardHeaders) {
          res.set({
            'RateLimit-Limit': this.config.maxRequests.toString(),
            'RateLimit-Remaining': limitInfo.remainingPoints.toString(),
            'RateLimit-Reset': new Date(Date.now() + limitInfo.msBeforeNext).toISOString()
          });
        }
        
        if (this.config.legacyHeaders) {
          res.set({
            'X-RateLimit-Limit': this.config.maxRequests.toString(),
            'X-RateLimit-Remaining': limitInfo.remainingPoints.toString(),
            'X-RateLimit-Reset': Math.ceil((Date.now() + limitInfo.msBeforeNext) / 1000).toString()
          });
        }
        
        // Verificar se limite foi excedido
        if (limitInfo.totalHits > this.config.maxRequests) {
          this.config.onLimitReached(req, res);
          
          res.status(429).json({
            error: 'Rate limit exceeded',
            message: this.config.message,
            retryAfter: Math.ceil(limitInfo.msBeforeNext / 1000)
          });
          return;
        }
        
        // Continuar para próximo middleware
        next();
        
      } catch (error) {
        console.error('Erro no rate limiting:', error);
        // Em caso de erro, permitir a requisição
        next();
      }
    };
  }
}

// Função para criar rate limiter
export function createRateLimit(config: RateLimitConfig) {
  const limiter = new RateLimiter(config);
  return limiter.middleware();
}

// Rate limiters predefinidos
export const rateLimiters = {
  general: () => createRateLimit(RateLimitPresets.general),
  auth: () => createRateLimit(RateLimitPresets.auth),
  creation: () => createRateLimit(RateLimitPresets.creation),
  upload: () => createRateLimit(RateLimitPresets.upload),
  public: () => createRateLimit(RateLimitPresets.public),
  graphql: () => createRateLimit(RateLimitPresets.graphql)
};

// Middleware para rate limiting baseado em complexidade GraphQL
export function createGraphQLComplexityLimit(maxComplexity: number = 1000) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verificar se é uma query GraphQL
      if (req.body && req.body.query) {
        const complexity = calculateQueryComplexity(req.body.query);
        
        if (complexity > maxComplexity) {
          res.status(429).json({
            error: 'Query too complex',
            message: `Query complexity (${complexity}) exceeds maximum allowed (${maxComplexity})`,
            maxComplexity
          });
          return;
        }
        
        // Adicionar complexidade ao request para logging
        (req as any).queryComplexity = complexity;
      }
      
      next();
    } catch (error) {
      console.error('Erro ao calcular complexidade da query:', error);
      next();
    }
  };
}

// Função simples para calcular complexidade de query GraphQL
function calculateQueryComplexity(query: string): number {
  // Implementação básica - contar campos e profundidade
  const fieldMatches = query.match(/\w+\s*\{/g) || [];
  const depthMatches = query.match(/\{/g) || [];
  
  return fieldMatches.length + (depthMatches.length * 2);
}

// Middleware para rate limiting adaptativo
export function createAdaptiveRateLimit(baseConfig: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cache = getCache();
      const key = `adaptive_rate:${req.ip}`;
      
      // Buscar histórico de erros
      const errorCount = await cache.get<number>(`${key}:errors`) || 0;
      
      // Ajustar limite baseado no histórico
      let adjustedMaxRequests = baseConfig.maxRequests;
      
      if (errorCount > 10) {
        adjustedMaxRequests = Math.floor(baseConfig.maxRequests * 0.5); // Reduzir 50%
      } else if (errorCount > 5) {
        adjustedMaxRequests = Math.floor(baseConfig.maxRequests * 0.75); // Reduzir 25%
      }
      
      // Criar limiter com configuração ajustada
      const adaptiveConfig = {
        ...baseConfig,
        maxRequests: adjustedMaxRequests
      };
      
      const limiter = new RateLimiter(adaptiveConfig);
      const limitInfo = await limiter.checkLimit(req);
      
      // Headers informativos
      res.set({
        'X-RateLimit-Limit': adjustedMaxRequests.toString(),
        'X-RateLimit-Remaining': limitInfo.remainingPoints.toString(),
        'X-RateLimit-Adaptive': 'true'
      });
      
      if (limitInfo.totalHits > adjustedMaxRequests) {
        res.status(429).json({
          error: 'Adaptive rate limit exceeded',
          message: 'Limite adaptativo atingido devido ao histórico de erros',
          retryAfter: Math.ceil(limitInfo.msBeforeNext / 1000)
        });
        return;
      }
      
      // Middleware para rastrear erros na resposta
      const originalSend = res.send;
      res.send = function(data) {
        if (res.statusCode >= 400) {
          // Incrementar contador de erros
          cache.set(`${key}:errors`, errorCount + 1, 3600); // 1 hora
        }
        return originalSend.call(this, data);
      };
      
      next();
      
    } catch (error) {
      console.error('Erro no rate limiting adaptativo:', error);
      next();
    }
  };
}

// Middleware para whitelist de IPs
export function createIPWhitelist(whitelist: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (whitelist.includes(clientIP || '')) {
      // IP na whitelist - pular rate limiting
      next();
    } else {
      // Aplicar rate limiting normal
      next();
    }
  };
}

// Função para obter estatísticas de rate limiting
export async function getRateLimitStats(timeWindow: number = 3600000) {
  const cache = getCache();
  const now = Date.now();
  const windowStart = now - timeWindow;
  
  try {
    // Buscar todas as chaves de rate limit
    const keys = await cache.getKeysByPattern('rate_limit:*');
    
    const stats = {
      totalRequests: 0,
      uniqueIPs: new Set<string>(),
      blockedRequests: 0,
      topIPs: new Map<string, number>()
    };
    
    for (const key of keys) {
      const count = await cache.get<number>(key) || 0;
      const ip = key.split(':')[1];
      
      stats.totalRequests += count;
      stats.uniqueIPs.add(ip);
      
      // Contar requests por IP
      const currentCount = stats.topIPs.get(ip) || 0;
      stats.topIPs.set(ip, currentCount + count);
    }
    
    // Converter para array e ordenar
    const topIPsArray = Array.from(stats.topIPs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    return {
      totalRequests: stats.totalRequests,
      uniqueIPs: stats.uniqueIPs.size,
      blockedRequests: stats.blockedRequests,
      topIPs: topIPsArray
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de rate limiting:', error);
    return null;
  }
}

// Instância padrão do middleware de rate limiting
export const rateLimitingMiddleware = createRateLimit(RateLimitPresets.general);

export { RateLimiter };
export default createRateLimit;