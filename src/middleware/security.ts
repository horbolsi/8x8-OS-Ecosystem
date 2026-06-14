/**
 * 8x8 Hub - Security Middleware
 * Rate limiting, DDoS protection, and security headers
 */

import { Request, Response, NextFunction } from 'express';
import { sessions } from '../core/utils/sessions';

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Config
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // requests per window
const AUTH_RATE_LIMIT_MAX = 5; // auth requests per window

/**
 * General rate limiter middleware
 */
export function rateLimiter(options?: {
  windowMs?: number;
  max?: number;
  message?: string;
}) {
  const windowMs = options?.windowMs || RATE_LIMIT_WINDOW;
  const max = options?.max || RATE_LIMIT_MAX;
  const message = options?.message || 'Too many requests, please try again later';

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    let record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(key, record);
    }
    
    record.count++;
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', record.resetTime);
    
    if (record.count > max) {
      return res.status(429).json({
        error: message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    next();
  };
}

/**
 * Strict rate limiter for auth endpoints
 */
export function authRateLimiter() {
  return rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: AUTH_RATE_LIMIT_MAX,
    message: 'Too many authentication attempts, please try again later'
  });
}

/**
 * Validate Telegram initData
 */
export function validateTelegramAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const initData = req.headers['x-telegram-init-data'] as string;
      
      if (!initData) {
        // Check for session token
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
          const session = sessions.validateToken(token);
          if (session) {
            (req as any).session = session;
            (req as any).userId = session.userId;
            return next();
          }
        }
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Parse initData
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      params.delete('hash');

      // Verify hash (simplified - in production use proper HMAC verification)
      const secretKey = await createSecretKey(process.env.BOT_TOKEN || '');
      const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      const { createHmac } = await import('crypto');
      const calculatedHash = createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      if (calculatedHash !== hash) {
        return res.status(401).json({ error: 'Invalid authentication data' });
      }

      // Extract user info
      const user = JSON.parse(params.get('user') || '{}');
      (req as any).telegramUser = user;
      (req as any).userId = user.id;

      next();
    } catch (error) {
      console.error('Telegram auth error:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };
}

/**
 * Create secret key for HMAC
 */
async function createSecretKey(token: string): Promise<Buffer> {
  const { createHmac, randomBytes } = await import('crypto');
  const key = randomBytes(32);
  return createHmac('sha256', key).update(token).digest();
}

/**
 * Admin authentication middleware
 */
export function requireAdmin() {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = (req as any).session;
    
    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!session.permissions.includes('admin') && !session.permissions.includes('owner')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  };
}

/**
 * Role-based access control middleware
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = (req as any).session;
    
    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has any of the required roles
    const hasRole = roles.some(role => session.permissions.includes(role));
    
    if (!hasRole && !session.permissions.includes('admin') && !session.permissions.includes('owner')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Validate request body
 */
export function validateBody(schema: { [key: string]: 'string' | 'number' | 'boolean' | 'object' }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const [key, type] of Object.entries(schema)) {
      const value = req.body[key];
      
      if (value === undefined) continue;

      switch (type) {
        case 'string':
          if (typeof value !== 'string') errors.push(`${key} must be a string`);
          break;
        case 'number':
          if (typeof value !== 'number') errors.push(`${key} must be a number`);
          break;
        case 'boolean':
          if (typeof value !== 'boolean') errors.push(`${key} must be a boolean`);
          break;
        case 'object':
          if (typeof value !== 'object') errors.push(`${key} must be an object`);
          break;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prevent XSS
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Content type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Strict transport security
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://*.inference.sh https://*.openai.com https://*.anthropic.com https://*.openrouter.ai;"
    );

    next();
  };
}

/**
 * Input sanitization middleware
 */
export function sanitizeInput() {
  return (req: Request, res: Response, next: NextFunction) => {
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        // Remove potential XSS vectors
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = Array.isArray(obj) ? [] : {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitize(value);
        }
        return sanitized;
      }
      
      return obj;
    };

    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);

    next();
  };
}

/**
 * CORS configuration
 */
export function corsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://8x8-hub.app',
      'https://*.vercel.app',
      'https://*.render.com'
    ];

    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.some(o => o.includes('*') ? origin.match(o.replace('*', '.*')) : o === origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Init-Data');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  };
}

/**
 * Cleanup rate limit store periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Every hour
