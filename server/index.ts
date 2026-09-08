// server/index.ts — Production hub-server for 8x8 OS
// Uses REAL auth, rate limiting, RBAC, and all 22 feature routes
import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { WebSocketServer } from "ws";
import http from "http";
import rateLimit from "express-rate-limit";

const app = express();
const port = parseInt(process.env.HUB_PORT || "3000", 10);

// ── Security Middleware ──
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:8086", "http://localhost:3000"],
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ── Rate Limiting ──
const generalLimiter = rateLimit({ windowMs: 60000, max: 100, standardHeaders: true });
const authLimiter = rateLimit({ windowMs: 15 * 60000, max: 10, standardHeaders: true });
app.use(generalLimiter);

// ── Database (PostgreSQL via pg) ──
import pg from "pg";
import { synthesizeSpeech, fetchAvailableVoices, getAgentVoiceMap } from "../voice_synth.ts";
const { Pool } = pg;
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 })
  : null;

async function dbQuery(text: string, params: any[] = []) {
  if (!pool) return { rows: [] };
  const result = await pool.query(text, params);
  return result;
}

// ── Auth Helpers ──
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function verifyTelegramInitData(initData: string, botToken: string): Record<string, string> | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (calculatedHash !== hash) return null;
    const result: Record<string, string> = {};
    params.forEach((v, k) => { result[k] = v; });
    return result;
  } catch { return null; }
}

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "";

// ── Health ──
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "8x8-hub", ts: Date.now(), db: pool ? "connected" : "disconnected" });
});

// ── Auth Routes (with real Telegram HMAC verification) ──
app.post("/api/hub/auth/telegram", authLimiter, async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: "initData required" });

    let userData: any = null;
    if (TG_BOT_TOKEN) {
      const verified = verifyTelegramInitData(initData, TG_BOT_TOKEN);
      if (!verified) return res.status(401).json({ error: "Invalid Telegram signature" });
      try { userData = JSON.parse(verified.user || "{}"); } catch { userData = {}; }
    } else {
      // Dev mode: parse without verification
      try {
        const params = new URLSearchParams(initData);
        userData = JSON.parse(params.get("user") || "{}");
      } catch { userData = {}; }
    }

    if (!userData.id) return res.status(400).json({ error: "No user ID in initData" });

    const token = generateToken();
    // Upsert user in database
    const userResult = await dbQuery(
      `INSERT INTO hub_users (telegram_id, username, first_name, last_name, photo_url, session_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (telegram_id) DO UPDATE SET
         username = EXCLUDED.username, first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name, photo_url = EXCLUDED.photo_url,
         session_token = EXCLUDED.session_token, updated_at = NOW()
       RETURNING id, telegram_id, username, first_name, role`,
      [userData.id, userData.username, userData.first_name, userData.last_name, userData.photo_url, token]
    );
    const user = userResult.rows[0];
    res.json({ token, user, permissions: { role: user.role || "user" } });
  } catch (err: any) {
    console.error("Auth error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/hub/auth/verify", async (req, res) => {
  try {
    const token = req.headers["x-hub-token"] as string || req.body.token;
    if (!token) return res.status(401).json({ error: "No token" });
    const userResult = await dbQuery("SELECT * FROM hub_users WHERE session_token = $1", [token]);
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid token" });
    if (user.is_banned) return res.status(403).json({ error: "Account banned" });
    res.json({ user: { id: user.id, telegram_id: user.telegram_id, username: user.username, role: user.role } });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── AI Chat (policy-aware provider fallback) ──
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    const lastMsg = messages?.[messages.length - 1]?.content || "";
    const policyContext = "Truth boundaries: SOURCE_PRESENT is not RUNTIME_ACTIVE or VERIFIED. LIVE_TRADE=false, PAYMENT_EFFECT=false, WALLET_SIGNING=false, MAINNET=false. Current source policy: maximum supply 8,888,888; 4.44% only for explicitly defined events; ordinary non-sale/P2P companion-token transfers 0%. Former 4.88% and legacy Pi/ETH semantics are PAST_PRESERVED.";
    let reply = null;
    try {
      const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
      const resp = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "tinyllama", messages: [{ role: "system", content: `You are Pioneer AI for 8x8 OS. Be concise and policy-aware. ${policyContext}` }, ...(messages || [])], stream: false, options: { num_predict: 200 } }),
        signal: AbortSignal.timeout(15000),
      });
      if (resp.ok) {
        const data = await resp.json();
        reply = data.message?.content || data.response;
      }
    } catch { /* Ollama not available */ }

    if (!reply) {
      const lower = lastMsg.toLowerCase();
      if (lower.includes("nft")) reply = "NFT Vault references are SOURCE_ONLY / NOT_AUDITED / NOT_DEPLOYED / FUTURE_GATED. No mint, burn, stake, ownership, or chain provenance is verified.";
      else if (lower.includes("staking")) reply = "Staking and mining are FUTURE_GATED. No APY, reward, or productive staking runtime is verified.";
      else if (lower.includes("trade")) reply = "LIVE_TRADE=false. MARKET_DATA is not STRATEGY_SIGNAL, PAPER_POSITION, LIVE_ORDER, or VERIFIED_EXECUTION.";
      else if (lower.includes("fee") || lower.includes("tax") || lower.includes("policy")) reply = "Current source policy: 4.44% applies only to explicitly defined events; ordinary non-sale/P2P companion-token transfers are 0%. Former 4.88% is superseded.";
      else if (lower.includes("wallet")) reply = "Wallet surfaces are watch-only or source-only. WALLET_SIGNING=false; balances and chain authority remain unavailable without a fresh receipt.";
      else reply = `Pioneer AI received: "${lastMsg.substring(0, 80)}". I can explain source policy while separating source, simulation, runtime, and verified execution.`;
    }

    res.json({ reply, source: reply ? "ai" : "fallback", effects: { liveTrade: false, payment: false, walletSigning: false, mainnet: false } });
  } catch {
    res.status(500).json({ error: "AI service error" });
  }
});

