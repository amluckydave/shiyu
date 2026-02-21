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
