import { Router, type Response } from 'express';

const router = Router();

const PUBLIC_AGENTS = [
  {
    id: 'research',
    name: 'Research Agent',
    description: 'Collects public or read-only evidence and prepares summaries.',
    capabilities: ['research', 'evidence-summary'],
    authority: 'read-only',
    truth_class: 'SIMULATED',
  },
  {
    id: 'code',
    name: 'Code Agent',
    description: 'Prepares reviewable implementation proposals without deployment authority.',
    capabilities: ['code-review', 'implementation-plan'],
    authority: 'proposal-only',
    truth_class: 'SIMULATED',
  },
  {
    id: 'security',
    name: 'Security Agent',
    description: 'Classifies risk and verifies closed gates.',
    capabilities: ['risk-classification', 'gate-review'],
    authority: 'read-only',
    truth_class: 'SIMULATED',
  },
  {
    id: 'web3',
    name: 'Web3 Analysis Agent',
    description: 'Provides simulation-only market and transaction analysis.',
    capabilities: ['simulation', 'risk-analysis'],
    authority: 'simulation-only',
    truth_class: 'SIMULATED',
  },
];

function gated(res: Response, action: string) {
  return res.status(403).json({
    success: false,
    code: 'PUBLIC_DEMO_GATED',
    action,
    truth_class: 'LIVE',
    message: 'Marketplace purchase, execution, licensing, review, and minting are disabled in the public companion.',
  });
}

router.get('/', (_req, res) => {
  res.json({ agents: PUBLIC_AGENTS, truth_class: 'SIMULATED' });
});

router.get('/stats', (_req, res) => {
  res.json({ total_agents: PUBLIC_AGENTS.length, sales: null, executions: null, truth_class: 'SIMULATED' });
});

router.get('/licenses', (_req, res) => {
  res.json({ licenses: [], truth_class: 'SIMULATED' });
});

router.get('/execution/:id', (_req, res) => {
  res.status(404).json({ error: 'Agent execution is disabled in the public companion.', truth_class: 'LIVE' });
});

router.get('/:id/listings', (_req, res) => {
  res.json({ listings: [], truth_class: 'SIMULATED' });
});

router.get('/:id', (req, res) => {
  const agent = PUBLIC_AGENTS.find((candidate) => candidate.id === req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  return res.json(agent);
});

router.post('/', (_req, res) => gated(res, 'REGISTER_AGENT'));
router.patch('/:id', (_req, res) => gated(res, 'UPDATE_AGENT'));
router.post('/:id/listings', (_req, res) => gated(res, 'CREATE_LISTING'));
router.post('/purchase', (_req, res) => gated(res, 'PURCHASE_AGENT'));
router.post('/execute', (_req, res) => gated(res, 'EXECUTE_AGENT'));
router.post('/mint-nft', (_req, res) => gated(res, 'MINT_AGENT_NFT'));
router.post('/review', (_req, res) => gated(res, 'SUBMIT_REVIEW'));

export default router;
