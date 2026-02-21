import { computed } from 'vue'
import { useBilingualData } from './useBilingualData'
import type { SavedTranslation } from '../types'

export interface ParagraphTranslation {
    id: string
    articlePath: string
    paragraphIndex: number
    translation: string
    createdAt: number
    updatedAt: number
}

export function useParagraphTranslation() {
    const { data, isInitialized, initData, saveTranslationUpdate } = useBilingualData()

    // 确保初始化
    if (!isInitialized.value) {
        initData()
    }

    // 生成翻译 ID (作为 Map 的 key)
    const generateTranslationId = (articlePath: string, paragraphIndex: number): string => {
        return `${articlePath}-p${paragraphIndex}`
    }

    // 将 Map 转换为数组以便于统计 (computed)
    const translations = computed<ParagraphTranslation[]>(() => {
        return Object.entries(data.translations || {}).map(([key, val]) => ({
            id: key,
            articlePath: val.path,
            paragraphIndex: val.paragraphIndex,
            translation: val.translation,
            createdAt: val.updatedAt, // 简化处理，使用 updateTime
            updatedAt: val.updatedAt
        }))
    })

    // 获取特定段落的翻译
    const getTranslation = (articlePath: string, paragraphIndex: number): ParagraphTranslation | undefined => {
        const id = generateTranslationId(articlePath, paragraphIndex)
        const stored = data.translations?.[id]

        if (stored) {
            return {
                id,
                articlePath: stored.path,
                paragraphIndex: stored.paragraphIndex,
                translation: stored.translation,
                createdAt: stored.updatedAt,
                updatedAt: stored.updatedAt
            }
        }
        return undefined
    }

    // 添加或更新翻译
    const saveTranslation = (articlePath: string, paragraphIndex: number, translation: string) => {
        const id = generateTranslationId(articlePath, paragraphIndex)
        const now = Date.now()

        const payload: SavedTranslation = {
            path: articlePath,
            paragraphIndex,
            translation,
            updatedAt: now
        }

        // 更新全局状态 (自动触发保存)
        saveTranslationUpdate(id, payload)
    }

    // 删除翻译
    const deleteTranslation = (articlePath: string, paragraphIndex: number) => {
        const id = generateTranslationId(articlePath, paragraphIndex)
        if (data.translations && data.translations[id]) {
            delete data.translations[id]
            // 删除操作也需要同步? 
            // 目前 saveTranslationUpdate 只做合并。
            // 删除比较麻烦，需要发送 null 或者专门的 delete API。
            // 简单起见，可以发送一个 update，translation 为空字符串?
            // 或者我们可以修改 saveTranslationUpdate 支持删除
            // 这里为了简单，先置为空字符串或标记删除
            saveTranslationUpdate(id, {
                path: articlePath,
                paragraphIndex,
                translation: '',
                updatedAt: Date.now()
            })
        }
    }

    // 获取特定文章的所有翻译
    const getArticleTranslations = (articlePath: string): ParagraphTranslation[] => {
        return translations.value.filter(t => t.articlePath === articlePath && t.translation.trim())
    }

    // 统计信息
    const stats = computed(() => {
        return {
            total: translations.value.filter(t => t.translation.trim()).length,
            byArticle: translations.value.reduce((acc, t) => {
                if (t.translation.trim()) {
                    acc[t.articlePath] = (acc[t.articlePath] || 0) + 1
                }
                return acc
            }, {} as Record<string, number>)
        }
    })

    return {
        translations,
        getTranslation,
        saveTranslation,
        deleteTranslation,
        getArticleTranslations,
        stats
    }
}
