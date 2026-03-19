use crate::db::Database;
use crate::models::{AddVocabularyRequest, UpdateSrsRequest, VocabularyGrouped, VocabularyItem};
use crate::repositories::vocabulary_repository::VocabularyRepository;
use tauri::State;

#[tauri::command]
pub fn get_vocabulary(db: State<Database>) -> Result<Vec<VocabularyItem>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = VocabularyRepository::new();
    repo.find_all(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_vocabulary_by_article(db: State<Database>, article_id: String) -> Result<Vec<VocabularyItem>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = VocabularyRepository::new();
    repo.find_by_article(&conn, &article_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_vocabulary_grouped(db: State<Database>) -> Result<Vec<VocabularyGrouped>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = VocabularyRepository::new();
    repo.find_grouped(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_vocabulary(db: State<Database>, req: AddVocabularyRequest) -> Result<VocabularyItem, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = VocabularyRepository::new();
    repo.create(&conn, req).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_vocabulary(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = VocabularyRepository::new();
    repo.delete(&conn, &id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_vocabulary_review(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = VocabularyRepository::new();
    repo.update_review(&conn, &id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_due_vocabulary(db: State<Database>, now_ms: i64) -> Result<Vec<VocabularyItem>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = VocabularyRepository::new();
    repo.find_due(&conn, now_ms).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_vocabulary_srs(db: State<Database>, req: UpdateSrsRequest) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let repo = VocabularyRepository::new();
    repo.update_srs(&conn, &req).map_err(|e| e.to_string())?;
    Ok(())
}