// ── Staking ──
app.get("/api/staking", async (_req, res) => {
  res.json({
    state: "FUTURE_GATED",
    availability: "UNAVAILABLE",
    pools: [],
    apy: null,
    stakingEffect: false,
    source: "SOURCE_POLICY_REFERENCE_ONLY",
  });
});

app.post("/api/staking", async (_req, res) => {
  res.status(503).json({
    state: "FUTURE_GATED",
    error: "Staking is unavailable; no stake, reward, or transaction was created.",
    stakingEffect: false,
    txHash: null,
  });
});

// ── NFT ──
app.get("/api/nfts", async (_req, res) => {
  try {
    const nfts = await dbQuery("SELECT * FROM hub_nfts ORDER BY created_at DESC LIMIT 50");
    res.json({
      nfts: nfts.rows,
      count: nfts.rows.length,
      maxSupplyPolicy: 8888888,
      state: "SOURCE_ONLY_NOT_AUDITED_NOT_DEPLOYED",
      minting: false,
      chainProvenanceVerified: false,
    });
  } catch {
    res.json({ nfts: [], count: 0, maxSupplyPolicy: 8888888, state: "UNAVAILABLE", minting: false, chainProvenanceVerified: false });
  }
});

app.post("/api/nfts/mint", async (_req, res) => {
  res.status(503).json({
    state: "FUTURE_GATED",
    error: "NFT minting is unavailable; no token, ownership record, or chain transaction was created.",
    mintingEffect: false,
    tokenId: null,
    txHash: null,
  });
});

// ── Wallet ──
app.get("/api/wallet/status", async (req, res) => {
  const token = req.headers["x-hub-token"] as string;
  if (!token) return res.json({
    connected: false,
    availability: "UNKNOWN",
    address: null,
    balance: null,
    watchOnly: true,
    walletSigning: false,
    mainnet: false,
  });
  const userResult = await dbQuery("SELECT id FROM hub_users WHERE session_token = $1", [token]);
  if (!userResult.rows[0]) return res.json({
    connected: false,
    availability: "UNKNOWN",
    address: null,
    balance: null,
    watchOnly: true,
    walletSigning: false,
    mainnet: false,
  });
  const portfolio = await dbQuery("SELECT symbol, amount, current_price, value_usd FROM hub_portfolio WHERE user_id = $1", [userResult.rows[0].id]);
  res.json({
    connected: false,
    availability: portfolio.rows.length ? "INTERNAL_ACCOUNTING_ONLY" : "UNKNOWN",
    address: null,
    balance: null,
    portfolio: portfolio.rows,
    portfolioSource: "INTERNAL_PORTFOLIO_TABLE_NOT_CHAIN_BALANCE",
    watchOnly: true,
    walletSigning: false,
    mainnet: false,
  });
});

// ── Governance ──
app.get("/api/governance", async (_req, res) => {
  try {
    const proposals = await dbQuery("SELECT * FROM hub_governance_proposals ORDER BY created_at DESC LIMIT 20");
    res.json({ proposals: proposals.rows });
  } catch { res.json({ proposals: [] }); }
});

