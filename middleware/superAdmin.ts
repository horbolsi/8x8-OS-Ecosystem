// server/middleware/superAdmin.ts
// Super Admin middleware - validates FLASH_ADMIN_KEY env var

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to protect super-admin routes.
 * Checks the x-admin-key header against the FLASH_ADMIN_KEY env var.
 * Does NOT expose any secret keys in code or responses.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const providedKey = req.headers['x-admin-key'] as string | undefined;

  // Environment variable check only - no hardcoded secrets
  const adminKey = process.env.FLASH_ADMIN_KEY;

  // Reject immediately if env var is not configured
  if (!adminKey) {
    res.status(503).json({ error: 'Admin panel not configured' });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  if (!providedKey || !timingSafeEqual(providedKey, adminKey)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  next();
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true only if strings are exactly equal in length and content.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
