// server/index.ts — Simplified startup for 8x8 OS integration
import "dotenv/config";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes.js";
import { log } from "./app.js";

(async () => {
  try {
    const app = express();
    
    // Basic middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Security headers
    app.use((req, res, next) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Referrer-Policy", "same-origin");
      next();
    });

    // Health check
    app.get("/api/health", (_req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString(), service: "8x8-hub" });
    });

    // Live stream SSE
    app.get("/api/live/stream", (req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      res.write(`data: ${JSON.stringify({ event: "connected", timestamp: new Date().toISOString() })}\n\n`);
      const interval = setInterval(() => {
        res.write(`data: ${JSON.stringify({ event: "heartbeat", timestamp: new Date().toISOString() })}\n\n`);
      }, 15000);
      req.on("close", () => clearInterval(interval));
    });

    app.get("/api/live/snapshot", (_req, res) => {
      res.json({ events: [], count: 0, subscribers: 0, status: "ok" });
    });

    // Register all hub routes
    const httpServer = createServer(app);
    await registerRoutes(httpServer, app);

    const port = parseInt(process.env.HUB_PORT || "3000", 10);
    httpServer.listen(port, "0.0.0.0", () => {
      log(`8x8 Hub server running on port ${port}`);
    });

    httpServer.on("error", (err: any) => {
      console.error("Server error:", err);
    });
  } catch (error) {
    console.error("Fatal initialization error:", error);
    process.exit(1);
  }
})();
