// Tipos e interfaces para respostas da API

// Interface principal para respostas da API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
  timestamp?: string;
  requestId?: string;
}

// Interface para respostas paginadas
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Interface para respostas de erro
export interface ErrorResponse extends ApiResponse<null> {
  success: false;
  error: string;
  details?: {
    code?: string;
    field?: string;
    location?: string;
    stack?: string;
  }[];
}

// Interface para respostas de validação
export interface ValidationErrorResponse extends ErrorResponse {
  details: {
    field: string;
    message: string;
    code: string;
    location: 'body' | 'query' | 'params' | 'headers';
    received?: any;
  }[];
}

// Interface para respostas de sucesso
export interface SuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// Interface para metadados de resposta
export interface ResponseMetadata {
  requestId: string;
  timestamp: string;
  duration: number;
  version: string;
  environment: string;
}

// Interface para respostas com metadados
export interface MetadataResponse<T = any> extends ApiResponse<T> {
  metadata: ResponseMetadata;
}

// Tipos para status HTTP
export type HttpStatus = 
  | 200 // OK
  | 201 // Created
  | 204 // No Content
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 409 // Conflict
  | 422 // Unprocessable Entity
  | 429 // Too Many Requests
  | 500 // Internal Server Error
  | 502 // Bad Gateway
  | 503 // Service Unavailable
  | 504; // Gateway Timeout

// Interface para configuração de resposta
export interface ResponseConfig {
  includeMetadata?: boolean;
  includeTimestamp?: boolean;
  includeRequestId?: boolean;
  customHeaders?: Record<string, string>;
}

// Utilitários para criar respostas padronizadas
export class ApiResponseBuilder {
  /**
   * Cria uma resposta de sucesso
   */
  static success<T>(data: T, message?: string, config?: ResponseConfig): SuccessResponse<T> {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      ...(message && { message })
    };

    if (config?.includeTimestamp) {
      response.timestamp = new Date().toISOString();
    }

    return response;
  }

  /**
   * Cria uma resposta de erro
   */
  static error(error: string, details?: any, config?: ResponseConfig): ErrorResponse {
    const response: ErrorResponse = {
      success: false,
      error,
      ...(details && { details })
    };

    if (config?.includeTimestamp) {
      response.timestamp = new Date().toISOString();
    }

    return response;
  }

  /**
   * Cria uma resposta de validação
   */
  static validationError(
    message: string,
    details: ValidationErrorResponse['details'],
    config?: ResponseConfig
  ): ValidationErrorResponse {
    const response: ValidationErrorResponse = {
      success: false,
      error: message,
      details
    };

    if (config?.includeTimestamp) {
      response.timestamp = new Date().toISOString();
    }

    return response;
  }

  /**
   * Cria uma resposta paginada
   */
  static paginated<T>(
    data: T[],
    pagination: PaginatedResponse<T>['pagination'],
    message?: string,
    config?: ResponseConfig
  ): PaginatedResponse<T> {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      pagination,
      ...(message && { message })
    };

    if (config?.includeTimestamp) {
      response.timestamp = new Date().toISOString();
    }

    return response;
  }

  /**
   * Cria uma resposta com metadados
   */
  static withMetadata<T>(
    data: T,
    metadata: ResponseMetadata,
    message?: string
  ): MetadataResponse<T> {
    return {
      success: true,
      data,
      metadata,
      ...(message && { message })
    };
  }
}

// Tipos para filtros comuns
export interface BaseFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface StatusFilter {
  status?: string | string[];
}

// Interface para parâmetros de query comuns
export interface QueryParams extends BaseFilter, DateRangeFilter, StatusFilter {
  [key: string]: any;
}

// Tipos para upload de arquivos
export interface FileUploadResponse {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  url: string;
  uploadedAt: string;
}

// Interface para respostas de health check
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: 'up' | 'down';
    cache: 'up' | 'down';
    external: 'up' | 'down' | 'degraded';
  };
  metrics?: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
}

// Interface para respostas de autenticação
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  permissions: string[];
}

// Interface para respostas de rate limiting
export interface RateLimitResponse {
  limit: number;
  remaining: number;
  reset: string;
  retryAfter?: number;
}

// Tipos para webhooks
export interface WebhookResponse {
  received: boolean;
  processed: boolean;
  timestamp: string;
  eventType: string;
  signature?: string;
}

// Interface para respostas de export
export interface ExportResponse {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  filename: string;
  size: number;
  downloadUrl: string;
  expiresAt: string;
  recordCount: number;
}

// Constantes para mensagens padrão
export const API_MESSAGES = {
  SUCCESS: {
    CREATED: 'Resource created successfully',
    UPDATED: 'Resource updated successfully',
    DELETED: 'Resource deleted successfully',
    RETRIEVED: 'Resource retrieved successfully',
    PROCESSED: 'Request processed successfully'
  },
  ERROR: {
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    VALIDATION: 'Validation failed',
    INTERNAL: 'Internal server error',
    RATE_LIMIT: 'Rate limit exceeded',
    CONFLICT: 'Resource conflict'
  }
} as const;

// Tipos para códigos de erro personalizados
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR'
}

// Interface para erro detalhado
export interface DetailedError {
  code: ErrorCode;
  message: string;
  field?: string;
  value?: any;
  constraint?: string;
  context?: Record<string, any>;
}

export default {
  ApiResponseBuilder,
  API_MESSAGES,
  ErrorCode
};