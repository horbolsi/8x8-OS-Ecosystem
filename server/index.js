// server/index.js — Plain JavaScript entry point for Render
// No TypeScript, no tsx required
import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import http from "http";

const app = express();
const port = parseInt(process.env.HUB_PORT || "3000", 10);
const EFFECTS = Object.freeze({
  liveTrade: false,
  paymentEffect: false,
  walletSigning: false,
  mainnet: false,
  tokenMint: false,
  stakingEffect: false,
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

function secretMatches(provided) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || typeof provided !== "string") return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function gated(res, state, error, extra = {}) {
  return res.status(503).json({ state, error, success: false, ...EFFECTS, ...extra });
}

// Health
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "8x8-hub", ts: Date.now(), effects: EFFECTS });
});

// Auth: no unauthenticated owner-token fabrication.
app.post("/api/hub/auth/telegram", (_req, res) => {
  res.status(503).json({ state: "AUTH_PROVIDER_UNAVAILABLE", authenticated: false, owner: false });
});

// AI
app.post("/api/ai/chat", (req, res) => {
  const lastMsg = req.body?.messages?.slice(-1)[0]?.content || "";
  const policy = "Current source policy: maximum supply 8,888,888; 4.44% only for explicitly defined events; ordinary non-sale/P2P companion-token transfers 0%. Former 4.88% and legacy chain semantics are PAST_PRESERVED.";
  res.json({
    reply: lastMsg ? `Pioneer AI received: "${lastMsg.substring(0, 80)}". ${policy}` : policy,
    source: "SOURCE_POLICY_REFERENCE_ONLY",
    effects: EFFECTS,
  });
});

// Staking
app.get("/api/staking", (_req, res) => {
  res.json({ state: "FUTURE_GATED", availability: "UNAVAILABLE", pools: [], apy: null, ...EFFECTS });
});
app.post("/api/staking", (_req, res) => gated(
  res,
  "FUTURE_GATED",
  "Staking is unavailable; no stake, reward, entitlement, or transaction was created.",
  { txHash: null }
));

// Plans: catalog data is not payment acceptance or entitlement.
app.get("/api/hub/plans", (_req, res) => {
  res.json({
    state: "SOURCE_ONLY_PAYMENT_UNAVAILABLE",
    paymentEffect: false,
    entitlementCreated: false,
    plans: [
      { id: "basic", name: "Basic", price: 4.99, currency: "USDT", duration_days: 30 },
      { id: "pro", name: "Pro", price: 9.99, currency: "USDT", duration_days: 30 },
      { id: "quarterly", name: "Quarterly", price: 8.88, currency: "USDT", duration_days: 90 },
    ],
  });
});

// NFTs
app.get("/api/nfts", (_req, res) => res.json({
  nfts: [],
  count: 0,
  maxSupplyPolicy: 8888888,
  state: "SOURCE_ONLY_NOT_AUDITED_NOT_DEPLOYED",
  minting: false,
  chainProvenanceVerified: false,
}));
app.post("/api/nfts/mint", (_req, res) => gated(
  res,
  "FUTURE_GATED",
  "NFT minting is unavailable; no token, ownership record, or chain transaction was created.",
  { tokenId: null, txHash: null }
));

// Wallet
app.get("/api/wallet/status", (_req, res) => res.json({
  connected: false,
  availability: "UNKNOWN",
  address: null,
  balance: null,
  watchOnly: true,
  walletSigning: false,
  mainnet: false,
}));

// Governance
app.get("/api/governance", (_req, res) => res.json({ proposals: [], state: "SOURCE_ONLY", liveVoting: false }));
app.post("/api/governance", (_req, res) => gated(
  res,
  "FUTURE_GATED",
  "Live governance writes are unavailable; no proposal or vote was created.",
  { governanceEffect: false }
));

// Tokenomics
app.get("/api/tokenomics", (_req, res) => res.json({
  state: "SOURCE_POLICY_REFERENCE_ONLY",
  maxSupplyPolicy: 8888888,
  policyPercent: 4.44,
  policyAppliesOnlyToExplicitlyDefinedEvents: true,
  ordinaryCompanionTokenP2PTransferTaxPercent: 0,
  supersededPolicyPercent: 4.88,
  supersededPolicyState: "PAST_PRESERVED",
  circulatingSupply: null,
  holders: null,
  burnRate: null,
  stakingAPY: null,
  deployed: false,
  audited: false,
  mainnet: false,
}));

// Platforms
app.get("/api/platforms/status", (_req, res) => res.json({
  trading: { status: "UNAVAILABLE", state: "SOURCE_ONLY", liveTrade: false },
  staking: { status: "UNAVAILABLE", state: "FUTURE_GATED", stakingEffect: false },
  nft: { status: "UNAVAILABLE", state: "SOURCE_ONLY_NOT_AUDITED_NOT_DEPLOYED", minting: false },
  governance: { status: "SOURCE_ONLY", liveVoting: false },
  wallet: { status: "UNKNOWN", watchOnly: true, walletSigning: false },
  paymentEffect: false,
  mainnet: false,
}));

