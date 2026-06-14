import type { Express } from 'express';
import crypto from 'crypto';
import {
  findUserByToken, upsertUser, getUserPermissions,
  getUserSubscription, getSessionUsage, addSessionUsage,
  promoteToOwnerBySecret, getAllSettings,
} from '../hub-db.js';

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function verifyTelegramInitData(initData: string, botToken: string): Record<string, string> | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (calculatedHash !== hash) return null;
    const result: Record<string, string> = {};
    params.forEach((v, k) => { result[k] = v; });
    return result;
  } catch { return null; }
}

export function registerHubAuthRoutes(app: Express) {

  // Authenticate via Telegram WebApp initData
  app.post('/api/hub/auth/telegram', async (req, res) => {
    try {
      const { initData } = req.body;
      if (!initData) return res.status(400).json({ error: 'initData required' });

      const botToken = process.env.TG_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
      let userData: any = null;

      if (botToken) {
        const verified = verifyTelegramInitData(initData, botToken);
        if (!verified) return res.status(401).json({ error: 'Invalid Telegram signature' });
        try { userData = JSON.parse(verified.user || '{}'); } catch { userData = {}; }
      } else {
        // Dev mode: skip verification, parse anyway
        try {
          const params = new URLSearchParams(initData);
          userData = JSON.parse(params.get('user') || '{}');
        } catch { userData = {}; }
      }

      if (!userData.id) return res.status(400).json({ error: 'No user ID in initData' });

      const token = generateToken();
      const user = await upsertUser({
        telegram_id: userData.id,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        photo_url: userData.photo_url,
        session_token: token,
      });

      const [permissions, subscription, settings] = await Promise.all([
        getUserPermissions(user.id),
        getUserSubscription(user.id),
        getAllSettings(),
      ]);

      res.json({ token, user, permissions, subscription, settings });
    } catch (err: any) {
      console.error('Hub auth error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Manual entry (dev/fallback mode — no bot token)
  app.post('/api/hub/auth/manual', async (req, res) => {
    try {
      const { telegram_id, username, first_name } = req.body;
      if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

      const token = generateToken();
      const user = await upsertUser({
        telegram_id: parseInt(String(telegram_id)),
        username: username || `user_${telegram_id}`,
        first_name: first_name || 'Pioneer',
        session_token: token,
      });

      const [permissions, subscription, settings] = await Promise.all([
        getUserPermissions(user.id),
        getUserSubscription(user.id),
        getAllSettings(),
      ]);

      res.json({ token, user, permissions, subscription, settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Verify existing token + return full session data
  app.post('/api/hub/auth/verify', async (req, res) => {
    try {
      const token = req.headers['x-hub-token'] as string || req.body.token;
      if (!token) return res.status(401).json({ error: 'No token' });

      const user = await findUserByToken(token);
      if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
      if (user.is_banned) return res.status(403).json({ error: 'Account banned' });

      const [permissions, subscription, settings, usageSeconds] = await Promise.all([
        getUserPermissions(user.id),
        getUserSubscription(user.id),
        getAllSettings(),
        getSessionUsage(user.id),
      ]);

      res.json({ user, permissions, subscription, settings, usageSeconds });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Heartbeat — track session time (call every 30s)
  app.post('/api/hub/session/heartbeat', async (req, res) => {
    try {
      const token = req.headers['x-hub-token'] as string;
      if (!token) return res.status(401).json({ error: 'No token' });

      const user = await findUserByToken(token);
      if (!user) return res.status(401).json({ error: 'Invalid token' });

      const seconds = parseInt(req.body.seconds || '30');
      await addSessionUsage(user.id, Math.min(seconds, 60));

      const [usageSeconds, subscription] = await Promise.all([
        getSessionUsage(user.id),
        getUserSubscription(user.id),
      ]);

      const freeLimitSeconds = ((await getAllSettings()).free_daily_minutes || 60) * 60;

      res.json({
        usageSeconds,
        subscription,
        blocked: !subscription && usageSeconds >= freeLimitSeconds,
        remainingFreeSeconds: Math.max(0, freeLimitSeconds - usageSeconds),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Claim owner via admin secret
  app.post('/api/hub/auth/claim-owner', async (req, res) => {
    try {
      const token = req.headers['x-hub-token'] as string;
      if (!token) return res.status(401).json({ error: 'No token' });
      const user = await findUserByToken(token);
      if (!user) return res.status(401).json({ error: 'Invalid token' });

      const promoted = await promoteToOwnerBySecret(user.id, req.body.secret);
      if (!promoted) return res.status(403).json({ error: 'Invalid secret' });

      res.json({ success: true, user: promoted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get public events (for all users)
  app.get('/api/hub/events', async (_req, res) => {
    try {
      const { getEvents } = await import('../hub-db.js');
      const events = await getEvents();
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get active plans (for subscription purchase modal)
  app.get('/api/hub/plans', async (_req, res) => {
    try {
      const { getActivePlans } = await import('../hub-db.js');
      const plans = await getActivePlans();
      res.json(plans);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Subscribe (user submits payment reference)
  app.post('/api/hub/subscribe', async (req, res) => {
    try {
      const token = req.headers['x-hub-token'] as string;
      if (!token) return res.status(401).json({ error: 'No token' });
      const user = await findUserByToken(token);
      if (!user) return res.status(401).json({ error: 'Invalid token' });

      const { plan_id, payment_ref, payment_token, payment_amount } = req.body;
      if (!plan_id) return res.status(400).json({ error: 'plan_id required' });

      const { createSubscription } = await import('../hub-db.js');
      const sub = await createSubscription(user.id, plan_id, payment_ref || 'pending', payment_token || 'USDT', payment_amount || 0);
      res.json(sub);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
