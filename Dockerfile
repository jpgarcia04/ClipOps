# ─────────────────────────────────────────────────────────────
# ClipOps — Next.js 14 production image (multi-stage build)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
# libc6-compat & openssl are required by Prisma's engines on Alpine.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ---- 1. Dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
# The Prisma schema is required so `prisma generate` can run.
COPY prisma ./prisma
RUN npm ci

# ---- 2. Build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Sube el límite de heap de Node (por defecto ~2 GB) para que el build de
# Next no muera por "JavaScript heap out of memory" en VPS con poca RAM.
# Requiere swap configurada en el host (ver guía de deploy).
ENV NODE_OPTIONS=--max-old-space-size=3072
RUN npm run build

# ---- 3. Runner ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# ffmpeg para el export del editor (recorte + textos) y fuentes para drawtext.
RUN apk add --no-cache ffmpeg ttf-dejavu
# node_modules is kept so the Prisma CLI is available to sync the
# schema at container start (see docker-entrypoint.sh).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
# Strip any CRLF (Windows) line endings so the script runs under /bin/sh,
# then make it executable.
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["./docker-entrypoint.sh"]
