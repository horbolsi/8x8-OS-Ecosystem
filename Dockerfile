# 8x8 Hub Server - Dockerfile (Simplified)
FROM node:22-alpine

WORKDIR /app

# Copy all files
COPY . .

# Install ALL dependencies including dev deps (needed for tsx)
RUN npm install

# Build TypeScript to JavaScript
RUN npx tsc --outDir dist --declaration false --sourceMap false 2>/dev/null || echo "tsc not available, using tsx"

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "--import", "tsx", "server/index.ts"]
