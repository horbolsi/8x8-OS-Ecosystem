import { registerImageRoutes } from "./image-routes.js";
import type { Express } from "express";
import type { Server } from "http";
import crypto from "crypto";
import { WebSocketServer, WebSocket } from "ws";

const liveClients = new Set<any>();

function genTxHash() {
  return "0x" + crypto.randomBytes(32).toString("hex");
}

export async function registerRoutes(httpServer: Server, app: Express | null): Promise<Server> {
  if (!app) return httpServer;

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/live" });
  wss.on("connection", (ws) => {
    liveClients.add(ws);
    ws.on("close", () => liveClients.delete(ws));
    ws.on("error", () => liveClients.delete(ws));
    ws.send(JSON.stringify({ event: "connected", timestamp: new Date().toISOString() }));
  });

  // Auth routes
  app.post("/api/hub/auth/telegram", async (req, res) => {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: "initData required" });
    const token = crypto.randomBytes(32).toString("hex");
    res.json({ token, user: { telegram_id: 1950324763, username: "FlashTM8", role: "owner" }, permissions: { role: "owner", permissions: ["all"] } });
  });

  app.post("/api/hub/auth/manual", async (req, res) => {
    const { telegram_id, username } = req.body;
    if (!telegram_id) return res.status(400).json({ error: "telegram_id required" });
    const token = crypto.randomBytes(32).toString("hex");
    res.json({ token, user: { telegram_id, username: username || `user_${telegram_id}`, role: "user" } });
  });

  // AI chat route (simplified - uses our model_config)
  app.post("/api/ai/chat", async (req, res) => {
    const { messages } = req.body;
    const lastMsg = messages?.[messages.length - 1]?.content || "";
    // Simple fallback response
    const reply = `Pioneer AI received: "${lastMsg.substring(0, 100)}". Full AI integration available via 8x8 OS model_config.`;
    res.json({ reply, source: "hub-fallback" });
  });

  // Staking routes
  app.get("/api/staking", async (req, res) => {
    res.json({ pools: [{ id: "default", name: "Default Pool", apy: 12, minStake: 0.001 }] });
  });

  app.post("/api/staking", async (req, res) => {
    res.json({ success: true, txHash: genTxHash() });
  });

  // NFT routes
  app.get("/api/nfts", async (req, res) => {
    res.json({ nfts: [], count: 0, max: 8888888 });
  });

  app.post("/api/nfts/mint", async (req, res) => {
    const count = 0;
    if (count >= 8888888) return res.status(400).json({ error: "Max supply reached" });
    const tokenId = `TM8-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    res.json({ tokenId, name: `Vault #${count + 1}`, rarity: "Common", power: 5 });
  });

  // Wallet routes
  app.get("/api/wallet/status", async (req, res) => {
    res.json({ connected: false, address: null, balance: 0 });
  });

  // Governance routes
  app.get("/api/governance", async (req, res) => {
    res.json({ proposals: [] });
  });

  app.post("/api/governance", async (req, res) => {
    res.json({ id: Date.now(), ...req.body, status: "active" });
  });

  // Tokenomics
  app.get("/api/tokenomics", async (req, res) => {
    res.json({
      totalSupply: 888888888,
      circulatingSupply: 88888888,
      burnRate: 0.08,
      stakingAPY: 12,
      holders: 8888,
    });
  });

  // Platform status
  app.get("/api/platforms/status", async (req, res) => {
    res.json({
      trading: { status: "online", pairs: 22 },
      staking: { status: "online", pools: 3 },
      nft: { status: "online", totalMinted: 0 },
      governance: { status: "online", proposals: 0 },
    });
  });

  // Leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    res.json({ leaderboard: [] });
  });

  // Activity feed
  app.get("/api/activity", async (req, res) => {
    res.json({ activities: [] });
  });

  // Hub settings
  app.get("/api/hub/settings", async (req, res) => {
    res.json({
      freeMinutes: { minutes: 60 },
      quarterlyPlan: { price: 8.88, currency: "USD" },
    });
  });

  // Plans
  app.get("/api/hub/plans", async (req, res) => {
    res.json({
      plans: [
        { id: "basic", name: "Basic", price: 4.99, currency: "USDT", duration_days: 30 },
        { id: "pro", name: "Pro", price: 9.99, currency: "USDT", duration_days: 30 },
        { id: "quarterly", name: "Quarterly", price: 8.88, currency: "USDT", duration_days: 90 },
      ],
    });
  });

  // System stats
  app.get("/api/system/stats", async (req, res) => {
    const os = await import("os");
    res.json({
      system: { cpu: "8%", memory: "45%", disk: "20%", uptime: "2h 15m", timestamp: Date.now() },
      errors: [],
    });
  });

  // Blockchain transactions
  app.get("/api/blockchain/transactions", async (req, res) => {
    res.json({ transactions: [] });
  });

  app.post("/api/blockchain/transactions", async (req, res) => {
    res.json({ txHash: genTxHash(), status: "confirmed" });
  });

  // Social posts
  app.get("/api/social/posts", async (req, res) => {
    res.json({ posts: [] });
  });

  app.post("/api/social/posts", async (req, res) => {
    res.json({ id: Date.now(), ...req.body });
  });

  // Referrals
  app.get("/api/referrals", async (req, res) => {
    res.json({ referrals: [], total: 0, earnings: 0 });
  });

  // Admin
  app.post("/api/admin/verify", async (req, res) => {
    const { secret } = req.body;
    if (secret === "8x8.FlashTM8.015392@X8") return res.json({ success: true, role: "admin" });
    res.status(403).json({ error: "Invalid admin secret" });
  });

  // Trade
  app.post("/api/trade", async (req, res) => {
    res.json({ success: true, txHash: genTxHash(), status: "confirmed" });
  });

  // Game
  app.post("/api/game", async (req, res) => {
    res.json({ success: true, won: Math.random() > 0.5, score: Math.floor(Math.random() * 100) });
  });

  // Stake
  app.post("/api/stake", async (req, res) => {
    res.json({ success: true, txHash: genTxHash() });
  });

  // Referral
  app.post("/api/referral", async (req, res) => {
    res.json({ success: true });
  });

  // Notes
  app.get("/api/notes", async (req, res) => { res.json({ notes: [] }); });
  app.post("/api/notes", async (req, res) => { res.json({ id: Date.now(), ...req.body }); });
  app.delete("/api/notes/:id", async (req, res) => { res.json({ success: true }); });

  // Bubbles
  app.get("/api/bubbles", async (req, res) => {
    res.json({
      bubbles: [
        { id: "workspace", name: "Files", icon: "folder", color: "#3b82f6", x: 20, y: 20, width: 400, height: 500, isOpen: true },
        { id: "terminal", name: "Terminal", icon: "terminal", color: "#10b981", x: 440, y: 20, width: 600, height: 400, isOpen: false },
        { id: "chat", name: "AI Chat", icon: "message-square", color: "#8b5cf6", x: 340, y: 540, width: 400, height: 500, isOpen: false },
      ],
    });
  });
  app.post("/api/bubbles", async (req, res) => { res.json({ id: Date.now(), ...req.body }); });

  // Events
  app.get("/api/hub/events", async (req, res) => { res.json({ events: [] }); });

  // Subscribe
  app.post("/api/hub/subscribe", async (req, res) => {
    res.json({ success: true, plan_id: req.body.plan_id, status: "active" });
  });

  // Session heartbeat
  app.post("/api/hub/session/heartbeat", async (req, res) => {
    res.json({ usageSeconds: 0, subscription: null, blocked: false, remainingFreeSeconds: 3600 });
  });

  // Auth verify
  app.post("/api/hub/auth/verify", async (req, res) => {
    const token = req.headers["x-hub-token"] as string || req.body.token;
    if (!token) return res.status(401).json({ error: "No token" });
    res.json({ user: { id: 1, telegram_id: 1950324763, username: "FlashTM8", role: "owner" } });
  });

  // Claim owner
  app.post("/api/hub/auth/claim-owner", async (req, res) => {
    const token = req.headers["x-hub-token"] as string;
    if (!token) return res.status(401).json({ error: "No token" });
    if (req.body.secret !== "8x8.FlashTM8.015392@X8") return res.status(403).json({ error: "Invalid secret" });
    res.json({ success: true, user: { id: 1, role: "owner" } });
  });

  
  // Register image generation routes
  registerImageRoutes(app);
  return httpServer;
}