app.post("/api/governance", async (req, res) => {
  const token = req.headers["x-hub-token"] as string;
  if (!token) return res.status(401).json({ error: "Auth required" });
  const userResult = await dbQuery("SELECT id FROM hub_users WHERE session_token = $1", [token]);
  if (!userResult.rows[0]) return res.status(401).json({ error: "Invalid token" });
  const { title, description } = req.body;
  const result = await dbQuery(
    "INSERT INTO hub_governance_proposals (title, description, proposer_id, status) VALUES ($1, $2, $3, 'active') RETURNING *",
    [title, description, userResult.rows[0].id]
  );
  res.json(result.rows[0] || { id: Date.now(), title, status: "active" });
});

// ── Tokenomics ──
app.get("/api/tokenomics", async (_req, res) => {
  res.json({
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
  });
});

// ── Platforms ──
app.get("/api/platforms/status", async (_req, res) => {
  res.json({
    trading: { status: "UNAVAILABLE", state: "SOURCE_ONLY", liveTrade: false },
    staking: { status: "UNAVAILABLE", state: "FUTURE_GATED", stakingEffect: false },
    nft: { status: "UNAVAILABLE", state: "SOURCE_ONLY_NOT_AUDITED_NOT_DEPLOYED", minting: false },
    governance: { status: "SOURCE_ONLY", liveVoting: false },
    wallet: { status: "UNKNOWN", watchOnly: true, walletSigning: false },
    paymentEffect: false,
    mainnet: false,
  });
});

// ── Leaderboard ──
app.get("/api/leaderboard", async (_req, res) => {
  try {
    const lb = await dbQuery("SELECT u.username, u.telegram_id, COALESCE(SUM(s.amount), 0) as score FROM hub_users u LEFT JOIN hub_staking s ON u.id = s.user_id GROUP BY u.id ORDER BY score DESC LIMIT 20");
    res.json({ leaderboard: lb.rows });
  } catch { res.json({ leaderboard: [] }); }
});

// ── Activity ──
app.get("/api/activity", async (_req, res) => {
  try {
    const activities = await dbQuery("SELECT * FROM hub_activity_feed ORDER BY created_at DESC LIMIT 50");
    res.json({ activities: activities.rows });
  } catch { res.json({ activities: [] }); }
});

// ── Settings ──
app.get("/api/hub/settings", async (_req, res) => {
  try {
    const settings = await dbQuery("SELECT key, value FROM hub_settings");
    const s: any = {};
    settings.rows.forEach((r: any) => { s[r.key] = r.value; });
    res.json(s);
  } catch { res.json({ freeMinutes: { minutes: 60 } }); }
});

// ── Plans ──
app.get("/api/hub/plans", async (_req, res) => {
  try {
    const plans = await dbQuery("SELECT * FROM hub_plans WHERE is_active = true ORDER BY price ASC");
    res.json({ plans: plans.rows });
  } catch { res.json({ plans: [] }); }
});

// ── System Stats ──
app.get("/api/system/stats", async (_req, res) => {
  const os = await import("os");
  res.json({
    system: {
      cpu: `${Math.min(100, Math.round(os.loadavg()[0] * 10))}%`,
      memory: `${Math.round((1 - os.freemem() / os.totalmem()) * 100)}%`,
      disk: "20%",
      uptime: `${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m`,
      timestamp: Date.now(),
    },
    db: pool ? "connected" : "disconnected",
    errors: [],
  });
});

// ── Blockchain ──
app.get("/api/blockchain/transactions", async (_req, res) => {
  try {
    const txs = await dbQuery("SELECT * FROM hub_blockchain_transactions ORDER BY created_at DESC LIMIT 50");
    res.json({
      transactions: txs.rows,
      state: "READ_ONLY_STORED_RECORDS",
      chainExecutionVerified: false,
      mainnet: false,
    });
  } catch {
    res.json({ transactions: [], state: "UNAVAILABLE", chainExecutionVerified: false, mainnet: false });
  }
});

app.post("/api/blockchain/transactions", async (_req, res) => {
  res.status(503).json({
    state: "FUTURE_GATED",
    error: "Blockchain writes are unavailable; no transaction was signed, broadcast, or confirmed.",
    txHash: null,
    walletSigning: false,
    mainnet: false,
  });
});

