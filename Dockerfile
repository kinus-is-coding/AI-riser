# 1. Dùng Node 22 bản Debian (slim) đồng nhất cho tất cả các stage
FROM node:22-slim AS base

# Cài đặt ffmpeg và các công cụ build cơ bản ngay từ base stage
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Stage Cài đặt Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
# Chuyển sang npm install để không bị gắt lỗi lockfile
RUN npm install

# 3. Stage Build ứng dụng
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# 4. Stage Production Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080
CMD ["node", "server.js"]