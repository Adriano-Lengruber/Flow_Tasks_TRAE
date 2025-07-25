import { PrismaClient } from '@prisma/client';
import { getCache } from '../utils/redisCache';
import { structuredLogger } from '../utils/logger';
import { getAuditService } from './auditService';
import config from '../config';
import { EventEmitter } from 'events';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import crypto from 'crypto';
import { URLSearchParams } from 'url';

// Interfaces para integrações
interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  status: IntegrationStatus;
  config: IntegrationConfig;
  credentials: IntegrationCredentials;
  webhookUrl?: string;
  webhookSecret?: string;
  lastSync?: Date;
  lastError?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface IntegrationConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // em minutos
  retryAttempts: number;
  timeout: number; // em ms
  rateLimit: {
    requests: number;
    window: number; // em ms
  };
  features: string[];
  mappings: Record<string, string>;
  filters: Record<string, any>;
}

interface IntegrationCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  webhookSecret?: string;
  customFields?: Record<string, string>;
}

interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  errors: string[];
  duration: number;
  nextSync?: Date;
}

interface WebhookPayload {
  integrationId: string;
  event: string;
  data: any;
  timestamp: Date;
  signature?: string;
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  rateLimit?: {
    remaining: number;
    reset: Date;
  };
}

// Tipos de integração
type IntegrationType = 
  | 'github'
  | 'gitlab'
  | 'slack'
  | 'discord'
  | 'email'
  | 'jira'
  | 'trello'
  | 'asana'
  | 'notion'
  | 'google_drive'
  | 'dropbox'
  | 'webhook'
  | 'custom';

type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending' | 'suspended';

// Classe base para integrações
abstract class BaseIntegration {
  protected integration: Integration;
  protected httpClient: AxiosInstance;
  protected logger = structuredLogger.child({ service: 'integration' });
  protected cache = getCache();
  
  constructor(integration: Integration) {
    this.integration = integration;
    this.httpClient = this.createHttpClient();
  }
  
