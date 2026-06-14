// ============================================================
// Games API Routes - Server-side Game Logic & Leaderboard
// ============================================================

import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// In-memory storage (replace with database in production)
interface GameRecord {
  id: string;
  userId: string;
  username: string;
  gameType: 'coinflip' | 'dice' | 'guess' | 'scratch' | 'wheel';
  betAmount: number;
  result: 'win' | 'loss';
  payout: number;
  serverSeed: string;
  clientSeed: string;
  timestamp: Date;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  totalWins: number;
  totalGames: number;
  totalBet: number;
  totalWon: number;
  biggestWin: number;
  lastPlayed: Date;
}

const gameHistory: GameRecord[] = [];
const leaderboard: Map<string, LeaderboardEntry> = new Map();

// Provably fair hash generation
function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashSeed(seed: string): string {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

function verifyResult(serverSeed: string, clientSeed: string, gameType: string, betChoice?: any): { result: boolean; value: any; hash: string } {
  const combinedSeed = `${serverSeed}:${clientSeed}`;
  const hash = hashSeed(combinedSeed);
  
  let result = false;
  let value: any;

  switch (gameType) {
    case 'coinflip': {
      const hashNum = parseInt(hash.slice(0, 8), 16);
      value = hashNum % 2 === 0 ? 'heads' : 'tails';
      result = betChoice === value;
      break;
    }
    case 'dice': {
      const hashNum = parseInt(hash.slice(0, 8), 16);
      value = (hashNum % 6) + 1;
      if (betChoice.type === 'high') result = value >= 4;
      else if (betChoice.type === 'low') result = value <= 3;
      else if (betChoice.type === 'exact') result = value === betChoice.target;
      break;
    }
    case 'guess': {
      const hashNum = parseInt(hash.slice(0, 8), 16);
      value = (hashNum % 100) + 1;
      result = betChoice.guess === value;
      break;
    }
    case 'scratch': {
      const hashNum = parseInt(hash.slice(0, 8), 16);
      const prizePool = [0, 0, 0, 50, 50, 100, 100, 100, 150, 200, 500];
      value = prizePool[hashNum % prizePool.length];
      result = value >= betChoice.betAmount;
      break;
    }
    case 'wheel': {
      const hashNum = parseInt(hash.slice(0, 8), 16);
      const segments = [0, 2, 0, 5, 0, 3, 0, 10];
      value = segments[hashNum % segments.length];
      result = value > 0;
      break;
    }
  }

  return { result, value, hash };
}

// POST /api/games/seed - Get server seed for new game
router.post('/seed', (req, res) => {
  try {
    const serverSeed = generateServerSeed();
    res.json({
      success: true,
      serverSeed,
      serverSeedHash: hashSeed(serverSeed)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate seed' });
  }
});

// POST /api/games/play - Play a game round
router.post('/play', (req, res) => {
  try {
    const { userId, username, gameType, betAmount, clientSeed, betChoice } = req.body;

    if (!userId || !gameType || !betAmount || !clientSeed) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (betAmount < 10 || betAmount > 100000) {
      return res.status(400).json({ success: false, error: 'Invalid bet amount' });
    }

    const serverSeed = generateServerSeed();
    const { result, value, hash } = verifyResult(serverSeed, clientSeed, gameType, betChoice);

    let payout = 0;
    let multiplier = 1;

    if (result) {
      switch (gameType) {
        case 'coinflip': multiplier = 2; break;
        case 'dice': multiplier = betChoice?.type === 'exact' ? 5 : 1.5; break;
        case 'guess': multiplier = betChoice?.attempts === 3 ? 5 : betChoice?.attempts === 2 ? 3 : 2; break;
        case 'scratch': multiplier = value / betAmount; break;
        case 'wheel': multiplier = value; break;
      }
      payout = Math.floor(betAmount * multiplier);
    }

    // Record game
    const gameRecord: GameRecord = {
      id: crypto.randomUUID(),
      userId,
      username: username || 'Anonymous',
      gameType,
      betAmount,
      result: result ? 'win' : 'loss',
      payout,
      serverSeed,
      clientSeed,
      timestamp: new Date()
    };
    gameHistory.push(gameRecord);

    // Update leaderboard
    const entry = leaderboard.get(userId) || {
      userId,
      username: username || 'Anonymous',
      totalWins: 0,
      totalGames: 0,
      totalBet: 0,
      totalWon: 0,
      biggestWin: 0,
      lastPlayed: new Date()
    };

    entry.totalGames++;
    entry.totalBet += betAmount;
    if (result) {
      entry.totalWins++;
      entry.totalWon += payout;
      if (payout > entry.biggestWin) entry.biggestWin = payout;
    }
    entry.lastPlayed = new Date();
    leaderboard.set(userId, entry);

    res.json({
      success: true,
      result: {
        won: result,
        value,
        payout,
        multiplier,
        hash,
        serverSeed
      },
      leaderboard: {
        rank: getUserRank(userId),
        totalPlayers: leaderboard.size
      }
    });
  } catch (error) {
    console.error('Game error:', error);
    res.status(500).json({ success: false, error: 'Game failed' });
  }
});

// GET /api/games/leaderboard - Get leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const { period = 'all' } = req.query;
    
    const entries = Array.from(leaderboard.values())
      .map(entry => ({
        ...entry,
        winRate: entry.totalGames > 0 ? (entry.totalWins / entry.totalGames) * 100 : 0
      }))
      .sort((a, b) => b.totalWon - a.totalWon)
      .slice(0, 100);

    res.json({
      success: true,
      data: { entries, period }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/games/stats - Get user stats
router.get('/stats/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const entry = leaderboard.get(userId);
    
    if (!entry) {
      return res.json({
        success: true,
        data: {
          totalGames: 0,
          totalWins: 0,
          totalLosses: 0,
          totalBet: 0,
          totalWon: 0,
          winRate: 0,
          biggestWin: 0,
          rank: null
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...entry,
        totalLosses: entry.totalGames - entry.totalWins,
        winRate: entry.totalGames > 0 ? (entry.totalWins / entry.totalGames) * 100 : 0,
        rank: getUserRank(userId)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// GET /api/games/history - Get user's game history
router.get('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    const history = gameHistory
      .filter(g => g.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, Number(limit));

    res.json({ success: true, data: { history } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// Helper function
function getUserRank(userId: string): number {
  const sorted = Array.from(leaderboard.values())
    .sort((a, b) => b.totalWon - a.totalWon);
  return sorted.findIndex(e => e.userId === userId) + 1;
}

export default router;
