import jwt from 'jsonwebtoken';
import { Request } from 'express';
import config from '../config';
import { structuredLogger } from './logger';

const logger = structuredLogger.child({ service: 'auth-utils' });

// Interface para o payload do JWT
export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// Interface para usuário extraído do token
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

/**
 * Extrai o token do cabeçalho Authorization
 */
export function extractTokenFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
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
 * Verifica e decodifica um JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
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
 * Extrai informações do usuário do token JWT na requisição
 */
export function extractUserFromToken(req: Request): AuthUser | null {
  const token = extractTokenFromHeader(req);
  
  if (!token) {
    return null;
  }
  
  const payload = verifyToken(token);
  
  if (!payload) {
    return null;
  }
  
  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role
  };
}

/**
 * Gera um novo JWT token
 */
export function generateToken(user: {
  id: string;
  email: string;
  name: string;
  role?: string;
}): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
  
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
    issuer: 'taskmanager',
    audience: 'taskmanager-users'
  });
}

/**
 * Gera um refresh token
 */
export function generateRefreshToken(userId: string): string {
  const payload = {
    userId,
    type: 'refresh'
  };
  
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.refreshTokenExpiresIn,
    issuer: 'taskmanager',
    audience: 'taskmanager-refresh'
  });
}

/**
 * Verifica se um token é um refresh token válido
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret) as any;
    
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    return { userId: decoded.userId };
  } catch (error) {
    logger.warn('Refresh token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Extrai o IP real do cliente considerando proxies
 */
export function extractClientIP(req: Request): string {
  // Verificar headers de proxy em ordem de prioridade
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const clientIP = req.headers['x-client-ip'];
  
  if (forwardedFor) {
    // X-Forwarded-For pode conter múltiplos IPs separados por vírgula
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }
  
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }
  
  if (clientIP) {
    return Array.isArray(clientIP) ? clientIP[0] : clientIP;
  }
  
  // Fallback para o IP da conexão
  return req.socket.remoteAddress || req.ip || 'unknown';
}

/**
 * Gera um hash seguro para senhas
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcrypt');
  return bcrypt.hash(password, config.auth.bcryptRounds);
}

/**
 * Verifica se uma senha corresponde ao hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hash);
}

/**
 * Valida a força de uma senha
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < config.auth.passwordMinLength) {
    errors.push(`Password must be at least ${config.auth.passwordMinLength} characters long`);
  }
  
  if (config.auth.requirePasswordComplexity) {
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitiza dados do usuário removendo campos sensíveis
 */
export function sanitizeUser(user: any): any {
  const { password, refreshToken, ...sanitized } = user;
  return sanitized;
}

/**
 * Gera um ID de sessão único
 */
export function generateSessionId(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verifica se um email é válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Gera um token de reset de senha
 */
export function generatePasswordResetToken(userId: string): string {
  const payload = {
    userId,
    type: 'password_reset',
    timestamp: Date.now()
  };
  
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: '1h', // Token de reset expira em 1 hora
    issuer: 'taskmanager',
    audience: 'taskmanager-reset'
  });
}

/**
 * Verifica um token de reset de senha
 */
export function verifyPasswordResetToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret) as any;
    
    if (decoded.type !== 'password_reset') {
      return null;
    }
    
    return { userId: decoded.userId };
  } catch (error) {
    logger.warn('Password reset token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

export default {
  extractTokenFromHeader,
  verifyToken,
  extractUserFromToken,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  extractClientIP,
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  sanitizeUser,
  generateSessionId,
  isValidEmail,
  generatePasswordResetToken,
  verifyPasswordResetToken
};