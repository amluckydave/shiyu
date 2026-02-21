<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, withBase } from 'vuepress/client'
import { useTextSelection, useVocabulary, useSentenceBank, useBilingualToggle, useParagraphTranslation } from '../composables'
import { useBilingualData } from '../composables/useBilingualData'
import { createNotebookOpener } from '../utils/notebookNavigation'
import { listenForNavigation, listenForDataChanges, WINDOW_NAMES } from '../utils/channelMessaging'
import SelectionPopover from './SelectionPopover.vue'
import AnnotationForm from './AnnotationForm.vue'
import AnnotationTooltip from './AnnotationTooltip.vue'
import Toast from './Toast.vue'
import BilingualToggle from './BilingualToggle.vue'
import type { VocabularyWord, SavedSentence, PopoverPosition } from '../types'

const route = useRoute()
const router = useRouter()
const containerRef = ref<HTMLElement | null>(null)
const toastRef = ref<InstanceType<typeof Toast> | null>(null)

const { settings } = useBilingualToggle()
const { selection, popoverPosition, clearSelection, getContext, getCurrentPagePath } = useTextSelection(containerRef)
const { vocabulary, addWord } = useVocabulary()
const { sentences, addSentence } = useSentenceBank()
const { reloadData } = useBilingualData()
const { getTranslation, saveTranslation } = useParagraphTranslation()
const openNotebook = createNotebookOpener({
  withBase,
  getOrigin: () => window.location.origin,
  openWindow: (url, name) => window.open(url, name)
})

const showForm = ref(false)
const formType = ref<'word' | 'sentence'>('word')
const selectedTextForForm = ref('')
const selectedContextForForm = ref('')

const currentPath = ref('')

// Tooltip 状态
const showTooltip = ref(false)
const tooltipPosition = ref<PopoverPosition>({ top: 0, left: 0, visible: false })
const tooltipContent = ref<VocabularyWord | SavedSentence | null>(null)
const tooltipType = ref<'word' | 'sentence'>('word')
let hoverTimer: number | null = null

// 闪烁动画
const highlightElementId = ref<string | null>(null)
const highlightType = ref<'word' | 'sentence' | null>(null)
const annotationsActivating = ref(false)
const hasProcessedHighlight = ref(false) // 标记是否已处理高亮，防止重复触发

// 段落翻译状态
const paragraphs = ref<HTMLElement[]>([])
const hoveredParagraphIndex = ref<number | null>(null)
const expandedTranslations = ref<Set<number>>(new Set())

let annotationsFadeTimer: number | null = null

// 限制只有开启时才显示弹出框
const effectivePopoverPosition = computed(() => {
  if (!settings.value.enabled) {
    return { ...popoverPosition.value, visible: false }
  }
  return popoverPosition.value
})

function handleAddWord() {
  selectedTextForForm.value = selection.value.text
  selectedContextForForm.value = getContext()
  formType.value = 'word'
  showForm.value = true
  clearSelection()
}

function handleAddSentence() {
  selectedTextForForm.value = selection.value.text
  selectedContextForForm.value = ''
  formType.value = 'sentence'
  showForm.value = true
  clearSelection()
}

function handleSave(meaning: string) {
  currentPath.value = getCurrentPagePath()
  try {
    if (formType.value === 'word') {
      const context = getContext()
      addWord(selectedTextForForm.value, meaning, context, currentPath.value)
      toastRef.value?.show('已添加到生词本')
    } else {
      addSentence(selectedTextForForm.value, meaning, currentPath.value)
      toastRef.value?.show('已添加到长难句库')
    }
  } catch (e) {
    console.error('Save failed:', e)
    toastRef.value?.show('保存失败', 'error')
  }
  showForm.value = false
  selectedTextForForm.value = ''
  selectedContextForForm.value = ''
}

function handleCancel() {
  showForm.value = false
  selectedTextForForm.value = ''
  selectedContextForForm.value = ''
  clearSelection()
}

