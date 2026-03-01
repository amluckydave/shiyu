import { Router, type Request, type Response } from "express"
import { API_ROUTES } from "@shiyu/shared"
import type { VocabularyWord, SavedSentence, ApiErrorResponse, ApiSuccessResponse } from "@shiyu/shared"
import { requireAuth } from "../../middleware/auth.js"
import { UserDataRepository } from "./repository.js"
import type Database from "better-sqlite3"

interface UserDataResponse {
    vocabulary: VocabularyWord[]
    sentences: SavedSentence[]
}

export function createUserDataRouter(db: Database.Database): Router {
    const router = Router()
    const repo = new UserDataRepository(db)

    // All routes require authentication
    router.use(API_ROUTES.userData, requireAuth)
    router.use(API_ROUTES.userVocabulary, requireAuth)
    router.use(API_ROUTES.userSentences, requireAuth)

    // ── GET /api/v1/user/data — get all user data ─────────────
    router.get(API_ROUTES.userData, (req: Request, res: Response<UserDataResponse | ApiErrorResponse>) => {
        try {
            const data = repo.getAllData(req.user!.id)
            res.json(data)
        } catch (err: any) {
            console.error("[userData] GET error:", err)
            res.status(500).json({ error: "Failed to load user data." })
        }
    })

    // ── POST /api/v1/user/data — bulk sync (vocabulary + sentences) ──
    router.post(API_ROUTES.userData, (req: Request, res: Response<ApiSuccessResponse | ApiErrorResponse>) => {
        try {
            const { vocabulary, sentences } = req.body
            const userId = req.user!.id

            if (Array.isArray(vocabulary)) {
                repo.bulkSyncVocabulary(userId, vocabulary)
            }
            if (Array.isArray(sentences)) {
                repo.bulkSyncSentences(userId, sentences)
            }

            res.json({ success: true })
        } catch (err: any) {
            console.error("[userData] POST sync error:", err)
            res.status(500).json({ error: "Failed to sync data." })
        }
    })

    // ── POST /api/v1/user/vocabulary — upsert a word ──────────
    router.post(API_ROUTES.userVocabulary, (req: Request, res: Response<VocabularyWord | ApiErrorResponse>) => {
        try {
            const word = req.body as VocabularyWord
            if (!word.word || !word.meaning) {
                res.status(400).json({ error: "word and meaning are required." })
                return
            }
            const result = repo.upsertVocabulary(req.user!.id, word)
            res.json(result)
        } catch (err: any) {
            console.error("[userData] POST vocabulary error:", err)
            res.status(500).json({ error: "Failed to save word." })
        }
    })

    // ── DELETE /api/v1/user/vocabulary/:id — delete a word ────
    router.delete(`${API_ROUTES.userVocabulary}/:id`, (req: Request, res: Response<ApiSuccessResponse | ApiErrorResponse>) => {
        try {
            const deleted = repo.deleteVocabulary(req.user!.id, req.params.id)
            if (!deleted) {
                res.status(404).json({ error: "Word not found." })
                return
            }
            res.json({ success: true })
        } catch (err: any) {
            console.error("[userData] DELETE vocabulary error:", err)
            res.status(500).json({ error: "Failed to delete word." })
        }
    })

    // ── POST /api/v1/user/sentences — upsert a sentence ──────
    router.post(API_ROUTES.userSentences, (req: Request, res: Response<SavedSentence | ApiErrorResponse>) => {
        try {
            const sentence = req.body as SavedSentence
            if (!sentence.sentence || !sentence.explanation) {
                res.status(400).json({ error: "sentence and explanation are required." })
                return
            }
            const result = repo.upsertSentence(req.user!.id, sentence)
            res.json(result)
        } catch (err: any) {
            console.error("[userData] POST sentence error:", err)
            res.status(500).json({ error: "Failed to save sentence." })
        }
    })

    // ── DELETE /api/v1/user/sentences/:id — delete a sentence ──
    router.delete(`${API_ROUTES.userSentences}/:id`, (req: Request, res: Response<ApiSuccessResponse | ApiErrorResponse>) => {
        try {
            const deleted = repo.deleteSentence(req.user!.id, req.params.id)
            if (!deleted) {
                res.status(404).json({ error: "Sentence not found." })
                return
            }
            res.json({ success: true })
        } catch (err: any) {
            console.error("[userData] DELETE sentence error:", err)
            res.status(500).json({ error: "Failed to delete sentence." })
        }
    })

    return router
}
