/**
 * 8x8 Hub - Ecosystem API Routes
 * Endpoints for ecosystem monitoring and AI interaction
 */

import { Router } from 'express';
import { aiBrain } from '../../src/core/ai/brain';
import { heartMonitor } from '../../src/core/heart/monitor';
import { eyes } from '../../src/core/eyes/sensors';
import { seraphim } from '../../src/core/ecosystem';

const router = Router();

// Get complete ecosystem status
router.get('/status', async (req, res) => {
  try {
    res.json({
      brain: aiBrain.getStatus(),
      vitals: heartMonitor.healthCheck(),
      sensors: eyes.getDashboard(),
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get vitals only
router.get('/vitals', (req, res) => {
  try {
    res.json(heartMonitor.getVitalsArray());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get health check
router.get('/health', (req, res) => {
  try {
    res.json(heartMonitor.healthCheck());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Chat with Seraphim (AI Guide)
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Record activity
    heartMonitor.activity();
    eyes.trackUserAction('seraphim_chat', { messageLength: message.length });

    // Query the AI brain
    const response = await aiBrain.query(
      `As Seraphim, the wise guide of 8x8 Hub, please help with: ${message}`
    );

    eyes.trackAI(aiBrain.getStatus().primaryModel as string, message.length, response.latency);

    res.json({
      response: response.content || response.error || 'I am ready to help.',
      model: response.model,
      latency: response.latency
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Query AI with custom options
router.post('/query', async (req, res) => {
  try {
    const { prompt, model, mode } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    let response;
    switch (mode) {
      case 'think':
        response = await aiBrain.think(prompt);
        break;
      case 'create':
        response = await aiBrain.create(prompt);
        break;
      case 'analyze':
        response = await aiBrain.analyze(prompt, req.body.question || 'Analyze this data');
        break;
      default:
        response = await aiBrain.query(prompt, { model });
    }

    heartMonitor.activity();
    eyes.trackAI(response.model, prompt.length, response.latency);

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get activity events
router.get('/events', (req, res) => {
  try {
    const { type, limit } = req.query;
    
    let events = eyes.getEvents(Number(limit) || 100);
    
    if (type) {
      events = eyes.getEventsByType(type as string);
    }

    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get system state
router.get('/state', (req, res) => {
  try {
    res.json(eyes.getSystemState());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Track custom event
router.post('/track', (req, res) => {
  try {
    const { type, source, data } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    eyes.sense(type, source || 'api', data || {});

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Security event tracking
router.post('/security', (req, res) => {
  try {
    const { event, severity, details } = req.body;

    eyes.trackSecurity(
      event || 'unknown',
      severity || 'low',
      details || {}
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Seraphim status
router.get('/seraphim', (req, res) => {
  try {
    res.json(seraphim.getStatus());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Memory management
router.get('/memory/:key', (req, res) => {
  try {
    const value = aiBrain.recall(req.params.key);
    res.json({ key: req.params.key, value });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/memory/:key', (req, res) => {
  try {
    const { value } = req.body;
    aiBrain.remember(req.params.key, value);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
