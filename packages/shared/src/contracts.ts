import type { BilingualData, SavedTranslation, SavedSentence, VocabularyWord } from "./models.js"

export const API_ROUTES = {
  bilingualData: "/api/v1/bilingual-data",
  articles: "/api/v1/articles",
  ebookBooks: "/api/v1/ebooks/books",
  dailyQuote: "/api/v1/daily-quote",
  one: "/api/v1/one"
} as const

export interface BilingualDataResponse extends BilingualData {}

export interface BilingualDataUpdateRequest {
  vocabulary?: VocabularyWord[]
  sentences?: SavedSentence[]
  translations?: Record<string, SavedTranslation>
}

export interface ApiErrorResponse {
  error: string
  code?: string
  details?: string
}

export interface ApiSuccessResponse {
  success: true
}