// 高亮悬停，显示 tooltip
function handleHighlightHover(event: MouseEvent) {
  if (!settings.value.enabled) return

  const target = event.target as HTMLElement

  // 检查单词标注（包括首次和后续出现）
  const wordEl = target.closest('.annotated-word, .annotated-word-subtle')
  if (wordEl) {
    const wordId = wordEl.getAttribute('data-word-id')
    if (wordId) {
      const word = vocabulary.value.find(w => w.id === wordId)
      if (word) {
        // 清除之前的定时器
        if (hoverTimer) {
          clearTimeout(hoverTimer)
        }
        // 添加小延迟，防止鼠标快速划过时闪烁
        hoverTimer = window.setTimeout(() => {
          showTooltipContent(event, word, 'word')
        }, 200)
        return
      }
    }
  }

  // 检查句子标注（包括首次和后续出现）
  const sentenceEl = target.closest('.annotated-sentence, .annotated-sentence-subtle')
  if (sentenceEl) {
    const sentenceId = sentenceEl.getAttribute('data-sentence-id')
    if (sentenceId) {
      const sentence = sentences.value.find(s => s.id === sentenceId)
      if (sentence) {
        // 清除之前的定时器
        if (hoverTimer) {
          clearTimeout(hoverTimer)
        }
        // 添加小延迟，防止鼠标快速划过时闪烁
        hoverTimer = window.setTimeout(() => {
          showTooltipContent(event, sentence, 'sentence')
        }, 200)
        return
      }
    }
  }
}

// 鼠标移出标注区域时关闭 tooltip
function handleHighlightLeave(event: MouseEvent) {
  const target = event.target as HTMLElement
  const relatedTarget = event.relatedTarget as HTMLElement
  
  // 清除悬停定时器
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  
  // 如果鼠标移动到 tooltip 上，不关闭
  if (relatedTarget?.closest('.annotation-tooltip')) {
    return
  }
  
  closeTooltip()
}

function showTooltipContent(event: MouseEvent, content: VocabularyWord | SavedSentence, type: 'word' | 'sentence') {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  tooltipPosition.value = {
    top: rect.top,
    left: rect.left + rect.width / 2,
    visible: true
  }
  tooltipContent.value = content
  tooltipType.value = type
  showTooltip.value = true
}

function closeTooltip() {
  showTooltip.value = false
  tooltipPosition.value.visible = false
  tooltipContent.value = null
}

function handleAnnotationClick(event: MouseEvent) {
  if (typeof window === 'undefined') return
  if (!settings.value.enabled) return
  if (event.button !== 0) return
  if (event.ctrlKey || event.metaKey) return

  const target = event.target as HTMLElement

  const wordEl = target.closest('.annotated-word, .annotated-word-subtle')
  if (wordEl) {
    const wordId = wordEl.getAttribute('data-word-id')
    if (wordId) {
      event.preventDefault()
      event.stopPropagation()
      openNotebook('word', wordId)
    }
    return
  }

  const sentenceEl = target.closest('.annotated-sentence, .annotated-sentence-subtle')
  if (sentenceEl) {
    const sentenceId = sentenceEl.getAttribute('data-sentence-id')
    if (sentenceId) {
      event.preventDefault()
      event.stopPropagation()
      openNotebook('sentence', sentenceId)
    }
  }
}

// URL 查询参数触发高亮闪烁
function handleQueryHighlight() {
  if (hasProcessedHighlight.value) return // 已处理过，避免重复触发

  // 直接从 URL 读取参数，避免 route.query 可能的时序问题
  if (typeof window === 'undefined') return
  
  const urlParams = new URLSearchParams(window.location.search)
  const highlightId = urlParams.get('highlight')
  const type = urlParams.get('type') as 'word' | 'sentence' | null


  if (highlightId && type) {
    hasProcessedHighlight.value = true // 标记为已处理
    highlightElementId.value = highlightId
    highlightType.value = type

    // 清除 URL 参数
    const url = new URL(window.location.href)
    url.searchParams.delete('highlight')
    url.searchParams.delete('type')
    window.history.replaceState({}, '', url.toString())

    nextTick(() => {
      const selector = type === 'word' ? `[data-word-id="${highlightId}"]` : `[data-sentence-id="${highlightId}"]`
      const element = document.querySelector(selector) as HTMLElement

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (settings.value.enableFlash) {
          element.classList.add('flashing')
          setTimeout(() => {
            element.classList.remove('flashing')
            highlightElementId.value = null
            highlightType.value = null
          }, 3200)
        } else {
          setTimeout(() => {
            highlightElementId.value = null
            highlightType.value = null
          }, 0)
        }
      } else {

        // 如果没找到，可能是标注还没完成，再等一会儿重试
        hasProcessedHighlight.value = false
        setTimeout(() => {
          handleQueryHighlight()
        }, 500)
      }
    })
  }
}

