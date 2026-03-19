// 数据库初始化与迁移
use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;

const CURRENT_SCHEMA_VERSION: i32 = 3;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self> {
        let db_path = Self::resolve_db_path();

        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(&db_path)?;
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;
        Self::initialize_tables(&conn)?;
        Self::run_migrations(&conn)?;
        Self::check_version_announcement(&conn);

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }

    /// 版本变更时自动清除 last_seen_version，确保版本公告弹窗在新版本首次启动时显示
    fn check_version_announcement(conn: &Connection) {
        let current = env!("CARGO_PKG_VERSION");
        let stored: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'last_seen_version'",
                [],
                |row| row.get(0),
            )
            .ok();
        if stored.as_deref() != Some(current) && stored.is_some() {
            conn.execute(
                "DELETE FROM settings WHERE key = 'last_seen_version'",
                [],
            )
            .ok();
        }
    }




    fn resolve_db_path() -> PathBuf {
        let mut path = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        path.push(".shiyu");
        path.push("shiyu.db");
        path
    }

    /// 获取当前schema版本
    fn get_schema_version(conn: &Connection) -> Result<i32> {
        let version: i32 = conn.query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )?;
        Ok(version)
    }

    /// 运行数据库迁移
    fn run_migrations(conn: &Connection) -> Result<()> {
        let current_version = Self::get_schema_version(conn)?;

        if current_version < CURRENT_SCHEMA_VERSION {
            // 创建schema_migrations表（如果不存在）
            conn.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations (
                    version INTEGER PRIMARY KEY,
                    applied_at INTEGER NOT NULL
                )",
                [],
            )?;

            // 应用迁移
            Self::apply_migration(conn, current_version)?;

            // 更新版本记录
            let now = chrono::Utc::now().timestamp_millis();
            conn.execute(
                "INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
                rusqlite::params![CURRENT_SCHEMA_VERSION, now],
            )?;
        }

        Ok(())
    }

    /// 应用具体的迁移（逐版本递进）
    fn apply_migration(conn: &Connection, from_version: i32) -> Result<()> {
        if from_version < 1 {
            conn.execute_batch(
                "
                CREATE INDEX IF NOT EXISTS idx_vocabulary_article_path ON vocabulary(article_path);
                CREATE INDEX IF NOT EXISTS idx_sentences_article_path ON sentences(article_path);
                CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);
                "
            )?;
        }

        if from_version < 2 {
            // v2: 添加 FSRS 间隔重复字段
            conn.execute_batch(
                "
                ALTER TABLE vocabulary ADD COLUMN srs_due INTEGER;
                ALTER TABLE vocabulary ADD COLUMN srs_stability REAL NOT NULL DEFAULT 0;
                ALTER TABLE vocabulary ADD COLUMN srs_difficulty REAL NOT NULL DEFAULT 0;
                ALTER TABLE vocabulary ADD COLUMN srs_state INTEGER NOT NULL DEFAULT 0;
                ALTER TABLE vocabulary ADD COLUMN srs_lapses INTEGER NOT NULL DEFAULT 0;
                ALTER TABLE vocabulary ADD COLUMN srs_reps INTEGER NOT NULL DEFAULT 0;
                ALTER TABLE vocabulary ADD COLUMN srs_last_review INTEGER;

                ALTER TABLE sentences ADD COLUMN srs_due INTEGER;
                ALTER TABLE sentences ADD COLUMN srs_stability REAL NOT NULL DEFAULT 0;
                ALTER TABLE sentences ADD COLUMN srs_difficulty REAL NOT NULL DEFAULT 0;
                ALTER TABLE sentences ADD COLUMN srs_state INTEGER NOT NULL DEFAULT 0;
                ALTER TABLE sentences ADD COLUMN srs_lapses INTEGER NOT NULL DEFAULT 0;
                ALTER TABLE sentences ADD COLUMN srs_reps INTEGER NOT NULL DEFAULT 0;
                ALTER TABLE sentences ADD COLUMN srs_last_review INTEGER;

                CREATE INDEX IF NOT EXISTS idx_vocabulary_srs_due ON vocabulary(srs_due);
                CREATE INDEX IF NOT EXISTS idx_sentences_srs_due ON sentences(srs_due);
                "
            )?;
        }

        if from_version < 3 {
            // v3: 思维导图持久化
            conn.execute_batch(
                "ALTER TABLE articles ADD COLUMN mindmap_markdown TEXT;"
            )?;
        }

        Ok(())
    }

    fn initialize_tables(conn: &Connection) -> Result<()> {
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS vocabulary (
                id TEXT PRIMARY KEY,
                word TEXT NOT NULL,
                meaning TEXT NOT NULL,
                context TEXT,
                article_path TEXT,
                review_count INTEGER NOT NULL DEFAULT 0,
                last_reviewed_at INTEGER,
                created_at INTEGER NOT NULL
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulary_word_path
                ON vocabulary(word, article_path);

            CREATE TABLE IF NOT EXISTS sentences (
                id TEXT PRIMARY KEY,
                sentence TEXT NOT NULL,
                explanation TEXT NOT NULL,
                article_path TEXT,
                review_count INTEGER NOT NULL DEFAULT 0,
                last_reviewed_at INTEGER,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                author TEXT,
                category TEXT,
                description TEXT,
                word_count INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS ebooks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                file_path TEXT NOT NULL,
                author TEXT,
                format TEXT NOT NULL DEFAULT 'epub',
                progress REAL NOT NULL DEFAULT 0.0,
                cfi_position TEXT,
                last_read_at INTEGER,
                created_at INTEGER NOT NULL
            );

            -- Schema版本表（用于迁移）
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at INTEGER NOT NULL
            );

            -- 创建常用索引
            CREATE INDEX IF NOT EXISTS idx_vocabulary_article_path ON vocabulary(article_path);
            CREATE INDEX IF NOT EXISTS idx_sentences_article_path ON sentences(article_path);
            CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);

            -- 插入初始版本
            INSERT OR IGNORE INTO schema_migrations (version, applied_at)
            SELECT 1, strftime('%s', 'now') * 1000
            WHERE NOT EXISTS (SELECT 1 FROM schema_migrations);
            ",
        )?;
        Ok(())
    }
}
