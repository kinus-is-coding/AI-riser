# 1. Base stage
FROM node:22-slim AS base
WORKDIR /app

# 2. Stage Cài đặt Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

# 3. Stage Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# 4. Stage Production Runner
FROM node:22-slim AS runner

# Cài ffmpeg + ffprobe hệ thống (CHẮC CHẮN chạy)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080
CMD ["node", "server.js"]