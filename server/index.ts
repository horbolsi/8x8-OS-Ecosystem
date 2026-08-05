// Public-safe compatibility server for the 8x8 OS companion repository.
// Canonical implementation: https://github.com/horbolsi/8x8
import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
const port = Number.parseInt(process.env.HUB_PORT || "3000", 10);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:8086")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  },
  credentials: false,
}));
app.use(express.json({ limit: "256kb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cache-Control", "no-store");
  next();
});

const GATES = [
  "FINANCIAL_EXECUTION",
  "WALLET_OR_ASSET_MOVEMENT",
  "PUBLIC_CONTENT_PUBLISH",
  "EXTERNAL_MESSAGE_SEND",
  "CREDENTIAL_CHANGE",
  "PRODUCTION_MUTATION",
  "DESTRUCTIVE_FILE_ACTION",
  "AGENT_PERMISSION_ESCALATION",
];

const AGENTS = [
  { id: "research", authority: "read-only" },
  { id: "code", authority: "proposal-only" },
  { id: "security", authority: "read-only" },
  { id: "operations", authority: "proposal-only" },
  { id: "web3", authority: "simulation-only" },
];

function gate(res: express.Response, action: string) {
  return res.status(403).json({
    success: false,
    code: "PUBLIC_DEMO_GATED",
    action,
    truth_class: "LIVE",
    message: "This companion public build is read-only. Use the canonical 8x8 repository for the current judge implementation.",
  });
}

function plan(goal: string) {
  const sensitive = /trade|buy|sell|transfer|wallet|withdraw|publish|post|message|email|credential|password|token|delete|deploy|restart|production/i.test(goal);
  return {
    summary: "A bounded compatibility plan was generated; no external action was executed.",
    classification: sensitive ? "GATED" : "SAFE_TO_PLAN",
    selected_agents: sensitive ? ["research", "security", "operations"] : ["research", "code"],
    safe_actions: ["collect read-only evidence", "prepare a reviewable plan", "generate an audit receipt"],
    gated_actions: sensitive ? ["sensitive execution requires exact human approval in a private authenticated runtime"] : [],
    blocked_actions: ["financial, publishing, credential, destructive, and production actions were not executed"],
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "8x8-os-ecosystem-public-companion",
    canonical_repository: "https://github.com/horbolsi/8x8",
    mode: "public-demo",
    truth_class: "LIVE",
    sensitive_execution_enabled: false,
    timestamp: new Date().toISOString(),
  });
});
app.get("/api/judge/info", (_req, res) => res.json({ agents: AGENTS, gates: GATES, sensitive_execution_enabled: false, truth_class: "LIVE" }));
app.get("/api/gates", (_req, res) => res.json({ gates: GATES.map((name) => ({ name, state: "CLOSED" })), truth_class: "LIVE" }));
app.get("/api/agents", (_req, res) => res.json({ agents: AGENTS, truth_class: "SIMULATED" }));
app.get("/api/platforms/status", (_req, res) => res.json({
  platforms: {
    trading: { status: "simulation-only", truth_class: "LIVE" },
    telegram: { status: "not-connected", truth_class: "UNKNOWN" },
    discord: { status: "not-connected", truth_class: "UNKNOWN" },
    production: { status: "not-exposed", truth_class: "LIVE" },
  },
}));
app.get("/api/system/stats", (_req, res) => res.json({ system: {}, truth_class: "UNKNOWN", message: "Private device metrics are not exposed." }));

app.post("/api/judge/plan", (req, res) => {
  const goal = typeof req.body?.goal === "string" ? req.body.goal.trim() : "";
  if (!goal) return res.status(400).json({ error: "goal is required" });
  if (goal.length > 4000) return res.status(413).json({ error: "goal is too long" });
  res.json({
    plan: plan(goal),
    audit: {
      receipt_id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      input_sha256: crypto.createHash("sha256").update(goal).digest("hex"),
      truth_class: "SIMULATED",
      executed_actions: [],
      sensitive_actions_executed: false,
    },
    executed: false,
  });
});
app.post("/api/ai/chat", (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const goal = String(messages.at(-1)?.content || "").trim();
  if (!goal) return res.status(400).json({ error: "message content is required" });
  const result = plan(goal);
  res.json({ reply: result.summary, plan: result, truth_class: "SIMULATED", source: "public-fixture" });
});

const gatedPostRoutes = [
  "/api/hub/auth/telegram", "/api/hub/auth/manual", "/api/hub/auth/verify", "/api/hub/auth/claim-owner",
  "/api/admin/verify", "/api/trade", "/api/stake", "/api/staking", "/api/nfts/mint",
  "/api/governance", "/api/blockchain/transactions", "/api/social/posts", "/api/notes",
  "/api/bubbles", "/api/hub/subscribe", "/api/referral", "/api/game", "/api/wallet-addresses",
  "/api/admin/wallet-addresses",
];
for (const route of gatedPostRoutes) app.post(route, (_req, res) => gate(res, route));
app.delete("/api/notes/:id", (_req, res) => gate(res, "DELETE_NOTE"));
app.delete("/api/wallet-addresses/:id", (_req, res) => gate(res, "DELETE_WALLET_ADDRESS"));

app.get("/api/staking", (_req, res) => res.json({ pools: [], truth_class: "SIMULATED" }));
app.get("/api/nfts", (_req, res) => res.json({ nfts: [], count: 0, truth_class: "SIMULATED" }));
app.get("/api/governance", (_req, res) => res.json({ proposals: [], truth_class: "SIMULATED" }));
app.get("/api/blockchain/transactions", (_req, res) => res.json({ transactions: [], truth_class: "SIMULATED" }));
app.get("/api/social/posts", (_req, res) => res.json({ posts: [], truth_class: "SIMULATED" }));
app.get("/api/notes", (_req, res) => res.json({ notes: [], truth_class: "SIMULATED" }));
app.get("/api/wallet/status", (_req, res) => res.json({ connected: false, balance: null, truth_class: "UNKNOWN" }));

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`8x8 OS public companion listening on ${port} | sensitive_execution=false`);
});
