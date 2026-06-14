/**
 * Agent Marketplace API Routes
 */

import { Router } from 'express';
import {
  registerAgent,
  getAgents,
  getAgent,
  updateAgent,
  createListing,
  getListings,
  createEscrow,
  releaseEscrow,
  executeAgent,
  getExecution,
  getUserLicenses,
  hasActiveLicense,
  mintAgentNFT,
  getMarketplaceStats,
  submitReview,
} from '../services/agent-marketplace';

const router = Router();

// Get all agents
router.get('/', async (req, res) => {
  try {
    const { category, verified, featured, search, sortBy } = req.query;
    const agents = await getAgents({
      category: category as string,
      verified: verified === 'true',
      featured: featured === 'true',
      search: search as string,
      sortBy: sortBy as 'rating' | 'sales' | 'newest',
    });
    res.json({ agents });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent by ID
router.get('/:id', async (req, res) => {
  try {
    const agent = await getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get marketplace stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getMarketplaceStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Register new agent
router.post('/', async (req, res) => {
  try {
    const agent = await registerAgent(req.body);
    res.status(201).json(agent);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update agent
router.patch('/:id', async (req, res) => {
  try {
    const { creatorAddress, ...updates } = req.body;
    const agent = await updateAgent(req.params.id, creatorAddress, updates);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get agent listings
router.get('/:id/listings', async (req, res) => {
  try {
    const listings = await getListings(req.params.id);
    res.json(listings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create listing
router.post('/:id/listings', async (req, res) => {
  try {
    const listing = await createListing({
      ...req.body,
      agentId: req.params.id,
    });
    res.status(201).json(listing);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Purchase / Rent agent (creates escrow)
router.post('/purchase', async (req, res) => {
  try {
    const { agentId, buyerAddress, licenseType, price, duration } = req.body;
    
    // Get agent
    const agent = await getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check if already has license
    const hasLicense = await hasActiveLicense(buyerAddress, agentId);
    if (hasLicense && licenseType === 'purchase') {
      return res.status(400).json({ error: 'Already own this agent' });
    }

    // Create escrow
    const escrow = await createEscrow({
      agentId,
      buyerAddress,
      sellerAddress: agent.creatorAddress,
      amount: price,
      currency: 'ETH',
      licenseType,
      duration,
    });

    // Release escrow immediately (in production, wait for blockchain confirmation)
    await releaseEscrow(escrow.id, true);

    res.json({ success: true, escrow, message: 'Purchase successful' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Execute agent
router.post('/execute', async (req, res) => {
  try {
    const { agentId, userAddress, input } = req.body;
    const execution = await executeAgent({ agentId, userAddress, input });
    res.json(execution);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get execution status
router.get('/execution/:id', async (req, res) => {
  try {
    const execution = await getExecution(req.params.id);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user licenses
router.get('/licenses', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }
    const licenses = await getUserLicenses(address as string);
    res.json(licenses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mint agent NFT
router.post('/mint-nft', async (req, res) => {
  try {
    const { agentId, ownerAddress } = req.body;
    const result = await mintAgentNFT(agentId, ownerAddress);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Submit review
router.post('/review', async (req, res) => {
  try {
    const { agentId, userAddress, rating, comment } = req.body;
    await submitReview(agentId, userAddress, rating, comment);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
