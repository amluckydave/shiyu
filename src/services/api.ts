import { invoke } from '@tauri-apps/api/core'

// ── Vocabulary ──────────────────────────────────────────

export interface VocabularyItem {
    id: string
    word: string
    meaning: string
    context?: string
    article_path?: string
    review_count: number
    last_reviewed_at?: number
    created_at: number
    // FSRS SRS fields
    srs_due?: number
    srs_stability: number
    srs_difficulty: number
    srs_state: number
    srs_lapses: number
    srs_reps: number
    srs_last_review?: number
}

export interface AddVocabularyRequest {
    word: string
    meaning: string
    context?: string
    article_path?: string
}

export async function getVocabulary(): Promise<VocabularyItem[]> {
    return invoke('get_vocabulary')
}

export async function getVocabularyByArticle(articleId: string): Promise<VocabularyItem[]> {
    return invoke('get_vocabulary_by_article', { articleId })
}

export interface VocabularyGrouped {
    word: string
    primary_meaning: string
    article_count: number
    total_review_count: number
    last_reviewed_at?: number
    entries: VocabularyItem[]
}

export async function getVocabularyGrouped(): Promise<VocabularyGrouped[]> {
    return invoke('get_vocabulary_grouped')
}

export async function addVocabulary(req: AddVocabularyRequest): Promise<VocabularyItem> {
    return invoke('add_vocabulary', { req })
}

export async function deleteVocabulary(id: string): Promise<void> {
    return invoke('delete_vocabulary', { id })
}

export async function updateVocabularyReview(id: string): Promise<void> {
    return invoke('update_vocabulary_review', { id })
}

export async function getDueVocabulary(nowMs: number): Promise<VocabularyItem[]> {
    return invoke('get_due_vocabulary', { nowMs })
}

export interface UpdateSrsRequest {
    id: string
    srs_due?: number
    srs_stability: number
    srs_difficulty: number
    srs_state: number
    srs_lapses: number
    srs_reps: number
    srs_last_review?: number
}

export async function updateVocabularySrs(req: UpdateSrsRequest): Promise<void> {
    return invoke('update_vocabulary_srs', { req })
}

// ── Sentences ───────────────────────────────────────────

export interface SentenceItem {
    id: string
    sentence: string
    explanation: string
    article_path?: string
    review_count: number
    last_reviewed_at?: number
    created_at: number
    // FSRS SRS fields
    srs_due?: number
    srs_stability: number
    srs_difficulty: number
    srs_state: number
    srs_lapses: number
    srs_reps: number
    srs_last_review?: number
}

export interface AddSentenceRequest {
    sentence: string
    explanation: string
    article_path?: string
}

export async function getSentences(): Promise<SentenceItem[]> {
    return invoke('get_sentences')
}

export async function getSentencesByArticle(articleId: string): Promise<SentenceItem[]> {
    return invoke('get_sentences_by_article', { articleId })
}

export async function addSentence(req: AddSentenceRequest): Promise<SentenceItem> {
    return invoke('add_sentence', { req })
}

export async function deleteSentence(id: string): Promise<void> {
    return invoke('delete_sentence', { id })
}

export async function updateSentenceReview(id: string): Promise<void> {
    return invoke('update_sentence_review', { id })
}

export async function getDueSentences(nowMs: number): Promise<SentenceItem[]> {
    return invoke('get_due_sentences', { nowMs })
}

export async function updateSentenceSrs(req: UpdateSrsRequest): Promise<void> {
    return invoke('update_sentence_srs', { req })
}

// ── Settings ────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
    return invoke('get_setting', { key })
}

export async function setSetting(key: string, value: string): Promise<void> {
    return invoke('set_setting', { key, value })
}

export async function getAllSettings(): Promise<{ key: string; value: string }[]> {
    return invoke('get_all_settings')
}

export async function deleteSetting(key: string): Promise<void> {
    return invoke('delete_setting', { key })
}

// ── Config Pack ─────────────────────────────────────────

/** 导入加密配置包，返回成功导入的配置项数 */
export async function importConfigPack(filePath: string): Promise<number> {
    return invoke('import_config_pack', { filePath })
}

// ── AI Translation ──────────────────────────────────────

export interface TranslateRequest {
    text: string
    prompt_type: 'word' | 'sentence' | 'complex_sentence' | 'sentence_structure' | 'mindmap'
}

export async function translateText(req: TranslateRequest): Promise<{ result: string }> {
    return invoke('translate_text', { req })
}

export async function testApiConnection(): Promise<string> {
    return invoke('test_api_connection')
}

export async function translateArticleStream(
    paragraphs: { index: number; text: string }[],
    title?: string,
): Promise<void> {
    return invoke('translate_article_stream', {
        req: { paragraphs, title: title || null },
    })
}

// ── Data Import/Export ──────────────────────────────────

export interface ExportData {
    vocabulary: VocabularyItem[]
    sentences: SentenceItem[]
    settings: { key: string; value: string }[]
    articles: ArticleItem[]
}

export async function exportAllData(): Promise<ExportData> {
    return invoke('export_all_data')
}

export async function importData(data: ExportData, mode: string): Promise<string> {
    return invoke('import_data', { data, mode })
}

// ── Articles ────────────────────────────────────────────

export interface ArticleItem {
    id: string
    title: string
    content: string
    author?: string
    category?: string
    description?: string
    word_count: number
    created_at: number
}

export interface AddArticleRequest {
    title: string
    content: string
    author?: string
    category?: string
    description?: string
}

export interface UpdateArticleContentRequest {
    id: string
    title: string
    content: string
}

export async function getArticles(): Promise<ArticleItem[]> {
    return invoke('get_articles')
}

export async function getArticle(id: string): Promise<ArticleItem> {
    return invoke('get_article', { id })
}

export async function addArticle(req: AddArticleRequest): Promise<ArticleItem> {
    return invoke('add_article', { req })
}

export async function updateArticleContent(req: UpdateArticleContentRequest): Promise<ArticleItem> {
    return invoke('update_article', { req })
}

export async function deleteArticle(id: string): Promise<void> {
    return invoke('delete_article', { id })
}

export async function getArticleMindMap(id: string): Promise<string | null> {
    return invoke('get_article_mindmap', { id })
}

export async function saveArticleMindMap(id: string, markdown: string): Promise<void> {
    return invoke('save_article_mindmap', { id, markdown })
}

// ── EPUB Tools ──────────────────────────────────────────

export interface TocEntry {
    index: number
    label: string
    path: string
    level: number
    children: TocEntry[]
}

export interface EpubImage {
    filename: string
    mime_type: string
    data_base64: string
}

export interface ChapterResult {
    title: string
    markdown: string
    html_content: string
    images: EpubImage[]
}

export async function parseEpubToc(filePath: string): Promise<TocEntry[]> {
    return invoke('parse_epub_toc', { filePath })
}

export async function extractEpubChapter(filePath: string, chapterPath: string): Promise<ChapterResult> {
    return invoke('extract_epub_chapter', { filePath, chapterPath })
}

export async function extractEpubChapters(filePath: string, chapterPaths: string[]): Promise<ChapterResult[]> {
    return invoke('extract_epub_chapters', { filePath, chapterPaths })
}
