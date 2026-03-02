import Database from "better-sqlite3"
import path from "node:path"
import os from "node:os"

let db: Database.Database | null = null

export function resolveDbPath(): string {
  const fromEnv = process.env.SHIYU_DB_PATH
  if (fromEnv && fromEnv.trim()) {
    return fromEnv
  }
  return path.join(os.homedir(), ".shiyu.db")
}

export function getDatabase(dbPath?: string): Database.Database {
  if (db) return db

  const resolvedPath = dbPath ?? resolveDbPath()
  db = new Database(resolvedPath)

  // Enable WAL mode for better concurrency
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")

  initializeTables(db)
  return db
}

function initializeTables(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      nickname TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      email_verified INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL COLLATE NOCASE,
      code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_vcodes_email ON verification_codes(email);
    CREATE INDEX IF NOT EXISTS idx_vcodes_code ON verification_codes(code);

    CREATE TABLE IF NOT EXISTS vocabulary (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      word TEXT NOT NULL,
      meaning TEXT NOT NULL,
      context TEXT,
      article_path TEXT,
      review_count INTEGER NOT NULL DEFAULT 0,
      last_reviewed_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_vocabulary_user ON vocabulary(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulary_user_word ON vocabulary(user_id, word, article_path);

    CREATE TABLE IF NOT EXISTS sentences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sentence TEXT NOT NULL,
      explanation TEXT NOT NULL,
      article_path TEXT,
      review_count INTEGER NOT NULL DEFAULT 0,
      last_reviewed_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sentences_user ON sentences(user_id);

    CREATE TABLE IF NOT EXISTS invitation_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      max_uses INTEGER NOT NULL DEFAULT 1,
      used_count INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      expires_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
  `)

  // ── Migration: remove password_hash column if it exists ──
  const columns = database.pragma("table_info(users)") as Array<{ name: string }>
  const hasPasswordHash = columns.some((c) => c.name === "password_hash")

  if (hasPasswordHash) {
    console.log("[DB] Migrating: removing password_hash column from users table...")
    database.exec(`
      CREATE TABLE users_new (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        nickname TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
        email_verified INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      INSERT INTO users_new (id, email, nickname, role, email_verified, created_at, updated_at)
      SELECT id, email, COALESCE(nickname, email), role, COALESCE(email_verified, 1), created_at, COALESCE(updated_at, created_at)
      FROM users;

      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `)
    console.log("[DB] Migration complete.")
  }
}

/** Close the database connection (useful for testing) */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

/** Create an in-memory database for testing */
export function createTestDatabase(): Database.Database {
  const testDb = new Database(":memory:")
  testDb.pragma("journal_mode = WAL")
  testDb.pragma("foreign_keys = ON")
  initializeTables(testDb)
  return testDb
}
