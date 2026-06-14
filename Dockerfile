# 8x8 Hub Server - Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (use --production to skip dev deps)
RUN npm install --production 2>&1 || echo "npm install failed, trying alternative" && \
    npm install express pg ws dotenv cors zod uuid 2>&1

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "--import", "tsx", "server/index.ts"]