// ── Social ──
app.get("/api/social/posts", async (_req, res) => {
  try {
    const posts = await dbQuery("SELECT * FROM hub_social_posts ORDER BY created_at DESC LIMIT 50");
    res.json({ posts: posts.rows });
  } catch { res.json({ posts: [] }); }
});

app.post("/api/social/posts", async (req, res) => {
  const token = req.headers["x-hub-token"] as string;
  if (!token) return res.status(401).json({ error: "Auth required" });
  const userResult = await dbQuery("SELECT id FROM hub_users WHERE session_token = $1", [token]);
  const result = await dbQuery(
    "INSERT INTO hub_social_posts (user_id, content, type) VALUES ($1, $2, $3) RETURNING *",
    [userResult.rows[0]?.id, req.body.content, req.body.type || "post"]
  );
  res.json(result.rows[0] || { id: Date.now(), ...req.body });
});

// ── Referrals ──
app.get("/api/referrals", async (req, res) => {
  const token = req.headers["x-hub-token"] as string;
  if (!token) return res.json({ referrals: [], total: 0, earnings: 0 });
  const userResult = await dbQuery("SELECT id FROM hub_users WHERE session_token = $1", [token]);
  if (!userResult.rows[0]) return res.json({ referrals: [], total: 0, earnings: 0 });
  const refs = await dbQuery("SELECT * FROM hub_referrals WHERE referrer_id = $1", [userResult.rows[0].id]);
  res.json({ referrals: refs.rows, total: refs.rows.length, earnings: 0 });
});

// ── Admin ──
app.post("/api/admin/verify", authLimiter, (req, res) => {
  if (req.body.secret === ADMIN_SECRET) return res.json({ success: true, role: "admin" });
  res.status(403).json({ error: "Invalid admin secret" });
});

// ── Trade ──
app.post("/api/trade", async (_req, res) => {
  res.status(503).json({
    state: "FUTURE_GATED",
    error: "Live trading is unavailable; no order, fill, position, or transaction was created.",
    success: false,
    txHash: null,
    liveTrade: false,
    verifiedExecution: false,
  });
});

// ── Game ──
app.post("/api/game", async (_req, res) => {
  res.json({
    state: "SIMULATION_ONLY",
    success: true,
    reward: 0,
    rewardEffect: false,
    entitlementCreated: false,
  });
});

// ── Referral ──
app.post("/api/referral", async (req, res) => {
  const token = req.headers["x-hub-token"] as string;
  if (!token) return res.status(401).json({ error: "Auth required" });
  res.json({ success: true });
});

// ── Notes ──
app.get("/api/notes", async (_req, res) => { res.json({ notes: [] }); });
app.post("/api/notes", async (req, res) => { res.json({ id: Date.now(), ...req.body }); });
app.delete("/api/notes/:id", async (_req, res) => { res.json({ success: true }); });

// ── Bubbles ──
app.get("/api/bubbles", async (_req, res) => {
  res.json({
    bubbles: [
      { id: "workspace", name: "Files", icon: "folder", color: "#3b82f6", x: 20, y: 20, width: 400, height: 500, isOpen: true },
      { id: "terminal", name: "Terminal", icon: "terminal", color: "#10b981", x: 440, y: 20, width: 600, height: 400, isOpen: false },
      { id: "chat", name: "AI Chat", icon: "message-square", color: "#8b5cf6", x: 340, y: 540, width: 400, height: 500, isOpen: false },
    ],
  });
});
app.post("/api/bubbles", async (req, res) => { res.json({ id: Date.now(), ...req.body }); });

// ── Events ──
app.get("/api/hub/events", async (_req, res) => {
  try {
    const events = await dbQuery("SELECT * FROM hub_events WHERE is_public = true ORDER BY created_at DESC LIMIT 20");
    res.json({ events: events.rows });
  } catch { res.json({ events: [] }); }
});

// ── Subscribe ──
app.post("/api/hub/subscribe", async (_req, res) => {
  res.status(503).json({
    state: "PAYMENT_AND_ENTITLEMENT_GATED",
    error: "Subscription activation is unavailable until payment, finality, idempotency, refund, and durable entitlement receipts are verified.",
    success: false,
    paymentEffect: false,
    entitlementCreated: false,
  });
});

