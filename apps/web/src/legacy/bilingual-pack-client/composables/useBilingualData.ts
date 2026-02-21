import { ref, reactive, watch } from 'vue'
import { notifyDataChanged } from '../utils/channelMessaging'
import type { VocabularyWord, SavedSentence, SavedTranslation } from '../types'

interface BilingualData {
    vocabulary: VocabularyWord[]
    sentences: SavedSentence[]
    translations: Record<string, SavedTranslation>
}

const data = reactive<BilingualData>({
    vocabulary: [],
    sentences: [],
    translations: {}
})

const isInitialized = ref(false)
const isReloading = ref(false)  // 防止 reload 时触发 save 导致无限循环
let vocabSaveTimer: ReturnType<typeof setTimeout> | null = null
let sentenceSaveTimer: ReturnType<typeof setTimeout> | null = null
let lastVocabSaveTime = 0
let lastSentenceSaveTime = 0

async function initData() {
    if (typeof window === 'undefined') return
    if (isInitialized.value) return

    isReloading.value = true  // 防止触发 save
    try {
        const res = await fetch('/api/bilingual-data')
        if (res.ok) {
            const json = await res.json()
            data.vocabulary = json.vocabulary || []
            data.sentences = json.sentences || []
            data.translations = json.translations || {}
            isInitialized.value = true
        } else {
            isInitialized.value = true
        }
    } catch (e) {
        console.error('Error loading bilingual data:', e)
        isInitialized.value = true
    } finally {
        // 延迟重置，确保 watch 不会在同一个 tick 触发
        setTimeout(() => { isReloading.value = false }, 100)
    }
}

async function reloadData() {
    if (typeof window === 'undefined') return
    if (isReloading.value) return  // 避免重复 reload

    const now = Date.now()
    if (now - lastVocabSaveTime < 1000 || now - lastSentenceSaveTime < 1000) {
        return
    }

    isReloading.value = true  // 防止触发 save
    try {
        const res = await fetch('/api/bilingual-data')
        if (res.ok) {
            const json = await res.json()
            data.vocabulary = json.vocabulary || []
            data.sentences = json.sentences || []
            data.translations = json.translations || {}
        }
    } catch (e) {
        console.error('Error reloading bilingual data:', e)
    } finally {
        // 延迟重置，确保 watch 不会在同一个 tick 触发
        setTimeout(() => { isReloading.value = false }, 100)
    }
}

async function saveVocabulary(vocab: VocabularyWord[]) {
    if (typeof window === 'undefined') return

    try {
        await fetch('/api/bilingual-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vocabulary: vocab })
        })
        lastVocabSaveTime = Date.now()
        notifyDataChanged('vocabulary')
    } catch (e) {
        console.error('Failed to save vocabulary:', e)
    }
}

async function saveSentences(sentenceList: SavedSentence[]) {
    if (typeof window === 'undefined') return

    try {
        await fetch('/api/bilingual-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sentences: sentenceList })
        })
        lastSentenceSaveTime = Date.now()
        notifyDataChanged('sentences')
    } catch (e) {
        console.error('Failed to save sentences:', e)
    }
}

watch(() => data.vocabulary, (newVal) => {
    if (!isInitialized.value) return
    if (isReloading.value) return  // reload 时不触发 save
    if (vocabSaveTimer) clearTimeout(vocabSaveTimer)
    vocabSaveTimer = setTimeout(() => {
        if (isReloading.value) return  // 再次检查
        saveVocabulary([...newVal])
        vocabSaveTimer = null
    }, 500)
}, { deep: true })

watch(() => data.sentences, (newVal) => {
    if (!isInitialized.value) return
    if (isReloading.value) return  // reload 时不触发 save
    if (sentenceSaveTimer) clearTimeout(sentenceSaveTimer)
    sentenceSaveTimer = setTimeout(() => {
        if (isReloading.value) return  // 再次检查
        saveSentences([...newVal])
        sentenceSaveTimer = null
    }, 500)
}, { deep: true })

initData()

export function useBilingualData() {
    function saveTranslationUpdate(key: string, translation: SavedTranslation) {
        if (!data.translations) data.translations = {}
        data.translations[key] = translation
        fetch('/api/bilingual-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ translations: { [key]: translation } })
        }).catch(e => console.error('Failed to save translation:', e))
    }

    return {
        data,
        isInitialized,
        saveTranslationUpdate,
        initData,
        reloadData
    }
}
