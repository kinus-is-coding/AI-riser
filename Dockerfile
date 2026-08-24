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

# Gán thẳng giá trị mặc định vào ARG để bypass việc Cloud Build truyền thiếu --build-arg
ARG NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAxv2fdoWkMx9yVHgOwmS7WSis_LDArJhw
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gen-lang-client-0723005417.firebaseapp.com
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=gen-lang-client-0723005417
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gen-lang-client-0723005417.firebasestorage.app
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=509847127047
ARG NEXT_PUBLIC_FIREBASE_APP_ID=1:509847127047:web:2fc305a5009b09ddf796a2
ARG NEXT_PUBLIC_SUPABASE_URL=https://hrouqwertusfwheqbiey.supabase.co
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_75VxpGJB0bZftUARNL91kg_plWT9Iud

# Ép thành ENV chuẩn để Next.js đóng gói vào JS bundle gửi xuống Client
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

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