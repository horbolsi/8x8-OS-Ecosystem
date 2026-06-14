// server/index.js — Plain JavaScript entry point for Render
// No TypeScript, no tsx required
import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import http from "http";

const app = express();
const port = parseInt(process.env.HUB_PORT || "3000", 10);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// Health
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "8x8-hub", ts: Date.now() });
});

// Auth
app.post("/api/hub/auth/telegram", (req, res) => {
  const token = crypto.randomBytes(32).toString("hex");
  res.json({ token, user: { telegram_id: 1950324763, role: "owner" } });
});

// AI
app.post("/api/ai/chat", (req, res) => {
  const lastMsg = req.body?.messages?.slice(-1)[0]?.content || "";
  res.json({ reply: `Pioneer AI: ${lastMsg.substring(0, 80)}`, source: "hub" });
});

// Staking
app.get("/api/staking", (_req, res) => {
  res.json({ pools: [{ id: "default", name: "Default", apy: 12, minStake: 0.001 }] });
});

// Plans
app.get("/api/hub/plans", (_req, res) => {
  res.json({ plans: [
    { id: "basic", name: "Basic", price: 4.99, currency: "USDT", duration_days: 30 },
    { id: "pro", name: "Pro", price: 9.99, currency: "USDT", duration_days: 30 },
    { id: "quarterly", name: "Quarterly", price: 8.88, currency: "USDT", duration_days: 90 },
  ]});
});

// NFTs
app.get("/api/nfts", (_req, res) => res.json({ nfts: [], count: 0, max: 8888888 }));
app.post("/api/nfts/mint", (_req, res) => {
  const tokenId = `TM8-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  res.json({ tokenId, rarity: "Common", power: 5 });
});

// Wallet
app.get("/api/wallet/status", (_req, res) => res.json({ connected: false, balance: 0 }));

// Governance
app.get("/api/governance", (_req, res) => res.json({ proposals: [] }));
app.post("/api/governance", (req, res) => res.json({ id: Date.now(), ...req.body, status: "active" }));

// Tokenomics
app.get("/api/tokenomics", (_req, res) => res.json({ totalSupply: 888888888, stakingAPY: 12 }));

// Platforms
app.get("/api/platforms/status", (_req, res) => res.json({
  trading: { status: "online", exchange: "BitGet" },
  staking: { status: "online" },
  nft: { status: "online" },
  governance: { status: "online" },
}));

// Leaderboard
app.get("/api/leaderboard", (_req, res) => res.json({ leaderboard: [] }));

// Activity
app.get("/api/activity", (_req, res) => res.json({ activities: [] }));

// Settings
app.get("/api/hub/settings", (_req, res) => res.json({ freeMinutes: { minutes: 60 } }));

// Admin
app.post("/api/admin/verify", (req, res) => {
  if (req.body.secret === (process.env.ADMIN_SECRET || "8x8.FlashTM8.015392@X8"))
    return res.json({ success: true, role: "admin" });
  res.status(403).json({ error: "Invalid" });
});

// Trade
app.post("/api/trade", (_req, res) => res.json({ success: true, txHash: "0x" + crypto.randomBytes(32).toString("hex") }));

// Game
app.post("/api/game", (_req, res) => res.json({ success: true, won: Math.random() > 0.5 }));

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
  res.json({ system: { cpu: "8%", memory: "45%", uptime: "2h", timestamp: Date.now() } });
});

// Blockchain
app.get("/api/blockchain/transactions", (_req, res) => res.json({ transactions: [] }));
app.post("/api/blockchain/transactions", (_req, res) => res.json({ txHash: "0x" + crypto.randomBytes(32).toString("hex"), status: "confirmed" }));

// Social
app.get("/api/social/posts", (_req, res) => res.json({ posts: [] }));
app.post("/api/social/posts", (req, res) => res.json({ id: Date.now(), ...req.body }));

// Notes
app.get("/api/notes", (_req, res) => res.json({ notes: [] }));
app.post("/api/notes", (req, res) => res.json({ id: Date.now(), ...req.body }));
app.delete("/api/notes/:id", (_req, res) => res.json({ success: true }));

// Bubbles
app.get("/api/bubbles", (_req, res) => res.json({ bubbles: [] }));
app.post("/api/bubbles", (req, res) => res.json({ id: Date.now(), ...req.body }));

// Events
app.get("/api/hub/events", (_req, res) => res.json({ events: [] }));

// Subscribe
app.post("/api/hub/subscribe", (_req, res) => res.json({ success: true }));

// Session heartbeat
app.post("/api/hub/session/heartbeat", (_req, res) => res.json({ usageSeconds: 0, blocked: false }));

// Auth verify
app.post("/api/hub/auth/verify", (_req, res) => res.json({ user: { role: "owner" } }));

// Claim owner
app.post("/api/hub/auth/claim-owner", (req, res) => {
  if (req.body.secret === (process.env.ADMIN_SECRET || "8x8.FlashTM8.015392@X8"))
    return res.json({ success: true, user: { role: "owner" } });
  res.status(403).json({ error: "Invalid" });
});

// Wallet addresses
app.get("/api/wallet-addresses", (_req, res) => res.json({ addresses: [] }));
app.post("/api/admin/wallet-addresses", (_req, res) => res.json({ id: Date.now(), ...req.body }));

// Stake/Referral
app.post("/api/stake", (_req, res) => res.json({ success: true, txHash: "0x" + crypto.randomBytes(32).toString("hex") }));
app.post("/api/referral", (_req, res) => res.json({ success: true }));

const server = http.createServer(app);
server.listen(port, "0.0.0.0", () => {
  console.log(`8x8 Hub v2.0 running on port ${port} | Render`);
});
