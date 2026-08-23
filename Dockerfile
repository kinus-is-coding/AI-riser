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

# Khai báo ARG nhận biến từ Cloud Build Trigger (bắt buộc có dấu _)
ARG _NEXT_PUBLIC_FIREBASE_API_KEY
ARG _NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG _NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG _NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG _NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG _NEXT_PUBLIC_FIREBASE_APP_ID
ARG _NEXT_PUBLIC_SUPABASE_URL
ARG _NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

# Ép thành ENV chuẩn để Next.js nhúng vào JS bundle lúc npm run build
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$_NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$_NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$_NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_SUPABASE_URL=$_NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# 4. Stage Production Runner
FROM node:22-slim AS runner

# ✅ cài ffmpeg + ffprobe vào PATH của container
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