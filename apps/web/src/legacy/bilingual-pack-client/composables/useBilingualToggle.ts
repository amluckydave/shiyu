import { ref, watch } from 'vue'
import type { BilingualSettings } from '../types'

const STORAGE_KEY = 'bilingual-pack-settings'

const defaultSettings: BilingualSettings = {
    enabled: true,
    showUnderline: true,
    showHighlight: true,
    enableFlash: true,
}

function loadFromStorage(): BilingualSettings {
    if (typeof window === 'undefined') return defaultSettings
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings
    } catch {
        return defaultSettings
    }
}

function saveToStorage(data: BilingualSettings) {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const settings = ref<BilingualSettings>(loadFromStorage())

watch(settings, (newVal) => {
    saveToStorage(newVal)
}, { deep: true })

export function useBilingualToggle() {
    if (typeof window !== 'undefined' && !settings.value) {
        settings.value = loadFromStorage()
    }

    function toggleEnabled() {
        settings.value.enabled = !settings.value.enabled
    }

    function setEnabled(value: boolean) {
        settings.value.enabled = value
    }

    function updateSettings(updates: Partial<BilingualSettings>) {
        settings.value = { ...settings.value, ...updates }
    }

    return {
        settings,
        toggleEnabled,
        setEnabled,
        updateSettings,
    }
}
