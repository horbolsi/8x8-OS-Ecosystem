# ============================================
# 8x8 Hub Server — Multi-stage Docker build
# ============================================

# ---- Stage 1: Build ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (layer caching)
COPY package.json ./

# Install all dependencies (including dev for tsx)
RUN npm ci --ignore-scripts 2>&1

# Copy source code
COPY . .

# ---- Stage 2: Production ----
FROM node:22-alpine AS production

# Security: run as non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/middleware ./middleware
COPY --from=builder /app/storage ./storage
COPY --from=builder /app/src ./src
COPY --from=builder /app/bot.disabled ./bot.disabled
COPY --from=builder /app/index.ts ./index.ts
COPY --from=builder /app/app.ts ./app.ts
COPY --from=builder /app/routes.ts ./routes.ts
COPY --from=builder /app/static.ts ./static.ts
COPY --from=builder /app/vite.ts ./vite.ts
COPY --from=builder /app/db.ts ./db.ts
COPY --from=builder /app/db-utils.ts ./db-utils.ts
COPY --from=builder /app/db-schema.sql ./db-schema.sql
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/hub-db.ts ./hub-db.ts
COPY --from=builder /app/storage.ts ./storage.ts
COPY --from=builder /app/storage-db.ts ./storage-db.ts
COPY --from=builder /app/bitget_bridge.py ./bitget_bridge.py
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create .env from build args (override at runtime via Docker env)
ARG NODE_ENV=production
ARG HUB_PORT=3000
ENV NODE_ENV=${NODE_ENV}
ENV HUB_PORT=${HUB_PORT}

# Expose the application port
EXPOSE ${HUB_PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${HUB_PORT}/api/health || exit 1

# Switch to non-root user
USER appuser

# Start the server
CMD ["node", "--import", "tsx", "server/index.ts"]
