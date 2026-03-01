import type { BilingualData, SavedTranslation, SavedSentence, VocabularyWord } from "./models.js"

export const API_ROUTES = {
  bilingualData: "/api/v1/bilingual-data",
  articles: "/api/v1/articles",
  ebookBooks: "/api/v1/ebooks/books",
  dailyQuote: "/api/v1/daily-quote",
  one: "/api/v1/one",

  // Auth — verification code flow
  authSendCode: "/api/v1/auth/send-code",
  authVerifyCode: "/api/v1/auth/verify-code",
  authLogout: "/api/v1/auth/logout",
  authMe: "/api/v1/auth/me",

  // Admin
  adminUsers: "/api/v1/admin/users",
  adminStats: "/api/v1/admin/stats",

  // User data (per-user vocabulary/sentences)
  userData: "/api/v1/user/data",
  userVocabulary: "/api/v1/user/vocabulary",
  userSentences: "/api/v1/user/sentences",
} as const

export interface BilingualDataResponse extends BilingualData { }

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
