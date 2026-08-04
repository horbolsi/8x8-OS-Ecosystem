import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import {
  createTelegramWebhookHandler,
  telegramConfiguration,
} from "./telegram.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicRoot = path.resolve(__dirname, "../public");

export const RELEASE = Object.freeze({
  release_id: "8X8-BETA-WORLD-V0.1",
  release_name: "8x8 World Public Browser Beta",
  canonical_repo: "horbolsi/8x8-OS-Ecosystem",
  source_branch: "feature/msg219-public-8x8-world-v1",
  public_mode: true,
  private_data_mounted: false,
  mutation_routes_enabled: false,
  database_writes_enabled: false,
  credential_access_enabled: false,
  cloud_telegram_relay: "BOUNDED_V1",
  public_world_preview: "LOCAL_ONLY_V1",
});

function stableIntegrity() {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(RELEASE, Object.keys(RELEASE).sort()))
    .digest("hex")
    .slice(0, 24);
}

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const originAllowlist = allowedOrigins();
app.use(cors({
  origin(origin, callback) {
    if (!origin || originAllowlist.length === 0 || originAllowlist.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("origin not allowed"));
  },
  methods: ["GET", "HEAD", "POST", "OPTIONS"],
  allowedHeaders: [
    "Accept",
    "Content-Type",
    "If-None-Match",
    "X-Telegram-Bot-Api-Secret-Token",
  ],
  maxAge: 86400,
}));

app.use(express.json({ limit: "64kb", strict: true }));
app.use((req, res, next) => {
  const requestId = req.get("x-request-id") || crypto.randomUUID();
  const worldRoute = req.path === "/world" || req.path.startsWith("/world/");
  const permissionsPolicy = worldRoute
    ? "camera=(), microphone=(), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), payment=(), usb=(), bluetooth=()"
    : "camera=(), microphone=(), geolocation=(), accelerometer=(), gyroscope=(), magnetometer=(), payment=(), usb=(), bluetooth=()";

  res.setHeader("X-Request-ID", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", permissionsPolicy);
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; "));
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "8x8-os-dual-monitor-beta",
    release_id: RELEASE.release_id,
    public_mode: true,
    private_data_mounted: false,
    mutation_routes_enabled: false,
    cloud_telegram_relay: "BOUNDED_V1",
    public_world_preview: "LOCAL_ONLY_V1",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/v1/release", (_req, res) => {
  res.json({ ...RELEASE, integrity: stableIntegrity() });
});

app.get("/api/v1/cloud-relay", (_req, res) => {
  res.json({
    schema_version: "1.0.0",
    release_id: RELEASE.release_id,
    state: "CLOUD_RELAY_CODE_DEPLOYED",
    ...telegramConfiguration(),
  });
});

app.get("/api/v1/world/capabilities", (_req, res) => {
  res.json({
    schema_version: "8x8.public-world-capabilities.v1",
    release_id: RELEASE.release_id,
    state: "PUBLIC_BROWSER_LOCAL_ONLY",
    movement: "ENABLED",
    device_orientation: "USER_PERMISSION_ON_WORLD_ROUTE",
    geolocation: "USER_PERMISSION_ON_WORLD_ROUTE",
    location_upload: false,
    live_users: 0,
    live_presence_backend: false,
    chat_calls: false,
    bluetooth_scan: false,
    wifi_peer_mesh: false,
    payments: false,
    wallet_signing: false,
    private_core: false,
    remote_device_control: false,
  });
});

app.post("/api/telegram/owner", createTelegramWebhookHandler("owner"));
app.post("/api/telegram/seraphim", createTelegramWebhookHandler("seraphim"));

app.get("/api/v1/public/state", (_req, res) => {
  res.json({
    schema_version: "1.0.0",
    release_id: RELEASE.release_id,
    mode: "PUBLIC_SANITIZED_DEMO",
    agents: ["HERMES", "FLASH", "SERAPH", "ATLAS", "SOMA", "CIPHER", "ORACLE", "WOMB"].map((id) => ({
      id,
      state: "DEMO_ONLINE",
      authority: "NONE",
      location: "UNSPECIFIED",
    })),
    monitors: [
      { id: "PUBLIC_WORLD", state: "ONLINE", data_class: "PUBLIC" },
      { id: "PRIVATE_OWNER", state: "LOCKED", data_class: "NOT_MOUNTED" },
    ],
    claims: {
      private_records_exposed: false,
      mutation_routes_enabled: false,
      financial_actions_enabled: false,
      credential_access_enabled: false,
    },
  });
});

const blockedExactPaths = new Set([
  "/api/trade",
  "/api/stake",
  "/api/nfts/mint",
  "/api/social/posts",
  "/api/governance",
  "/api/blockchain/transactions",
]);

app.use((req, res, next) => {
  const pathBlocked = req.path.startsWith("/api/v1/private/")
    || req.path.startsWith("/api/admin/")
    || blockedExactPaths.has(req.path);
  if (!pathBlocked) {
    next();
    return;
  }
  res.status(404).json({
    error: "not_available_in_public_beta",
    release_id: RELEASE.release_id,
  });
});

app.use(express.static(publicRoot, {
  etag: true,
  fallthrough: true,
  immutable: false,
  maxAge: process.env.NODE_ENV === "production" ? "5m" : 0,
}));

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(publicRoot, "index.html"));
});

app.use((error, _req, res, _next) => {
  const status = error?.message === "origin not allowed" ? 403 : 500;
  res.status(status).json({
    error: status === 403 ? "origin_not_allowed" : "internal_error",
    release_id: RELEASE.release_id,
  });
});

export default app;
