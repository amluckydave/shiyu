// 文章 CRUD + 级联删除
use crate::db::Database;
use crate::models::{AddArticleRequest, ArticleItem, UpdateArticleContentRequest};
use crate::repositories::article_repository::ArticleRepository;
use crate::repositories::vocabulary_repository::VocabularyRepository;
use crate::repositories::sentence_repository::SentenceRepository;
use tauri::State;

#[tauri::command]
pub fn get_articles(db: State<Database>) -> Result<Vec<ArticleItem>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = ArticleRepository::new();
    repo.find_all(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_article(id: String, db: State<Database>) -> Result<ArticleItem, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = ArticleRepository::new();
    repo.find_by_id(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Article not found".to_string())
}

#[tauri::command]
pub fn add_article(
    req: AddArticleRequest,
    db: State<Database>,
) -> Result<ArticleItem, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = ArticleRepository::new();
    let article = repo.create(&conn, req).map_err(|e| e.to_string())?;
    Ok(article)
}

#[tauri::command]
pub fn delete_article(id: String, db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // 级联删除：先删除关联的生词和句子标注
    let vocab_repo = VocabularyRepository::new();
    let sentence_repo = SentenceRepository::new();
    let article_repo = ArticleRepository::new();

    vocab_repo.delete_by_article(&conn, &id).map_err(|e| e.to_string())?;
    sentence_repo.delete_by_article(&conn, &id).map_err(|e| e.to_string())?;
    article_repo.delete(&conn, &id).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn update_article(req: UpdateArticleContentRequest, db: State<Database>) -> Result<ArticleItem, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = ArticleRepository::new();
    repo.update(&conn, req).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_article_mindmap(id: String, db: State<Database>) -> Result<Option<String>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let result: Option<String> = conn
        .query_row(
            "SELECT mindmap_markdown FROM articles WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub fn save_article_mindmap(id: String, markdown: String, db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE articles SET mindmap_markdown = ?1 WHERE id = ?2",
        rusqlite::params![markdown, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
