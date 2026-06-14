import { Request, Response, NextFunction } from 'express';
import { pool } from '../db.js';

export const isOwner = async (req: Request, res: Response, next: NextFunction) => {
  // Fast admin key check
  const adminKey = req.headers['x-flash-key'] || req.headers['x-admin-key'];
  if (adminKey === process.env.FLASH_ADMIN_KEY) {
    return next();
  }

  // TODO: after implementing Telegram auth, query the user's role from DB
  // For now, allow only if the key matches. In production, replace with real auth.
  res.status(403).json({ error: 'Forbidden – owner only' });
};
