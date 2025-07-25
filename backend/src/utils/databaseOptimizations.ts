import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

// Interface para configuração de otimizações
interface DatabaseOptimizationConfig {
  enableQueryLogging: boolean;
  enableSlowQueryDetection: boolean;
  slowQueryThreshold: number;
  enableConnectionPooling: boolean;
  maxConnections: number;
  enableQueryCache: boolean;
  cacheSize: number;
  enableIndexHints: boolean;
}

// Configuração padrão
const defaultConfig: DatabaseOptimizationConfig = {
  enableQueryLogging: process.env.NODE_ENV === 'development',
  enableSlowQueryDetection: true,
  slowQueryThreshold: 1000, // 1 segundo
  enableConnectionPooling: true,
  maxConnections: 10,
  enableQueryCache: true,
  cacheSize: 100,
  enableIndexHints: true
};

// Interface para métricas de query
interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: number;
  model: string;
  operation: string;
  args?: any;
}

// Classe para otimização do Prisma
class PrismaOptimizer {
  private prisma: PrismaClient;
  private config: DatabaseOptimizationConfig;
  private queryMetrics: QueryMetrics[] = [];
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  constructor(prisma: PrismaClient, config: Partial<DatabaseOptimizationConfig> = {}) {
    this.prisma = prisma;
    this.config = { ...defaultConfig, ...config };
    this.setupOptimizations();
  }
  
  private setupOptimizations() {
    // Middleware para logging e métricas
    this.prisma.$use(async (params, next) => {
      const startTime = performance.now();
      
      // Verificar cache
      if (this.config.enableQueryCache && this.isReadOperation(params.action)) {
        const cacheKey = this.generateCacheKey(params);
        const cached = this.queryCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
          return cached.data;
        }
      }
      
      const result = await next(params);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Salvar métricas
      if (this.config.enableQueryLogging || this.config.enableSlowQueryDetection) {
        const metric: QueryMetrics = {
          query: this.formatQuery(params),
          duration,
          timestamp: Date.now(),
          model: params.model || 'unknown',
          operation: params.action,
          args: params.args
        };
        
        this.queryMetrics.push(metric);
        
        // Manter apenas as últimas 1000 métricas
        if (this.queryMetrics.length > 1000) {
          this.queryMetrics = this.queryMetrics.slice(-1000);
        }
        
        // Log para queries lentas
        if (this.config.enableSlowQueryDetection && duration > this.config.slowQueryThreshold) {
          console.warn(`Slow database query detected:`, {
            model: params.model,
            action: params.action,
            duration: `${duration.toFixed(2)}ms`,
            args: params.args
          });
        }
        
        // Log geral em desenvolvimento
        if (this.config.enableQueryLogging) {
          console.log(`DB Query: ${params.model}.${params.action} - ${duration.toFixed(2)}ms`);
        }
      }
      
      // Salvar no cache
      if (this.config.enableQueryCache && this.isReadOperation(params.action)) {
        const cacheKey = this.generateCacheKey(params);
        const ttl = this.getCacheTTL(params.action);
        
        this.queryCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          ttl
        });
        
        // Limpar cache se necessário
        if (this.queryCache.size > this.config.cacheSize) {
          this.clearOldCache();
        }
      }
      