// 页面点击关闭弹出框
function handlePageClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('.selection-popover')) return
  if (target.closest('.annotation-form-overlay')) return
  if (target.closest('.annotation-tooltip')) return

  if (showTooltip.value) closeTooltip()
  if (popoverPosition.value.visible) clearSelection()
}

// 段落翻译相关函数
function indexParagraphs() {
  if (!containerRef.value) return
  
  // 查找所有段落元素
  const allParagraphs = containerRef.value.querySelectorAll('p, h2, h3, h4')
  paragraphs.value = Array.from(allParagraphs) as HTMLElement[]
  
  // 为每个段落添加索引属性和包装
  paragraphs.value.forEach((p, index) => {
    // 避免重复包装
    if (p.getAttribute('data-paragraph-index')) return
    
    p.setAttribute('data-paragraph-index', String(index))
    p.classList.add('has-translation-feature')
    
    // 创建翻译按钮包装器 (用于定位)
    const btnWrapper = document.createElement('span')
    btnWrapper.className = 'translation-btn-wrapper'
    btnWrapper.style.position = 'relative'
    btnWrapper.style.display = 'inline-block'
    btnWrapper.style.width = '0'
    btnWrapper.style.height = '0'
    btnWrapper.style.verticalAlign = 'middle'
    
    // 创建翻译按钮
    const btn = document.createElement('button')
    btn.className = 'translation-toggle-btn'
    btn.setAttribute('data-paragraph-btn', String(index))
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14M9 8V4m6 0v4m-9 4h14m-6 4h6m-6 4h6M4 12h2m0 4h2m0 4h2"/></svg>`
    btn.title = '切换翻译'
    // 按钮默认显示（但在CSS中透明），这样才有交互热区
    btn.style.display = 'flex'
    btn.onclick = (e) => {
      e.stopPropagation()
      toggleTranslation(index)
    }
    
    btnWrapper.appendChild(btn)
    p.appendChild(btnWrapper)
    
    // 创建翻译框容器
    const container = document.createElement('div')
    container.className = 'translation-box-container'
    container.setAttribute('data-translation-box', String(index))
    container.style.display = 'none'
    
    // 在段落后插入容器
    if (p.parentNode) {
      p.parentNode.insertBefore(container, p.nextSibling)
    }
    
    // 如果有已保存的翻译，自动展开
    const currentPathValue = getCurrentPagePath()
    const existingTranslation = getTranslation(currentPathValue, index)
    if (existingTranslation && existingTranslation.translation && existingTranslation.translation.trim()) {
      expandedTranslations.value.add(index)
      // 需要延迟一点等待 DOM 插入完成
      setTimeout(() => updateTranslationBoxUI(index, true), 0)
    }
  })
}

function toggleTranslation(index: number) {
  const isExpanded = expandedTranslations.value.has(index)
  
  if (isExpanded) {
    expandedTranslations.value.delete(index)
  } else {
    expandedTranslations.value.add(index)
  }
  
  // 更新 UI
  updateTranslationBoxUI(index, !isExpanded)
  
  // 触发响应式更新
  expandedTranslations.value = new Set(expandedTranslations.value)
}

