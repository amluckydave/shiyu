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
const isReloading = ref(false)
let vocabSaveTimer: ReturnType<typeof setTimeout> | null = null
let sentenceSaveTimer: ReturnType<typeof setTimeout> | null = null
let lastVocabSaveTime = 0
let lastSentenceSaveTime = 0

// ── Auth helpers ─────────────────────────────────────────────

function getToken(): string | null {
    return localStorage.getItem('shiyu_token')
}

function isLoggedIn(): boolean {
    return !!getToken()
}

function getApiBase(): string {
    // @ts-ignore
    return (import.meta.env?.VITE_API_URL as string) || 'http://localhost:3100'
}

function authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = getToken()
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    return headers
}

// ── Data loading ─────────────────────────────────────────────

async function initData() {
    if (typeof window === 'undefined') return
    if (isInitialized.value) return

    isReloading.value = true
    try {
        if (isLoggedIn()) {
            // Authenticated: load from user-specific API
            const res = await fetch(`${getApiBase()}/api/v1/user/data`, {
                headers: authHeaders()
            })
            if (res.ok) {
                const json = await res.json()
                data.vocabulary = json.vocabulary || []
                data.sentences = json.sentences || []
                data.translations = {}
            } else if (res.status === 401) {
                // Token expired, clear and don't load
                data.vocabulary = []
                data.sentences = []
                data.translations = {}
            }
        } else {
            // Not logged in: empty data (login required)
            data.vocabulary = []
            data.sentences = []
            data.translations = {}
        }
        isInitialized.value = true
    } catch (e) {
        console.error('Error loading bilingual data:', e)
        isInitialized.value = true
    } finally {
        setTimeout(() => { isReloading.value = false }, 100)
    }
}

async function reloadData() {
    if (typeof window === 'undefined') return
    if (isReloading.value) return

    const now = Date.now()
    if (now - lastVocabSaveTime < 1000 || now - lastSentenceSaveTime < 1000) {
        return
    }

    isReloading.value = true
    try {
        if (isLoggedIn()) {
            const res = await fetch(`${getApiBase()}/api/v1/user/data`, {
                headers: authHeaders()
            })
            if (res.ok) {
                const json = await res.json()
                data.vocabulary = json.vocabulary || []
                data.sentences = json.sentences || []
            }
        }
    } catch (e) {
        console.error('Error reloading bilingual data:', e)
    } finally {
        setTimeout(() => { isReloading.value = false }, 100)
    }
}

// ── Save functions ───────────────────────────────────────────

async function saveVocabulary(vocab: VocabularyWord[]) {
    if (typeof window === 'undefined') return
    if (!isLoggedIn()) return

    try {
        await fetch(`${getApiBase()}/api/v1/user/data`, {
            method: 'POST',
            headers: authHeaders(),
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
    if (!isLoggedIn()) return

    try {
        await fetch(`${getApiBase()}/api/v1/user/data`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ sentences: sentenceList })
        })
        lastSentenceSaveTime = Date.now()
        notifyDataChanged('sentences')
    } catch (e) {
        console.error('Failed to save sentences:', e)
    }
}

// ── Watch for changes (debounced save) ───────────────────────

watch(() => data.vocabulary, (newVal) => {
    if (!isInitialized.value) return
    if (isReloading.value) return
    if (!isLoggedIn()) return
    if (vocabSaveTimer) clearTimeout(vocabSaveTimer)
    vocabSaveTimer = setTimeout(() => {
        if (isReloading.value) return
        saveVocabulary([...newVal])
        vocabSaveTimer = null
    }, 500)
}, { deep: true })

watch(() => data.sentences, (newVal) => {
    if (!isInitialized.value) return
    if (isReloading.value) return
    if (!isLoggedIn()) return
    if (sentenceSaveTimer) clearTimeout(sentenceSaveTimer)
    sentenceSaveTimer = setTimeout(() => {
        if (isReloading.value) return
        saveSentences([...newVal])
        sentenceSaveTimer = null
    }, 500)
}, { deep: true })

// Auto-init only if logged in
if (isLoggedIn()) {
    initData()
}

export function useBilingualData() {
    function saveTranslationUpdate(key: string, translation: SavedTranslation) {
        // Translations still use the old shared API for now
        // (they are article-level, not user-level)
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
