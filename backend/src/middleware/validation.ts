import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { structuredLogger } from '../utils/logger';
import { ApiResponse } from '../types/api';

const logger = structuredLogger.child({ service: 'validation' });

// Interface para opções de validação
interface ValidationOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
  skipValidation?: boolean;
  customErrorMessage?: string;
}

// Interface para resultado de validação
interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: any[];
}

// Classe principal do middleware de validação
class ValidationMiddleware {
  private logger = structuredLogger.child({ service: 'validation' });

  /**
   * Valida dados usando schema Zod
   */
  private validateData(data: any, schema: ZodSchema): ValidationResult {
    try {
      const validatedData = schema.parse(data);
      return {
        success: true,
        data: validatedData
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          errors: error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        };
      }
      
      return {
        success: false,
        errors: [{
          field: 'unknown',
          message: 'Validation error occurred',
          code: 'unknown_error'
        }]
      };
    }
  }

  /**
   * Cria middleware de validação
   */
  createValidationMiddleware(options: ValidationOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Pular validação se especificado
      if (options.skipValidation) {
        return next();
      }

      const validationErrors: any[] = [];
      const validatedData: any = {};

      try {
        // Validar body
        if (options.body) {
          const bodyResult = this.validateData(req.body, options.body);
          if (!bodyResult.success) {
            validationErrors.push(...(bodyResult.errors || []).map(err => ({
              ...err,
              location: 'body'
            })));
          } else {
            validatedData.body = bodyResult.data;
          }
        }

        // Validar query parameters
        if (options.query) {
          const queryResult = this.validateData(req.query, options.query);
          if (!queryResult.success) {
            validationErrors.push(...(queryResult.errors || []).map(err => ({
              ...err,
              location: 'query'
            })));
          } else {
            validatedData.query = queryResult.data;
          }
        }

        // Validar route parameters
        if (options.params) {
          const paramsResult = this.validateData(req.params, options.params);
          if (!paramsResult.success) {
            validationErrors.push(...(paramsResult.errors || []).map(err => ({
              ...err,
              location: 'params'
            })));
          } else {
            validatedData.params = paramsResult.data;
          }
        }

        // Validar headers
        if (options.headers) {
          const headersResult = this.validateData(req.headers, options.headers);
          if (!headersResult.success) {
            validationErrors.push(...(headersResult.errors || []).map(err => ({
              ...err,
              location: 'headers'
            })));
          } else {
            validatedData.headers = headersResult.data;
          }
        }

        // Se há erros de validação, retornar erro
        if (validationErrors.length > 0) {
          this.logger.warn('Validation failed', {
            url: req.originalUrl,
            method: req.method,
            errors: validationErrors,
            userId: (req as any).user?.id
          });

          return res.status(400).json({
            success: false,
            error: options.customErrorMessage || 'Validation failed',
            details: validationErrors,
            message: 'The request contains invalid data. Please check the details and try again.'
          } as ApiResponse<null>);
        }

        // Adicionar dados validados ao request para uso posterior
        (req as any).validatedData = validatedData;

        this.logger.debug('Validation successful', {
          url: req.originalUrl,
          method: req.method,
          userId: (req as any).user?.id
        });

        next();
      } catch (error) {
        this.logger.error('Validation middleware error', error instanceof Error ? error : undefined);

        return res.status(500).json({
          success: false,
          error: 'Internal validation error',
          message: 'An error occurred while validating the request'
        } as ApiResponse<null>);
      }
    };
  }

  /**
   * Middleware para validação de JSON
   */
  validateJSON() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.is('application/json') && req.body) {
        try {
          // Se chegou até aqui, o JSON já foi parseado pelo express.json()
          // Apenas verificar se não está vazio quando esperado
          if (req.method !== 'GET' && req.method !== 'DELETE' && 
              Object.keys(req.body).length === 0) {
            return res.status(400).json({
              success: false,
              error: 'Empty request body',
              message: 'Request body is required for this endpoint'
            } as ApiResponse<null>);
          }
          next();
        } catch (error) {
          this.logger.warn('Invalid JSON in request', {
            url: req.originalUrl,
            method: req.method,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          return res.status(400).json({
            success: false,
            error: 'Invalid JSON',
            message: 'The request body contains invalid JSON'
          } as ApiResponse<null>);
        }
      }
      next();
    };
  }

  /**
   * Middleware para sanitização de dados
   */
  sanitizeInput() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Sanitizar strings no body
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body);
        }

        // Sanitizar query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = this.sanitizeObject(req.query);
        }

        next();
      } catch (error) {
        this.logger.error('Input sanitization error', error instanceof Error ? error : undefined);
        next(); // Continue mesmo com erro de sanitização
      }
    };
  }

  /**
   * Sanitiza um objeto recursivamente
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = this.sanitizeObject(value);
    }
    return sanitized;
  }

  /**
   * Sanitiza um valor individual
   */
  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Remover caracteres perigosos básicos
      return value
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove scripts
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .trim();
    }
    return value;
  }
}

// Instância singleton
const validationMiddleware = new ValidationMiddleware();

// Função principal para criar middleware de validação
export function validateRequest(options: ValidationOptions) {
  return validationMiddleware.createValidationMiddleware(options);
}

// Middleware para validação de JSON
export const validateJSON = validationMiddleware.validateJSON();

// Middleware para sanitização
export const sanitizeInput = validationMiddleware.sanitizeInput();

// Schemas comuns para reutilização
export const commonSchemas = {
  // Schema para ID
  id: z.string().uuid('Invalid ID format'),
  
  // Schema para paginação
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional()
  }),
  
  // Schema para ordenação
  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  }),
  
  // Schema para filtros de data
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }),
  
  // Schema para busca
  search: z.object({
    q: z.string().min(1).optional(),
    fields: z.array(z.string()).optional()
  })
};

// Utilitários para validação
export const validationUtils = {
  /**
   * Combina múltiplos schemas
   */
  combineSchemas: (...schemas: ZodSchema[]) => {
    if (schemas.length === 0) return z.object({});
    if (schemas.length === 1) return schemas[0];
    return schemas.reduce((acc, schema) => z.intersection(acc, schema));
  },
  
  /**
   * Cria schema condicional
   */
  conditionalSchema: (condition: (data: any) => boolean, trueSchema: ZodSchema, falseSchema: ZodSchema) => {
    return z.any().refine((data) => {
      const schema = condition(data) ? trueSchema : falseSchema;
      return schema.safeParse(data).success;
    });
  },
  
  /**
   * Valida array com schema específico
   */
  arrayOf: (itemSchema: ZodSchema, minItems?: number, maxItems?: number) => {
    let schema = z.array(itemSchema);
    if (minItems !== undefined) schema = schema.min(minItems);
    if (maxItems !== undefined) schema = schema.max(maxItems);
    return schema;
  }
};

export default ValidationMiddleware;