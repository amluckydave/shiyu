export interface VocabularyWord {
  id: string
  word: string
  meaning: string
  context?: string
  articlePath?: string
  createdAt: number
  reviewCount: number
  lastReviewedAt?: number
}

export interface SavedSentence {
  id: string
  sentence: string
  explanation: string
  articlePath?: string
  createdAt: number
  reviewCount: number
  lastReviewedAt?: number
}

export interface SavedTranslation {
  path: string
  paragraphIndex: number
  translation: string
  updatedAt: number
}

export interface BilingualData {
  vocabulary: VocabularyWord[]
  sentences: SavedSentence[]
  translations: Record<string, SavedTranslation>
}

export function createEmptyBilingualData(): BilingualData {
  return {
    vocabulary: [],
    sentences: [],
    translations: {}
  }
}

// ── Auth Models ──────────────────────────────────────────

export type UserRole = "user" | "admin"

export interface User {
  id: string
  email: string
  nickname: string
  role: UserRole
  emailVerified: boolean
  createdAt: number
}

/** Step 1: request a verification code */
export interface SendCodeRequest {
  email: string
}

/** Step 2: verify code (+ nickname for new users) */
export interface VerifyCodeRequest {
  email: string
  code: string
  nickname?: string
  invitationCode?: string
}

export interface AuthResponse {
  user: User
  token: string
  isNewUser?: boolean
}

export interface SendCodeResponse {
  success: true
  message: string
  /** true if this email hasn't registered yet */
  isNewUser: boolean
}

export interface AdminUserListResponse {
  users: User[]
  total: number
  page: number
  pageSize: number
}

export interface AdminStatsResponse {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
}

// ── Invitation Code Models ───────────────────────────────

export interface InvitationCode {
  id: string
  code: string
  maxUses: number
  usedCount: number
  createdBy: string
  createdAt: number
  expiresAt?: number
}

export interface AdminInvitationCodeListResponse {
  codes: InvitationCode[]
  total: number
  page: number
  pageSize: number
}
