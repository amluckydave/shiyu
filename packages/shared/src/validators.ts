import type { BilingualDataUpdateRequest } from "./contracts.js"
import type { SavedSentence, SavedTranslation, VocabularyWord } from "./models.js"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value)
}

function isVocabularyWord(value: unknown): value is VocabularyWord {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.word) &&
    isString(value.meaning) &&
    isOptionalString(value.context) &&
    isOptionalString(value.articlePath) &&
    isFiniteNumber(value.createdAt) &&
    isFiniteNumber(value.reviewCount) &&
    (value.lastReviewedAt === undefined || isFiniteNumber(value.lastReviewedAt))
  )
}

function isSavedSentence(value: unknown): value is SavedSentence {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.sentence) &&
    isString(value.explanation) &&
    isOptionalString(value.articlePath) &&
    isFiniteNumber(value.createdAt) &&
    isFiniteNumber(value.reviewCount) &&
    (value.lastReviewedAt === undefined || isFiniteNumber(value.lastReviewedAt))
  )
}

function isSavedTranslation(value: unknown): value is SavedTranslation {
  if (!isRecord(value)) return false
  return (
    isString(value.path) &&
    isFiniteNumber(value.paragraphIndex) &&
    isString(value.translation) &&
    isFiniteNumber(value.updatedAt)
  )
}

function isTranslationMap(value: unknown): value is Record<string, SavedTranslation> {
  if (!isRecord(value)) return false
  return Object.values(value).every((item) => isSavedTranslation(item))
}

export function parseBilingualDataUpdateRequest(payload: unknown): {
  ok: true
  value: BilingualDataUpdateRequest
} | {
  ok: false
  error: string
} {
  if (!isRecord(payload)) {
    return { ok: false, error: "Request body must be an object." }
  }

  const parsed: BilingualDataUpdateRequest = {}

  if (payload.vocabulary !== undefined) {
    if (!Array.isArray(payload.vocabulary) || !payload.vocabulary.every((item) => isVocabularyWord(item))) {
      return { ok: false, error: "Invalid field: vocabulary." }
    }
    parsed.vocabulary = payload.vocabulary
  }

  if (payload.sentences !== undefined) {
    if (!Array.isArray(payload.sentences) || !payload.sentences.every((item) => isSavedSentence(item))) {
      return { ok: false, error: "Invalid field: sentences." }
    }
    parsed.sentences = payload.sentences
  }

  if (payload.translations !== undefined) {
    if (!isTranslationMap(payload.translations)) {
      return { ok: false, error: "Invalid field: translations." }
    }
    parsed.translations = payload.translations
  }

  return { ok: true, value: parsed }
}
