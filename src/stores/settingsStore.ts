import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSetting, setSetting, getAllSettings } from '../services/api'

/**
 * 设置状态管理
 * 管理应用配置和用户偏好设置
 */
export const useSettingsStore = defineStore('settings', () => {
  // ── 状态 ──────────────────────────────────────────────

  const settings = ref<Record<string, string>>({})
  const loaded = ref(false)

  // 常用设置项的快捷访问
  const apiKey = computed({
    get: () => settings.value['api_key'] || '',
    set: (val: string) => setSettingValue('api_key', val),
  })

  const apiUrl = computed({
    get: () => settings.value['api_url'] || 'https://api.deepseek.com',
    set: (val: string) => setSettingValue('api_url', val),
  })

  const modelName = computed({
    get: () => settings.value['model_name'] || 'deepseek-chat',
    set: (val: string) => setSettingValue('model_name', val),
  })

  const theme = computed({
    get: () => settings.value['theme'] || 'light',
    set: (val: string) => setSettingValue('theme', val),
  })

  const fontSize = computed({
    get: () => settings.value['font_size'] || 'medium',
    set: (val: string) => setSettingValue('font_size', val),
  })

  // ── Actions ───────────────────────────────────────────

  async function loadSettings() {
    if (loaded.value) return

    try {
      const allSettings = await getAllSettings()
      settings.value = Object.fromEntries(
        allSettings.map(s => [s.key, s.value])
      )
      loaded.value = true
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }

  async function setSettingValue(key: string, value: string) {
    try {
      await setSetting(key, value)
      settings.value[key] = value
    } catch (e) {
      console.error(`Failed to set setting ${key}:`, e)
      throw e
    }
  }

  async function getSettingValue(key: string): Promise<string | null> {
    if (key in settings.value) {
      return settings.value[key]
    }

    try {
      const value = await getSetting(key)
      if (value) {
        settings.value[key] = value
      }
      return value
    } catch (e) {
      console.error(`Failed to get setting ${key}:`, e)
      return null
    }
  }

  function getSettingImmediate(key: string): string | null {
    return settings.value[key] || null
  }

  return {
    settings,
    loaded,
    apiKey,
    apiUrl,
    modelName,
    theme,
    fontSize,
    loadSettings,
    setSetting: setSettingValue,
    getSetting: getSettingValue,
    getSettingImmediate,
  }
})
