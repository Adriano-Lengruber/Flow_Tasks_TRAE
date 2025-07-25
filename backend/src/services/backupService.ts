import { PrismaClient } from '@prisma/client';
import { getCache } from '../utils/redisCache';
import { structuredLogger } from '../utils/logger';
import { getAuditService } from './auditService';
import config from '../config';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import archiver from 'archiver';
import extract from 'extract-zip';

// Interfaces para backup
interface BackupConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  compression: boolean;
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyPath?: string;
  };
  storage: {
    local: {
      enabled: boolean;
      path: string;
    };
    s3?: {
      enabled: boolean;
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
    ftp?: {
      enabled: boolean;
      host: string;
      port: number;
      username: string;
      password: string;
      path: string;
    };
  };
  includes: {
    database: boolean;
    files: boolean;
    logs: boolean;
    config: boolean;
  };
  excludePatterns: string[];
}

interface BackupMetadata {
  id: string;
  type: BackupType;
  status: BackupStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  size?: number;
  checksum?: string;
  version: string;
  includes: string[];
  error?: string;
  location: {
    local?: string;
    s3?: string;
    ftp?: string;
  };
  metadata: {
    databaseVersion: string;
    recordCounts: Record<string, number>;
    fileCount?: number;
    logCount?: number;
  };
}

interface RestoreOptions {
  backupId: string;
  restoreDatabase: boolean;
  restoreFiles: boolean;
  restoreLogs: boolean;
  restoreConfig: boolean;
  targetPath?: string;
  overwrite: boolean;
  validateIntegrity: boolean;
}

interface BackupProgress {
  stage: string;
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
}

// Tipos de backup
type BackupType = 'full' | 'incremental' | 'differential' | 'manual';
type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Classe principal do serviço de backup
class BackupService extends EventEmitter {
  private prisma: PrismaClient;
  private cache = getCache();
  private logger = structuredLogger.child({ service: 'backup' });
  private config: BackupConfig;
  private isRunning = false;
  private currentBackup?: BackupMetadata;
  private scheduleTimer?: NodeJS.Timeout;
  
  constructor(prisma: PrismaClient, backupConfig: Partial<BackupConfig> = {}) {
    super();
    this.prisma = prisma;
    this.config = this.mergeConfig(backupConfig);
    
    if (this.config.enabled) {
      this.setupSchedule();
    }
  }
  
  // Mesclar configuração padrão
  private mergeConfig(userConfig: Partial<BackupConfig>): BackupConfig {
    const defaultConfig: BackupConfig = {
      enabled: true,
      schedule: '0 2 * * *', // Diariamente às 2h
      retention: {
        daily: 7,
        weekly: 4,
        monthly: 12
      },
      compression: true,
      encryption: {
        enabled: false,
        algorithm: 'aes-256-gcm'
      },
      storage: {
        local: {
          enabled: true,
          path: path.join(process.cwd(), 'backups')
        }
      },
      includes: {
        database: true,
        files: true,
        logs: true,
        config: true
      },
      excludePatterns: [
        '*.tmp',
        '*.log',
        'node_modules/**',
        '.git/**',
        'backups/**'
      ]
    };
    
    return { ...defaultConfig, ...userConfig };
  }
  
  // Configurar agendamento
  private setupSchedule() {
    // Implementação simplificada - em produção usar node-cron
    const scheduleInterval = 24 * 60 * 60 * 1000; // 24 horas
    
    this.scheduleTimer = setInterval(async () => {
      try {
        await this.createBackup('full');
      } catch (error) {
        this.logger.error('Scheduled backup failed', error as Error);
      }
    }, scheduleInterval);
    
    this.logger.info('Backup schedule configured', {
      schedule: this.config.schedule,
      enabled: this.config.enabled
    });
  }
  