function updateTranslationBoxUI(index: number, isExpanded: boolean) {
  const container = document.querySelector(`[data-translation-box="${index}"]`) as HTMLElement
  const btn = document.querySelector(`[data-paragraph-btn="${index}"]`) as HTMLElement
  
  if (!container) return
  
  if (isExpanded) {
    // 展开翻译框
    container.style.display = 'block'
    if (btn) {
      btn.classList.add('active')
    }
    
    // 渲染翻译框内容
    const currentPathValue = getCurrentPagePath()
    const translation = getTranslation(currentPathValue, index)
    
    container.innerHTML = `
      <div class="translation-box">
        <textarea
          class="translation-input"
          data-translation-input="${index}"
          placeholder=""
          rows="1"
          style="height: auto; min-height: 24px; overflow-y: hidden;"
        >${translation?.translation || ''}</textarea>
      </div>
    `
    
    // 自动调整高度
    const autoResize = (target: HTMLTextAreaElement) => {
      target.style.height = 'auto'
      target.style.height = target.scrollHeight + 'px'
    }

    // 绑定输入事件（防抖保存 + 自动高度）
    const textarea = container.querySelector(`[data-translation-input="${index}"]`) as HTMLTextAreaElement
    if (textarea) {
      // 初始化高度
      setTimeout(() => autoResize(textarea), 0)
      
      let saveTimer: number | null = null
      textarea.oninput = (e) => {
        const target = e.target as HTMLTextAreaElement
        autoResize(target)
        
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = window.setTimeout(() => {
          handleTranslationSave(index, target.value)
        }, 1000)
      }
    }
  } else {
    // 收起翻译框
    container.style.display = 'none'
    container.innerHTML = ''
    if (btn) {
      btn.classList.remove('active')
    }
  }
}

function handleTranslationSave(index: number, translation: string) {
  currentPath.value = getCurrentPagePath()
  saveTranslation(currentPath.value, index, translation)
}

function handleChannelNavigate(path: string, highlightId?: string, highlightType?: 'word' | 'sentence') {
  const currentPathNormalized = route.path.replace(/\.html$/, '')
  const targetPathNormalized = path.replace(/\.html$/, '').replace(/\?.*$/, '')
  
  if (currentPathNormalized === targetPathNormalized) {
    if (highlightId && highlightType) {
      nextTick(() => {
        const selector = highlightType === 'word' 
          ? `[data-word-id="${highlightId}"]` 
          : `[data-sentence-id="${highlightId}"]`
        const element = document.querySelector(selector) as HTMLElement
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          if (settings.value.enableFlash) {
            element.classList.add('flashing')
            setTimeout(() => element.classList.remove('flashing'), 3200)
          }
        }
      })
    }
  } else {
    const url = new URL(path, window.location.origin)
    if (highlightId) url.searchParams.set('highlight', highlightId)
    if (highlightType) url.searchParams.set('type', highlightType)
    router.push(url.pathname + url.search)
  }
}

let cleanupListener: (() => void) | null = null
let cleanupVocabListener: (() => void) | null = null
let cleanupSentenceListener: (() => void) | null = null

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.name = WINDOW_NAMES.ARTICLE
    cleanupListener = listenForNavigation('article', handleChannelNavigate)
    cleanupVocabListener = listenForDataChanges('vocabulary', reloadData)
    cleanupSentenceListener = listenForDataChanges('sentences', reloadData)
  }
  document.addEventListener('click', handlePageClick)
  setTimeout(() => {
    handleQueryHighlight()
    indexParagraphs()
  }, 500)
})

watch(() => route.path, () => {
  hasProcessedHighlight.value = false
  setTimeout(() => {
    handleQueryHighlight()
  }, 500)
})

onUnmounted(() => {
  cleanupListener?.()
  cleanupVocabListener?.()
  cleanupSentenceListener?.()
  document.removeEventListener('click', handlePageClick)
  if (annotationsFadeTimer && typeof window !== 'undefined') {
    window.clearTimeout(annotationsFadeTimer)
  }
  annotationsFadeTimer = null
})

// 清除现有标注，恢复原始文本
function clearExistingAnnotations() {
  if (!containerRef.value) return
  
  const annotationClasses = [
    'annotated-word', 
    'annotated-word-subtle', 
    'annotated-sentence', 
    'annotated-sentence-subtle'
  ]
  
  for (const className of annotationClasses) {
    const elements = containerRef.value.querySelectorAll(`.${className}`)
    elements.forEach(el => {
      const parent = el.parentNode
      if (parent) {
        // 用纯文本替换标注元素
        const textNode = document.createTextNode(el.textContent || '')
        parent.replaceChild(textNode, el)
        // 合并相邻的文本节点
        parent.normalize()
      }
    })
  }
}

