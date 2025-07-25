#!/usr/bin/env node

/**
 * Ponto de entrada principal da aplicação Task Manager Backend
 * 
 * Este arquivo é responsável por:
 * - Carregar configurações de ambiente
 * - Inicializar a aplicação
 * - Configurar logging
 * - Tratar erros de inicialização
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createApp } from './app';
import { structuredLogger } from './utils/logger';

// Configurar dotenv para carregar variáveis de ambiente
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

// Logger principal
const logger = structuredLogger.child({ service: 'main' });

/**
 * Função principal para inicializar a aplicação
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting Task Manager Backend...');
    
    // Verificar variáveis de ambiente essenciais
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }
    
    // Criar e inicializar aplicação
    const app = await createApp();
    
    // Iniciar servidor
    await app.start();
    
    logger.info('Task Manager Backend started successfully');
    
  } catch (error) {
    logger.error('Failed to start Task Manager Backend', error as Error);
    
    // Aguardar um pouco para garantir que os logs sejam escritos
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
}

/**
 * Tratamento de sinais do sistema operacional
 */
function setupProcessHandlers(): void {
  // Tratamento de exceções não capturadas
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception - Application will exit', error);
    process.exit(1);
  });
  
  // Tratamento de promises rejeitadas não tratadas
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', new Error(String(reason)), {
      promise: promise.toString()
    });
    // Não sair imediatamente para dar chance de recuperação
  });
  
  // Tratamento de sinais de término
  const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'] as const;
  
  signals.forEach(signal => {
    process.on(signal, () => {
      logger.info(`Received ${signal} signal - initiating graceful shutdown`);
      // O graceful shutdown é tratado na classe Application
    });
  });
  
  // Tratamento de avisos
  process.on('warning', (warning: Error) => {
    logger.warn('Node.js Warning', warning);
  });
}

/**
 * Configurações de performance do Node.js
 */
function setupNodeOptimizations(): void {
  // Configurar limite de listeners para EventEmitter
  require('events').EventEmitter.defaultMaxListeners = 20;
  
  // Configurar timezone se não estiver definido
  if (!process.env.TZ) {
    process.env.TZ = 'UTC';
  }
  
  // Configurar encoding padrão
  if (!process.env.NODE_OPTIONS) {
    process.env.NODE_OPTIONS = '--max-old-space-size=2048';
  }
}

/**
 * Função para exibir informações de inicialização
 */
function displayStartupInfo(): void {
  const nodeVersion = process.version;
  const platform = process.platform;
  const arch = process.arch;
  const pid = process.pid;
  const environment = process.env.NODE_ENV || 'development';
  
  logger.info('System Information', {
    nodeVersion,
    platform,
    arch,
    pid,
    environment,
    cwd: process.cwd(),
    execPath: process.execPath,
    argv: process.argv
  });
  
  // Exibir informações de memória
  const memoryUsage = process.memoryUsage();
  logger.info('Memory Usage', {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
  });
}

/**
 * Inicialização da aplicação
 */
if (require.main === module) {
  // Configurar otimizações do Node.js
  setupNodeOptimizations();
  
  // Configurar tratadores de processo
  setupProcessHandlers();
  
  // Exibir informações de inicialização
  displayStartupInfo();
  
  // Iniciar aplicação principal
  main().catch(error => {
    logger.error('Fatal error during application startup', error);
    process.exit(1);
  });
}

// Exportar função principal para testes
export { main };