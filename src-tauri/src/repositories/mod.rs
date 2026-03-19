use rusqlite::{Result, Row};

pub mod article_repository;
pub mod sentence_repository;
pub mod vocabulary_repository;


/// 从Row映射到结构体的trait
pub trait FromRow: Sized {
    fn from_row(row: &Row) -> Result<Self>;
}