// Read-only informational surfaces
app.get("/api/leaderboard", (_req, res) => res.json({ leaderboard: [] }));
app.get("/api/activity", (_req, res) => res.json({ activities: [] }));
app.get("/api/hub/settings", (_req, res) => res.json({ freeMinutes: { minutes: 60 } }));

// Admin: never fall back to a source-embedded secret.
app.post("/api/admin/verify", (req, res) => {
  if (!process.env.ADMIN_SECRET) return res.status(503).json({ state: "ADMIN_AUTH_UNAVAILABLE", authenticated: false });
  if (secretMatches(req.body?.secret)) return res.json({ success: true, role: "admin" });
  res.status(403).json({ error: "Invalid", authenticated: false });
});

// Trade
app.post("/api/trade", (_req, res) => gated(
  res,
  "FUTURE_GATED",
  "Live trading is unavailable; no order, fill, position, or transaction was created.",
  { txHash: null, verifiedExecution: false }
));

// Game: explicitly non-economic simulation.
app.post("/api/game", (_req, res) => res.json({
  state: "SIMULATION_ONLY",
  success: true,
  won: false,
  reward: 0,
  rewardEffect: false,
  entitlementCreated: false,
}));

// Live stream
app.get("/api/live/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.write(`data: ${JSON.stringify({ event: "connected" })}\n\n`);
  const interval = setInterval(() => res.write(`data: ${JSON.stringify({ event: "heartbeat" })}\n\n`), 15000);
  req.on("close", () => clearInterval(interval));
});
app.get("/api/live/snapshot", (_req, res) => res.json({ events: [], count: 0 }));

// System stats
app.get("/api/system/stats", async (_req, res) => {
  const os = await import("os");
  res.json({ system: { cpu: "UNKNOWN", memory: "UNKNOWN", uptime: `${Math.floor(os.uptime())}s`, timestamp: Date.now() } });
});

// Blockchain
app.get("/api/blockchain/transactions", (_req, res) => res.json({
  transactions: [],
  state: "READ_ONLY_NO_CHAIN_OBSERVER",
  chainExecutionVerified: false,
  mainnet: false,
}));
app.post("/api/blockchain/transactions", (_req, res) => gated(
  res,
  "FUTURE_GATED",
  "Blockchain writes are unavailable; no transaction was signed, broadcast, or confirmed.",
  { txHash: null, confirmed: false }
));

// Social, notes and layout remain local response stubs; no external publication is implied.
app.get("/api/social/posts", (_req, res) => res.json({ posts: [] }));
app.post("/api/social/posts", (req, res) => res.json({ id: Date.now(), ...req.body, externalPublication: false }));
app.get("/api/notes", (_req, res) => res.json({ notes: [] }));
app.post("/api/notes", (req, res) => res.json({ id: Date.now(), ...req.body }));
app.delete("/api/notes/:id", (_req, res) => res.json({ success: true }));
app.get("/api/bubbles", (_req, res) => res.json({ bubbles: [] }));
app.post("/api/bubbles", (req, res) => res.json({ id: Date.now(), ...req.body }));
app.get("/api/hub/events", (_req, res) => res.json({ events: [] }));

// Subscription/payment
app.post("/api/hub/subscribe", (_req, res) => gated(
  res,
  "PAYMENT_AND_ENTITLEMENT_GATED",
  "Subscription activation is unavailable until destination, fee, idempotency, finality, refund, recovery, durable entitlement, security, and rollback receipts are verified.",
  { entitlementCreated: false }
));

// Session heartbeat
app.post("/api/hub/session/heartbeat", (_req, res) => res.json({ usageSeconds: 0, blocked: false, state: "SIMULATION_ONLY" }));

// Auth verification cannot invent an owner session.
app.post("/api/hub/auth/verify", (_req, res) => res.status(401).json({ authenticated: false, owner: false }));

// Claim owner requires an explicitly configured secret.
app.post("/api/hub/auth/claim-owner", (req, res) => {
  if (!process.env.ADMIN_SECRET) return res.status(503).json({ state: "OWNER_CLAIM_UNAVAILABLE", authenticated: false });
  if (secretMatches(req.body?.secret)) return res.json({ success: true, user: { role: "owner" } });
  res.status(403).json({ error: "Invalid", authenticated: false });
});

// Wallet-address records are read-only until destination provenance is verified.
app.get("/api/wallet-addresses", (_req, res) => res.json({ addresses: [], state: "UNKNOWN" }));
app.post("/api/admin/wallet-addresses", (_req, res) => gated(
  res,
  "DESTINATION_PROVENANCE_REQUIRED",
  "Wallet-address mutation is unavailable until destination provenance and rollback are verified."
));

// Compatibility staking/referral routes
app.post("/api/stake", (_req, res) => gated(
  res,
  "FUTURE_GATED",
  "Staking is unavailable; no stake, reward, entitlement, or transaction was created.",
  { txHash: null }
));
app.post("/api/referral", (_req, res) => res.json({
  state: "SIMULATION_ONLY",
  success: false,
  reward: 0,
  rewardEffect: false,
  entitlementCreated: false,
}));

const server = http.createServer(app);
server.listen(port, "0.0.0.0", () => {
  console.log(`8x8 Hub policy-safe runtime on port ${port} | Render`);
});
