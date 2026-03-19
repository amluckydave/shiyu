use crate::db::Database;
use crate::models::{AddSentenceRequest, SentenceItem, UpdateSrsRequest};
use crate::repositories::sentence_repository::SentenceRepository;
use tauri::State;

#[tauri::command]
pub fn get_sentences(db: State<Database>) -> Result<Vec<SentenceItem>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = SentenceRepository::new();
    repo.find_all(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_sentences_by_article(db: State<Database>, article_id: String) -> Result<Vec<SentenceItem>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = SentenceRepository::new();
    repo.find_by_article(&conn, &article_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_sentence(db: State<Database>, req: AddSentenceRequest) -> Result<SentenceItem, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = SentenceRepository::new();
    repo.create(&conn, req).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_sentence(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = SentenceRepository::new();
    repo.delete(&conn, &id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_sentence_review(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = SentenceRepository::new();
    repo.update_review(&conn, &id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_due_sentences(db: State<Database>, now_ms: i64) -> Result<Vec<SentenceItem>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = SentenceRepository::new();
    repo.find_due(&conn, now_ms).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_sentence_srs(db: State<Database>, req: UpdateSrsRequest) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = SentenceRepository::new();
    repo.update_srs(&conn, &req).map_err(|e| e.to_string())?;
    Ok(())
}
