FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci

COPY tsconfig.base.json ./
COPY backend backend

WORKDIR /app/backend

RUN npm run db:generate \
  && npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
  PORT=3000 \
  DATABASE_URL=file:/app/data/dev.db \
  LOCAL_STORAGE_DIR=/app/storage/private

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/backend/package.json backend/package.json
COPY --from=builder /app/backend/dist backend/dist
COPY --from=builder /app/backend/prisma backend/prisma
COPY --from=builder /app/backend/prisma.config.ts backend/prisma.config.ts
COPY backend/docker-entrypoint.sh backend/docker-entrypoint.sh

RUN mkdir -p /app/data /app/storage/private \
  && chmod +x /app/backend/docker-entrypoint.sh

WORKDIR /app/backend

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
