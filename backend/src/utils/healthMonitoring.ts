import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getCache } from './redisCache';
import { performance } from 'perf_hooks';
import os from 'os';
import fs from 'fs/promises';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Interface para status de saúde
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  version: string;
  environment: string;
  services: ServiceHealth[];
  metrics: SystemMetrics;
  checks: HealthCheck[];
}

// Interface para saúde de serviços
interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: number;
  error?: string;
  metadata?: any;
}

// Interface para métricas do sistema
interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  network?: {
    bytesReceived: number;
    bytesSent: number;
  };
}

// Interface para verificações de saúde
interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  output?: string;
  details?: any;
}

// Classe principal para monitoramento
class HealthMonitor {
  private prisma: PrismaClient;
  private cache = getCache();
  private startTime = Date.now();
  private version: string;
  private environment: string;
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.version = process.env.npm_package_version || '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
  }
  
  // Verificar saúde do banco de dados
  async checkDatabase(): Promise<ServiceHealth> {
    const startTime = performance.now();
    
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = performance.now() - startTime;
      
      return {
        name: 'database',
        status: 'up',
        responseTime,
        lastCheck: Date.now()
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'down',
        responseTime: performance.now() - startTime,
        lastCheck: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Verificar saúde do Redis
  async checkRedis(): Promise<ServiceHealth> {
    const startTime = performance.now();
    
    try {
      await this.cache.set('health_check', 'ok', 10);
      const result = await this.cache.get('health_check');
      
      if (result === 'ok') {
        const responseTime = performance.now() - startTime;
        return {
          name: 'redis',
          status: 'up',
          responseTime,
          lastCheck: Date.now()
        };
      } else {
        throw new Error('Redis health check failed');
      }
    } catch (error) {
      return {
        name: 'redis',
        status: 'down',
        responseTime: performance.now() - startTime,
        lastCheck: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Verificar APIs externas
  async checkExternalAPIs(): Promise<ServiceHealth[]> {
    const apis = [
      { name: 'github', url: 'https://api.github.com/zen' },
      // Adicionar outras APIs conforme necessário
    ];
    
    const results: ServiceHealth[] = [];
    
    for (const api of apis) {
      const startTime = performance.now();
      
      try {
        const response = await fetch(api.url, {
          method: 'GET'
        });
        
        const responseTime = performance.now() - startTime;
        
        results.push({
          name: api.name,
          status: response.ok ? 'up' : 'degraded',
          responseTime,
          lastCheck: Date.now(),
          metadata: {
            statusCode: response.status,
            url: api.url
          }
        });
      } catch (error) {
        results.push({
          name: api.name,
          status: 'down',
          responseTime: performance.now() - startTime,
          lastCheck: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            url: api.url
          }
        });
      }
    }
    
    return results;
  }
  
  // Obter métricas do sistema
  async getSystemMetrics(): Promise<SystemMetrics> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Calcular uso de CPU
    const cpuUsage = await this.getCPUUsage();
    
    // Obter informações de disco
    const diskInfo = await this.getDiskUsage();
    
    return {
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg()
      },
      memory: {
        used: usedMem,
        free: freeMem,
        total: totalMem,
        percentage: (usedMem / totalMem) * 100
      },
      disk: diskInfo
    };
  }
  
  // Calcular uso de CPU
  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startMeasure = this.cpuAverage();
      
      setTimeout(() => {
        const endMeasure = this.cpuAverage();
        
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        
        const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
        resolve(percentageCPU);
      }, 100);
    });
  }
  
  private cpuAverage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    
    return {
      idle: totalIdle / cpus.length,
      total: totalTick / cpus.length
    };
  }
  
  // Obter uso de disco
  private async getDiskUsage(): Promise<SystemMetrics['disk']> {
    try {
      if (process.platform === 'win32') {
        // Windows
        const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
        const lines = stdout.trim().split('\n').slice(1);
        
        let totalSize = 0;
        let totalFree = 0;
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const free = parseInt(parts[1]) || 0;
            const size = parseInt(parts[2]) || 0;
            totalFree += free;
            totalSize += size;
          }
        });
        
        const used = totalSize - totalFree;
        
        return {
          used,
          free: totalFree,
          total: totalSize,
          percentage: totalSize > 0 ? (used / totalSize) * 100 : 0
        };
      } else {
        // Unix/Linux
        const { stdout } = await execAsync('df -k /');
        const lines = stdout.trim().split('\n');
        const data = lines[1].split(/\s+/);
        
        const total = parseInt(data[1]) * 1024;
        const used = parseInt(data[2]) * 1024;
        const free = parseInt(data[3]) * 1024;
        
        return {
          used,
          free,
          total,
          percentage: (used / total) * 100
        };
      }
    } catch (error) {
      console.error('Erro ao obter uso de disco:', error);
      return {
        used: 0,
        free: 0,
        total: 0,
        percentage: 0
      };
    }
  }
  
  // Executar verificações de saúde
  async runHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    
    // Verificação de memória
    const memoryCheck = await this.checkMemoryUsage();
    checks.push(memoryCheck);
    
    // Verificação de CPU
    const cpuCheck = await this.checkCPUUsage();
    checks.push(cpuCheck);
    
    // Verificação de disco
    const diskCheck = await this.checkDiskUsage();
    checks.push(diskCheck);
    
    // Verificação de conectividade
    const connectivityCheck = await this.checkConnectivity();
    checks.push(connectivityCheck);
    
    return checks;
  }
  
  private async checkMemoryUsage(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedPercentage = ((totalMem - freeMem) / totalMem) * 100;
      
      let status: 'pass' | 'warn' | 'fail' = 'pass';
      let output = `Memory usage: ${usedPercentage.toFixed(2)}%`;
      
      if (usedPercentage > 90) {
        status = 'fail';
        output += ' - Critical memory usage';
      } else if (usedPercentage > 80) {
        status = 'warn';
        output += ' - High memory usage';
      }
      
      return {
        name: 'memory_usage',
        status,
        duration: performance.now() - startTime,
        output,
        details: {
          usedPercentage,
          totalMem,
          freeMem
        }
      };
    } catch (error) {
      return {
        name: 'memory_usage',
        status: 'fail',
        duration: performance.now() - startTime,
        output: 'Failed to check memory usage',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
  
  private async checkCPUUsage(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const cpuUsage = await this.getCPUUsage();
      
      let status: 'pass' | 'warn' | 'fail' = 'pass';
      let output = `CPU usage: ${cpuUsage.toFixed(2)}%`;
      
      if (cpuUsage > 90) {
        status = 'fail';
        output += ' - Critical CPU usage';
      } else if (cpuUsage > 80) {
        status = 'warn';
        output += ' - High CPU usage';
      }
      
      return {
        name: 'cpu_usage',
        status,
        duration: performance.now() - startTime,
        output,
        details: {
          cpuUsage,
          loadAverage: os.loadavg()
        }
      };
    } catch (error) {
      return {
        name: 'cpu_usage',
        status: 'fail',
        duration: performance.now() - startTime,
        output: 'Failed to check CPU usage',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
  
  private async checkDiskUsage(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const diskInfo = await this.getDiskUsage();
      
      let status: 'pass' | 'warn' | 'fail' = 'pass';
      let output = `Disk usage: ${diskInfo.percentage.toFixed(2)}%`;
      
      if (diskInfo.percentage > 95) {
        status = 'fail';
        output += ' - Critical disk usage';
      } else if (diskInfo.percentage > 85) {
        status = 'warn';
        output += ' - High disk usage';
      }
      
      return {
        name: 'disk_usage',
        status,
        duration: performance.now() - startTime,
        output,
        details: diskInfo
      };
    } catch (error) {
      return {
        name: 'disk_usage',
        status: 'fail',
        duration: performance.now() - startTime,
        output: 'Failed to check disk usage',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
  
  private async checkConnectivity(): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      // Verificar conectividade com DNS
      const response = await fetch('https://8.8.8.8', {
        method: 'HEAD'
      });
      
      return {
        name: 'connectivity',
        status: 'pass',
        duration: performance.now() - startTime,
        output: 'Internet connectivity available'
      };
    } catch (error) {
      return {
        name: 'connectivity',
        status: 'warn',
        duration: performance.now() - startTime,
        output: 'Limited or no internet connectivity',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
  
  // Obter status completo de saúde
  async getHealthStatus(): Promise<HealthStatus> {
    const [dbHealth, redisHealth, externalAPIs, metrics, checks] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalAPIs(),
      this.getSystemMetrics(),
      this.runHealthChecks()
    ]);
    
    const services = [dbHealth, redisHealth, ...externalAPIs];
    
    // Determinar status geral
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    const downServices = services.filter(s => s.status === 'down');
    const degradedServices = services.filter(s => s.status === 'degraded');
    const failedChecks = checks.filter(c => c.status === 'fail');
    const warnChecks = checks.filter(c => c.status === 'warn');
    
    if (downServices.length > 0 || failedChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices.length > 0 || warnChecks.length > 0) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      version: this.version,
      environment: this.environment,
      services,
      metrics,
      checks
    };
  }
  
  // Middleware para endpoint de saúde
  healthEndpoint() {
    return async (req: Request, res: Response) => {
      try {
        const healthStatus = await this.getHealthStatus();
        
        const statusCode = healthStatus.status === 'healthy' ? 200 : 
                          healthStatus.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json(healthStatus);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }
  
  // Endpoint simplificado para load balancers
  readinessEndpoint() {
    return async (req: Request, res: Response) => {
      try {
        const [dbHealth, redisHealth] = await Promise.all([
          this.checkDatabase(),
          this.checkRedis()
        ]);
        
        const isReady = dbHealth.status === 'up' && redisHealth.status === 'up';
        
        if (isReady) {
          res.status(200).json({ status: 'ready' });
        } else {
          res.status(503).json({ status: 'not ready' });
        }
      } catch (error) {
        res.status(503).json({ status: 'not ready' });
      }
    };
  }
  
  // Endpoint de liveness
  livenessEndpoint() {
    return (req: Request, res: Response) => {
      res.status(200).json({
        status: 'alive',
        timestamp: Date.now(),
        uptime: Date.now() - this.startTime
      });
    };
  }
}

// Função para criar monitor de saúde
export function createHealthMonitor(prisma: PrismaClient) {
  return new HealthMonitor(prisma);
}

export { HealthMonitor };
export default createHealthMonitor;