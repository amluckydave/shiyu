import { defineStore } from "pinia"
import { reactive, ref, watch } from "vue"
import type { BilingualDataResponse, BilingualDataUpdateRequest, SavedTranslation, SavedSentence, VocabularyWord } from "../../../../packages/shared/src/index.js"
import { API_ROUTES, createEmptyBilingualData } from "../../../../packages/shared/src/index.js"
import { notifyDataChanged } from "../services/channelMessaging.js"

export const useBilingualDataStore = defineStore("bilingualData", () => {
  const data = reactive(createEmptyBilingualData())
  const isInitialized = ref(false)
  const isReloading = ref(false)
  const lastVocabSaveTime = ref(0)
  const lastSentenceSaveTime = ref(0)
  const apiPath = API_ROUTES.bilingualData

  let vocabSaveTimer: ReturnType<typeof setTimeout> | null = null
  let sentenceSaveTimer: ReturnType<typeof setTimeout> | null = null

  function applyServerData(payload: Partial<BilingualDataResponse>): void {
    data.vocabulary = payload.vocabulary || []
    data.sentences = payload.sentences || []
    data.translations = payload.translations || {}
  }

  async function postUpdate(update: BilingualDataUpdateRequest): Promise<void> {
    await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update)
    })
  }

  async function initData(): Promise<void> {
    if (typeof window === "undefined") return
    if (isInitialized.value) return

    isReloading.value = true
    try {
      const response = await fetch(apiPath)
      if (response.ok) {
        const json = (await response.json()) as BilingualDataResponse
        applyServerData(json)
      }
    } finally {
      isInitialized.value = true
      setTimeout(() => {
        isReloading.value = false
      }, 100)
    }
  }

  async function reloadData(): Promise<void> {
    if (typeof window === "undefined") return
    if (isReloading.value) return

    const now = Date.now()
    if (now - lastVocabSaveTime.value < 1000 || now - lastSentenceSaveTime.value < 1000) {
      return
    }

    isReloading.value = true
    try {
      const response = await fetch(apiPath)
      if (response.ok) {
        const json = (await response.json()) as BilingualDataResponse
        applyServerData(json)
      }
    } finally {
      setTimeout(() => {
        isReloading.value = false
      }, 100)
    }
  }

  async function saveVocabulary(vocabulary: VocabularyWord[]): Promise<void> {
    await postUpdate({ vocabulary })
    lastVocabSaveTime.value = Date.now()
    notifyDataChanged("vocabulary")
  }

  async function saveSentences(sentences: SavedSentence[]): Promise<void> {
    await postUpdate({ sentences })
    lastSentenceSaveTime.value = Date.now()
    notifyDataChanged("sentences")
  }

  async function saveTranslationUpdate(key: string, translation: SavedTranslation): Promise<void> {
    data.translations[key] = translation
    await postUpdate({ translations: { [key]: translation } })
  }

  function resetDataForTest(): void {
    data.vocabulary = []
    data.sentences = []
    data.translations = {}
    isInitialized.value = false
    isReloading.value = false
    lastVocabSaveTime.value = 0
    lastSentenceSaveTime.value = 0
    if (vocabSaveTimer) {
      clearTimeout(vocabSaveTimer)
      vocabSaveTimer = null
    }
    if (sentenceSaveTimer) {
      clearTimeout(sentenceSaveTimer)
      sentenceSaveTimer = null
    }
  }

  watch(
    () => data.vocabulary,
    (newValue) => {
      if (!isInitialized.value) return
      if (isReloading.value) return
      if (vocabSaveTimer) clearTimeout(vocabSaveTimer)

      vocabSaveTimer = setTimeout(() => {
        if (isReloading.value) return
        void saveVocabulary([...newValue])
        vocabSaveTimer = null
      }, 500)
    },
    { deep: true }
  )

  watch(
    () => data.sentences,
    (newValue) => {
      if (!isInitialized.value) return
      if (isReloading.value) return
      if (sentenceSaveTimer) clearTimeout(sentenceSaveTimer)

      sentenceSaveTimer = setTimeout(() => {
        if (isReloading.value) return
        void saveSentences([...newValue])
        sentenceSaveTimer = null
      }, 500)
    },
    { deep: true }
  )

  return {
    data,
    isInitialized,
    isReloading,
    initData,
    reloadData,
    saveTranslationUpdate,
    resetDataForTest
  }
})