// 高亮已标注内容
function highlightAnnotatedContent() {
  if (!containerRef.value || !settings.value.enabled) return

  // 先清除现有标注，从干净的文本开始
  clearExistingAnnotations()

  currentPath.value = getCurrentPagePath()
  const articlePath = currentPath.value

  const relevantWords = settings.value.showUnderline 
    ? vocabulary.value.filter(w => w.articlePath === articlePath)
    : []
  const relevantSentences = settings.value.showHighlight
    ? sentences.value.filter(s => s.articlePath === articlePath)
    : []

  if (relevantWords.length === 0 && relevantSentences.length === 0) return

  // 辅助函数：规范化文本（移除多余空白）
  function normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ').trim()
  }
  
  // 跟踪首次出现
  const firstOccurrenceWords = new Set<string>()
  const firstOccurrenceSentences = new Set<string>()

  // ========== 第一遍：标注句子 ==========
  if (relevantSentences.length > 0) {
    const sentenceWalker = document.createTreeWalker(
      containerRef.value,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (node.parentNode?.nodeName === 'SCRIPT' || node.parentNode?.nodeName === 'STYLE') {
            return NodeFilter.FILTER_REJECT
          }
          const parent = node.parentElement
          // 跳过已标注的句子
          if (parent?.classList.contains('annotated-sentence') ||
              parent?.classList.contains('annotated-sentence-subtle')) {
            return NodeFilter.FILTER_REJECT
          }
          if (node.textContent?.trim() === '') {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        }
      }
    )

    const sentenceReplacements: { node: Text; newHtml: string; parent: Node }[] = []
    
    let node: Node | null
    while ((node = sentenceWalker.nextNode())) {
      const textNode = node as Text
      const textContent = textNode.textContent || ''
      let newHtml = textContent
      let modified = false

      for (const sentence of relevantSentences) {
        const normalizedSentence = normalizeText(sentence.sentence)
        const normalizedContent = normalizeText(newHtml)
        
        const isFirstOccurrence = !firstOccurrenceSentences.has(sentence.id)
        const className = isFirstOccurrence ? 'annotated-sentence' : 'annotated-sentence-subtle'
        
        const escapedSentence = escapeRegex(sentence.sentence)
        const regex = new RegExp(`(${escapedSentence})`, 'i')
        if (regex.test(newHtml)) {
          newHtml = newHtml.replace(regex, `<mark class="${className}" data-sentence-id="${sentence.id}">$1</mark>`)
          modified = true
          if (isFirstOccurrence) {
            firstOccurrenceSentences.add(sentence.id)
          }
        }
        else if (normalizedContent.length > 20) {
          const sentenceStart = normalizedSentence.substring(0, Math.min(50, normalizedSentence.length))
          if (normalizedContent.includes(sentenceStart)) {
            const startIdx = normalizedContent.indexOf(sentenceStart)
            if (startIdx >= 0) {
              const matchLength = Math.min(normalizedContent.length - startIdx, normalizedSentence.length)
              const matchedText = newHtml.substring(startIdx, startIdx + matchLength)
              newHtml = newHtml.replace(matchedText, `<mark class="${className}" data-sentence-id="${sentence.id}">${matchedText}</mark>`)
              modified = true
              if (isFirstOccurrence) {
                firstOccurrenceSentences.add(sentence.id)
              }
            }
          }
        }
      }

      // 只要有修改且有父节点，就记录替换
      if (modified && textNode.parentNode) {
        sentenceReplacements.push({ node: textNode, newHtml, parent: textNode.parentNode })
      }
    }

    // 应用句子替换
    for (const { node, newHtml, parent } of sentenceReplacements) {
      if (parent.contains(node)) {
        const range = document.createRange()
        range.setStartBefore(node)
        range.setEndAfter(node)
        range.deleteContents()
        const fragment = range.createContextualFragment(newHtml)
        range.insertNode(fragment)
      }
    }
  }

  // ========== 第二遍：标注单词（包括句子内的单词）==========
  if (relevantWords.length > 0) {
    const wordWalker = document.createTreeWalker(
      containerRef.value,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (node.parentNode?.nodeName === 'SCRIPT' || node.parentNode?.nodeName === 'STYLE') {
            return NodeFilter.FILTER_REJECT
          }
          const parent = node.parentElement
          // 只跳过已标注的单词
          if (parent?.classList.contains('annotated-word') || 
              parent?.classList.contains('annotated-word-subtle')) {
            return NodeFilter.FILTER_REJECT
          }
          if (node.textContent?.trim() === '') {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        }
      }
    )

    const wordReplacements: { node: Text; newHtml: string; parent: Node }[] = []
    
    let node: Node | null
    while ((node = wordWalker.nextNode())) {
      const textNode = node as Text
      const textContent = textNode.textContent || ''
      let newHtml = textContent
      let modified = false

      for (const word of relevantWords) {
        const regex = new RegExp(`\\b(${escapeRegex(word.word)})\\b`, 'gi')
        if (regex.test(newHtml)) {
          const isFirstOccurrence = !firstOccurrenceWords.has(word.id)
          if (isFirstOccurrence) {
            newHtml = newHtml.replace(regex, `<mark class="annotated-word" data-word-id="${word.id}">$1</mark>`)
            firstOccurrenceWords.add(word.id)
          } else {
            newHtml = newHtml.replace(regex, `<mark class="annotated-word-subtle" data-word-id="${word.id}">$1</mark>`)
          }
          modified = true
        }
      }

      // 只要有修改且有父节点，就记录替换
      if (modified && textNode.parentNode) {
        wordReplacements.push({ node: textNode, newHtml, parent: textNode.parentNode })
      }
    }

    // 应用单词替换
    for (const { node, newHtml, parent } of wordReplacements) {
      if (parent.contains(node)) {
        const range = document.createRange()
        range.setStartBefore(node)
        range.setEndAfter(node)
        range.deleteContents()
        const fragment = range.createContextualFragment(newHtml)
        range.insertNode(fragment)
      }
    }
  }
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

