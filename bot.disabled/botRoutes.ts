
/**
 * Telegram Bot API routes
 * Mounted at /api/bot/* in routes.ts
 */
import type { Express } from 'express';
import { getBotStatus, initBots, handleHubWebhook, handleAdminWebhook } from './index.js';

function getAdminSecret(): string | undefined {
  return process.env.ADMIN_SECRET?.trim() || undefined;
}

function isAdminSecret(secret?: string) {
  const adminSecret = getAdminSecret();
  return typeof adminSecret === 'string' && adminSecret.length > 0 && secret === adminSecret;
}

export function registerBotRoutes(app: Express) {
  // GET /api/bot/status — check if bots are configured + running
  app.get('/api/bot/status', (_req, res) => {
    res.json(getBotStatus());
  });

  // POST /api/bot/set-tokens — store tokens and (re)start bots
  // Requires admin secret header
  app.post('/api/bot/set-tokens', async (req, res) => {
    const secret = (req.headers['x-admin-secret'] as string) || req.body.secret;
    const { hubToken, adminToken, hubMiniAppUrl, adminIds } = req.body;
    if (!isAdminSecret(secret)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (hubToken)      process.env.TG_HUB_BOT_TOKEN    = hubToken;
    if (adminToken)    process.env.TG_ADMIN_BOT_TOKEN  = adminToken;
    if (hubMiniAppUrl) process.env.HUB_MINI_APP_URL    = hubMiniAppUrl;
    if (adminIds)      process.env.TG_ADMIN_IDS        = adminIds;
    await initBots();
    res.json({ success: true, status: getBotStatus() });
  });

  // POST /api/bot/hub/webhook — Telegram sends updates here (webhook mode)
  app.post('/api/bot/hub/webhook', (req, res) => {
    handleHubWebhook(req.body);
    res.sendStatus(200);
  });

  // POST /api/bot/admin/webhook — Admin bot webhook
  app.post('/api/bot/admin/webhook', (req, res) => {
    handleAdminWebhook(req.body);
    res.sendStatus(200);
  });

  // GET /api/bot/mini-app-config — config sent to the Mini App on launch
  app.get('/api/bot/mini-app-config', (_req, res) => {
    res.json({
      appName: '8×8 Ecosystem Hub',
      version: '3.0.0',
      features: {
        trade: true,
        staking: true,
        nft: true,
        streaming: true,
        terminal: true,
        ai: true,
        radio: true,
        games: true,
      },
      tokens: ['8x8', 'TM8', 'PI', 'BTC', 'ETH', 'SOL', 'TON'],
      miniAppUrl: process.env.HUB_MINI_APP_URL || '',
      hubChannel: process.env.TG_HUB_CHANNEL || '',
    });
  });
}
