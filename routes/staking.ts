/**
 * @title Staking Routes
 * @notice API routes for staking operations
 * @dev Provides endpoints for staking statistics and operations
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Mock staking data (in production, this would query the blockchain)
const STAKING_STATS = {
  totalValueLocked: 12500000,
  totalStakers: 3420,
  averageApy: 24,
  dailyRewards: 8200,
  pools: [
    { id: 0, name: 'Basic Pool', apy: 12, lockDays: 30, tvl: 2500000, stakers: 1200 },
    { id: 1, name: 'Standard Pool', apy: 24, lockDays: 60, tvl: 4500000, stakers: 1500 },
    { id: 2, name: 'Premium Pool', apy: 36, lockDays: 90, tvl: 5500000, stakers: 720 },
  ],
};

// Get overall staking statistics
router.get('/stats', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: STAKING_STATS,
  });
});

// Get specific pool info
router.get('/pools/:poolId', (req: Request, res: Response) => {
  const { poolId } = req.params;
  const pool = STAKING_STATS.pools[parseInt(poolId as string)];
  
  if (!pool) {
    return res.status(404).json({
      success: false,
      error: 'Pool not found',
    });
  }
  
  res.json({
    success: true,
    data: pool,
  });
});

// Get all pools
router.get('/pools', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: STAKING_STATS.pools,
  });
});

// Get user's staking positions (mock)
router.get('/positions/:address', (req: Request, res: Response) => {
  const { address } = req.params;
  
  // In production, query the contract for user's positions
  const mockPositions = [
    {
      poolId: 0,
      positionId: 0,
      amount: 5000,
      startTime: Date.now() - 86400000 * 20,
      lockEnd: Date.now() + 86400000 * 10,
      pendingRewards: 328,
      isUnlocked: false,
    },
    {
      poolId: 1,
      positionId: 0,
      amount: 2500,
      startTime: Date.now() - 86400000 * 45,
      lockEnd: Date.now() + 86400000 * 15,
      pendingRewards: 820,
      isUnlocked: false,
    },
  ];
  
  res.json({
    success: true,
    data: {
      address,
      positions: mockPositions,
      totalStaked: 7500,
      totalRewards: 1148,
    },
  });
});

// Calculate estimated rewards
router.post('/calculate', (req: Request, res: Response) => {
  const { poolId, amount, days } = req.body;
  
  const pool = STAKING_STATS.pools[parseInt(poolId as string)];
  if (!pool) {
    return res.status(400).json({
      success: false,
      error: 'Invalid pool',
    });
  }
  
  const apyDecimal = pool.apy / 100;
  const dailyRate = apyDecimal / 365;
  const estimatedReward = amount * dailyRate * days;
  
  res.json({
    success: true,
    data: {
      poolId: parseInt(poolId as string),
      amount,
      days,
      apy: pool.apy,
      estimatedReward: Math.round(estimatedReward * 100) / 100,
      totalReturn: Math.round((estimatedReward + amount) * 100) / 100,
    },
  });
});

export default router;