watch([vocabulary, sentences, () => settings.value.enabled], () => {
  nextTick(() => {
    highlightAnnotatedContent()
    attachHighlightHoverHandlers()
    attachAnnotationClickHandlers()
    indexParagraphs()
  })
}, { deep: true, immediate: true })

watch(() => settings.value.enabled, (enabled) => {
  if (!enabled) {
    annotationsActivating.value = false
    if (annotationsFadeTimer && typeof window !== 'undefined') {
      window.clearTimeout(annotationsFadeTimer)
    }
    annotationsFadeTimer = null
    return
  }
  annotationsActivating.value = true
  if (typeof window === 'undefined') {
    annotationsActivating.value = false
    return
  }
  if (annotationsFadeTimer) {
    window.clearTimeout(annotationsFadeTimer)
  }
  annotationsFadeTimer = window.setTimeout(() => {
    annotationsActivating.value = false
    annotationsFadeTimer = null
  }, 120)
})

function attachHighlightHoverHandlers() {
  if (!containerRef.value) return

  // 清理旧的事件监听器
  const oldHoverHandler = (containerRef.value as any)._highlightHoverHandler
  const oldLeaveHandler = (containerRef.value as any)._highlightLeaveHandler
  if (oldHoverHandler) {
    containerRef.value.removeEventListener('mouseenter', oldHoverHandler, true)
  }
  if (oldLeaveHandler) {
    containerRef.value.removeEventListener('mouseleave', oldLeaveHandler, true)
  }

  // 添加新的悬停事件监听器
  containerRef.value.addEventListener('mouseenter', handleHighlightHover, true)
  containerRef.value.addEventListener('mouseleave', handleHighlightLeave, true)
  ;(containerRef.value as any)._highlightHoverHandler = handleHighlightHover
  ;(containerRef.value as any)._highlightLeaveHandler = handleHighlightLeave
}

function attachAnnotationClickHandlers() {
  if (!containerRef.value) return

  const oldClickHandler = (containerRef.value as any)._annotationClickHandler
  if (oldClickHandler) {
    containerRef.value.removeEventListener('click', oldClickHandler, true)
  }

  containerRef.value.addEventListener('click', handleAnnotationClick, true)
  ;(containerRef.value as any)._annotationClickHandler = handleAnnotationClick
}
</script>

