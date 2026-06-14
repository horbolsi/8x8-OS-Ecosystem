/**
 * AI Agent Marketplace Service
 * Handles agent registration, listings, execution, and payment escrow
 */

import { storage } from '../storage';
import crypto from 'crypto';

// Types
export interface Agent {
  id: string;
  creatorAddress: string;
  name: string;
  description: string;
  category: string;
  version: string;
  capabilities: string[];
  pricing: {
    purchasePrice: number;      // One-time purchase in ETH/USDC
    rentalPrice: number;       // Per day rental
    executionCost: number;     // Per execution in tokens
    subscriptionPrice: number;  // Monthly subscription
  };
  stats: {
    totalSales: number;
    totalRentals: number;
    totalExecutions: number;
    rating: number;
    reviewCount: number;
  };
  metadata: {
    imageUrl: string;
    bannerUrl: string;
    documentation: string;
    sourceCodeHash: string;
  };
  nft?: {
    tokenId: string;
    collectionAddress: string;
    mintPrice: number;
  };
  status: 'pending' | 'active' | 'suspended' | 'deprecated';
  verified: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentListing {
  id: string;
  agentId: string;
  sellerAddress: string;
  listingType: 'purchase' | 'rental' | 'subscription';
  price: number;
  currency: 'ETH' | 'USDC' | 'TOKEN';
  duration?: number; // For rentals (in days)
  active: boolean;
  createdAt: string;
}

export interface AgentLicense {
  id: string;
  agentId: string;
  ownerAddress: string;
  licenseType: 'purchase' | 'rental' | 'subscription';
  purchasedAt: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'revoked';
}

export interface EscrowTransaction {
  id: string;
  agentId: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: number;
  currency: 'ETH' | 'USDC' | 'TOKEN';
  status: 'pending' | 'released' | 'refunded' | 'disputed';
  releaseCondition: string;
  createdAt: string;
  completedAt?: string;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  userAddress: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  cost: number;
  executionTime: number;
  createdAt: string;
}

// Mock agent data
const MOCK_AGENTS: Agent[] = [
  {
    id: 'agent-001',
    creatorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    name: 'DeFi Trading Master',
    description: 'Advanced DeFi trading agent with arbitrage, yield optimization, and risk management capabilities.',
    category: 'trading',
    version: '2.1.0',
    capabilities: ['swap', 'arbitrage', 'yield-farming', 'portfolio-rebalance', 'risk-analysis'],
    pricing: {
      purchasePrice: 2.5,
      rentalPrice: 0.15,
      executionCost: 0.001,
      subscriptionPrice: 0.5,
    },
    stats: {
      totalSales: 1247,
      totalRentals: 3891,
      totalExecutions: 156789,
      rating: 4.8,
      reviewCount: 892,
    },
    metadata: {
      imageUrl: 'https://picsum.photos/seed/agent1/400/400',
      bannerUrl: 'https://picsum.photos/seed/agent-banner1/1200/400',
      documentation: 'https://docs.8x8-hub.io/agents/defi-trading-master',
      sourceCodeHash: '0xabc123...',
    },
    nft: {
      tokenId: 'NFT-001',
      collectionAddress: '0x1234...',
      mintPrice: 0.1,
    },
    status: 'active',
    verified: true,
    featured: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-03-10T15:30:00Z',
  },
  {
    id: 'agent-002',
    creatorAddress: '0xabc123def456...',
    name: 'NFT Analytics Pro',
    description: 'Real-time NFT market analysis, floor price tracking, and investment recommendations.',
    category: 'analytics',
    version: '1.5.0',
    capabilities: ['floor-tracking', 'portfolio-analysis', 'whale-watching', 'trend-prediction'],
    pricing: {
      purchasePrice: 1.8,
      rentalPrice: 0.1,
      executionCost: 0.0005,
      subscriptionPrice: 0.3,
    },
    stats: {
      totalSales: 856,
      totalRentals: 2341,
      totalExecutions: 89456,
      rating: 4.6,
      reviewCount: 567,
    },
    metadata: {
      imageUrl: 'https://picsum.photos/seed/agent2/400/400',
      bannerUrl: 'https://picsum.photos/seed/agent-banner2/1200/400',
      documentation: 'https://docs.8x8-hub.io/agents/nft-analytics-pro',
      sourceCodeHash: '0xdef456...',
    },
    status: 'active',
    verified: true,
    featured: true,
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-03-08T12:00:00Z',
  },
  {
    id: 'agent-003',
    creatorAddress: '0x789xyz...',
    name: 'Smart Contract Auditor',
    description: 'Automated smart contract security analysis and vulnerability detection.',
    category: 'security',
    version: '3.0.0',
    capabilities: ['static-analysis', 'formal-verification', 'gas-optimization', 'audit-report'],
    pricing: {
      purchasePrice: 5.0,
      rentalPrice: 0.5,
      executionCost: 0.002,
      subscriptionPrice: 1.0,
    },
    stats: {
      totalSales: 423,
      totalRentals: 1205,
      totalExecutions: 34521,
      rating: 4.9,
      reviewCount: 234,
    },
    metadata: {
      imageUrl: 'https://picsum.photos/seed/agent3/400/400',
      bannerUrl: 'https://picsum.photos/seed/agent-banner3/1200/400',
      documentation: 'https://docs.8x8-hub.io/agents/smart-contract-auditor',
      sourceCodeHash: '0xghi789...',
    },
    nft: {
      tokenId: 'NFT-003',
      collectionAddress: '0x5678...',
      mintPrice: 0.25,
    },
    status: 'active',
    verified: true,
    featured: true,
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-03-12T09:00:00Z',
  },
  {
    id: 'agent-004',
    creatorAddress: '0xdef456...',
    name: 'Yield Farming Optimizer',
    description: 'Maximize DeFi yields with automated strategy switching and compound farming.',
    category: 'defi',
    version: '1.8.0',
    capabilities: ['auto-compound', 'strategy-switch', 'impermanent-loss-calculation', 'apy-tracking'],
    pricing: {
      purchasePrice: 2.0,
      rentalPrice: 0.12,
      executionCost: 0.0008,
      subscriptionPrice: 0.4,
    },
    stats: {
      totalSales: 678,
      totalRentals: 1890,
      totalExecutions: 67890,
      rating: 4.7,
      reviewCount: 445,
    },
    metadata: {
      imageUrl: 'https://picsum.photos/seed/agent4/400/400',
      bannerUrl: 'https://picsum.photos/seed/agent-banner4/1200/400',
      documentation: 'https://docs.8x8-hub.io/agents/yield-optimizer',
      sourceCodeHash: '0xjkl012...',
    },
    status: 'active',
    verified: false,
    featured: false,
    createdAt: '2024-02-15T10:00:00Z',
    updatedAt: '2024-03-05T14:00:00Z',
  },
  {
    id: 'agent-005',
    creatorAddress: '0x456ghi...',
    name: 'Governance Voting Assistant',
    description: 'Track and analyze DAO governance proposals with voting recommendations.',
    category: 'governance',
    version: '1.2.0',
    capabilities: ['proposal-tracking', 'voting-analysis', 'delegate-management', 'treasury-report'],
    pricing: {
      purchasePrice: 1.2,
      rentalPrice: 0.08,
      executionCost: 0.0003,
      subscriptionPrice: 0.2,
    },
    stats: {
      totalSales: 345,
      totalRentals: 890,
      totalExecutions: 23456,
      rating: 4.5,
      reviewCount: 123,
    },
    metadata: {
      imageUrl: 'https://picsum.photos/seed/agent5/400/400',
      bannerUrl: 'https://picsum.photos/seed/agent-banner5/1200/400',
      documentation: 'https://docs.8x8-hub.io/agents/governance-assistant',
      sourceCodeHash: '0xmno345...',
    },
    status: 'active',
    verified: true,
    featured: false,
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-11T11:00:00Z',
  },
];

// In-memory storage for demo (replace with database)
let agents = [...MOCK_AGENTS];
let listings: AgentListing[] = [];
let licenses: AgentLicense[] = [];
let escrows: EscrowTransaction[] = [];
let executions: AgentExecution[] = [];

/**
 * Register a new AI agent
 */
export async function registerAgent(data: {
  creatorAddress: string;
  name: string;
  description: string;
  category: string;
  version: string;
  capabilities: string[];
  pricing: Agent['pricing'];
  metadata: Agent['metadata'];
  nft?: Agent['nft'];
}): Promise<Agent> {
  const agent: Agent = {
    id: `agent-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    creatorAddress: data.creatorAddress,
    name: data.name,
    description: data.description,
    category: data.category,
    version: data.version,
    capabilities: data.capabilities,
    pricing: data.pricing,
    stats: {
      totalSales: 0,
      totalRentals: 0,
      totalExecutions: 0,
      rating: 0,
      reviewCount: 0,
    },
    metadata: data.metadata,
    nft: data.nft,
    status: 'pending', // Requires verification
    verified: false,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  agents.push(agent);
  return agent;
}

/**
 * Get all agents with optional filters
 */
export async function getAgents(filters?: {
  category?: string;
  verified?: boolean;
  featured?: boolean;
  search?: string;
  sortBy?: 'rating' | 'sales' | 'newest';
}): Promise<Agent[]> {
  let result = [...agents].filter(a => a.status === 'active');

  if (filters?.category) {
    result = result.filter(a => a.category === filters.category);
  }
  if (filters?.verified !== undefined) {
    result = result.filter(a => a.verified === filters.verified);
  }
  if (filters?.featured !== undefined) {
    result = result.filter(a => a.featured === filters.featured);
  }
  if (filters?.search) {
    const query = filters.search.toLowerCase();
    result = result.filter(a => 
      a.name.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query) ||
      a.capabilities.some(c => c.toLowerCase().includes(query))
    );
  }

  // Sort
  switch (filters?.sortBy) {
    case 'rating':
      result.sort((a, b) => b.stats.rating - a.stats.rating);
      break;
    case 'sales':
      result.sort((a, b) => b.stats.totalSales - a.stats.totalSales);
      break;
    case 'newest':
    default:
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return result;
}

/**
 * Get single agent by ID
 */
export async function getAgent(agentId: string): Promise<Agent | null> {
  return agents.find(a => a.id === agentId) || null;
}

/**
 * Update agent (creator only)
 */
export async function updateAgent(
  agentId: string,
  creatorAddress: string,
  updates: Partial<Agent>
): Promise<Agent | null> {
  const index = agents.findIndex(a => a.id === agentId);
  if (index === -1) return null;
  
  const agent = agents[index];
  if (agent.creatorAddress !== creatorAddress) {
    throw new Error('Unauthorized: Only creator can update');
  }

  agents[index] = {
    ...agent,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return agents[index];
}

/**
 * Create agent listing
 */
export async function createListing(data: {
  agentId: string;
  sellerAddress: string;
  listingType: 'purchase' | 'rental' | 'subscription';
  price: number;
  currency: 'ETH' | 'USDC' | 'TOKEN';
  duration?: number;
}): Promise<AgentListing> {
  const listing: AgentListing = {
    id: `listing-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    agentId: data.agentId,
    sellerAddress: data.sellerAddress,
    listingType: data.listingType,
    price: data.price,
    currency: data.currency,
    duration: data.duration,
    active: true,
    createdAt: new Date().toISOString(),
  };

  listings.push(listing);
  return listing;
}

/**
 * Get listings for an agent
 */
export async function getListings(agentId?: string): Promise<AgentListing[]> {
  if (agentId) {
    return listings.filter(l => l.agentId === agentId && l.active);
  }
  return listings.filter(l => l.active);
}

/**
 * Create escrow for purchase/rental
 */
export async function createEscrow(data: {
  agentId: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: number;
  currency: 'ETH' | 'USDC' | 'TOKEN';
  licenseType: 'purchase' | 'rental' | 'subscription';
  duration?: number;
}): Promise<EscrowTransaction> {
  const escrow: EscrowTransaction = {
    id: `escrow-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    agentId: data.agentId,
    buyerAddress: data.buyerAddress,
    sellerAddress: data.sellerAddress,
    amount: data.amount,
    currency: data.currency,
    status: 'pending',
    releaseCondition: 'delivery_confirmed',
    createdAt: new Date().toISOString(),
  };

  escrows.push(escrow);
  return escrow;
}

/**
 * Release escrow (after delivery confirmation)
 */
export async function releaseEscrow(
  escrowId: string,
  confirmBuyer: boolean
): Promise<EscrowTransaction | null> {
  const escrow = escrows.find(e => e.id === escrowId);
  if (!escrow) return null;

  if (confirmBuyer) {
    escrow.status = 'released';
    escrow.completedAt = new Date().toISOString();
    
    // Create license for buyer
    const license: AgentLicense = {
      id: `license-${Date.now()}`,
      agentId: escrow.agentId,
      ownerAddress: escrow.buyerAddress,
      licenseType: escrow.licenseType as 'purchase' | 'rental' | 'subscription',
      purchasedAt: new Date().toISOString(),
      expiresAt: escrow.licenseType !== 'purchase' 
        ? new Date(Date.now() + (escrow.amount * 24 * 60 * 60 * 1000)).toISOString()
        : undefined,
      status: 'active',
    };
    licenses.push(license);

    // Update agent stats
    const agent = agents.find(a => a.id === escrow.agentId);
    if (agent) {
      if (escrow.licenseType === 'purchase') {
        agent.stats.totalSales++;
      } else {
        agent.stats.totalRentals++;
      }
    }
  } else {
    escrow.status = 'refunded';
    escrow.completedAt = new Date().toISOString();
  }

  return escrow;
}

/**
 * Execute agent
 */
export async function executeAgent(data: {
  agentId: string;
  userAddress: string;
  input: Record<string, any>;
}): Promise<AgentExecution> {
  const agent = agents.find(a => a.id === data.agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }

  // Check license
  const license = licenses.find(l => 
    l.agentId === data.agentId && 
    l.ownerAddress === data.userAddress &&
    l.status === 'active'
  );

  if (!license) {
    throw new Error('No active license. Please purchase or rent this agent.');
  }

  const execution: AgentExecution = {
    id: `exec-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    agentId: data.agentId,
    userAddress: data.userAddress,
    input: data.input,
    status: 'running',
    cost: agent.pricing.executionCost,
    executionTime: 0,
    createdAt: new Date().toISOString(),
  };

  executions.push(execution);

  // Simulate execution (in real implementation, call agent)
  setTimeout(async () => {
    const exec = executions.find(e => e.id === execution.id);
    if (exec) {
      exec.status = 'completed';
      exec.output = { result: 'success', message: 'Agent execution completed' };
      exec.executionTime = Math.floor(Math.random() * 5000) + 1000;
      
      // Update agent stats
      if (agent) {
        agent.stats.totalExecutions++;
      }
    }
  }, 2000);

  return execution;
}

/**
 * Get execution status
 */
export async function getExecution(executionId: string): Promise<AgentExecution | null> {
  return executions.find(e => e.id === executionId) || null;
}

/**
 * Get user licenses
 */
export async function getUserLicenses(userAddress: string): Promise<AgentLicense[]> {
  return licenses.filter(l => l.ownerAddress === userAddress);
}

/**
 * Check if user has active license for agent
 */
export async function hasActiveLicense(userAddress: string, agentId: string): Promise<boolean> {
  const license = licenses.find(l => 
    l.agentId === agentId && 
    l.ownerAddress === userAddress &&
    l.status === 'active'
  );

  if (!license) return false;

  // Check expiration
  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    license.status = 'expired';
    return false;
  }

