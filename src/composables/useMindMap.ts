import { ref, computed } from 'vue'
import { translateText, getArticleMindMap, saveArticleMindMap } from '../services/api'

interface BilingualMindMap {
  en: string
  cn: string
}

// Memory cache for current session: articleId → { en, cn }
const cache = new Map<string, BilingualMindMap>()

const currentData = ref<BilingualMindMap | null>(null)
const currentLang = ref<'en' | 'cn'>('en')
const mindMapLoading = ref(false)
const mindMapError = ref('')

// 当前语言对应的 Markdown
const mindMapMarkdown = computed(() => {
  if (!currentData.value) return ''
  return currentData.value[currentLang.value]
})

/**
 * 解析 AI 返回的 JSON 字符串，提取 en/cn 两份大纲。
 * 兼容旧格式：如果不是 JSON 则当作纯英文大纲。
 */
function parseBilingualResult(raw: string): BilingualMindMap {
  try {
    // 去掉可能的 ```json 包裹
    let cleaned = raw.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim()
    }
    const parsed = JSON.parse(cleaned)
    if (parsed.en && parsed.cn) {
      return { en: parsed.en, cn: parsed.cn }
    }
  } catch {
    // not JSON
  }
  // fallback: treat as single-language (old cache or parse failure)
  return { en: raw, cn: raw }
}

export function useMindMap() {
  async function generateMindMap(articleContent: string, articleId: string) {
    // 1. Check memory cache
    const memCached = cache.get(articleId)
    if (memCached) {
      currentData.value = memCached
      return
    }

    // 2. Check DB cache
    try {
      const dbCached = await getArticleMindMap(articleId)
      if (dbCached) {
        const data = parseBilingualResult(dbCached)
        currentData.value = data
        cache.set(articleId, data)
        return
      }
    } catch (e) {
      console.warn('读取缓存失败，将重新生成:', e)
    }

    // 3. AI generate → save to DB + memory
    mindMapLoading.value = true
    mindMapError.value = ''

    try {
      const { result } = await translateText({
        text: articleContent,
        prompt_type: 'mindmap',
      })
      const data = parseBilingualResult(result)
      currentData.value = data
      cache.set(articleId, data)

      // Persist raw JSON to DB (fire-and-forget)
      saveArticleMindMap(articleId, result).catch((e) =>
        console.warn('思维导图保存失败:', e)
      )
    } catch (e: any) {
      mindMapError.value = e?.toString() || '生成失败'
      console.error('思维导图生成失败:', e)
    } finally {
      mindMapLoading.value = false
    }
  }

  // Force regenerate: always calls AI, skips DB cache
  async function forceRegenerate(articleContent: string, articleId: string) {
    cache.delete(articleId)
    currentData.value = null
    mindMapLoading.value = true
    mindMapError.value = ''

    try {
      const { result } = await translateText({
        text: articleContent,
        prompt_type: 'mindmap',
      })
      const data = parseBilingualResult(result)
      currentData.value = data
      cache.set(articleId, data)
      saveArticleMindMap(articleId, result).catch((e) =>
        console.warn('思维导图保存失败:', e)
      )
    } catch (e: any) {
      mindMapError.value = e?.toString() || '生成失败'
      console.error('思维导图生成失败:', e)
    } finally {
      mindMapLoading.value = false
    }
  }

  function switchLang() {
    currentLang.value = currentLang.value === 'en' ? 'cn' : 'en'
  }

  function clearMindMap() {
    currentData.value = null
    mindMapError.value = ''
  }

  return {
    mindMapMarkdown,
    mindMapLoading,
    mindMapError,
    currentLang,
    switchLang,
    generateMindMap,
    regenerateMindMap: forceRegenerate,
    clearMindMap,
  }
}