  // Criar backup
  async createBackup(
    type: BackupType = 'manual',
    options: {
      includes?: Partial<BackupConfig['includes']>;
      description?: string;
    } = {}
  ): Promise<BackupMetadata> {
    if (this.isRunning) {
      throw new Error('Backup already in progress');
    }
    
    this.isRunning = true;
    
    const backupId = crypto.randomUUID();
    const startTime = new Date();
    
    const metadata: BackupMetadata = {
      id: backupId,
      type,
      status: 'running',
      startTime,
      version: process.env.npm_package_version || '1.0.0',
      includes: [],
      location: {},
      metadata: {
        databaseVersion: '',
        recordCounts: {}
      }
    };
    
    this.currentBackup = metadata;
    
    try {
      this.emit('backup:started', metadata);
      
      // Criar diretório de backup temporário
      const tempDir = path.join(this.config.storage.local.path, 'temp', backupId);
      await fs.mkdir(tempDir, { recursive: true });
      
      const includes = { ...this.config.includes, ...options.includes };
      
      // Backup do banco de dados
      if (includes.database) {
        await this.backupDatabase(tempDir, metadata);
        metadata.includes.push('database');
        this.emitProgress('database', 25, 'Database backup completed');
      }
      
      // Backup de arquivos
      if (includes.files) {
        await this.backupFiles(tempDir, metadata);
        metadata.includes.push('files');
        this.emitProgress('files', 50, 'Files backup completed');
      }
      
      // Backup de logs
      if (includes.logs) {
        await this.backupLogs(tempDir, metadata);
        metadata.includes.push('logs');
        this.emitProgress('logs', 75, 'Logs backup completed');
      }
      
      // Backup de configuração
      if (includes.config) {
        await this.backupConfig(tempDir, metadata);
        metadata.includes.push('config');
        this.emitProgress('config', 85, 'Config backup completed');
      }
      
      // Criar arquivo compactado
      const backupPath = await this.createArchive(tempDir, metadata);
      this.emitProgress('archive', 95, 'Archive created');
      
      // Calcular checksum
      metadata.checksum = await this.calculateChecksum(backupPath);
      
      // Criptografar se habilitado
      if (this.config.encryption.enabled) {
        await this.encryptBackup(backupPath, metadata);
      }
      
      // Obter tamanho do arquivo
      const stats = await fs.stat(backupPath);
      metadata.size = stats.size;
      
      // Armazenar em locais configurados
      await this.storeBackup(backupPath, metadata);
      
      // Limpar diretório temporário
      await fs.rm(tempDir, { recursive: true, force: true });
      
      // Finalizar metadata
      metadata.endTime = new Date();
      metadata.duration = metadata.endTime.getTime() - metadata.startTime.getTime();
      metadata.status = 'completed';
      
      // Salvar metadata no banco
      await this.saveBackupMetadata(metadata);
      
      // Registrar auditoria
      const auditService = getAuditService();
      await auditService.log(
        'system.backup',
        'system',
        backupId,
        {
          ip: 'system',
          userAgent: 'backup-service'
        },
        {
          type,
          size: metadata.size,
          duration: metadata.duration,
          includes: metadata.includes
        }
      );
      
      this.emit('backup:completed', metadata);
      this.emitProgress('completed', 100, 'Backup completed successfully');
      
      this.logger.info('Backup completed successfully', {
        backupId,
        type,
        duration: metadata.duration,
        size: metadata.size
      });
      
      // Limpar backups antigos
      await this.cleanupOldBackups();
      
      return metadata;
      
    } catch (error) {
      metadata.status = 'failed';
      metadata.error = (error as Error).message;
      metadata.endTime = new Date();
      metadata.duration = metadata.endTime.getTime() - metadata.startTime.getTime();
      
      await this.saveBackupMetadata(metadata);
      
      this.emit('backup:failed', metadata, error);
      this.logger.error('Backup failed', error as Error, { backupId });
      
      throw error;
    } finally {
      this.isRunning = false;
      this.currentBackup = undefined;
    }
  }
  