  return true;
}

/**
 * Mint agent as NFT
 */
export async function mintAgentNFT(
  agentId: string,
  ownerAddress: string
): Promise<{ tokenId: string; collectionAddress: string; txHash: string }> {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }

  // Generate mock NFT data
  const tokenId = `AGENT-NFT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const collectionAddress = process.env.NFT_COLLECTION_ADDRESS || '0x0000000000000000000000000000000000000000';
  const txHash = '0x' + crypto.randomBytes(32).toString('hex');

  // Update agent with NFT info
  agent.nft = {
    tokenId,
    collectionAddress,
    mintPrice: 0.1,
  };

  return { tokenId, collectionAddress, txHash };
}

/**
 * Get marketplace stats
 */
export async function getMarketplaceStats(): Promise<{
  totalAgents: number;
  totalVolume: string;
  totalTransactions: number;
  avgRating: number;
  featuredAgents: Agent[];
}> {
  const activeAgents = agents.filter(a => a.status === 'active');
  const featuredAgents = activeAgents.filter(a => a.featured);
  
  const totalVolume = activeAgents.reduce((sum, a) => {
    return sum + (a.stats.totalSales * a.pricing.purchasePrice);
  }, 0);

  const totalRatings = activeAgents.reduce((sum, a) => sum + a.stats.rating, 0);
  const avgRating = activeAgents.length > 0 ? totalRatings / activeAgents.length : 0;

  return {
    totalAgents: activeAgents.length,
    totalVolume: `${totalVolume.toFixed(2)} ETH`,
    totalTransactions: activeAgents.reduce((sum, a) => sum + a.stats.totalSales + a.stats.totalRentals, 0),
    avgRating: Math.round(avgRating * 10) / 10,
    featuredAgents,
  };
}

/**
 * Submit agent review
 */
export async function submitReview(
  agentId: string,
  userAddress: string,
  rating: number,
  comment: string
): Promise<void> {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }

  // Update agent rating
  const totalScore = agent.stats.rating * agent.stats.reviewCount + rating;
  agent.stats.reviewCount++;
  agent.stats.rating = Math.round((totalScore / agent.stats.reviewCount) * 10) / 10;
}

export default {
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
};
