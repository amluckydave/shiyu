import { computed } from 'vue'
import { useBilingualData } from './useBilingualData'
import type { VocabularyWord } from '../types'

export function useVocabulary() {
    const { data, isInitialized, initData } = useBilingualData()

    if (!isInitialized.value) {
        initData()
    }

    const vocabulary = computed(() => data.vocabulary)

    function addWord(word: string, meaning: string, context?: string, articlePath?: string): VocabularyWord {
        const normalizedWord = word.toLowerCase().trim()

        if (articlePath) {
            const existingWord = data.vocabulary.find(
                w => w.word === normalizedWord && w.articlePath === articlePath
            )
            if (existingWord) {
                existingWord.meaning = meaning
                existingWord.context = context
                return existingWord
            }
        }

        const existingGlobalWord = data.vocabulary.find(
            w => w.word === normalizedWord && !w.articlePath
        )
        if (existingGlobalWord) {
            if (articlePath) {
                existingGlobalWord.articlePath = articlePath
                existingGlobalWord.meaning = meaning
                existingGlobalWord.context = context
            }
            return existingGlobalWord
        }

        const newWord: VocabularyWord = {
            id: crypto.randomUUID(),
            word: normalizedWord,
            meaning,
            context,
            articlePath,
            createdAt: Date.now(),
            reviewCount: 0
        }
        data.vocabulary.push(newWord)
        return newWord
    }

    function removeWord(id: string) {
        const index = data.vocabulary.findIndex(w => w.id === id)
        if (index !== -1) {
            data.vocabulary.splice(index, 1)
        }
    }

    function updateWord(id: string, updates: Partial<VocabularyWord>) {
        const index = data.vocabulary.findIndex(w => w.id === id)
        if (index !== -1) {
            data.vocabulary[index] = { ...data.vocabulary[index], ...updates }
        }
    }

    function markReviewed(id: string) {
        const word = data.vocabulary.find(w => w.id === id)
        if (word) {
            word.reviewCount++
            word.lastReviewedAt = Date.now()
        }
    }

    function findWord(wordText: string): VocabularyWord | undefined {
        return data.vocabulary.find(w => w.word === wordText.toLowerCase().trim())
    }

    function exportToCSV(): string {
        const headers = 'Front\tBack\tContext\tTags'
        const rows = data.vocabulary.map(w =>
            `${w.word}\t${w.meaning}\t${w.context || ''}\tEnglish`
        )
        return [headers, ...rows].join('\n')
    }

    return {
        vocabulary,
        addWord,
        removeWord,
        updateWord,
        markReviewed,
        findWord,
        exportToCSV,
    }
}
