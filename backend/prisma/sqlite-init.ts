import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationName = '20260529030855_init_schema';
const migrationPath = resolve(__dirname, 'migrations', migrationName, 'migration.sql');

function resolveSqlitePath(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('sqlite-init only supports file: SQLite DATABASE_URL values');
  }

  const rawPath = databaseUrl.slice('file:'.length);
  if (!rawPath) {
    throw new Error('DATABASE_URL must include a SQLite file path');
  }

  return rawPath.startsWith('/') ? rawPath : resolve(__dirname, rawPath);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
  const databasePath = resolveSqlitePath(databaseUrl);
  await mkdir(dirname(databasePath), { recursive: true });

  const require = createRequire(import.meta.url);
  const Database = require('better-sqlite3');
  const db = new Database(databasePath);

  try {
    const hasUsersTable = Boolean(
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get(),
    );

    if (hasUsersTable) {
      console.log(`SQLite schema already exists at ${databasePath}`);
      return;
    }

    if (!existsSync(migrationPath)) {
      throw new Error(`Migration SQL not found: ${migrationPath}`);
    }

    const migrationSql = await readFile(migrationPath, 'utf8');
    db.exec(migrationSql);
    db.exec(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "checksum" TEXT NOT NULL,
        "finished_at" DATETIME,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT,
        "rolled_back_at" DATETIME,
        "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
        "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
      );
    `);
    db.prepare(
      `
        INSERT OR IGNORE INTO "_prisma_migrations"
          ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
        VALUES
          (?, ?, CURRENT_TIMESTAMP, ?, NULL, NULL, CURRENT_TIMESTAMP, 1)
      `,
    ).run(randomUUID(), createHash('sha256').update(migrationSql).digest('hex'), migrationName);

    console.log(`SQLite schema initialized at ${databasePath}`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
