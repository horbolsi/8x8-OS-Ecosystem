import { Router, type Response } from 'express';

const router = Router();

type BroadcastFn = (event: string, data: unknown) => void;
let broadcastFn: BroadcastFn | null = null;

export function setLeaderboardBroadcast(fn: BroadcastFn) {
  broadcastFn = fn;
}

export function calculatePoints(data: {
  tradeVolume?: number;
  stakeAmount?: number;
  referralCount?: number;
  gamesWon?: number;
}): number {
  const tradePoints = data.tradeVolume ? Math.sqrt(Math.max(0, data.tradeVolume)) / 100 : 0;
  const stakePoints = data.stakeAmount ? Math.max(0, data.stakeAmount) * 0.01 : 0;
  const referralPoints = Math.max(0, data.referralCount || 0) * 1000;
  const gamePoints = Math.max(0, data.gamesWon || 0) * 500;
  return Math.floor(tradePoints + stakePoints + referralPoints + gamePoints);
}

function gated(res: Response, action: string) {
  return res.status(403).json({
    success: false,
    code: 'PUBLIC_DEMO_GATED',
    action,
    truth_class: 'LIVE',
    message: 'Administrator, scoring, user-management, and system mutation routes are closed in the public companion.',
  });
}

router.get('/settings', (_req, res) => {
  res.json({ autoCommitEnabled: false, public_demo: true, truth_class: 'LIVE' });
});

router.get('/leaderboard', (_req, res) => {
  res.json({ leaderboard: [], category: 'public-demo', truth_class: 'SIMULATED' });
});

router.get('/users', (_req, res) => gated(res, 'LIST_PRIVATE_USERS'));

const closedPosts = [
  '/update-role',
  '/update-badges',
  '/update-title',
  '/update-features',
  '/toggle-auto-commit',
  '/hooks/trade',
  '/hooks/game',
  '/hooks/stake',
  '/hooks/referral',
  '/leaderboard/recalculate',
];
for (const path of closedPosts) router.post(path, (_req, res) => gated(res, path));

// Retained only for API compatibility. The public companion never broadcasts
// private events or mutates a leaderboard.
void broadcastFn;

export default router;
