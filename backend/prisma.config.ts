import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(configDir, '../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --import tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'] ?? 'file:./dev.db',
  },
});
