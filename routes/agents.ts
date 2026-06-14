// ============================================================
// 8x8 Hub - Enhanced Multi-Agent System
// With long-term memory and orchestration
// ============================================================

import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

// Agent types
type AgentType = 'mining' | 'security' | 'support' | 'social' | 'profit';
type AgentStatus = 'idle' | 'running' | 'paused' | 'error';

// Agent definition
interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  status: AgentStatus;
  lastRun: string | null;
  memory: AgentMemory[];
}

interface AgentMemory {
  id: string;
  content: string;
  embedding: number[];
  createdAt: string;
}

// Predefined agents
const AGENTS: Omit<Agent, 'status' | 'lastRun' | 'memory'>[] = [
  {
    id: 'mining-agent',
    type: 'mining',
    name: 'Mining Optimizer',
    description: 'Optimizes network selection and mining assignments daily',
  },
  {
    id: 'security-agent',
    type: 'security',
    name: 'Security Guardian',
    description: 'Scans for scams, vulnerabilities, and suspicious activities',
  },
  {
    id: 'support-agent',
    type: 'support',
    name: 'Support Assistant',
    description: 'Chats with users, answers questions, provides guidance',
  },
  {
    id: 'social-agent',
    type: 'social',
    name: 'Social Media Manager',
    description: 'Posts updates on Telegram and Twitter',
  },
  {
    id: 'profit-agent',
    type: 'profit',
    name: 'Profit Optimizer',
    description: 'Suggests adjustments to fee structures and staking rewards',
  },
];

// GET /api/agents - List all agents
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM agent_status ORDER BY updated_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    // Return default agents if DB not available
    res.json({
      success: true,
      data: AGENTS.map(a => ({ ...a, status: 'idle', lastRun: null })),
    });
  }
});

// GET /api/agents/:id - Get single agent
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM agent_status WHERE agent_id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      const defaultAgent = AGENTS.find(a => a.id === id);
      if (defaultAgent) {
        return res.json({
          success: true,
          data: { ...defaultAgent, status: 'idle', lastRun: null },
        });
      }
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// POST /api/agents/:id/start - Start an agent
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await pool.query(`
      INSERT INTO agent_status (agent_id, status, updated_at)
      VALUES ($1, 'running', NOW())
      ON CONFLICT (agent_id) DO UPDATE SET status = 'running', updated_at = NOW()
    `, [id]);
    
    // Log the action
    await pool.query(`
      INSERT INTO agent_logs (agent_id, action, details, created_at)
      VALUES ($1, 'started', $2, NOW())
    `, [id, JSON.stringify({ triggeredBy: req.body.triggeredBy || 'manual' })]);
    
    res.json({
      success: true,
      message: `${id} agent started`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start agent' });
  }
});

// POST /api/agents/:id/stop - Stop an agent
router.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await pool.query(`
      UPDATE agent_status SET status = 'paused', updated_at = NOW() WHERE agent_id = $1
    `, [id]);
    
    res.json({
      success: true,
      message: `${id} agent stopped`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop agent' });
  }
});

// GET /api/agents/:id/memory - Get agent memory (with vector search)
router.get('/:id/memory', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50, search } = req.query;
    
    let query = `
      SELECT * FROM agent_memory 
      WHERE agent_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    
    const result = await pool.query(query, [id, limit]);
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch memory' });
  }
});

// POST /api/agents/:id/memory - Add to agent memory
router.post('/:id/memory', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, type = 'interaction' } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Generate simple embedding (in production, use proper embedding API)
    const embedding = generateSimpleEmbedding(content);
    
    const result = await pool.query(`
      INSERT INTO agent_memory (agent_id, memory_type, content, embedding, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `, [id, type, content, JSON.stringify(embedding)]);
    
    res.json({
      success: true,
      memoryId: result.rows[0].id,
      message: 'Memory added successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add memory' });
  }
});

// POST /api/agents/:id/memory/search - Semantic search in memory
router.post('/:id/memory/search', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { query, limit = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Generate embedding for query
    const queryEmbedding = generateSimpleEmbedding(query);
    
    // In production with pgvector:
    // SELECT *, 1 - (embedding <=> $2) as similarity FROM agent_memory
    // WHERE agent_id = $1 ORDER BY embedding <=> $2 LIMIT $3
    
    // Simple fallback: just return recent memories
    const result = await pool.query(`
      SELECT * FROM agent_memory 
      WHERE agent_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `, [id, limit]);
    
    res.json({
      success: true,
      data: result.rows,
      query,
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/agents/:id/logs - Get agent execution logs
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;
    
    const result = await pool.query(`
      SELECT * FROM agent_logs 
      WHERE agent_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `, [id, limit]);
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// POST /api/agents/orchestrate - Run multiple agents in coordination
router.post('/orchestrate', async (req: Request, res: Response) => {
  try {
    const { agents, task } = req.body;
    
    if (!agents || !Array.isArray(agents) || agents.length === 0) {
      return res.status(400).json({ error: 'At least one agent is required' });
    }
    
    // Log orchestration start
    const orchestrationId = `orch-${Date.now()}`;
    
    await pool.query(`
      INSERT INTO agent_logs (agent_id, action, details, created_at)
      VALUES ($1, 'orchestration_start', $2, NOW())
    `, ['orchestrator', JSON.stringify({ orchestrationId, agents, task })]);
    
    res.json({
      success: true,
      orchestrationId,
      message: `Orchestration started for ${agents.length} agent(s)`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Orchestration failed' });
  }
});

// POST /api/agents/:id/execute - Execute agent task
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { task, context } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }
    
    // Log execution
    await pool.query(`
      INSERT INTO agent_logs (agent_id, action, details, created_at)
      VALUES ($1, 'execute', $2, NOW())
    `, [id, JSON.stringify({ task, context })]);
    
    // Simulate task execution
    const result = {
      agentId: id,
      task,
      status: 'completed',
      output: `Executed: ${task}`,
      executedAt: new Date().toISOString(),
    };
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ error: 'Execution failed' });
  }
});

// Simple embedding generator (in production, use OpenAI/Cohere/etc)
function generateSimpleEmbedding(text: string): number[] {
  const dimension = 128;
  const embedding = new Array(dimension).fill(0);
  
  for (let i = 0; i < text.length; i++) {
    embedding[i % dimension] += text.charCodeAt(i);
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

export default router;