  // Criar cliente HTTP
  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      timeout: this.integration.config.timeout,
      headers: {
        'User-Agent': 'TaskManager-Integration/1.0',
        'Content-Type': 'application/json'
      }
    });
    
    // Interceptor para rate limiting
    client.interceptors.request.use(async (config) => {
      await this.checkRateLimit();
      return config;
    });
    
    // Interceptor para logging
    client.interceptors.response.use(
      (response) => {
        this.logger.debug('API request successful', {
          integration: this.integration.name,
          url: response.config.url,
          status: response.status
        });
        return response;
      },
      (error) => {
        this.logger.error('API request failed', error, {
          integration: this.integration.name,
          url: error.config?.url,
          status: error.response?.status
        });
        return Promise.reject(error);
      }
    );
    
    return client;
  }
  
  // Verificar rate limit
  private async checkRateLimit(): Promise<void> {
    const key = `rate_limit:${this.integration.id}`;
    const window = this.integration.config.rateLimit.window;
    const maxRequests = this.integration.config.rateLimit.requests;
    
    const current = await this.cache.get(key);
    const count = current ? parseInt(current) : 0;
    
    if (count >= maxRequests) {
      // const ttl = await this.cache.ttl(key); // Method not available
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(window / 1000)} seconds.`);
    }
    
    await this.cache.set(key, (count + 1).toString(), Math.ceil(window / 1000));
  }
  
  // Métodos abstratos
  abstract authenticate(): Promise<boolean>;
  abstract sync(): Promise<SyncResult>;
  abstract handleWebhook(payload: any): Promise<void>;
  abstract validateConfig(): boolean;
  
  // Métodos comuns
  async testConnection(): Promise<boolean> {
    try {
      return await this.authenticate();
    } catch (error) {
      this.logger.error('Connection test failed', error as Error, {
        integration: this.integration.name
      });
      return false;
    }
  }
  
  protected async makeRequest<T = any>(
    config: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.httpClient.request(config);
      
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
        rateLimit: this.extractRateLimit(response.headers)
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status
      };
    }
  }
  
  private extractRateLimit(headers: any): { remaining: number; reset: Date } | undefined {
    const remaining = headers['x-ratelimit-remaining'] || headers['x-rate-limit-remaining'];
    const reset = headers['x-ratelimit-reset'] || headers['x-rate-limit-reset'];
    
    if (remaining && reset) {
      return {
        remaining: parseInt(remaining),
        reset: new Date(parseInt(reset) * 1000)
      };
    }
    
    return undefined;
  }
}

// Integração GitHub
class GitHubIntegration extends BaseIntegration {
  private baseUrl = 'https://api.github.com';
  
  async authenticate(): Promise<boolean> {
    const response = await this.makeRequest({
      method: 'GET',
      url: `${this.baseUrl}/user`,
      headers: {
        'Authorization': `token ${this.integration.credentials.accessToken}`
      }
    });
    
    return response.success;
  }
  
  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      errors: [],
      duration: 0
    };
    
    try {
      // Sincronizar repositórios
      await this.syncRepositories(result);
      
      // Sincronizar issues
      await this.syncIssues(result);
      
      // Sincronizar pull requests
      await this.syncPullRequests(result);
      
      result.success = true;
    } catch (error) {
      result.errors.push((error as Error).message);
    }
    
    result.duration = Date.now() - startTime;
    return result;
  }
  
  private async syncRepositories(result: SyncResult): Promise<void> {
    const response = await this.makeRequest({
      method: 'GET',
      url: `${this.baseUrl}/user/repos`,
      headers: {
        'Authorization': `token ${this.integration.credentials.accessToken}`
      },
      params: {
        sort: 'updated',
        per_page: 100
      }
    });
    
    if (!response.success || !response.data) {
      result.errors.push('Failed to fetch repositories');
      return;
    }
    
    for (const repo of response.data) {
      try {
        // Criar ou atualizar projeto baseado no repositório
        // Implementar lógica de mapeamento
        result.itemsProcessed++;
      } catch (error) {
        result.errors.push(`Failed to sync repository ${repo.name}: ${(error as Error).message}`);
      }
    }
  }
  
  private async syncIssues(result: SyncResult): Promise<void> {
    // Implementar sincronização de issues
    // Mapear issues do GitHub para tarefas do sistema
  }
  
  private async syncPullRequests(result: SyncResult): Promise<void> {
    // Implementar sincronização de pull requests
  }
  
  async handleWebhook(payload: any): Promise<void> {
    const event = payload.action;
    
    switch (event) {
      case 'opened':
      case 'closed':
      case 'reopened':
        await this.handleIssueEvent(payload);
        break;
      case 'synchronize':
        await this.handlePullRequestEvent(payload);
        break;
      default:
        this.logger.debug('Unhandled GitHub webhook event', { event });
    }
  }
  
  private async handleIssueEvent(payload: any): Promise<void> {
    // Implementar tratamento de eventos de issue
  }
  
  private async handlePullRequestEvent(payload: any): Promise<void> {
    // Implementar tratamento de eventos de pull request
  }
  
  validateConfig(): boolean {
    return !!(this.integration.credentials.accessToken);
  }
}

// Integração Slack
class SlackIntegration extends BaseIntegration {
  private baseUrl = 'https://slack.com/api';
  
  async authenticate(): Promise<boolean> {
    const response = await this.makeRequest({
      method: 'POST',
      url: `${this.baseUrl}/auth.test`,
      headers: {
        'Authorization': `Bearer ${this.integration.credentials.accessToken}`
      }
    });
    
    return response.success && response.data?.ok;
  }
  
  async sync(): Promise<SyncResult> {
    // Slack não precisa de sincronização tradicional
    return {
      success: true,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      errors: [],
      duration: 0
    };
  }
  
  async sendMessage(channel: string, message: string, attachments?: any[]): Promise<boolean> {
    const response = await this.makeRequest({
      method: 'POST',
      url: `${this.baseUrl}/chat.postMessage`,
      headers: {
        'Authorization': `Bearer ${this.integration.credentials.accessToken}`
      },
      data: {
        channel,
        text: message,
        attachments
      }
    });
    
    return response.success && response.data?.ok;
  }
  
  async handleWebhook(payload: any): Promise<void> {
    // Implementar tratamento de eventos do Slack
    if (payload.type === 'url_verification') {
      // Verificação de URL do webhook
      return;
    }
    
    // Processar outros eventos
  }
  
  validateConfig(): boolean {
    return !!(this.integration.credentials.accessToken);
  }
}

// Integração de Email
class EmailIntegration extends BaseIntegration {
  async authenticate(): Promise<boolean> {
    // Implementar autenticação SMTP/IMAP
    return true;
  }
  
  async sync(): Promise<SyncResult> {
    // Email não precisa de sincronização
    return {
      success: true,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      errors: [],
      duration: 0
    };
  }
  
  async sendEmail(to: string, subject: string, body: string, isHtml: boolean = false): Promise<boolean> {
    try {
      // Implementar envio de email usando nodemailer ou similar
      this.logger.info('Email sent', { to, subject });
      return true;
    } catch (error) {
      this.logger.error('Failed to send email', error as Error, { to, subject });
      return false;
    }
  }
  
  async handleWebhook(payload: any): Promise<void> {
    // Implementar tratamento de webhooks de email (bounces, opens, etc.)
  }
  
  validateConfig(): boolean {
    return !!(this.integration.credentials.username && this.integration.credentials.password);
  }
}

// Classe principal do serviço de integração
class IntegrationService extends EventEmitter {
  private prisma: PrismaClient;
  private cache = getCache();
  private logger = structuredLogger.child({ service: 'integration' });
  private integrations = new Map<string, Integration>();
  private integrationInstances = new Map<string, BaseIntegration>();
  private syncTimers = new Map<string, NodeJS.Timeout>();
  
  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }
  
  // Inicializar serviço
  async initialize(): Promise<void> {
    await this.loadIntegrations();
    this.setupSyncSchedules();
    
    this.logger.info('Integration service initialized', {
      integrationsCount: this.integrations.size
    });
  }
  
  // Carregar integrações do banco
  private async loadIntegrations(): Promise<void> {
    try {
      const integrations = await this.prisma.integration.findMany({
        where: { status: 'active' }
      });
      
      for (const integration of integrations) {
        const parsed: Integration = {
          ...integration,
          config: JSON.parse(integration.config as string),
          credentials: JSON.parse(integration.credentials as string)
        } as any;
        
        this.integrations.set(integration.id, parsed);
        
        // Criar instância da integração
        const instance = this.createIntegrationInstance(parsed);
        if (instance) {
          this.integrationInstances.set(integration.id, instance);
        }
      }
    } catch (error) {
      this.logger.error('Failed to load integrations', error as Error);
    }
  }
  
  // Criar instância de integração
  private createIntegrationInstance(integration: Integration): BaseIntegration | null {
    switch (integration.type) {
      case 'github':
        return new GitHubIntegration(integration);
      case 'slack':
        return new SlackIntegration(integration);
      case 'email':
        return new EmailIntegration(integration);
      default:
        this.logger.warn('Unsupported integration type', { type: integration.type });
        return null;
    }
  }
  
  // Configurar agendamentos de sincronização
  private setupSyncSchedules(): void {
    for (const [id, integration] of this.integrations) {
      if (integration.config.autoSync && integration.config.syncInterval > 0) {
        const interval = integration.config.syncInterval * 60 * 1000; // Converter para ms
        
        const timer = setInterval(async () => {
          await this.syncIntegration(id);
        }, interval);
        
        this.syncTimers.set(id, timer);
      }
    }
  }
  
  // Criar nova integração
  async createIntegration(
    name: string,
    type: IntegrationType,
    config: Partial<IntegrationConfig>,
    credentials: IntegrationCredentials,
    userId: string
  ): Promise<Integration> {
    const id = crypto.randomUUID();
    
    const defaultConfig: IntegrationConfig = {
      enabled: true,
      autoSync: false,
      syncInterval: 60, // 1 hora
      retryAttempts: 3,
      timeout: 30000, // 30 segundos
      rateLimit: {
        requests: 100,
        window: 60000 // 1 minuto
      },
      features: [],
      mappings: {},
      filters: {}
    };
    
    const integration: Integration = {
      id,
      name,
      type,
      status: 'pending',
      config: { ...defaultConfig, ...config },
      credentials,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Validar configuração
    const instance = this.createIntegrationInstance(integration);
    if (!instance || !instance.validateConfig()) {
      throw new Error('Invalid integration configuration');
    }
    
    // Testar conexão
    const connectionTest = await instance.testConnection();
    if (!connectionTest) {
      throw new Error('Failed to connect to integration');
    }
    
    // Salvar no banco
    await this.prisma.integration.create({
      data: {
        id: integration.id,
        name: integration.name,
        type: integration.type,
        status: 'active',
        config: JSON.stringify(integration.config),
        credentials: JSON.stringify(integration.credentials),
        userId: userId,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt
      }
    });
    
    // Adicionar às integrações ativas
    integration.status = 'active';
    this.integrations.set(id, integration);
    this.integrationInstances.set(id, instance);
    
    // Configurar sincronização se habilitada
    if (integration.config.autoSync) {
      this.setupSyncSchedule(id, integration);
    }
    
    // Registrar auditoria
    const auditService = getAuditService();
    await auditService.log(
      'admin.settings_change',
      'integration',
      id,
      {
        ip: 'system',
        userAgent: 'integration-service'
      },
      {
        action: 'create',
        type,
        name
      }
    );
    
    this.emit('integration:created', integration);
    
    this.logger.info('Integration created', {
      id,
      name,
      type
    });
    
    return integration;
  }
  
  // Configurar agendamento individual
  private setupSyncSchedule(id: string, integration: Integration): void {
    if (this.syncTimers.has(id)) {
      clearInterval(this.syncTimers.get(id)!);
    }
    
    const interval = integration.config.syncInterval * 60 * 1000;
    
    const timer = setInterval(async () => {
      await this.syncIntegration(id);
    }, interval);
    
    this.syncTimers.set(id, timer);
  }
  
  // Sincronizar integração
  async syncIntegration(integrationId: string): Promise<SyncResult> {
    const integration = this.integrations.get(integrationId);
    const instance = this.integrationInstances.get(integrationId);
    
    if (!integration || !instance) {
      throw new Error(`Integration not found: ${integrationId}`);
    }
    
    this.logger.info('Starting integration sync', {
      id: integrationId,
      name: integration.name,
      type: integration.type
    });
    
    try {
      const result = await instance.sync();
      
      // Atualizar última sincronização
      integration.lastSync = new Date();
      integration.lastError = undefined;
      
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: integration.lastSync,
          updatedAt: new Date()
        }
      });
      
      this.emit('integration:synced', integration, result);
      
      this.logger.info('Integration sync completed', {
        id: integrationId,
        result
      });
      
      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      // Atualizar erro
      integration.lastError = errorMessage;
      
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: {
          updatedAt: new Date()
        }
      });
      
      this.emit('integration:error', integration, error);
      
      this.logger.error('Integration sync failed', error as Error, {
        id: integrationId
      });
      
      throw error;
    }
  }
  
  // Processar webhook
  async processWebhook(
    integrationId: string,
    payload: any,
    signature?: string
  ): Promise<void> {
    const integration = this.integrations.get(integrationId);
    const instance = this.integrationInstances.get(integrationId);
    
    if (!integration || !instance) {
      throw new Error(`Integration not found: ${integrationId}`);
    }
    
    // Verificar assinatura se configurada
    if (integration.webhookSecret && signature) {
      const expectedSignature = this.generateWebhookSignature(
        JSON.stringify(payload),
        integration.webhookSecret
      );
      
      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature');
      }
    }
    
    try {
      await instance.handleWebhook(payload);
      
      this.emit('webhook:processed', integration, payload);
      
      this.logger.info('Webhook processed', {
        integrationId,
        event: payload.action || payload.type
      });
    } catch (error) {
      this.emit('webhook:error', integration, payload, error);
      
      this.logger.error('Webhook processing failed', error as Error, {
        integrationId
      });
      
      throw error;
    }
  }
  
  // Gerar assinatura de webhook
  private generateWebhookSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
  
  // Atualizar integração
  async updateIntegration(
    integrationId: string,
    updates: {
      name?: string;
      config?: Partial<IntegrationConfig>;
      credentials?: Partial<IntegrationCredentials>;
      status?: IntegrationStatus;
    }
  ): Promise<Integration> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }
    
    // Atualizar dados
    if (updates.name) integration.name = updates.name;
    if (updates.config) {
      integration.config = { ...integration.config, ...updates.config };
    }
    if (updates.credentials) {
      integration.credentials = { ...integration.credentials, ...updates.credentials };
    }
    if (updates.status) integration.status = updates.status;
    
    integration.updatedAt = new Date();
    
    // Salvar no banco
    await this.prisma.integration.update({
      where: { id: integrationId },
      data: {
        name: integration.name,
        status: integration.status,
        config: JSON.stringify(integration.config),
        credentials: JSON.stringify(integration.credentials),
        updatedAt: integration.updatedAt
      }
    });
    
    // Recriar instância se necessário
    if (updates.config || updates.credentials) {
      const newInstance = this.createIntegrationInstance(integration);
      if (newInstance) {
        this.integrationInstances.set(integrationId, newInstance);
      }
    }
    
    // Reconfigurar sincronização
    if (updates.config?.autoSync !== undefined || updates.config?.syncInterval) {
      if (integration.config.autoSync) {
        this.setupSyncSchedule(integrationId, integration);
      } else {
        const timer = this.syncTimers.get(integrationId);
        if (timer) {
          clearInterval(timer);
          this.syncTimers.delete(integrationId);
        }
      }
    }
    
    this.emit('integration:updated', integration);
    
    this.logger.info('Integration updated', {
      id: integrationId,
      updates: Object.keys(updates)
    });
    
    return integration;
  }
  
  // Deletar integração
  async deleteIntegration(integrationId: string): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }
    
    // Parar sincronização
    const timer = this.syncTimers.get(integrationId);
    if (timer) {
      clearInterval(timer);
      this.syncTimers.delete(integrationId);
    }
    
    // Remover das coleções
    this.integrations.delete(integrationId);
    this.integrationInstances.delete(integrationId);
    
    // Deletar do banco
    await this.prisma.integration.delete({
      where: { id: integrationId }
    });
    
    this.emit('integration:deleted', integration);
    
    this.logger.info('Integration deleted', {
      id: integrationId,
      name: integration.name
    });
  }
  
  // Listar integrações
  getIntegrations(): Integration[] {
    return Array.from(this.integrations.values());
  }
  
  // Obter integração específica
  getIntegration(integrationId: string): Integration | undefined {
    return this.integrations.get(integrationId);
  }
  
  // Obter integrações por tipo
  getIntegrationsByType(type: IntegrationType): Integration[] {
    return Array.from(this.integrations.values())
      .filter(integration => integration.type === type);
  }
  
  // Testar conexão
  async testIntegrationConnection(integrationId: string): Promise<boolean> {
    const instance = this.integrationInstances.get(integrationId);
    if (!instance) {
      throw new Error(`Integration not found: ${integrationId}`);
    }
    
    return await instance.testConnection();
  }
  
  // Obter estatísticas
  getStats(): {
    total: number;
    active: number;
    byType: Record<IntegrationType, number>;
    lastSync: Record<string, Date | undefined>;
  } {
    const integrations = Array.from(this.integrations.values());
    
    const byType = integrations.reduce((acc, integration) => {
      acc[integration.type] = (acc[integration.type] || 0) + 1;
      return acc;
    }, {} as Record<IntegrationType, number>);
    
    const lastSync = integrations.reduce((acc, integration) => {
      acc[integration.id] = integration.lastSync;
      return acc;
    }, {} as Record<string, Date | undefined>);
    
    return {
      total: integrations.length,
      active: integrations.filter(i => i.status === 'active').length,
      byType,
      lastSync
    };
  }
  
  // Finalizar serviço
  async shutdown(): Promise<void> {
    // Parar todos os timers
    for (const timer of this.syncTimers.values()) {
      clearInterval(timer);
    }
    this.syncTimers.clear();
    
    this.logger.info('Integration service shutdown completed');
  }
}

// Singleton instance
let integrationService: IntegrationService;

export function createIntegrationService(prisma: PrismaClient): IntegrationService {
  if (!integrationService) {
    integrationService = new IntegrationService(prisma);
  }
  return integrationService;
}

export function getIntegrationService(): IntegrationService {
  if (!integrationService) {
    throw new Error('IntegrationService not initialized');
  }
  return integrationService;
}

export {
  IntegrationService,
  BaseIntegration,
  GitHubIntegration,
  SlackIntegration,
  EmailIntegration,
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  SyncResult,
  WebhookPayload,
  APIResponse,
  IntegrationType,
  IntegrationStatus
};

export default IntegrationService;