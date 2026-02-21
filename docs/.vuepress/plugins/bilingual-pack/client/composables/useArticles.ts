import { ref, computed } from 'vue'
import { useVocabulary } from './useVocabulary'
import { useSentenceBank } from './useSentenceBank'

export interface ArticleInfo {
    id: string
    title: string
    path: string
    icon?: string
    description?: string
    content?: string
    wordCount: number
    vocabularyCount: number
    sentenceCount: number
    category?: string
    createdAt?: number
    updatedAt?: number
    isCustom?: boolean
}

// @ts-ignore
import { articles as AUTO_ARTICLES } from '@temp/internal/article-data'

export function useArticles() {
    const { vocabulary } = useVocabulary()
    const { sentences } = useSentenceBank()

    // 使用自动生成的文章列表
    const allArticles = computed(() => AUTO_ARTICLES as ArticleInfo[])

    // 搜索关键词
    const searchQuery = ref('')

    // 计算每篇文章的标注统计
    const articlesWithStats = computed(() => {
        return allArticles.value.map(article => {
            const vocabCount = vocabulary.value.filter(v => v.articlePath === article.path).length
            const sentCount = sentences.value.filter(s => s.articlePath === article.path).length

            return {
                ...article,
                vocabularyCount: vocabCount,
                sentenceCount: sentCount
            }
        })
    })

    // 筛选后的文章列表
    const filteredArticles = computed(() => {
        let result = articlesWithStats.value

        // 按关键词搜索
        if (searchQuery.value) {
            const query = searchQuery.value.toLowerCase()
            result = result.filter(a =>
                a.title.toLowerCase().includes(query) ||
                (a.description?.toLowerCase().includes(query) ?? false)
            )
        }

        return result
    })

    // 整体统计
    const stats = computed(() => {
        return {
            totalArticles: allArticles.value.length,
            totalVocabulary: vocabulary.value.length,
            totalSentences: sentences.value.length
        }
    })

    return {
        allArticles,
        articlesWithStats,
        filteredArticles,
        searchQuery,
        stats
    }
}
