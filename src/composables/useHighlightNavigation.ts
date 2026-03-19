/**
 * 跳转定位与高亮
 */
import { ref, nextTick, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { useRouteQuery } from './useRouteQuery'

export interface HighlightNavigationOptions {
  /** 元素上的 data 属性名，例如 'word-id' → 查找 [data-word-id="xxx"] */
  dataAttr: string
  /** route.query.type 的匹配值，例如 'word' 或 'sentence'。为空则不检查 type */
  expectedType?: string
  /** 最大重试次数（默认 24） */
  retryLimit?: number
  /** 重试间隔（毫秒，默认 250） */
  retryDelay?: number
  /** 高亮闪烁持续时间（毫秒，默认 2000） */
  highlightDuration?: number
  /** 高亮时添加的 CSS 类名（默认 'focus-highlight'） */
  highlightClass?: string
  /** 标签名称用于超时警告日志 */
  label?: string
}

/**
 * 可复用的列表项高亮跳转 Composable
 *
 * 用于 VocabularyView 和 SentencesView：从路由 query 中读取 highlight ID，
 * 找到对应 DOM 元素后滚动到视图中并添加闪烁动画。
 *
 * 包含重试机制：如果元素尚未渲染到 DOM 中（列表数据加载中），
 * 会定时重试直到找到元素或超过最大重试次数。
 */
export function useHighlightNavigation(
  options: HighlightNavigationOptions,
  /** 外部的 loading 状态 — 加载中时会持续重试不计入上限 */
  loading?: Ref<boolean>
) {
  const {
    dataAttr,
    expectedType,
    retryLimit = 24,
    retryDelay = 250,
    highlightDuration = 2000,
    highlightClass = 'focus-highlight',
    label = 'HighlightNav',
  } = options

  const route = useRoute()
  const { getQueryValue, clearHighlightQuery } = useRouteQuery()

  const pendingHighlightId = ref<string | null>(null)
  const hasProcessedHighlight = ref(false)
  let retryCount = 0

  /** 从 route.query 中读取 highlight ID */
  function readHighlightId(): string | null {
    const type = getQueryValue(route.query.type)
    const id = getQueryValue(route.query.highlight)
    if (!id) return null
    if (expectedType && type && type !== expectedType) return null
    return id
  }

  /**
   * 尝试滚动到指定元素并添加高亮
   * @returns true 如果成功找到并聚焦元素
   */
  function focusElement(id: string): boolean {
    const selector = `[data-${dataAttr}="${id}"]`
    const element = document.querySelector(selector) as HTMLElement | null
    if (!element) return false

    // 主滚动
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // 修正滚动位置（某些情况下 scrollIntoView 不够精确）
    requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect()
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        const target = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2
        window.scrollTo({ top: target, behavior: 'smooth' })
      }
    })

    // 再次修正（DOM 更新后）
    setTimeout(() => {
      const rect = element.getBoundingClientRect()
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        const target = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2
        window.scrollTo({ top: target, behavior: 'smooth' })
      }
    }, 250)

    // 添加高亮动画
    element.classList.add(highlightClass)
    setTimeout(() => {
      element.classList.remove(highlightClass)
    }, highlightDuration)

    return true
  }

  /** 执行高亮定位（含重试逻辑） */
  function handleQueryHighlight() {
    if (hasProcessedHighlight.value) return

    if (!pendingHighlightId.value) {
      pendingHighlightId.value = readHighlightId()
    }

    if (!pendingHighlightId.value) {
      hasProcessedHighlight.value = true
      return
    }

    nextTick(() => {
      const targetId = pendingHighlightId.value
      if (!targetId) return

      if (focusElement(targetId)) {
        hasProcessedHighlight.value = true
        clearHighlightQuery()
        retryCount = 0
        return
      }

      retryCount += 1
      const isStillLoading = loading?.value ?? false
      if (isStillLoading || retryCount < retryLimit) {
        setTimeout(() => {
          handleQueryHighlight()
        }, retryDelay)
        return
      }

      if (retryCount >= retryLimit) {
        console.warn(`[${label}] 高亮定位超时，id=`, targetId)
        hasProcessedHighlight.value = true
      }
    })
  }

  /** 重置高亮状态（路由变化时调用） */
  function resetHighlight() {
    pendingHighlightId.value = readHighlightId()
    hasProcessedHighlight.value = false
    retryCount = 0
    handleQueryHighlight()
  }

  /** 初始化（onMounted 时调用） */
  function initHighlight() {
    pendingHighlightId.value = readHighlightId()
    handleQueryHighlight()
  }

  return {
    pendingHighlightId,
    hasProcessedHighlight,
    readHighlightId,
    focusElement,
    handleQueryHighlight,
    resetHighlight,
    initHighlight,
  }
}