  // Backup do banco de dados
  private async backupDatabase(tempDir: string, metadata: BackupMetadata) {
    const dbBackupPath = path.join(tempDir, 'database.json');
    
    // Obter todas as tabelas e dados
    const tables = ['user', 'project', 'task', 'comment', 'file', 'auditLog'];
    const databaseData: Record<string, any[]> = {};
    
    for (const table of tables) {
      try {
        const data = await (this.prisma as any)[table].findMany();
        databaseData[table] = data;
        metadata.metadata.recordCounts[table] = data.length;
      } catch (error) {
        this.logger.warn(`Failed to backup table ${table}`, error as Error);
        databaseData[table] = [];
        metadata.metadata.recordCounts[table] = 0;
      }
    }
    
    // Adicionar metadata do banco
    metadata.metadata.databaseVersion = await this.getDatabaseVersion();
    
    // Salvar dados
    await fs.writeFile(dbBackupPath, JSON.stringify(databaseData, null, 2));
    
    this.logger.debug('Database backup completed', {
      tables: tables.length,
      totalRecords: Object.values(metadata.metadata.recordCounts).reduce((a, b) => a + b, 0)
    });
  }
  
  // Backup de arquivos
  private async backupFiles(tempDir: string, metadata: BackupMetadata) {
    const filesDir = path.join(tempDir, 'files');
    await fs.mkdir(filesDir, { recursive: true });
    
    // Definir diretórios para backup
    const sourceDirectories = [
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'public'),
      path.join(process.cwd(), 'assets')
    ];
    
    let fileCount = 0;
    
    for (const sourceDir of sourceDirectories) {
      try {
        const exists = await fs.access(sourceDir).then(() => true).catch(() => false);
        if (!exists) continue;
        
        const targetDir = path.join(filesDir, path.basename(sourceDir));
        await this.copyDirectory(sourceDir, targetDir);
        
        const count = await this.countFiles(targetDir);
        fileCount += count;
      } catch (error) {
        this.logger.warn(`Failed to backup directory ${sourceDir}`, error as Error);
      }
    }
    
    metadata.metadata.fileCount = fileCount;
    
