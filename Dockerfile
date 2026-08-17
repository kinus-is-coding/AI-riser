FROM node:20 AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
COPY . .
# Cho phép bỏ qua kiểm tra TypeScript/Lint khi build Docker nếu có lỗi nhỏ không đáng kể
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Cài đặt ffmpeg và các dependencies cần thiết cho môi trường Linux
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080
CMD ["node", "server.js"]