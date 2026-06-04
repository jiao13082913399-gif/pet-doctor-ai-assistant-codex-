#!/bin/sh
set -eu

mkdir -p /app/data "${LOCAL_STORAGE_DIR:-/app/storage/private}"

echo "Running Prisma migrations..."
npx prisma migrate deploy || {
  echo "Prisma migration failed; falling back to checked-in SQLite SQL initialization..."
  node --import tsx prisma/sqlite-init.ts
}

if [ "${SEED_ON_START:-true}" = "true" ]; then
  echo "Running MVP seed..."
  npm run db:seed
fi

exec "$@"
