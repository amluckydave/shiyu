import { computed } from 'vue'
import { useBilingualData } from './useBilingualData'
import type { SavedSentence } from '../types'

export function useSentenceBank() {
    const { data, isInitialized, initData } = useBilingualData()

    if (!isInitialized.value) {
        initData()
    }

    const sentences = computed(() => data.sentences)

    function addSentence(sentence: string, explanation: string, articlePath?: string): SavedSentence {
        const normalizedSentence = sentence.trim()

        if (articlePath) {
            const existingSentence = data.sentences.find(
                s => s.sentence === normalizedSentence && s.articlePath === articlePath
            )
            if (existingSentence) {
                existingSentence.explanation = explanation
                return existingSentence
            }
        }

        const existingGlobalSentence = data.sentences.find(
            s => s.sentence === normalizedSentence && !s.articlePath
        )
        if (existingGlobalSentence) {
            if (articlePath) {
                existingGlobalSentence.articlePath = articlePath
                existingGlobalSentence.explanation = explanation
            }
            return existingGlobalSentence
        }

        const newSentence: SavedSentence = {
            id: crypto.randomUUID(),
            sentence: normalizedSentence,
            explanation,
            articlePath,
            createdAt: Date.now(),
            reviewCount: 0
        }
        data.sentences.push(newSentence)
        return newSentence
    }

    function removeSentence(id: string) {
        const index = data.sentences.findIndex(s => s.id === id)
        if (index !== -1) {
            data.sentences.splice(index, 1)
        }
    }

    function updateSentence(id: string, updates: Partial<SavedSentence>) {
        const index = data.sentences.findIndex(s => s.id === id)
        if (index !== -1) {
            data.sentences[index] = { ...data.sentences[index], ...updates }
        }
    }

    function markReviewed(id: string) {
        const sentence = data.sentences.find(s => s.id === id)
        if (sentence) {
            sentence.reviewCount++
            sentence.lastReviewedAt = Date.now()
        }
    }

    function exportToCSV(): string {
        const headers = 'Front\tBack\tTags'
        const rows = data.sentences.map(s =>
            `${s.sentence}\t${s.explanation}\tEnglish,Sentences`
        )
        return [headers, ...rows].join('\n')
    }

    return {
        sentences,
        addSentence,
        removeSentence,
        updateSentence,
        markReviewed,
        exportToCSV,
    }
}
