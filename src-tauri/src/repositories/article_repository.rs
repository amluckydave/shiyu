use crate::models::{AddArticleRequest, ArticleItem, UpdateArticleContentRequest};
use crate::repositories::FromRow;
use chrono::Utc;
use rusqlite::{Connection, Result};
use std::sync::MutexGuard;
use uuid::Uuid;

impl FromRow for ArticleItem {
    fn from_row(row: &rusqlite::Row) -> Result<Self> {
        Ok(ArticleItem {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            author: row.get(3)?,
            category: row.get(4)?,
            description: row.get(5)?,
            word_count: row.get(6)?,
            created_at: row.get(7)?,
        })
    }
}

/// 文章Repository
pub struct ArticleRepository;

impl ArticleRepository {
    pub fn new() -> Self {
        Self
    }

    /// 获取文章列表（不包含content字段）
    pub fn find_all(&self, conn: &MutexGuard<Connection>) -> Result<Vec<ArticleItem>> {
        let mut stmt = conn.prepare(
            "SELECT id, title, '' as content, author, category, description, word_count, created_at
             FROM articles
             ORDER BY created_at DESC"
        )?;

        let items = stmt
            .query_map([], |row| ArticleItem::from_row(row))?
            .collect::<Result<Vec<_>>>()?;

        Ok(items)
    }

    /// 获取文章详情（包含content）
    pub fn find_by_id(&self, conn: &MutexGuard<Connection>, id: &str) -> Result<Option<ArticleItem>> {
        let result = conn.query_row(
            "SELECT id, title, content, author, category, description, word_count, created_at
             FROM articles WHERE id = ?1",
            [id],
            |row| ArticleItem::from_row(row),
        );

        match result {
            Ok(item) => Ok(Some(item)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// 添加文章
    pub fn create(&self, conn: &MutexGuard<Connection>, req: AddArticleRequest) -> Result<ArticleItem> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();
        let word_count = req.content.split_whitespace().count() as i64;

        conn.execute(
            "INSERT INTO articles (id, title, content, author, category, description, word_count, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![id, req.title, req.content, req.author, req.category, req.description, word_count, now],
        )?;

        Ok(ArticleItem {
            id,
            title: req.title,
            content: req.content,
            author: req.author,
            category: req.category,
            description: req.description,
            word_count,
            created_at: now,
        })
    }

    /// 更新文章
    pub fn update(&self, conn: &MutexGuard<Connection>, req: UpdateArticleContentRequest) -> Result<ArticleItem> {
        let word_count = req.content.split_whitespace().count() as i64;

        conn.execute(
            "UPDATE articles SET title = ?1, content = ?2, word_count = ?3 WHERE id = ?4",
            rusqlite::params![req.title, req.content, word_count, req.id],
        )?;

        self.find_by_id(conn, &req.id)?.map_or(
            Err(rusqlite::Error::QueryReturnedNoRows),
            Ok
        )
    }

    /// 删除文章
    pub fn delete(&self, conn: &MutexGuard<Connection>, id: &str) -> Result<usize> {
        conn.execute("DELETE FROM articles WHERE id = ?1", [id])
    }

    /// 获取文章数量（预留：仪表盘统计）
    #[allow(dead_code)]
    pub fn count(&self, conn: &MutexGuard<Connection>) -> Result<i64> {
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM articles",
            [],
            |row| row.get(0)
        )?;
        Ok(count)
    }

    /// 获取总字数（预留：仪表盘统计）
    #[allow(dead_code)]
    pub fn total_word_count(&self, conn: &MutexGuard<Connection>) -> Result<i64> {
        let count: i64 = conn.query_row(
            "SELECT COALESCE(SUM(word_count), 0) FROM articles",
            [],
            |row| row.get(0)
        )?;
        Ok(count)
    }
}