    this.logger.debug('Files backup completed', { fileCount });
  }
  
  // Backup de logs
  private async backupLogs(tempDir: string, metadata: BackupMetadata) {
    const logsDir = path.join(tempDir, 'logs');
    await fs.mkdir(logsDir, { recursive: true });
    
    const logSources = [
      path.join(process.cwd(), 'logs'),
      '/var/log/app' // Logs do sistema
    ];
    
    let logCount = 0;
    
    for (const logSource of logSources) {
      try {
        const exists = await fs.access(logSource).then(() => true).catch(() => false);
        if (!exists) continue;
        
        const targetDir = path.join(logsDir, path.basename(logSource));
        await this.copyDirectory(logSource, targetDir);
        
        const count = await this.countFiles(targetDir);
        logCount += count;
      } catch (error) {
        this.logger.warn(`Failed to backup logs from ${logSource}`, error as Error);
      }
    }
    
    metadata.metadata.logCount = logCount;
    
    this.logger.debug('Logs backup completed', { logCount });
  }
  
  // Backup de configuração
  private async backupConfig(tempDir: string, metadata: BackupMetadata) {
    const configDir = path.join(tempDir, 'config');
    await fs.mkdir(configDir, { recursive: true });
    
    const configFiles = [
      '.env.example',
      'package.json',
      'tsconfig.json',
      'prisma/schema.prisma'
    ];
    
    for (const configFile of configFiles) {
      try {
        const sourcePath = path.join(process.cwd(), configFile);
        const targetPath = path.join(configDir, path.basename(configFile));
        
        const exists = await fs.access(sourcePath).then(() => true).catch(() => false);
        if (exists) {
          await fs.copyFile(sourcePath, targetPath);
        }
      } catch (error) {
        this.logger.warn(`Failed to backup config file ${configFile}`, error as Error);
      }
    }
    
    this.logger.debug('Config backup completed');
  }
  
  // Criar arquivo compactado
  private async createArchive(tempDir: string, metadata: BackupMetadata): Promise<string> {
    const timestamp = metadata.startTime.toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${metadata.type}-${timestamp}.tar.gz`;
    const archivePath = path.join(this.config.storage.local.path, filename);
    
    await fs.mkdir(path.dirname(archivePath), { recursive: true });
    
    return new Promise((resolve, reject) => {
      const output = createWriteStream(archivePath);
      const archive = archiver('tar', {
        gzip: this.config.compression,
        gzipOptions: { level: 6 }
      });
      
      output.on('close', () => {
        metadata.location.local = archivePath;
        resolve(archivePath);
      });
      
      archive.on('error', reject);
      archive.pipe(output);
      
      archive.directory(tempDir, false);
      archive.finalize();
    });
  }
  
  // Calcular checksum
  private async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
  
  // Criptografar backup
  private async encryptBackup(backupPath: string, metadata: BackupMetadata) {
    if (!this.config.encryption.enabled) return;
    
    const encryptedPath = `${backupPath}.enc`;
    const key = await this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(this.config.encryption.algorithm, key);
    
    await pipeline(
      createReadStream(backupPath),
      cipher,
      createWriteStream(encryptedPath)
    );
    
    // Remover arquivo não criptografado
    await fs.unlink(backupPath);
    
    // Atualizar metadata
    metadata.location.local = encryptedPath;
    
    this.logger.debug('Backup encrypted', { path: encryptedPath });
  }
  
  // Obter chave de criptografia
  private async getEncryptionKey(): Promise<string> {
    if (this.config.encryption.keyPath) {
      return await fs.readFile(this.config.encryption.keyPath, 'utf8');
    }
    
    // Usar chave do ambiente ou gerar uma
    return process.env.BACKUP_ENCRYPTION_KEY || 'default-key-change-in-production';
  }
  
  // Armazenar backup
  private async storeBackup(backupPath: string, metadata: BackupMetadata) {
    // Armazenamento local já está feito
    
    // Armazenamento S3 (se configurado)
    if (this.config.storage.s3?.enabled) {
      await this.uploadToS3(backupPath, metadata);
    }
    
    // Armazenamento FTP (se configurado)
    if (this.config.storage.ftp?.enabled) {
      await this.uploadToFTP(backupPath, metadata);
    }
  }
  
  // Upload para S3 (placeholder)
  private async uploadToS3(backupPath: string, metadata: BackupMetadata) {
    // Implementação do upload S3
    this.logger.info('S3 upload not implemented yet');
  }
  
  // Upload para FTP (placeholder)
  private async uploadToFTP(backupPath: string, metadata: BackupMetadata) {
    // Implementação do upload FTP
    this.logger.info('FTP upload not implemented yet');
  }
  
  // Salvar metadata do backup
  private async saveBackupMetadata(metadata: BackupMetadata) {
    try {
      await this.prisma.backup.create({
        data: {
          id: metadata.id,
          type: metadata.type,
          status: metadata.status,
          size: metadata.size,
          checksum: metadata.checksum,
          filename: `backup_${metadata.id}.sql`,
          path: `/backups/backup_${metadata.id}.sql`
        }
      });
    } catch (error) {
      this.logger.error('Failed to save backup metadata', error as Error);
    }
  }
  
  // Restaurar backup
  async restoreBackup(options: RestoreOptions): Promise<void> {
    if (this.isRunning) {
      throw new Error('Cannot restore while backup is running');
    }
    
    this.logger.info('Starting backup restoration', { backupId: options.backupId });
    
    try {
      // Buscar metadata do backup
      const backupRecord = await this.prisma.backup.findUnique({
        where: { id: options.backupId }
      });
      
      if (!backupRecord) {
        throw new Error(`Backup not found: ${options.backupId}`);
      }
      
      const metadata: BackupMetadata = {
        ...backupRecord
      } as any;
      
      // Verificar se o arquivo existe
      const backupPath = metadata.location.local;
      if (!backupPath) {
        throw new Error('Backup file location not found');
      }
      
      const exists = await fs.access(backupPath).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }
      
      // Validar integridade se solicitado
      if (options.validateIntegrity && metadata.checksum) {
        const currentChecksum = await this.calculateChecksum(backupPath);
        if (currentChecksum !== metadata.checksum) {
          throw new Error('Backup integrity check failed');
        }
      }
      
      // Extrair backup
      const tempDir = path.join(this.config.storage.local.path, 'restore', options.backupId);
      await fs.mkdir(tempDir, { recursive: true });
      
      await this.extractBackup(backupPath, tempDir, metadata);
      
      // Restaurar componentes
      if (options.restoreDatabase && metadata.includes.includes('database')) {
        await this.restoreDatabase(tempDir);
      }
      
      if (options.restoreFiles && metadata.includes.includes('files')) {
        await this.restoreFiles(tempDir, options.targetPath);
      }
      
      if (options.restoreLogs && metadata.includes.includes('logs')) {
        await this.restoreLogs(tempDir, options.targetPath);
      }
      
      if (options.restoreConfig && metadata.includes.includes('config')) {
        await this.restoreConfig(tempDir, options.targetPath);
      }
      
      // Limpar diretório temporário
      await fs.rm(tempDir, { recursive: true, force: true });
      
      // Registrar auditoria
      const auditService = getAuditService();
      await auditService.log(
        'system.restore',
        'system',
        options.backupId,
        {
          ip: 'system',
          userAgent: 'backup-service'
        },
        {
          backupId: options.backupId,
          restoreOptions: options
        }
      );
      
      this.logger.info('Backup restoration completed', { backupId: options.backupId });
      
    } catch (error) {
      this.logger.error('Backup restoration failed', error as Error, {
        backupId: options.backupId
      });
      throw error;
    }
  }
  
  // Extrair backup
  private async extractBackup(backupPath: string, tempDir: string, metadata: BackupMetadata) {
    // Descriptografar se necessário
    let extractPath = backupPath;
    
    if (this.config.encryption.enabled && backupPath.endsWith('.enc')) {
      extractPath = await this.decryptBackup(backupPath, tempDir);
    }
    
    // Extrair arquivo
    await extract(extractPath, { dir: tempDir });
  }
  
  // Descriptografar backup
  private async decryptBackup(encryptedPath: string, tempDir: string): Promise<string> {
    const decryptedPath = path.join(tempDir, 'decrypted.tar.gz');
    const key = await this.getEncryptionKey();
    
    const decipher = crypto.createDecipher(this.config.encryption.algorithm, key);
    
    await pipeline(
      createReadStream(encryptedPath),
      decipher,
      createWriteStream(decryptedPath)
    );
    
    return decryptedPath;
  }
  
  // Restaurar banco de dados
  private async restoreDatabase(tempDir: string) {
    const dbBackupPath = path.join(tempDir, 'database.json');
    
    const exists = await fs.access(dbBackupPath).then(() => true).catch(() => false);
    if (!exists) {
      throw new Error('Database backup file not found');
    }
    
    const databaseData = JSON.parse(await fs.readFile(dbBackupPath, 'utf8'));
    
    // Restaurar dados por tabela
    for (const [table, data] of Object.entries(databaseData)) {
      try {
        // Limpar tabela existente
        await (this.prisma as any)[table].deleteMany();
        
        // Inserir dados do backup
        if (Array.isArray(data) && data.length > 0) {
          await (this.prisma as any)[table].createMany({ data });
        }
        
        this.logger.debug(`Restored table ${table}`, { records: Array.isArray(data) ? data.length : 0 });
      } catch (error) {
        this.logger.error(`Failed to restore table ${table}`, error as Error);
      }
    }
  }
  
  // Restaurar arquivos
  private async restoreFiles(tempDir: string, targetPath?: string) {
    const filesDir = path.join(tempDir, 'files');
    const target = targetPath || process.cwd();
    
    const exists = await fs.access(filesDir).then(() => true).catch(() => false);
    if (!exists) return;
    
    await this.copyDirectory(filesDir, target);
  }
  
  // Restaurar logs
  private async restoreLogs(tempDir: string, targetPath?: string) {
    const logsDir = path.join(tempDir, 'logs');
    const target = targetPath || path.join(process.cwd(), 'logs');
    
    const exists = await fs.access(logsDir).then(() => true).catch(() => false);
    if (!exists) return;
    
    await this.copyDirectory(logsDir, target);
  }
  
  // Restaurar configuração
  private async restoreConfig(tempDir: string, targetPath?: string) {
    const configDir = path.join(tempDir, 'config');
    const target = targetPath || process.cwd();
    
    const exists = await fs.access(configDir).then(() => true).catch(() => false);
    if (!exists) return;
    
    await this.copyDirectory(configDir, target);
  }
  
  // Listar backups
  async listBackups(filters: {
    type?: BackupType;
    status?: BackupStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): Promise<BackupMetadata[]> {
    const where: any = {};
    
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }
    
    const backups = await this.prisma.backup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50
    });
    
    return backups as any;
  }
  
  // Limpar backups antigos
  async cleanupOldBackups(): Promise<number> {
    let deletedCount = 0;
    
    // Limpar backups diários antigos
    const dailyCutoff = new Date();
    dailyCutoff.setDate(dailyCutoff.getDate() - this.config.retention.daily);
    
    const oldDailyBackups = await this.prisma.backup.findMany({
      where: {
        type: 'full',
        createdAt: { lt: dailyCutoff }
      }
    });
    
    for (const backup of oldDailyBackups) {
      await this.deleteBackup(backup.id);
      deletedCount++;
    }
    
    this.logger.info('Old backups cleaned up', { deletedCount });
    
    return deletedCount;
  }
  
  // Deletar backup
  async deleteBackup(backupId: string): Promise<void> {
    const backup = await this.prisma.backup.findUnique({
      where: { id: backupId }
    });
    
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }
    
    // Deletar arquivo local
    if (backup.path) {
      try {
        await fs.unlink(backup.path);
      } catch (error) {
        this.logger.warn('Failed to delete backup file', error as Error);
      }
    }
    
    // Deletar registro do banco
    await this.prisma.backup.delete({
      where: { id: backupId }
    });
    
    this.logger.info('Backup deleted', { backupId });
  }
  
  // Obter status do backup atual
  getCurrentBackupStatus(): BackupMetadata | null {
    return this.currentBackup || null;
  }
  
  // Cancelar backup em execução
  async cancelCurrentBackup(): Promise<void> {
    if (!this.isRunning || !this.currentBackup) {
      throw new Error('No backup is currently running');
    }
    
    this.currentBackup.status = 'cancelled';
    this.isRunning = false;
    
    this.emit('backup:cancelled', this.currentBackup);
    this.logger.info('Backup cancelled', { backupId: this.currentBackup.id });
  }
  
  // Emitir progresso
  private emitProgress(stage: string, progress: number, message: string) {
    const progressData: BackupProgress = {
      stage,
      progress,
      message
    };
    
    this.emit('backup:progress', progressData);
  }
  
  // Métodos utilitários
  private async copyDirectory(source: string, target: string) {
    await fs.mkdir(target, { recursive: true });
    
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }
  
  private async countFiles(directory: string): Promise<number> {
    let count = 0;
    
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          count += await this.countFiles(path.join(directory, entry.name));
        } else {
          count++;
        }
      }
    } catch (error) {
      // Ignorar erros de acesso
    }
    
    return count;
  }
  
  private async getDatabaseVersion(): Promise<string> {
    try {
      const result = await this.prisma.$queryRaw`SELECT version()` as any[];
      return result[0]?.version || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }
  
  // Finalizar serviço
  async shutdown() {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
    }
    
    if (this.isRunning) {
      await this.cancelCurrentBackup();
    }
    
    this.logger.info('Backup service shutdown completed');
  }
}

// Singleton instance
let backupService: BackupService;

export function createBackupService(
  prisma: PrismaClient,
  config?: Partial<BackupConfig>
): BackupService {
  if (!backupService) {
    backupService = new BackupService(prisma, config);
  }
  return backupService;
}

export function getBackupService(): BackupService {
  if (!backupService) {
    throw new Error('BackupService not initialized');
  }
  return backupService;
}

export {
  BackupService,
  BackupConfig,
  BackupMetadata,
  RestoreOptions,
  BackupProgress,
  BackupType,
  BackupStatus
};

export default BackupService;