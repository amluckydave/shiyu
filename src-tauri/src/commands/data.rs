// 数据导入/导出
use crate::db::Database;
use crate::models::{ArticleItem, ExportData, SentenceItem, SettingItem, VocabularyItem};
use tauri::State;

#[tauri::command]
pub fn export_all_data(db: State<Database>) -> Result<ExportData, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Export vocabulary
    let mut stmt = conn
        .prepare("SELECT id, word, meaning, context, article_path, review_count, last_reviewed_at, created_at, srs_due, srs_stability, srs_difficulty, srs_state, srs_lapses, srs_reps, srs_last_review FROM vocabulary")
        .map_err(|e| e.to_string())?;
    let vocabulary = stmt
        .query_map([], |row| {
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
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Export sentences
    let mut stmt = conn
        .prepare("SELECT id, sentence, explanation, article_path, review_count, last_reviewed_at, created_at, srs_due, srs_stability, srs_difficulty, srs_state, srs_lapses, srs_reps, srs_last_review FROM sentences")
        .map_err(|e| e.to_string())?;
    let sentences = stmt
        .query_map([], |row| {
            Ok(SentenceItem {
                id: row.get(0)?,
                sentence: row.get(1)?,
                explanation: row.get(2)?,
                article_path: row.get(3)?,
                review_count: row.get(4)?,
                last_reviewed_at: row.get(5)?,
                created_at: row.get(6)?,
                srs_due: row.get(7)?,
                srs_stability: row.get(8)?,
                srs_difficulty: row.get(9)?,
                srs_state: row.get(10)?,
                srs_lapses: row.get(11)?,
                srs_reps: row.get(12)?,
                srs_last_review: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Export settings
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let settings = stmt
        .query_map([], |row| {
            Ok(SettingItem {
                key: row.get(0)?,
                value: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Export articles
    let mut stmt = conn
        .prepare("SELECT id, title, content, author, category, description, word_count, created_at FROM articles ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let articles = stmt
        .query_map([], |row| {
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
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(ExportData {
        vocabulary,
        sentences,
        settings,
        articles,
    })
}

#[tauri::command]
pub fn import_data(db: State<Database>, data: ExportData, mode: String) -> Result<String, String> {
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;

    // 使用事务确保数据一致性
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    if mode == "replace" {
        tx.execute_batch("DELETE FROM vocabulary; DELETE FROM sentences; DELETE FROM settings; DELETE FROM articles;")
            .map_err(|e| e.to_string())?;
    }

    let mut vocab_count = 0;
    for item in &data.vocabulary {
        let result = tx.execute(
            "INSERT OR IGNORE INTO vocabulary (id, word, meaning, context, article_path, review_count, last_reviewed_at, created_at, srs_due, srs_stability, srs_difficulty, srs_state, srs_lapses, srs_reps, srs_last_review) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            rusqlite::params![item.id, item.word, item.meaning, item.context, item.article_path, item.review_count, item.last_reviewed_at, item.created_at, item.srs_due, item.srs_stability, item.srs_difficulty, item.srs_state, item.srs_lapses, item.srs_reps, item.srs_last_review],
        );
        if result.is_ok() {
            vocab_count += 1;
        }
    }

    let mut sentence_count = 0;
    for item in &data.sentences {
        let result = tx.execute(
            "INSERT OR IGNORE INTO sentences (id, sentence, explanation, article_path, review_count, last_reviewed_at, created_at, srs_due, srs_stability, srs_difficulty, srs_state, srs_lapses, srs_reps, srs_last_review) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            rusqlite::params![item.id, item.sentence, item.explanation, item.article_path, item.review_count, item.last_reviewed_at, item.created_at, item.srs_due, item.srs_stability, item.srs_difficulty, item.srs_state, item.srs_lapses, item.srs_reps, item.srs_last_review],
        );
        if result.is_ok() {
            sentence_count += 1;
        }
    }

    for item in &data.settings {
        tx.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
            rusqlite::params![item.key, item.value],
        )
        .ok();
    }

    // Import articles
    let mut article_count = 0;
    for item in &data.articles {
        let result = tx.execute(
            "INSERT OR IGNORE INTO articles (id, title, content, author, category, description, word_count, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![item.id, item.title, item.content, item.author, item.category, item.description, item.word_count, item.created_at],
        );
        if result.is_ok() {
            article_count += 1;
        }
    }

    // 提交事务
    tx.commit().map_err(|e| e.to_string())?;

    Ok(format!(
        "导入完成：{} 个生词，{} 个句子，{} 个设置项，{} 篇文章",
        vocab_count,
        sentence_count,
        data.settings.len(),
        article_count
    ))
}