<template>
  <div class="bilingual-reader-wrapper" :class="{ 'annotations-hidden': !settings.enabled, 'annotations-activating': annotationsActivating }">
    <div ref="containerRef" class="bilingual-reader">
      <slot></slot>
      
      <SelectionPopover 
        :position="effectivePopoverPosition"
        :selection-type="selection.type"
        :selection-length="selection.text.length"
        @add-word="handleAddWord"
        @add-sentence="handleAddSentence"
      />
      
      <AnnotationForm 
        v-if="showForm"
        :selected-text="selectedTextForForm"
        :context-text="selectedContextForForm"
        :type="formType"
        @save="handleSave"
        @cancel="handleCancel"
      />
      
      <AnnotationTooltip
        v-if="showTooltip"
        :position="tooltipPosition"
        :content="tooltipContent"
        :type="tooltipType"
        @close="closeTooltip"
      />
      
      <Toast ref="toastRef" />
    </div>
  </div>
</template>

<style scoped>
.bilingual-reader-wrapper {
  position: relative;
}

.bilingual-reader {
  line-height: 1.8;
  font-size: 16px;
}

.bilingual-reader :deep(p),
.bilingual-reader :deep(h2),
.bilingual-reader :deep(h3),
.bilingual-reader :deep(h4) {
  margin-bottom: 1.5em;
}

/* 段落翻译功能样式 */
.bilingual-reader :deep(.has-translation-feature) {
  position: relative;
}

.bilingual-reader :deep(.translation-toggle-btn) {
  position: absolute;
  left: 8px; /* 紧挨着最后一个单词，距离 8px */
  top: 50%;
  transform: translateY(-50%) translateX(0);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid rgba(60, 60, 60, 0.12);
  border-radius: 6px;
  width: 24px;
  height: 24px;
  display: flex !important;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: background-color 0.2s ease, color 0.2s ease;
  opacity: 0;
  z-index: 10;
  padding: 0;
}

