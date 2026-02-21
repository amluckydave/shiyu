// 生词类型
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

// 长难句类型
export interface SavedSentence {
    id: string
    sentence: string
    explanation: string
    articlePath?: string
    createdAt: number
    reviewCount: number
    lastReviewedAt?: number
}

// 选择状态
export interface SelectionState {
    text: string
    type: 'word' | 'sentence' | null
    range: Range | null
    rect: DOMRect | null
}

// 弹出框位置
export interface PopoverPosition {
    top: number
    left: number
    visible: boolean
}

// Bilingual Pack 设置
export interface BilingualSettings {
    enabled: boolean
    showUnderline: boolean
    showHighlight: boolean
    enableFlash: boolean
}

// 段落翻译类型
export interface SavedTranslation {
    path: string
    paragraphIndex: number
    translation: string
    updatedAt: number
}
