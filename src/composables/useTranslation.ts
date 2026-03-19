/**
 * 双语翻译（流式 + 缓存）
 */
import { ref, nextTick, onUnmounted, type Ref } from 'vue'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { translateArticleStream } from '../services/api'

interface TranslationChunk {
  index: number
  text: string
  done: boolean
  started?: boolean
  allDone?: boolean
}

interface ArticleCache {
  titleHash: string
  titleTranslation: string
  paragraphs: Map<number, { hash: string; translation: string }>
}

// ── Module-level persistent cache (keyed by article ID) ──
const translationCache = new Map<string, ArticleCache>()

/** Simple string hash for change detection */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash.toString(36)
}

/** Split raw markdown content into translatable paragraphs (same logic as old Rust) */
function splitParagraphs(content: string): string[] {
  return content
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 0 && !p.startsWith('!['))
}

/** Clear cache for a deleted article */
export function clearTranslationCache(articleId: string) {
  translationCache.delete(articleId)
}

export function useTranslation(
  readerBodyRef: Ref<HTMLElement | null>,
  articleContent: Ref<string | null>,
  articleTitle: Ref<string | null>,
  articleId: Ref<string | null>,
) {
  const translationEnabled = ref(false)
  const translating = ref(false)
  const titleTranslation = ref('')
  const titleStreaming = ref(false)
  // Live translations for current session (mirrors cache for display)
  const translations = ref<Map<number, string>>(new Map())
  const streamingIndices = ref<Set<number>>(new Set())
  let unlisten: UnlistenFn | null = null

  // ── DOM helpers ──

  /** Get translatable elements, skipping image-only <p> tags */
  function getTranslatableElements(): Element[] {
    const body = readerBodyRef.value
    if (!body) return []
    const all = Array.from(body.querySelectorAll(':scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6'))
    return all.filter(el => {
      if (el.tagName === 'P') {
        const text = el.textContent?.trim() || ''
        const hasOnlyImages = el.querySelectorAll('img').length > 0 && text.length === 0
        if (hasOnlyImages) return false
      }
      return true
    })
  }

  function upsertTranslationBlock(element: Element, index: number, text: string, isStreaming: boolean) {
    let block = element.nextElementSibling
    if (!block || !block.classList.contains('translation-block')) {
      block = document.createElement('div')
      block.classList.add('translation-block')
      block.setAttribute('data-translation-index', String(index))
      element.after(block)
    }
    block.textContent = text
    if (isStreaming) {
      block.classList.add('streaming')
    } else {
      block.classList.remove('streaming')
    }
    return block
  }

  function removeAllTranslationBlocks() {
    const body = readerBodyRef.value
    if (!body) return
    body.querySelectorAll('.translation-block').forEach(el => el.remove())
  }

  /** Scroll to an element smoothly */
  function scrollToElement(el: Element) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  // ── Show cached translations without API call ──

  function showCachedTranslations() {
    const id = articleId.value
    if (!id) return
    const cache = translationCache.get(id)
    if (!cache) return

    // Title
    titleTranslation.value = cache.titleTranslation

    // Paragraphs
    const elements = getTranslatableElements()
    cache.paragraphs.forEach((entry, index) => {
      translations.value.set(index, entry.translation)
      if (index < elements.length) {
        upsertTranslationBlock(elements[index], index, entry.translation, false)
      }
    })
  }

  // ── Main translation logic ──

  async function startTranslation() {
    if (!articleContent.value || translating.value || !articleId.value) return
    translating.value = true
    streamingIndices.value.clear()

    const id = articleId.value
    const title = articleTitle.value || ''
    const rawParagraphs = splitParagraphs(articleContent.value)
    const titleHash = simpleHash(title)

    // Load or create cache
    let cache = translationCache.get(id)
    if (!cache) {
      cache = { titleHash: '', titleTranslation: '', paragraphs: new Map() }
      translationCache.set(id, cache)
    }

    // Determine what needs translating
    const needTitleTranslation = title && cache.titleHash !== titleHash
    const paragraphsToTranslate: { index: number; text: string }[] = []

    rawParagraphs.forEach((text, index) => {
      const hash = simpleHash(text)
      const cached = cache!.paragraphs.get(index)
      if (cached && cached.hash === hash) {
        // Use cached translation
        translations.value.set(index, cached.translation)
      } else {
        paragraphsToTranslate.push({ index, text })
      }
    })

    // Remove stale entries (if article got shorter)
    for (const key of cache.paragraphs.keys()) {
      if (key >= rawParagraphs.length) cache.paragraphs.delete(key)
    }

    // Show already-cached paragraphs immediately
    const elements = getTranslatableElements()
    translations.value.forEach((text, index) => {
      if (index < elements.length) {
        upsertTranslationBlock(elements[index], index, text, false)
      }
    })

    // If nothing changed, we're done
    if (!needTitleTranslation && paragraphsToTranslate.length === 0) {
      // Title from cache
      if (cache.titleTranslation) {
        titleTranslation.value = cache.titleTranslation
      }
      translating.value = false
      return
    }

    // Show cached title if not re-translating
    if (!needTitleTranslation && cache.titleTranslation) {
      titleTranslation.value = cache.titleTranslation
    }

    // If title needs translation, reset it
    if (needTitleTranslation) {
      titleTranslation.value = ''
    }

    // Listen for streaming chunks
    unlisten = await listen<TranslationChunk>('translation-chunk', (event) => {
      const { index, text, done, allDone } = event.payload

      if (allDone) {
        translating.value = false
        titleStreaming.value = false
        return
      }

      // Title (index = -2)
      if (index === -2) {
        if (text) titleTranslation.value += text
        titleStreaming.value = !done
        if (done && id) {
          cache!.titleHash = titleHash
          cache!.titleTranslation = titleTranslation.value
        }
        return
      }

      if (index < 0) return

      // Accumulate text
      if (text) {
        const current = translations.value.get(index) || ''
        translations.value.set(index, current + text)
      }

      // Update DOM + auto-scroll
      const els = getTranslatableElements()
      if (index < els.length) {
        const translated = translations.value.get(index) || ''
        const block = upsertTranslationBlock(els[index], index, translated, !done)
        // Auto-scroll to the streaming block
        if (block && !done) {
          scrollToElement(block)
        }
        if (done) {
          streamingIndices.value.delete(index)
          // Save to cache
          const pHash = simpleHash(rawParagraphs[index] || '')
          cache!.paragraphs.set(index, { hash: pHash, translation: translated })
        } else {
          streamingIndices.value.add(index)
        }
      }
    })

    // Invoke backend
    try {
      await translateArticleStream(
        paragraphsToTranslate,
        needTitleTranslation ? title : undefined,
      )
    } catch (e: any) {
      console.error('翻译失败:', e)
      translating.value = false
    }
  }

  async function toggleTranslation() {
    translationEnabled.value = !translationEnabled.value

    if (translationEnabled.value) {
      await nextTick()
      // Check if we have a complete cache for this article
      const id = articleId.value
      const content = articleContent.value
      if (id && content) {
        const cache = translationCache.get(id)
        const rawParagraphs = splitParagraphs(content)
        const allCached = cache
          && rawParagraphs.every((text, i) => {
            const c = cache.paragraphs.get(i)
            return c && c.hash === simpleHash(text)
          })
          && rawParagraphs.length === cache.paragraphs.size
          && (!articleTitle.value || cache.titleHash === simpleHash(articleTitle.value))

        if (allCached) {
          showCachedTranslations()
          return
        }
      }
      startTranslation()
    } else {
      removeAllTranslationBlocks()
    }
  }

  function cleanup() {
    if (unlisten) {
      unlisten()
      unlisten = null
    }
    removeAllTranslationBlocks()
    translations.value.clear()
    titleTranslation.value = ''
    // Don't clear translationCache — it persists across open/close
    translationEnabled.value = false
    translating.value = false
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    translationEnabled,
    translating,
    titleTranslation,
    titleStreaming,
    toggleTranslation,
    cleanup,
  }
}