/* 仅在悬停按钮包装器时显示按钮 */
.bilingual-reader :deep(.translation-btn-wrapper:hover .translation-toggle-btn) {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

.bilingual-reader :deep(.translation-toggle-btn:hover) {
  background: rgba(255, 255, 255, 0.9);
  color: var(--vp-c-brand, #3eaf7c);
  transform: translateY(-50%) scale(1.05);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  border-color: rgba(62, 175, 124, 0.2);
}

.bilingual-reader :deep(.translation-toggle-btn.active) {
  background: var(--vp-c-brand, #3eaf7c);
  color: white;
  opacity: 1 !important;
  border-color: transparent;
}

.bilingual-reader :deep(.translation-box-container) {
  position: relative;
  width: 100%;
  margin: -16px 0 24px 0; /* 使用负边距抵消段落的 margin-bottom，实现紧贴效果 */
}

.bilingual-reader :deep(.translation-box) {
  padding: 0;
  background-color: transparent;
  border: none;
  border-radius: 0;
  backdrop-filter: none;
  animation: expandBox 0.3s ease-out;
}

@keyframes expandBox {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bilingual-reader :deep(.translation-input) {
  width: 100%;
  padding: 6px 10px; /* 减小内边距，使框变小 */
  border: 1px solid rgba(60, 60, 60, 0.1);
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  font-family: inherit;
  color: rgba(60, 60, 60, 0.6); /* 字体颜色更浅 */
  background-color: transparent;
  transition: background-color 0.2s ease, border-bottom-color 0.2s ease, color 0.2s ease;
  box-sizing: border-box;
  max-width: 100%;
  display: block;
}

.bilingual-reader :deep(.translation-input:focus) {
  outline: none;
  box-shadow: none;
  color: var(--vp-c-text-1); /* 聚焦时颜色变深，方便阅读 */
  background-color: transparent;
  border-color: var(--vp-c-brand, #3eaf7c);
}

.bilingual-reader :deep(.translation-input::placeholder) {
  color: rgba(60, 60, 60, 0.2);
  font-style: italic;
}

/* 暗色模式适配 */
@media (prefers-color-scheme: dark) {
  .bilingual-reader :deep(.translation-input) {
    color: rgba(255, 255, 255, 0.5); /* 暗色模式下也变浅 */
    border-color: rgba(255, 255, 255, 0.1);
    background-color: transparent;
  }
  
  .bilingual-reader :deep(.translation-input:focus) {
    color: var(--vp-c-text-1);
    background-color: transparent;
    border-color: var(--vp-c-brand, #3eaf7c);
  }
  
  .bilingual-reader :deep(.translation-input::placeholder) {
    color: rgba(255, 255, 255, 0.2);
  }
}

.bilingual-reader :deep(.annotated-word) {
  background-color: transparent;
  border-bottom: 2px solid #3eaf7c;
  cursor: pointer;
  padding: 0;
  display: inline;
  line-height: inherit;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  transition: background-color 0.3s ease, border-bottom-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
}

.bilingual-reader :deep(.annotated-word.flashing) {
  animation: flash-word 1s ease-in-out 3;
}

@keyframes flash-word {
  0%, 100% {
    background-color: transparent;
    box-shadow: 0 0 0 0 transparent;
  }
  50% {
    background-color: rgba(62, 175, 124, 0.4);
    box-shadow: 0 0 20px 8px rgba(100, 200, 150, 0.5), 0 0 40px 16px rgba(62, 175, 124, 0.25);
  }
}

.bilingual-reader :deep(.annotated-sentence) {
  background-color: rgba(74, 144, 226, 0.15) !important;
  padding: 0;
  cursor: pointer;
  border-radius: 0;
  display: inline;
  line-height: inherit;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  transition: background-color 0.3s ease, border-bottom-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
}

.bilingual-reader :deep(.annotated-sentence.flashing) {
  animation: flash-sentence 1s ease-in-out 3;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: 0 0 0 0 transparent;
}

@keyframes flash-sentence {
  0%, 100% {
    background-color: transparent;
    box-shadow: 0 0 0 0 transparent;
  }
  50% {
    background-color: rgba(74, 144, 226, 0.32);
    box-shadow: 0 0 12px 6px rgba(100, 160, 240, 0.4), 0 0 24px 12px rgba(74, 144, 226, 0.18), inset 0 0 10px 2px rgba(74, 144, 226, 0.45);
  }
}

/* 后续出现的单词：无下划线，但仍可交互 */
.bilingual-reader :deep(.annotated-word-subtle) {
  background-color: transparent;
  border-bottom: none;
  cursor: pointer;
  padding: 0;
  display: inline;
  line-height: inherit;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  transition: background-color 0.2s ease, border-bottom-color 0.2s ease, color 0.2s ease;
}

.bilingual-reader :deep(.annotated-word-subtle:hover) {
  border-bottom: 1px dotted rgba(62, 175, 124, 0.5);
}

/* 后续出现的句子：浅色背景，悬停时加深 */
.bilingual-reader :deep(.annotated-sentence-subtle) {
  background-color: transparent;
  padding: 0;
  cursor: pointer;
  border-radius: 0;
  display: inline;
  line-height: inherit;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.bilingual-reader :deep(.annotated-sentence-subtle:hover) {
  background-color: rgba(74, 144, 226, 0.08);
}

/* 修复：当单词在句子内时，继承句子的背景色 */
.bilingual-reader :deep(.annotated-sentence .annotated-word),
.bilingual-reader :deep(.annotated-sentence .annotated-word-subtle) {
  background-color: inherit;
}

.bilingual-reader :deep(.annotated-sentence-subtle .annotated-word),
.bilingual-reader :deep(.annotated-sentence-subtle .annotated-word-subtle) {
  background-color: inherit;
}

/* 关闭标注时隐藏所有高亮样式 */
.annotations-hidden :deep(.annotated-word),
.annotations-hidden :deep(.annotated-word-subtle) {
  border-bottom-color: transparent !important;
  background-color: transparent !important;
  color: inherit !important;
  font-weight: inherit !important;
  text-decoration: none !important;
  cursor: text;
}

.annotations-hidden :deep(.annotated-sentence),
.annotations-hidden :deep(.annotated-sentence-subtle) {
  background-color: transparent !important;
  color: inherit !important;
  font-weight: inherit !important;
  cursor: text;
}

/* 启用标注时的渐显起点 */
.annotations-activating :deep(.annotated-word),
.annotations-activating :deep(.annotated-word-subtle) {
  border-bottom-color: transparent !important;
  background-color: transparent !important;
  color: inherit !important;
  font-weight: inherit !important;
  text-decoration: none !important;
  cursor: text;
}

.annotations-activating :deep(.annotated-sentence),
.annotations-activating :deep(.annotated-sentence-subtle) {
  background-color: transparent !important;
  color: inherit !important;
  font-weight: inherit !important;
  cursor: text;
}
</style>
