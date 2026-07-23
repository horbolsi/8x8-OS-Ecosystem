import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicRoot = path.resolve(__dirname, "../public");

export const RELEASE = Object.freeze({
  release_id: "8X8-BETA-DUAL-MONITOR-V0.1",
  release_name: "8x8 OS Dual Monitor Beta",
  canonical_repo: "horbolsi/8x8-OS-Ecosystem",
  source_branch: "beta/8x8-dual-monitor-v0.1",
  public_mode: true,
  private_data_mounted: false,
  mutation_routes_enabled: false,
  database_writes_enabled: false,
  credential_access_enabled: false,
});

function stableIntegrity() {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(RELEASE, Object.keys(RELEASE).sort()))
    .digest("hex")
    .slice(0, 24);
}

function allowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.length ? configured : [];
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
  methods: ["GET", "HEAD", "OPTIONS"],
  allowedHeaders: ["Accept", "Content-Type", "If-None-Match"],
  maxAge: 86400,
}));

app.use(express.json({ limit: "64kb", strict: true }));
app.use((req, res, next) => {
  const requestId = req.get("x-request-id") || crypto.randomUUID();
  res.setHeader("X-Request-ID", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
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
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/v1/release", (_req, res) => {
  res.json({ ...RELEASE, integrity: stableIntegrity() });
});

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

app.all(["/api/v1/private/*", "/api/admin/*", "/api/trade", "/api/stake", "/api/nfts/mint", "/api/social/posts"], (_req, res) => {
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

app.get("*", (_req, res) => {
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
