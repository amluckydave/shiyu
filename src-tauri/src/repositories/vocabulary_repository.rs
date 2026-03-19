use crate::models::{AddVocabularyRequest, UpdateSrsRequest, VocabularyGrouped, VocabularyItem};
use crate::repositories::FromRow;
use chrono::Utc;
use rusqlite::{Connection, Result};
use std::sync::MutexGuard;
use uuid::Uuid;

impl FromRow for VocabularyItem {
    fn from_row(row: &rusqlite::Row) -> Result<Self> {
        Ok(VocabularyItem {
            id: row.get(0)?,
            word: row.get(1)?,
            meaning: row.get(2)?,
            context: row.get(3)?,
            article_path: row.get(4)?,
            review_count: row.get(5)?,
            last_reviewed_at: row.get(6)?,
            created_at: row.get(7)?,
            srs_due: row.get(8)?,
            srs_stability: row.get(9)?,
            srs_difficulty: row.get(10)?,
            srs_state: row.get(11)?,
            srs_lapses: row.get(12)?,
            srs_reps: row.get(13)?,
            srs_last_review: row.get(14)?,
        })
    }
}

const VOCAB_SELECT: &str =
    "SELECT id, word, meaning, context, article_path, review_count, last_reviewed_at, created_at,
            srs_due, srs_stability, srs_difficulty, srs_state, srs_lapses, srs_reps, srs_last_review
     FROM vocabulary";

/// 生词Repository
pub struct VocabularyRepository;

impl VocabularyRepository {
    pub fn new() -> Self {
        Self
    }

    /// 获取所有生词
    pub fn find_all(&self, conn: &MutexGuard<Connection>) -> Result<Vec<VocabularyItem>> {
        let sql = format!("{} ORDER BY created_at DESC", VOCAB_SELECT);
        let mut stmt = conn.prepare(&sql)?;

        let items = stmt
            .query_map([], |row| VocabularyItem::from_row(row))?
            .collect::<Result<Vec<_>>>()?;

        Ok(items)
    }

    /// 根据文章ID查找关联生词
    pub fn find_by_article(&self, conn: &MutexGuard<Connection>, article_path: &str) -> Result<Vec<VocabularyItem>> {
        let sql = format!("{} WHERE article_path = ?1 ORDER BY created_at DESC", VOCAB_SELECT);
        let mut stmt = conn.prepare(&sql)?;

        let items = stmt
            .query_map([article_path], |row| VocabularyItem::from_row(row))?
            .collect::<Result<Vec<_>>>()?;

        Ok(items)
    }

    /// 获取到期待复习的生词
    pub fn find_due(&self, conn: &MutexGuard<Connection>, now_ms: i64) -> Result<Vec<VocabularyItem>> {
        let sql = format!(
            "{} WHERE (srs_due IS NULL OR srs_due <= ?1) AND srs_state != -1 ORDER BY srs_due ASC",
            VOCAB_SELECT
        );
        let mut stmt = conn.prepare(&sql)?;

        let items = stmt
            .query_map([now_ms], |row| VocabularyItem::from_row(row))?
            .collect::<Result<Vec<_>>>()?;

        Ok(items)
    }

    /// 添加生词
    pub fn create(&self, conn: &MutexGuard<Connection>, req: AddVocabularyRequest) -> Result<VocabularyItem> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();

        conn.execute(
            "INSERT INTO vocabulary (id, word, meaning, context, article_path, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![id, req.word, req.meaning, req.context, req.article_path, now],
        )?;

        Ok(VocabularyItem {
            id,
            word: req.word,
            meaning: req.meaning,
            context: req.context,
            article_path: req.article_path,
            review_count: 0,
            last_reviewed_at: None,
            created_at: now,
            srs_due: None,
            srs_stability: 0.0,
            srs_difficulty: 0.0,
            srs_state: 0,
            srs_lapses: 0,
            srs_reps: 0,
            srs_last_review: None,
        })
    }

    /// 删除生词
    pub fn delete(&self, conn: &MutexGuard<Connection>, id: &str) -> Result<usize> {
        conn.execute("DELETE FROM vocabulary WHERE id = ?1", [id])
    }

    /// 更新复习状态（旧接口，保持兼容）
    pub fn update_review(&self, conn: &MutexGuard<Connection>, id: &str) -> Result<usize> {
        let now = Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE vocabulary SET review_count = review_count + 1, last_reviewed_at = ?1 WHERE id = ?2",
            rusqlite::params![now, id],
        )
    }

    /// 更新 SRS 状态（FSRS 算法计算后的结果）
    pub fn update_srs(&self, conn: &MutexGuard<Connection>, req: &UpdateSrsRequest) -> Result<usize> {
        let now = Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE vocabulary SET
                review_count = review_count + 1,
                last_reviewed_at = ?1,
                srs_due = ?2,
                srs_stability = ?3,
                srs_difficulty = ?4,
                srs_state = ?5,
                srs_lapses = ?6,
                srs_reps = ?7,
                srs_last_review = ?8
             WHERE id = ?9",
            rusqlite::params![
                now,
                req.srs_due,
                req.srs_stability,
                req.srs_difficulty,
                req.srs_state,
                req.srs_lapses,
                req.srs_reps,
                req.srs_last_review,
                req.id,
            ],
        )
    }

    /// 根据文章路径删除所有关联生词
    pub fn delete_by_article(&self, conn: &MutexGuard<Connection>, article_path: &str) -> Result<usize> {
        conn.execute(
            "DELETE FROM vocabulary WHERE article_path = ?1",
            [article_path]
        )
    }

    /// 按 word 分组聚合，用于全局生词本视图
    pub fn find_grouped(&self, conn: &MutexGuard<Connection>) -> Result<Vec<VocabularyGrouped>> {
        // 先获取所有生词
        let all = self.find_all(conn)?;

        // 按 word（小写）分组
        let mut groups: std::collections::HashMap<String, Vec<VocabularyItem>> = std::collections::HashMap::new();
        for item in all {
            let key = item.word.to_lowercase();
            groups.entry(key).or_default().push(item);
        }

        // 转换为 VocabularyGrouped
        let mut result: Vec<VocabularyGrouped> = groups
            .into_iter()
            .map(|(_, mut entries)| {
                // 按时间倒序：最新在前
                entries.sort_by(|a, b| b.created_at.cmp(&a.created_at));
                let primary_meaning = entries[0].meaning.clone();
                let word = entries[0].word.clone();
                let article_count = entries
                    .iter()
                    .filter_map(|e| e.article_path.as_ref())
                    .collect::<std::collections::HashSet<_>>()
                    .len() as u32;
                let total_review_count: i64 = entries.iter().map(|e| e.review_count).sum();
                let last_reviewed_at = entries.iter().filter_map(|e| e.last_reviewed_at).max();

                VocabularyGrouped {
                    word,
                    primary_meaning,
                    article_count,
                    total_review_count,
                    last_reviewed_at,
                    entries,
                }
            })
            .collect();

        // 按最新条目时间排序
        result.sort_by(|a, b| {
            let a_time = a.entries.first().map(|e| e.created_at).unwrap_or(0);
            let b_time = b.entries.first().map(|e| e.created_at).unwrap_or(0);
            b_time.cmp(&a_time)
        });

        Ok(result)
    }
}
