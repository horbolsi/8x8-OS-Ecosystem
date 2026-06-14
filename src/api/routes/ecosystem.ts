/**
 * 8x8 Hub - Ecosystem API Routes
 * Complete REST API for the quantum ecosystem
 */

import { Router, Request, Response } from 'express';
import { aiBrain } from '../../core/ai/brain';
import { aiRouter } from '../../core/ai/router';
import { aiMemory } from '../../core/ai/memory';
import { heartMonitor } from '../../core/heart/monitor';
import { eyes } from '../../core/eyes/sensors';
import { seraphim } from '../../core/ecosystem/seraphim';
import { sessions } from '../../core/utils/sessions';
import { validateTelegramAuth, requireAdmin, rateLimiter, sanitizeInput } from '../../middleware/security';

const router = Router();

/**
 * @route GET /api/ecosystem/status
 * @desc Get complete ecosystem status
 */
router.get('/status', rateLimiter({ max: 200 }), async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      status: {
        initialized: true,
        brain: aiBrain.getStatus(),
        heart: heartMonitor.getMetrics(),
        eyes: eyes.getDashboard(),
        seraphim: seraphim.getStatus(),
        router: aiRouter.getStats(),
        memory: aiMemory.getStats(),
        sessions: sessions.getStats()
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/ecosystem/vitals
 * @desc Get all vital signs
 */
router.get('/vitals', rateLimiter({ max: 200 }), async (req: Request, res: Response) => {
  try {
    const health = heartMonitor.healthCheck();
    res.json({
      success: true,
      vitals: health.vitals,
      status: health.status,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/ecosystem/health
 * @desc Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  const health = heartMonitor.healthCheck();
  
  res.status(health.status === 'critical' ? 503 : 200).json({
    success: health.status !== 'critical',
    status: health.status,
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

/**
 * @route GET /api/ecosystem/events
 * @desc Get recent events
 */
router.get('/events', rateLimiter({ max: 100 }), async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const events = eyes.getEvents(limit);
    
    res.json({
      success: true,
      events,
      count: events.length,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/ecosystem/chat
 * @desc Chat with Seraphim
 */
router.post('/chat', rateLimiter({ max: 50 }), sanitizeInput(), async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const result = await seraphim.chat(message);
    
    res.json({
      success: true,
      ...result,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/ecosystem/query
 * @desc Query AI model directly
 */
router.post('/query', rateLimiter({ max: 30 }), sanitizeInput(), async (req: Request, res: Response) => {
  try {
    const { prompt, model, temperature, maxTokens } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const response = await aiBrain.query(prompt, { model, temperature, maxTokens });
    
    res.json({
      success: response.success,
      content: response.content,
      error: response.error,
      model: response.model,
      latency: response.latency,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/ecosystem/route
 * @desc Route to AI with fallback chain
 */
router.post('/route', rateLimiter({ max: 30 }), sanitizeInput(), async (req: Request, res: Response) => {
  try {
    const { prompt, model, temperature, maxTokens } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const response = await aiRouter.route({
      prompt,
      model,
      temperature,
      maxTokens
    });
    
    res.json({
      success: response.success,
      content: response.content,
      error: response.error,
      model: response.model,
      provider: response.provider,
      latency: response.latency,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/ecosystem/track
 * @desc Track custom event
 */
router.post('/track', rateLimiter({ max: 100 }), async (req: Request, res: Response) => {
  try {
    const { type, source, data } = req.body;
    
    if (!type || !source) {
      return res.status(400).json({ success: false, error: 'Type and source are required' });
    }

    eyes.sense(type, source, data || {});
    
    res.json({
      success: true,
      message: 'Event tracked',
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/ecosystem/track/user
 * @desc Track user action
 */
router.post('/track/user', rateLimiter({ max: 100 }), async (req: Request, res: Response) => {
  try {
    const { action, ...data } = req.body;
    
    if (!action) {
      return res.status(400).json({ success: false, error: 'Action is required' });
    }

    eyes.trackUserAction(action, data);
    heartMonitor.activity();
    
    res.json({
      success: true,
      message: 'User action tracked',
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/ecosystem/security
 * @desc Report security event
 */
router.post('/security', rateLimiter({ max: 50 }), async (req: Request, res: Response) => {
  try {
    const { event, severity, ...details } = req.body;
    
    if (!event) {
      return res.status(400).json({ success: false, error: 'Event is required' });
    }

    eyes.trackSecurity(event, severity || 'low', details);
    
    res.json({
      success: true,
      message: 'Security event logged',
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/memory/:key
 * @desc Get memory value
 */
router.get('/memory/:key', rateLimiter({ max: 100 }), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const value = aiMemory.recall(key);
    
    res.json({
      success: true,
      key,
      value,
      found: value !== null,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/memory/:key
 * @desc Set memory value
 */
router.post('/memory/:key', rateLimiter({ max: 50 }), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value, tags, ttl } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ success: false, error: 'Value is required' });
    }

    const id = aiMemory.store(key, value, { tags, ttl });
    
    res.json({
      success: true,
      key,
      id,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/memory/search
 * @desc Search memory
 */
router.get('/memory/search', rateLimiter({ max: 50 }), async (req: Request, res: Response) => {
  try {
    const { q, limit } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    const results = aiMemory.search(q, parseInt(limit as string) || 10);
    
    res.json({
      success: true,
      query: q,
      results,
      count: results.length,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/providers
 * @desc Get AI providers status
 */
router.get('/providers', rateLimiter({ max: 100 }), async (req: Request, res: Response) => {
  try {
    const providers = aiRouter.getProviders();
    
    res.json({
      success: true,
      providers,
      count: providers.length,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/sessions
 * @desc Get user sessions (admin only)
 */
router.get('/sessions', validateTelegramAuth(), requireAdmin(), async (req: Request, res: Response) => {
  try {
    const allSessions = sessions.getAllSessions();
    
    // Remove sensitive data
    const sanitized = allSessions.map(s => ({
      id: s.id,
      userId: s.userId,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      lastActivity: s.lastActivity,
      permissions: s.permissions,
      isValid: s.expiresAt > Date.now()
    }));
    
    res.json({
      success: true,
      sessions: sanitized,
      count: sanitized.length,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route DELETE /api/sessions/:id
 * @desc Delete a session (admin only)
 */
router.delete('/sessions/:id', validateTelegramAuth(), requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = sessions.deleteSession(id);
    
    res.json({
      success: deleted,
      message: deleted ? 'Session deleted' : 'Session not found',
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/stats
 * @desc Get ecosystem statistics
 */
router.get('/stats', rateLimiter({ max: 50 }), async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      stats: {
        brain: aiBrain.getStatus(),
        router: aiRouter.getStats(),
        memory: aiMemory.getStats(),
        sessions: sessions.getStats(),
        heart: heartMonitor.getMetrics(),
        eyes: {
          events: eyes.getEvents(0).length,
          state: eyes.getSystemState()
        }
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
