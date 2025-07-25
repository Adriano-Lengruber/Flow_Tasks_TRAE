// Tipos para respostas da API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  timestamp: string;
  requestId?: string;
  version?: string;
  pagination?: PaginationMetadata;
  rateLimit?: RateLimitInfo;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
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

// Tipos para erros da API
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  timestamp: string;
}

export interface ValidationError extends ApiError {
  field: string;
  value?: any;
  constraint?: string;
}

// Tipos para filtros e ordenação
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

// Tipos para webhooks
export interface WebhookResponse {
  received: boolean;
  processed: boolean;
  timestamp: string;
  eventType: string;
  signature?: string;
}

// Builder para respostas da API
export class ApiResponseBuilder<T> {
  private response: Partial<ApiResponse<T>> = {
    success: false
  };

  static success<T>(data: T): ApiResponseBuilder<T> {
    return new ApiResponseBuilder<T>().setSuccess(true).setData(data);
  }

  static error<T>(error: string): ApiResponseBuilder<T> {
    return new ApiResponseBuilder<T>().setSuccess(false).setError(error);
  }

  setSuccess(success: boolean): this {
    this.response.success = success;
    return this;
  }

  setData(data: T): this {
    this.response.data = data;
    return this;
  }

  setMessage(message: string): this {
    this.response.message = message;
    return this;
  }

  setError(error: string): this {
    this.response.error = error;
    return this;
  }

  setMetadata(metadata: ResponseMetadata): this {
    this.response.metadata = metadata;
    return this;
  }

  build(): ApiResponse<T> {
    if (!this.response.metadata) {
      this.response.metadata = {
        timestamp: new Date().toISOString()
      };
    }
    return this.response as ApiResponse<T>;
  }
}

export default ApiResponse;