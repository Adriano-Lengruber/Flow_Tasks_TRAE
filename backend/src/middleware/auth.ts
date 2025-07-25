import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponseBuilder } from '../types/api';
import { structuredLogger } from '../utils/logger';
import config from '../config';

// Interface para usuário autenticado
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

// Estender Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

// Interface para payload do JWT
interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

// Logger específico para autenticação
const logger = structuredLogger.child({ service: 'auth' });

/**
 * Extrai token do header Authorization
 */
function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Formato esperado: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Verifica e decodifica o JWT token
 */
function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
    return decoded;
  } catch (error) {
    logger.warn('Token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      token: token.substring(0, 20) + '...'
    });
    return null;
  }
}

/**
 * Middleware de autenticação obrigatória
 * Requer token JWT válido
 */
export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractTokenFromHeader(req.headers.authorization);
      
      if (!token) {
        logger.warn('Authentication failed: No token provided', {
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(401).json(
          ApiResponseBuilder.error('Authentication required', {
            code: 'MISSING_TOKEN',
            message: 'Authorization token is required'
          })
        );
      }

      const payload = verifyToken(token);
      
      if (!payload) {
        logger.warn('Authentication failed: Invalid token', {
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(401).json(
          ApiResponseBuilder.error('Invalid token', {
            code: 'INVALID_TOKEN',
            message: 'The provided token is invalid or expired'
          })
        );
      }

      // Adicionar usuário ao request
      req.user = {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        permissions: payload.permissions
      };

      logger.debug('User authenticated successfully', {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        url: req.originalUrl,
        method: req.method
      });

      next();
    } catch (error) {
      logger.error('Authentication middleware error', error instanceof Error ? error : undefined);
      
      return res.status(500).json(
        ApiResponseBuilder.error('Internal server error', {
          code: 'AUTH_ERROR',
          message: 'An error occurred during authentication'
        })
      );
    }
  };
}

/**
 * Middleware de autenticação opcional
 * Adiciona usuário ao request se token válido estiver presente
 */
export function optionalAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractTokenFromHeader(req.headers.authorization);
      
      if (token) {
        const payload = verifyToken(token);
        
        if (payload) {
          req.user = {
            id: payload.userId,
            email: payload.email,
            name: payload.name,
            role: payload.role,
            permissions: payload.permissions
          };
          
          logger.debug('Optional auth: User authenticated', {
            userId: payload.userId,
            email: payload.email,
            url: req.originalUrl
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Optional auth middleware error', error instanceof Error ? error : undefined);
      
      // Em caso de erro, continua sem autenticação
      next();
    }
  };
}

/**
 * Middleware para verificar permissões específicas
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(
        ApiResponseBuilder.error('Authentication required', {
          code: 'NOT_AUTHENTICATED',
          message: 'User must be authenticated to access this resource'
        })
      );
    }

    if (!req.user.permissions.includes(permission)) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        requiredPermission: permission,
        userPermissions: req.user.permissions,
        url: req.originalUrl,
        method: req.method
      });
      
      return res.status(403).json(
        ApiResponseBuilder.error('Insufficient permissions', {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Permission '${permission}' is required`,
          requiredPermission: permission
        })
      );
    }

    next();
  };
}

/**
 * Middleware para verificar role específica
 */
export function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(
        ApiResponseBuilder.error('Authentication required', {
          code: 'NOT_AUTHENTICATED',
          message: 'User must be authenticated to access this resource'
        })
      );
    }

    if (req.user.role !== role) {
      logger.warn('Role access denied', {
        userId: req.user.id,
        requiredRole: role,
        userRole: req.user.role,
        url: req.originalUrl,
        method: req.method
      });
      
      return res.status(403).json(
        ApiResponseBuilder.error('Insufficient role', {
          code: 'INSUFFICIENT_ROLE',
          message: `Role '${role}' is required`,
          requiredRole: role,
          userRole: req.user.role
        })
      );
    }

    next();
  };
}

/**
 * Middleware para verificar se usuário é admin
 */
export function requireAdmin() {
  return requireRole('admin');
}

/**
 * Middleware para verificar múltiplas roles
 */
export function requireAnyRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(
        ApiResponseBuilder.error('Authentication required', {
          code: 'NOT_AUTHENTICATED',
          message: 'User must be authenticated to access this resource'
        })
      );
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Multi-role access denied', {
        userId: req.user.id,
        requiredRoles: roles,
        userRole: req.user.role,
        url: req.originalUrl,
        method: req.method
      });
      
      return res.status(403).json(
        ApiResponseBuilder.error('Insufficient role', {
          code: 'INSUFFICIENT_ROLE',
          message: `One of the following roles is required: ${roles.join(', ')}`,
          requiredRoles: roles,
          userRole: req.user.role
        })
      );
    }

    next();
  };
}

/**
 * Middleware para verificar se usuário pode acessar recurso próprio
 */
export function requireOwnershipOrAdmin(userIdParam: string = 'userId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(
        ApiResponseBuilder.error('Authentication required', {
          code: 'NOT_AUTHENTICATED',
          message: 'User must be authenticated to access this resource'
        })
      );
    }

    const targetUserId = req.params[userIdParam];
    const isOwner = req.user.id === targetUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      logger.warn('Ownership/admin access denied', {
        userId: req.user.id,
        targetUserId,
        userRole: req.user.role,
        url: req.originalUrl,
        method: req.method
      });
      
      return res.status(403).json(
        ApiResponseBuilder.error('Access denied', {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own resources or need admin privileges'
        })
      );
    }

    next();
  };
}

/**
 * Utilitário para gerar JWT token
 */
export function generateToken(user: Omit<AuthenticatedUser, 'permissions'> & { permissions?: string[] }): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions || []
  };

  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn || '7d'
  });
}

/**
 * Utilitário para verificar se token está expirado
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Middleware para refresh token
 */
export function refreshTokenMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractTokenFromHeader(req.headers.authorization);
      
      if (!token) {
        return res.status(401).json(
          ApiResponseBuilder.error('Refresh token required', {
            code: 'MISSING_REFRESH_TOKEN'
          })
        );
      }

      // Verificar se é um refresh token válido
      const payload = verifyToken(token);
      
      if (!payload) {
        return res.status(401).json(
          ApiResponseBuilder.error('Invalid refresh token', {
            code: 'INVALID_REFRESH_TOKEN'
          })
        );
      }

      // Gerar novo access token
      const newToken = generateToken({
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        permissions: payload.permissions
      });

      res.json(
        ApiResponseBuilder.success({
          accessToken: newToken,
          expiresIn: config.auth.jwtExpiresIn || '7d'
        }, 'Token refreshed successfully')
      );
    } catch (error) {
      logger.error('Refresh token middleware error', error instanceof Error ? error : undefined);
      
      return res.status(500).json(
        ApiResponseBuilder.error('Internal server error', {
          code: 'REFRESH_ERROR'
        })
      );
    }
  };
}

// Exportar middlewares principais
export default {
  requireAuth,
  optionalAuth,
  requirePermission,
  requireRole,
  requireAdmin,
  requireAnyRole,
  requireOwnershipOrAdmin,
  refreshTokenMiddleware,
  generateToken,
  isTokenExpired
};