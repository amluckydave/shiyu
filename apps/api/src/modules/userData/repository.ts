import type Database from "better-sqlite3"
import type { VocabularyWord, SavedSentence } from "@shiyu/shared"
import crypto from "node:crypto"

export interface UserDataResponse {
    vocabulary: VocabularyWord[]
    sentences: SavedSentence[]
}

// ── Row helpers ─────────────────────────────────────────────

function rowToVocab(row: any): VocabularyWord {
    return {
        id: row.id,
        word: row.word,
        meaning: row.meaning,
        context: row.context ?? undefined,
        articlePath: row.article_path ?? undefined,
        createdAt: row.created_at,
        reviewCount: row.review_count,
        lastReviewedAt: row.last_reviewed_at ?? undefined,
    }
}

function rowToSentence(row: any): SavedSentence {
    return {
        id: row.id,
        sentence: row.sentence,
        explanation: row.explanation,
        articlePath: row.article_path ?? undefined,
        createdAt: row.created_at,
        reviewCount: row.review_count,
        lastReviewedAt: row.last_reviewed_at ?? undefined,
    }
}

// ── Repository ──────────────────────────────────────────────

export class UserDataRepository {
    constructor(private readonly db: Database.Database) { }

    // ── Read all ────────────────────────────────────────────

    getAllData(userId: string): UserDataResponse {
        const vocabRows = this.db
            .prepare("SELECT * FROM vocabulary WHERE user_id = ? ORDER BY created_at DESC")
            .all(userId)

        const sentenceRows = this.db
            .prepare("SELECT * FROM sentences WHERE user_id = ? ORDER BY created_at DESC")
            .all(userId)

        return {
            vocabulary: vocabRows.map(rowToVocab),
            sentences: sentenceRows.map(rowToSentence),
        }
    }

    // ── Vocabulary CRUD ──────────────────────────────────────

    getVocabulary(userId: string): VocabularyWord[] {
        return this.db
            .prepare("SELECT * FROM vocabulary WHERE user_id = ? ORDER BY created_at DESC")
            .all(userId)
            .map(rowToVocab)
    }

    upsertVocabulary(userId: string, word: VocabularyWord): VocabularyWord {
        const id = word.id || crypto.randomUUID()
        this.db
            .prepare(`
        INSERT INTO vocabulary (id, user_id, word, meaning, context, article_path, review_count, last_reviewed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          word = excluded.word,
          meaning = excluded.meaning,
          context = excluded.context,
          article_path = excluded.article_path,
          review_count = excluded.review_count,
          last_reviewed_at = excluded.last_reviewed_at
      `)
            .run(
                id,
                userId,
                word.word,
                word.meaning,
                word.context ?? null,
                word.articlePath ?? null,
                word.reviewCount ?? 0,
                word.lastReviewedAt ?? null,
                word.createdAt ?? Date.now()
            )
        return { ...word, id }
    }

    deleteVocabulary(userId: string, wordId: string): boolean {
        const result = this.db
            .prepare("DELETE FROM vocabulary WHERE id = ? AND user_id = ?")
            .run(wordId, userId)
        return result.changes > 0
    }

    // ── Sentences CRUD ───────────────────────────────────────

    getSentences(userId: string): SavedSentence[] {
        return this.db
            .prepare("SELECT * FROM sentences WHERE user_id = ? ORDER BY created_at DESC")
            .all(userId)
            .map(rowToSentence)
    }

    upsertSentence(userId: string, sentence: SavedSentence): SavedSentence {
        const id = sentence.id || crypto.randomUUID()
        this.db
            .prepare(`
        INSERT INTO sentences (id, user_id, sentence, explanation, article_path, review_count, last_reviewed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          sentence = excluded.sentence,
          explanation = excluded.explanation,
          article_path = excluded.article_path,
          review_count = excluded.review_count,
          last_reviewed_at = excluded.last_reviewed_at
      `)
            .run(
                id,
                userId,
                sentence.sentence,
                sentence.explanation,
                sentence.articlePath ?? null,
                sentence.reviewCount ?? 0,
                sentence.lastReviewedAt ?? null,
                sentence.createdAt ?? Date.now()
            )
        return { ...sentence, id }
    }

    deleteSentence(userId: string, sentenceId: string): boolean {
        const result = this.db
            .prepare("DELETE FROM sentences WHERE id = ? AND user_id = ?")
            .run(sentenceId, userId)
        return result.changes > 0
    }

    // ── Bulk sync (used by frontend batch save) ──────────────

    bulkSyncVocabulary(userId: string, words: VocabularyWord[]): void {
        const upsert = this.db.prepare(`
      INSERT INTO vocabulary (id, user_id, word, meaning, context, article_path, review_count, last_reviewed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        word = excluded.word,
        meaning = excluded.meaning,
        context = excluded.context,
        article_path = excluded.article_path,
        review_count = excluded.review_count,
        last_reviewed_at = excluded.last_reviewed_at
    `)

        // Delete all then re-insert (simpler and handles deletions)
        const tx = this.db.transaction(() => {
            this.db.prepare("DELETE FROM vocabulary WHERE user_id = ?").run(userId)
            for (const w of words) {
                upsert.run(
                    w.id || crypto.randomUUID(),
                    userId,
                    w.word,
                    w.meaning,
                    w.context ?? null,
                    w.articlePath ?? null,
                    w.reviewCount ?? 0,
                    w.lastReviewedAt ?? null,
                    w.createdAt ?? Date.now()
                )
            }
        })
        tx()
    }

    bulkSyncSentences(userId: string, sentences: SavedSentence[]): void {
        const upsert = this.db.prepare(`
      INSERT INTO sentences (id, user_id, sentence, explanation, article_path, review_count, last_reviewed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        sentence = excluded.sentence,
        explanation = excluded.explanation,
        article_path = excluded.article_path,
        review_count = excluded.review_count,
        last_reviewed_at = excluded.last_reviewed_at
    `)

        const tx = this.db.transaction(() => {
            this.db.prepare("DELETE FROM sentences WHERE user_id = ?").run(userId)
            for (const s of sentences) {
                upsert.run(
                    s.id || crypto.randomUUID(),
                    userId,
                    s.sentence,
                    s.explanation,
                    s.articlePath ?? null,
                    s.reviewCount ?? 0,
                    s.lastReviewedAt ?? null,
                    s.createdAt ?? Date.now()
                )
            }
        })
        tx()
    }
}
