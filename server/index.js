import "dotenv/config";
import http from "http";
import app, { RELEASE } from "./app.js";

const port = Number.parseInt(process.env.PORT || process.env.HUB_PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";
const server = http.createServer(app);

server.listen(port, host, () => {
  console.log(JSON.stringify({
    event: "server.started",
    service: "8x8-os-dual-monitor-beta",
    release_id: RELEASE.release_id,
    host,
    port,
    public_mode: true,
    mutation_routes_enabled: false,
  }));
});

function shutdown(signal) {
  console.log(JSON.stringify({ event: "server.shutdown", signal, release_id: RELEASE.release_id }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
