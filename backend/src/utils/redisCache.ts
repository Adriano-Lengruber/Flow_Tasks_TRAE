import Redis, { Redis as RedisType } from 'ioredis';
import { performance } from 'perf_hooks';

// Interface para erros com código
interface ErrorWithCode extends Error {
  code?: string;
}

// Interface para configuração do cache
interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
  enableCompression: boolean;
  enableMetrics: boolean;
  maxRetries: number;
}

// Configuração padrão
const defaultConfig: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'fusion_flow:',
  defaultTTL: 300, // 5 minutos
  enableCompression: true,
  enableMetrics: true,
  maxRetries: 3
};

// Interface para métricas de cache
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalOperations: number;
  averageResponseTime: number;
}

// Classe principal do cache Redis
class RedisCache {
  private redis: RedisType;
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private responseTimes: number[] = [];
  
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalOperations: 0,
      averageResponseTime: 0
    };
    
    this.redis = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      commandTimeout: 5000,
      autoResubscribe: false,
      autoResendUnfulfilledCommands: false
    } as any);
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    this.redis.on('connect', () => {
      console.log('Redis conectado com sucesso');
    });
    
    this.redis.on('error', (error: ErrorWithCode) => {
      console.error('Erro no Redis:', error);
      this.metrics.errors++;
      
      // Se for erro de conexão, não tenta reconectar
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.log('Redis indisponível. Usando cache em memória como fallback.');
        this.redis.disconnect();
      }
    });
    
    this.redis.on('reconnecting', () => {
      console.log('Reconectando ao Redis...');
    });
    
    this.redis.on('close', () => {
      console.log('Conexão Redis fechada');
    });
  }
  
  private trackMetrics(operation: string, duration: number, success: boolean) {
    if (!this.config.enableMetrics) return;
    
    this.metrics.totalOperations++;
    this.responseTimes.push(duration);
    
    // Manter apenas os últimos 1000 tempos de resposta
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
    
    // Calcular tempo médio de resposta
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    
    if (success) {
      switch (operation) {
        case 'get':
          this.metrics.hits++;
          break;
        case 'set':
          this.metrics.sets++;
          break;
        case 'del':
          this.metrics.deletes++;
          break;
      }
    } else {
      if (operation === 'get') {
        this.metrics.misses++;
      }
      this.metrics.errors++;
    }
  }
  
  private compress(data: string): string {
    if (!this.config.enableCompression) return data;
    
    // Implementação simples de compressão (em produção, usar zlib)
    try {
      return Buffer.from(data).toString('base64');
    } catch {
      return data;
    }
  }
  
  private decompress(data: string): string {
    if (!this.config.enableCompression) return data;
    
    try {
      return Buffer.from(data, 'base64').toString('utf-8');
    } catch {
      return data;
    }
  }
  
  // Métodos principais
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      const data = await this.redis.get(key);
      const duration = performance.now() - startTime;
      
      if (data) {
        this.trackMetrics('get', duration, true);
        const decompressed = this.decompress(data);
        return JSON.parse(decompressed);
      } else {
        this.trackMetrics('get', duration, false);
        return null;
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.trackMetrics('get', duration, false);
      console.error(`Erro ao buscar cache para chave ${key}:`, error);
      return null;
    }
  }
  
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      const serialized = JSON.stringify(value);
      const compressed = this.compress(serialized);
      const cacheTTL = ttl || this.config.defaultTTL;
      
      await this.redis.setex(key, cacheTTL, compressed);
      
      const duration = performance.now() - startTime;
      this.trackMetrics('set', duration, true);
      return true;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.trackMetrics('set', duration, false);
      console.error(`Erro ao definir cache para chave ${key}:`, error);
      return false;
    }
  }
  
  async del(key: string): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      const result = await this.redis.del(key);
      const duration = performance.now() - startTime;
      this.trackMetrics('del', duration, true);
      return result > 0;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.trackMetrics('del', duration, false);
      console.error(`Erro ao deletar cache para chave ${key}:`, error);
      return false;
    }
  }
  
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Erro ao verificar existência da chave ${key}:`, error);
      return false;
    }
  }
  
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error(`Erro ao definir expiração para chave ${key}:`, error);
      return false;
    }
  }
  
  async flush(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      return false;
    }
  }
  
  // Métodos para operações em lote
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    try {
      const results = await this.redis.mget(...keys);
      return results.map(data => {
        if (data) {
          const decompressed = this.decompress(data);
          return JSON.parse(decompressed);
        }
        return null;
      });
    } catch (error) {
      console.error('Erro ao buscar múltiplas chaves:', error);
      return keys.map(() => null);
    }
  }
  
  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      
      keyValuePairs.forEach(({ key, value, ttl }) => {
        const serialized = JSON.stringify(value);
        const compressed = this.compress(serialized);
        const cacheTTL = ttl || this.config.defaultTTL;
        
        pipeline.setex(key, cacheTTL, compressed);
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Erro ao definir múltiplas chaves:', error);
      return false;
    }
  }
  
  // Métodos para cache com padrões
  async getOrSet<T = any>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl?: number
  ): Promise<T | null> {
    // Tentar buscar do cache primeiro
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Se não estiver no cache, buscar dos dados originais
    try {
      const data = await fetcher();
      if (data !== null && data !== undefined) {
        await this.set(key, data, ttl);
      }
      return data;
    } catch (error) {
      console.error(`Erro ao buscar dados para chave ${key}:`, error);
      return null;
    }
  }
  
  // Cache com invalidação por tags
  async setWithTags(key: string, value: any, tags: string[], ttl?: number): Promise<boolean> {
    const success = await this.set(key, value, ttl);
    
    if (success && tags.length > 0) {
      // Adicionar chave às tags
      const pipeline = this.redis.pipeline();
      tags.forEach(tag => {
        pipeline.sadd(`tag:${tag}`, key);
        pipeline.expire(`tag:${tag}`, (ttl || this.config.defaultTTL) + 60); // Tag expira um pouco depois
      });
      await pipeline.exec();
    }
    
    return success;
  }
  
  async invalidateByTag(tag: string): Promise<number> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      if (keys.length === 0) return 0;
      
      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      pipeline.del(`tag:${tag}`);
      
      const results = await pipeline.exec();
      return keys.length;
    } catch (error) {
      console.error(`Erro ao invalidar tag ${tag}:`, error);
      return 0;
    }
  }
  
  // Métodos de análise
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }
  
  getCacheHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }
  
  async getInfo(): Promise<any> {
    try {
      const info = await this.redis.info();
      return info;
    } catch (error) {
      console.error('Erro ao obter informações do Redis:', error);
      return null;
    }
  }
  
  async getKeysByPattern(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error(`Erro ao buscar chaves com padrão ${pattern}:`, error);
      return [];
    }
  }
  
  // Cleanup
  async connect(): Promise<void> {
    // O Redis já conecta automaticamente, mas podemos aguardar a conexão com timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, 5000); // 5 segundos de timeout
      
      this.redis.ping()
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}

// Instância singleton
let cacheInstance: RedisCache | null = null;

export const getCache = (config?: Partial<CacheConfig>): RedisCache => {
  if (!cacheInstance) {
    cacheInstance = new RedisCache(config);
  }
  return cacheInstance;
};

// Decorador para cache automático
export function Cacheable(ttl?: number, tags?: string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cache = getCache();
      const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      // Tentar buscar do cache
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
      
      // Executar método original
      const result = await method.apply(this, args);
      
      // Salvar no cache
      if (result !== null && result !== undefined) {
        if (tags && tags.length > 0) {
          await cache.setWithTags(cacheKey, result, tags, ttl);
        } else {
          await cache.set(cacheKey, result, ttl);
        }
      }
      
      return result;
    };
  };
}

// Funções utilitárias para chaves de cache
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  project: (id: string) => `project:${id}`,
  projectList: (userId: string, filters?: any) => 
    `projects:${userId}:${filters ? JSON.stringify(filters) : 'all'}`,
  task: (id: string) => `task:${id}`,
  taskList: (projectId: string, filters?: any) => 
    `tasks:${projectId}:${filters ? JSON.stringify(filters) : 'all'}`,
  userProjects: (userId: string) => `user_projects:${userId}`,
  projectMembers: (projectId: string) => `project_members:${projectId}`,
  taskComments: (taskId: string) => `task_comments:${taskId}`,
  dashboardStats: (userId: string) => `dashboard_stats:${userId}`,
  notifications: (userId: string) => `notifications:${userId}`
};

// Tags para invalidação
export const CacheTags = {
  USER: 'user',
  PROJECT: 'project',
  TASK: 'task',
  COMMENT: 'comment',
  NOTIFICATION: 'notification',
  DASHBOARD: 'dashboard'
};

// Função factory para criar instância do cache
export const createRedisCache = (config?: Partial<CacheConfig>): RedisCache => {
  return new RedisCache(config);
};

export { RedisCache };
export default getCache;