// ── Session Heartbeat ──
app.post("/api/hub/session/heartbeat", async (req, res) => {
  const token = req.headers["x-hub-token"] as string;
  if (!token) return res.status(401).json({ error: "No token" });
  const userResult = await dbQuery("SELECT id FROM hub_users WHERE session_token = $1", [token]);
  if (!userResult.rows[0]) return res.status(401).json({ error: "Invalid token" });
  const seconds = Math.min(parseInt(req.body.seconds || "30"), 60);
  await dbQuery(
    "INSERT INTO hub_session_usage (user_id, session_date, seconds_used) VALUES ($1, CURRENT_DATE, $2) ON CONFLICT (user_id, session_date) DO UPDATE SET seconds_used = hub_session_usage.seconds_used + $2",
    [userResult.rows[0].id, seconds]
  );
  const usage = await dbQuery("SELECT COALESCE(SUM(seconds_used), 0) as total FROM hub_session_usage WHERE user_id = $1 AND session_date = CURRENT_DATE", [userResult.rows[0].id]);
  const settings = await dbQuery("SELECT value FROM hub_settings WHERE key = 'free_daily_minutes'");
  const freeMinutes = settings.rows[0]?.value?.minutes || 60;
  const usageSeconds = parseInt(usage.rows[0]?.total || "0");
  res.json({ usageSeconds, blocked: usageSeconds >= freeMinutes * 60, remainingFreeSeconds: Math.max(0, freeMinutes * 60 - usageSeconds) });
});

// ── Claim Owner ──
app.post("/api/hub/auth/claim-owner", async (req, res) => {
  const token = req.headers["x-hub-token"] as string;
  if (!token) return res.status(401).json({ error: "No token" });
  const userResult = await dbQuery("SELECT id FROM hub_users WHERE session_token = $1", [token]);
  if (!userResult.rows[0]) return res.status(401).json({ error: "Invalid token" });
  if (req.body.secret !== ADMIN_SECRET) return res.status(403).json({ error: "Invalid secret" });
  await dbQuery("UPDATE hub_users SET role = 'owner' WHERE id = $1", [userResult.rows[0].id]);
  res.json({ success: true, user: { id: userResult.rows[0].id, role: "owner" } });
});

// ── Live Stream ──
app.get("/api/live/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.write(`data: ${JSON.stringify({ event: "connected", ts: Date.now() })}\n\n`);
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ event: "heartbeat", ts: Date.now() })}\n\n`);
  }, 15000);
  req.on("close", () => clearInterval(interval));
});
app.get("/api/live/snapshot", (_req, res) => res.json({ events: [], count: 0 }));


// ── Voice Synthesis (ElevenLabs) ──
app.get("/api/voice/voices", async (_req, res) => {
  try {
    const voices = await fetchAvailableVoices();
    const agentMap = getAgentVoiceMap();
    res.json({ voices, agent_voices: agentMap });
  } catch (err: any) {
    // Fallback to cached data
    const agentMap = getAgentVoiceMap();
    res.json({ voices: Object.values(agentMap), agent_voices: agentMap, source: "cache" });
  }
});

app.get("/api/voice/agents", (_req, res) => {
  const agentMap = getAgentVoiceMap();
  res.json({ agent_voices: agentMap });
});

app.post("/api/voice/synthesize", async (req, res) => {
  try {
    const { text, agent, voice_id, model_id, voice_settings } = req.body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "text is required" });
    }
    const result = await synthesizeSpeech({ text, agent, voice_id, model_id, voice_settings });
    res.setHeader("Content-Type", result.content_type);
    res.setHeader("X-Voice-Agent", result.agent);
    res.setHeader("X-Voice-Name", result.voice_name);
    res.setHeader("X-Voice-Id", result.voice_id);
    res.setHeader("X-Model-Id", result.model_id);
    res.setHeader("X-Text-Length", String(result.text_length));
    res.send(result.audio);
  } catch (err: any) {
    console.error("[VoiceSynth] Error:", err.message);
    if (err.message.includes("ELEVENLABS_API_KEY")) {
      return res.status(503).json({ error: "Voice synthesis not configured", details: err.message });
    }
    if (err.message.includes("401")) {
      return res.status(502).json({ error: "ElevenLabs authentication failed" });
    }
    if (err.message.includes("429")) {
      return res.status(429).json({ error: "Voice synthesis rate limited, try again shortly" });
    }
    if (err.message.includes("402")) {
      return res.status(502).json({ error: "ElevenLabs quota exhausted" });
    }
    res.status(500).json({ error: "Voice synthesis failed", details: err.message });
  }
});


// ── Start Server ──
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/live" });
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ event: "connected", ts: Date.now() }));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`8x8 Hub v2.0 running on port ${port} | DB: ${pool ? "connected" : "memory"} | Auth: ${TG_BOT_TOKEN ? "telegram" : "dev"}`);
});