      return result;
    });
  }
  
  private isReadOperation(action: string): boolean {
    return ['findFirst', 'findMany', 'findUnique', 'count', 'aggregate'].includes(action);
  }
  
  private generateCacheKey(params: any): string {
    return JSON.stringify({
      model: params.model,
      action: params.action,
      args: params.args
    });
  }
  
  private getCacheTTL(action: string): number {
    // TTL baseado no tipo de operação
    switch (action) {
      case 'findMany': return 5 * 60 * 1000; // 5 minutos
      case 'findFirst':
      case 'findUnique': return 10 * 60 * 1000; // 10 minutos
      case 'count': return 2 * 60 * 1000; // 2 minutos
      case 'aggregate': return 15 * 60 * 1000; // 15 minutos
      default: return 5 * 60 * 1000;
    }
  }
  
  private clearOldCache() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.queryCache.forEach((value, key) => {
      if (now - value.timestamp > value.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.queryCache.delete(key));
  }
  
  private formatQuery(params: any): string {
    return `${params.model}.${params.action}`;
  }
  
  // Métodos públicos para análise
  getQueryMetrics(): QueryMetrics[] {
    return [...this.queryMetrics];
  }
  
  getSlowQueries(threshold?: number): QueryMetrics[] {
    const limit = threshold || this.config.slowQueryThreshold;
    return this.queryMetrics.filter(m => m.duration > limit);
  }
  
  getQueryStats() {
    if (this.queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        cacheHitRate: 0
      };
    }
    
    const totalDuration = this.queryMetrics.reduce((sum, m) => sum + m.duration, 0);
    const slowQueries = this.getSlowQueries().length;
    
    return {
      totalQueries: this.queryMetrics.length,
      averageDuration: Math.round(totalDuration / this.queryMetrics.length),
      slowQueries,
      cacheHitRate: Math.round((this.queryCache.size / this.queryMetrics.length) * 100)
    };
  }
  
  clearCache() {
    this.queryCache.clear();
  }
  
  clearMetrics() {
    this.queryMetrics = [];
  }
}

// Funções de otimização específicas
export const optimizeProjectQueries = {
  // Buscar projetos com dados relacionados otimizados
  findManyWithOptimizations: async (prisma: PrismaClient, args: any = {}) => {
    return prisma.project.findMany({
      ...args,
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10 // Limitar tarefas por projeto
        },
        members: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            role: true
          }
        },
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      }
    });
  },
  
  // Buscar projeto único com cache otimizado
  findUniqueWithCache: async (prisma: PrismaClient, id: string) => {
    return prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            comments: {
              select: {
                id: true,
                content: true,
                createdAt: true,
                author: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 5
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      }
    });
  }
};

export const optimizeTaskQueries = {
  // Buscar tarefas com paginação otimizada
  findManyPaginated: async (prisma: PrismaClient, {
    page = 1,
    limit = 20,
    projectId,
    status,
    assigneeId,
    search
  }: {
    page?: number;
    limit?: number;
    projectId?: string;
    status?: string;
    assigneeId?: string;
    search?: string;
  } = {}) => {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              comments: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.task.count({ where })
    ]);
    
    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
};

// Função para criar índices otimizados
export const createOptimizedIndexes = async (prisma: PrismaClient) => {
  try {
    // Índices para projetos
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_projects_status_created 
      ON "Project" (status, "createdAt" DESC);
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_projects_owner_status 
      ON "Project" ("ownerId", status);
    `;
    
    // Índices para tarefas
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_tasks_project_status_priority 
      ON "Task" ("projectId", status, priority DESC);
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status 
      ON "Task" ("assigneeId", status);
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date 
      ON "Task" ("dueDate") WHERE "dueDate" IS NOT NULL;
    `;
    
    // Índices para comentários
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_comments_task_created 
      ON "Comment" ("taskId", "createdAt" DESC);
    `;
    
    // Índices para membros do projeto
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_project_members_project_user 
      ON "ProjectMember" ("projectId", "userId");
    `;
    
    console.log('Índices otimizados criados com sucesso');
  } catch (error) {
    console.error('Erro ao criar índices otimizados:', error);
  }
};

// Função para análise de performance
export const analyzeQueryPerformance = async (prisma: PrismaClient) => {
  try {
    // Analisar queries mais lentas
    const slowQueries = await prisma.$queryRaw`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        max_time
      FROM pg_stat_statements 
      WHERE query LIKE '%SELECT%'
      ORDER BY mean_time DESC 
      LIMIT 10;
    `;
    
    // Analisar índices não utilizados
    const unusedIndexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      WHERE idx_tup_read = 0 AND idx_tup_fetch = 0;
    `;
    
    return {
      slowQueries,
      unusedIndexes
    };
  } catch (error) {
    console.error('Erro na análise de performance:', error);
    return { slowQueries: [], unusedIndexes: [] };
  }
};

export { PrismaOptimizer };
export default PrismaOptimizer;