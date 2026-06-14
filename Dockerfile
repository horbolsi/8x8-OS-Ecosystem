# 8x8 Hub Server - Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests first (layer caching)
COPY package.json ./

# Install all dependencies (including tsx for TypeScript execution)
RUN npm install

# Copy source code
COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "--import", "tsx", "server/index.ts"]
