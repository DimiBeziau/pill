# syntax=docker/dockerfile:1

# better-sqlite3 demande une toolchain native ; bookworm-slim (glibc) garde un
# comportement identique entre build et runtime.
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="file:./build.db"
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl gosu \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/pill.db"
ENV PORT=3000
ENV TZ=UTC

RUN groupadd --system nodejs && useradd --system --gid nodejs nextjs \
  && mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/app/generated ./app/generated
COPY package.json next.config.ts ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R nextjs:nodejs /app

EXPOSE 3000

# Reste root pour corriger les droits du volume ./data (créé par Docker en root)
# avant de passer à l'utilisateur nextjs.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
