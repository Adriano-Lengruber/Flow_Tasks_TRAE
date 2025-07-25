// Cache em memória como fallback para Redis

interface CacheItem {
  value: any;
  expiry: number;
  tags?: string[];
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalOperations: number;
  averageResponseTime: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem>();
  private tagMap = new Map<string, Set<string>>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    totalOperations: 0,
    averageResponseTime: 0
  };
  private responseTimes: number[] = [];
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(defaultTTL: number = 300) {
    this.defaultTTL = defaultTTL;
    
    // Limpeza automática de itens expirados a cada 60 segundos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private trackMetrics(operation: string, duration: number, success: boolean) {
    this.metrics.totalOperations++;
    this.responseTimes.push(duration);
    
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
    
    // Calcular tempo médio de resposta
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-50);
    }
    
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  private cleanup() {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry <= now) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.cache.delete(key);
      // Remover das tags também
      for (const [tag, keys] of this.tagMap.entries()) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagMap.delete(tag);
        }
      }
    });
  }

  async connect(): Promise<void> {
    // Método para compatibilidade com RedisCache
    return Promise.resolve();
  }

  async get<T = any>(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      const item = this.cache.get(key);
      const duration = performance.now() - startTime;
      
      if (item && item.expiry > Date.now()) {
        this.trackMetrics('get', duration, true);
        return item.value;
      } else {
        if (item) {
          this.cache.delete(key);
        }
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
      const cacheTTL = ttl || this.defaultTTL;
      const expiry = Date.now() + (cacheTTL * 1000);
      
      this.cache.set(key, {
        value,
        expiry
      });
      
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
      const result = this.cache.delete(key);
      
      // Remover das tags também
      for (const [tag, keys] of this.tagMap.entries()) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagMap.delete(tag);
        }
      }
      
      const duration = performance.now() - startTime;
      this.trackMetrics('del', duration, true);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.trackMetrics('del', duration, false);
      console.error(`Erro ao deletar cache para chave ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    return item !== undefined && item.expiry > Date.now();
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    const item = this.cache.get(key);
    if (item) {
      item.expiry = Date.now() + (ttl * 1000);
      return true;
    }
    return false;
  }

  async flush(): Promise<boolean> {
    try {
      this.cache.clear();
      this.tagMap.clear();
      return true;
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      return false;
    }
  }

  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    
    for (const key of keys) {
      results.push(await this.get<T>(key));
    }
    
    return results;
  }

  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    try {
      for (const { key, value, ttl } of keyValuePairs) {
        await this.set(key, value, ttl);
      }
      return true;
    } catch (error) {
      console.error('Erro ao definir múltiplas chaves:', error);
      return false;
    }
  }

  async getOrSet<T = any>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl?: number
  ): Promise<T | null> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    try {
      const value = await fetcher();
      await this.set(key, value, ttl);
      return value;
    } catch (error) {
      console.error(`Erro ao buscar dados para chave ${key}:`, error);
      return null;
    }
  }

  async setWithTags(key: string, value: any, tags: string[], ttl?: number): Promise<boolean> {
    const success = await this.set(key, value, ttl);
    
    if (success && tags.length > 0) {
      const item = this.cache.get(key);
      if (item) {
        item.tags = tags;
        
        // Adicionar às tags
        tags.forEach(tag => {
          if (!this.tagMap.has(tag)) {
            this.tagMap.set(tag, new Set());
          }
          this.tagMap.get(tag)!.add(key);
        });
      }
    }
    
    return success;
  }

  async invalidateByTag(tag: string): Promise<number> {
    const keys = this.tagMap.get(tag);
    if (!keys || keys.size === 0) return 0;
    
    let deletedCount = 0;
    for (const key of keys) {
      if (await this.del(key)) {
        deletedCount++;
      }
    }
    
    this.tagMap.delete(tag);
    return deletedCount;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  getCacheHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  async getInfo(): Promise<any> {
    return {
      type: 'memory',
      size: this.cache.size,
      metrics: this.getMetrics(),
      hitRate: this.getCacheHitRate()
    };
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keys: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }
    
    return keys;
  }

  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    this.tagMap.clear();
  }
}

// Função factory para criar instância do cache em memória
export const createMemoryCache = (defaultTTL?: number): MemoryCache => {
  return new MemoryCache(defaultTTL);
};

export { MemoryCache };
export default createMemoryCache;