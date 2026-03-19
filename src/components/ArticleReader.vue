<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getArticle, type ArticleItem } from '../services/api'
import ContentEditorModal from './ContentEditorModal.vue'
import MindMapPanel from './MindMapPanel.vue'
import ArticleWordList from './ArticleWordList.vue'
import { marked } from 'marked'
import { useTextSelection } from '../composables/useTextSelection'
import { useAnnotation } from '../composables/useAnnotation'
import { useAnnotationInteraction } from '../composables/useAnnotationInteraction'
import { useTranslation } from '../composables/useTranslation'
import type { HighlightType } from '../composables/useRouteQuery'

import SelectionPopover from './SelectionPopover.vue'
import AnnotationForm from './AnnotationForm.vue'
import AnnotationTooltip from './AnnotationTooltip.vue'
import Toast from './Toast.vue'
// ⚠️ CSS 导入顺序固定：annotation-highlight 必须最后加载
import '../styles/reader-typography.css'
import '../styles/article-reader.css'
import '../styles/annotation-highlight.css'

marked.setOptions({ gfm: true, breaks: true })

const props = defineProps<{
  article: ArticleItem
  highlightId?: string | null
  highlightType?: HighlightType | null
  autoOpenEditor?: boolean
}>()

const emit = defineEmits<{
  close: []
  updated: [article: ArticleItem]
}>()

const router = useRouter()

// Reader state
const fontSize = ref<'small' | 'medium' | 'large'>('medium')
const readingProgress = ref(0)
const showFloatingHeader = ref(false)

const readerBodyRef = ref<HTMLElement | null>(null)
const currentArticle = ref<ArticleItem | null>(null)
const currentArticleId = computed(() => currentArticle.value?.id || null)
const toastRef = ref<InstanceType<typeof Toast> | null>(null)
const showEditor = ref(false)
const showWordList = ref(false)
const showMindMap = ref(false)

function openEditor() {
  showEditor.value = true
}

function handleEditorSaved(updated: ArticleItem) {
  currentArticle.value = updated
  showEditor.value = false
  emit('updated', updated)
}

// 词句面板：删除后刷新标注
async function handleWordListDeleted(_type: 'word' | 'sentence', _id: string) {
  // 重新加载标注数据并刷新高亮
  await loadAnnotations()
  clearExistingAnnotations()
  await nextTick()
  highlightAnnotatedContent()
}

// 词句面板：定位到文中高亮
function handleWordListLocate(type: 'word' | 'sentence', id: string) {
  const dataAttr = type === 'word' ? 'word-id' : 'sentence-id'
  const el = readerBodyRef.value?.querySelector(`[data-${dataAttr}="${id}"]`) as HTMLElement | null
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('flashing')
  setTimeout(() => el.classList.remove('flashing'), 3200)
}

// Composables
const {
  selection,
  popoverPosition,
  clearSelection,
  getContext,
} = useTextSelection(readerBodyRef)

const {
  annotationEnabled,
  loadData: loadAnnotations,
  highlightAnnotatedContent,
  clearExistingAnnotations,
  saveWord,
  saveSentence,
  findWordById,
  findSentenceById,
} = useAnnotation(readerBodyRef, currentArticleId)

const {
  showAnnotationForm,
  annotationType,
  cachedSelectedText,
  cachedContextText,
  tooltipState,
  handleAddWord,
  handleAddSentence,
  handleCloseForm,
  handleSaveAnnotation,
  toggleAnnotations,
  handleAnnotationClick,
  handleHighlightHover,
  handleHighlightLeave,
  handleTooltipClose,
  handlePageClick,
} = useAnnotationInteraction(
  router,
  toastRef,
  { selection, clearSelection, getContext, popoverPosition },
  { annotationEnabled, findWordById, findSentenceById, saveWord, saveSentence },
)

import { resolveLocalImages, resolveLocalImagesInMarkdown } from '../utils/imageResolver'

const articleMarkdownContent = computed(() => currentArticle.value?.content || null)
const articleTitleRef = computed(() => currentArticle.value?.title || null)
const articleIdRef = computed(() => currentArticle.value?.id || null)

const {
  translationEnabled,
  translating,
  titleTranslation,
  titleStreaming,
  toggleTranslation,
  cleanup: cleanupTranslation,
} = useTranslation(readerBodyRef, articleMarkdownContent, articleTitleRef, articleIdRef)

const parsedContent = computed(() => {
  if (!currentArticle.value) return ''
  const content = currentArticle.value.content
  // Resolve image paths before markdown parsing (prevents backslash issues)
  const resolved = resolveLocalImagesInMarkdown(content)
  return resolveLocalImages(marked.parse(resolved) as string)
})

const fontSizeMap = {
  small: '0.95rem',
  medium: '1.1rem',
  large: '1.25rem',
}

const fontSizeLabel = {
  small: '小',
  medium: '中',
  large: '大',
}

const estimatedReadTime = computed(() => {
  if (!currentArticle.value) return 0
  return Math.max(1, Math.ceil(currentArticle.value.word_count / 400))
})

// Highlight logic
let pendingHighlightId = ref<string | null>(null)
let pendingHighlightType = ref<HighlightType | null>(null)
let highlightRetryCount = 0
const highlightRetryLimit = 8
let highlightTimer: ReturnType<typeof setTimeout> | null = null

function triggerHighlight() {
  if (!pendingHighlightId.value || !pendingHighlightType.value) return
  const selector = pendingHighlightType.value === 'word'
    ? `[data-word-id="${pendingHighlightId.value}"]`
    : `[data-sentence-id="${pendingHighlightId.value}"]`

  const element = document.querySelector(selector) as HTMLElement | null
  if (!element) {
    highlightRetryCount += 1
    if (highlightRetryCount >= highlightRetryLimit) {
      pendingHighlightId.value = null
      pendingHighlightType.value = null
      return
    }
    setTimeout(() => triggerHighlight(), 250)
    return
  }

  // 先清除所有正在闪烁的元素，确保同一时间只有一个在闪
  document.querySelectorAll('.flashing').forEach(el => el.classList.remove('flashing'))
  if (highlightTimer) clearTimeout(highlightTimer)

  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  element.classList.add('flashing')

  highlightTimer = setTimeout(() => {
    element.classList.remove('flashing')
  }, 3200)

  pendingHighlightId.value = null
  pendingHighlightType.value = null
  highlightRetryCount = 0
}

function cycleFontSize() {
  const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large']
  const idx = sizes.indexOf(fontSize.value)
  fontSize.value = sizes[(idx + 1) % sizes.length]
}

let scrollRafId: number | null = null
let scrollContainer: HTMLElement | null = null

function getScrollContainer(): HTMLElement {
  if (!scrollContainer) {
    scrollContainer = document.querySelector('.app-main') as HTMLElement
  }
  return scrollContainer || document.documentElement
}

function handleScroll() {
  if (scrollRafId !== null) return
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = null
    const el = getScrollContainer()
    const scrollTop = el.scrollTop
    const scrollHeight = el.scrollHeight - el.clientHeight
    readingProgress.value = scrollHeight > 0 ? Math.min((scrollTop / scrollHeight) * 100, 100) : 0
    showFloatingHeader.value = scrollTop > 200
  })
}

function scrollToTop() {
  getScrollContainer().scrollTo({ top: 0, behavior: 'smooth' })
}

function closeReader() {
  clearSelection()
  clearExistingAnnotations()
  cleanupTranslation()
  readingProgress.value = 0
  currentArticle.value = null
  emit('close')
}

// Initialize reader content
async function initReader() {
  // Fetch full article content
  try {
    const fullArticle = await getArticle(props.article.id)
    currentArticle.value = fullArticle
  } catch (e) {
    console.error('获取文章详情失败:', e)
    currentArticle.value = props.article
  }

  readingProgress.value = 0
  showFloatingHeader.value = false
  pendingHighlightId.value = props.highlightId ?? null
  pendingHighlightType.value = props.highlightType ?? null
  highlightRetryCount = 0

  nextTick(async () => {
    await loadAnnotations()
    await nextTick()
    await nextTick()
    setTimeout(() => {
      highlightAnnotatedContent()
      setTimeout(() => triggerHighlight(), 100)
    }, 50)

    // OCR 导入时自动打开编辑器
    if (props.autoOpenEditor) {
      showEditor.value = true
    }
  })
}

onMounted(() => {
  initReader()
  getScrollContainer().addEventListener('scroll', handleScroll, { passive: true })
  document.addEventListener('mousedown', handlePageClick)
})

onUnmounted(() => {
  getScrollContainer().removeEventListener('scroll', handleScroll)
  document.removeEventListener('mousedown', handlePageClick)
  if (highlightTimer) clearTimeout(highlightTimer)
  if (scrollRafId !== null) cancelAnimationFrame(scrollRafId)
  scrollContainer = null
})

// Watch for article change (e.g., route navigation while reader is open)
watch(() => props.article.id, () => {
  initReader()
})

// Watch for highlight change on same article (e.g., vocab/sentences → 同一文章的不同标注)
watch(() => props.highlightId, (newId) => {
  if (!newId) return
  pendingHighlightId.value = newId
  pendingHighlightType.value = props.highlightType ?? null
  highlightRetryCount = 0
  nextTick(() => triggerHighlight())
})
</script>
<template>
  <div class="reader-view">
    <!-- 阅读进度条 -->
    <div class="reading-progress-bar">
      <div class="reading-progress-fill" :style="{ width: readingProgress + '%' }"></div>
    </div>

    <!-- 浮动顶部栏 -->
    <transition name="slide-down">
      <header v-if="showFloatingHeader" class="floating-header">
        <button class="floating-back-btn" @click="closeReader">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
            <path d="M19 12H5"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <span class="floating-title">{{ currentArticle?.title }}</span>
        <div class="floating-actions">
          <!-- 翻译开关按钮 -->
          <button 
            class="tool-btn translation-toggle-btn" 
            :class="{ 'active': translationEnabled, 'loading': translating }"
            @click="toggleTranslation" 
            :title="translating ? '翻译中...' : (translationEnabled ? '隐藏翻译' : '显示翻译')"
            :disabled="translating"
          >
            <svg v-if="!translating" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>
              <path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
            </svg>
            <svg v-else class="spin-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span class="tool-label">{{ translating ? '译中' : '译' }}</span>
          </button>

          <!-- 标注开关按钮 -->
          <button 
            class="tool-btn annotation-toggle-btn" 
            :class="{ 'active': annotationEnabled }"
            @click="toggleAnnotations" 
            :title="annotationEnabled ? '关闭标注' : '开启标注'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <span class="tool-label">标注</span>
          </button>
          
          <button class="tool-btn" @click="cycleFontSize" :title="'字号: ' + fontSizeLabel[fontSize]">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 7V4h16v3"/>
              <path d="M9 20h6"/>
              <path d="M12 4v16"/>
            </svg>
            <span class="tool-label">{{ fontSizeLabel[fontSize] }}</span>
          </button>
          <span class="progress-text">{{ Math.round(readingProgress) }}%</span>
        </div>
      </header>
    </transition>

    <!-- 文章头部 -->
    <header v-if="currentArticle" class="reader-header">
      <div class="reader-title-area">
        <div class="title-decoration"></div>
        <h1>{{ currentArticle.title }}</h1>
        <div v-if="translationEnabled && titleTranslation" class="translation-block title-translation" :class="{ 'streaming': titleStreaming }">
          {{ titleTranslation }}
        </div>
        <div class="reader-meta">
          <span v-if="currentArticle.author" class="meta-chip author">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {{ currentArticle.author }}
          </span>
          <span v-if="currentArticle.category" class="meta-chip category">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            {{ currentArticle.category }}
          </span>
          <span class="meta-chip">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            {{ currentArticle.word_count.toLocaleString() }} 字
          </span>
          <span class="meta-chip">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            约 {{ estimatedReadTime }} 分钟
          </span>
        </div>
      </div>
    </header>

    <!-- 文章正文 -->
    <article
      ref="readerBodyRef"
      class="reader-body"
      :class="{ 'annotations-hidden': !annotationEnabled }"
      :style="{ fontSize: fontSizeMap[fontSize] }"
      v-html="parsedContent"
      @click="handleAnnotationClick"
      @mouseover="handleHighlightHover"
      @mouseout="handleHighlightLeave"
    ></article>



    <!-- 右下角浮动操作栏 -->
    <div v-if="currentArticle" class="fab-column">
        <!-- 返回列表 -->
        <button class="fab-btn" @click="closeReader" data-tooltip="返回列表">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>

        <!-- 编辑排版 -->
        <button class="fab-btn" @click="openEditor" data-tooltip="编辑排版">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        <!-- 词句面板 -->
        <button class="fab-btn" :class="{ 'fab-active': showWordList }" @click="showWordList = true" data-tooltip="词句面板">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </button>

        <!-- 思维导图 -->
        <button class="fab-btn" :class="{ 'fab-active': showMindMap }" @click="showMindMap = true" data-tooltip="思维导图">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/>
            <path d="M12 7.5V12m0 0l-5.5 4.5M12 12l5.5 4.5"/>
          </svg>
        </button>

        <!-- 双语翻译 -->
        <button 
          class="fab-btn" 
          :class="{ 'fab-active': translationEnabled, 'fab-loading': translating }"
          @click="toggleTranslation"
          :data-tooltip="translating ? '翻译中...' : (translationEnabled ? '隐藏翻译' : '双语翻译')"
          :disabled="translating"
        >
          <svg v-if="!translating" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>
            <path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
          </svg>
          <svg v-else class="spin-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        </button>

        <!-- 回到顶部 -->
        <button 
          class="fab-btn fab-primary fab-scroll-top" 
          :class="{ 'fab-visible': showFloatingHeader }"
          @click="scrollToTop" 
          data-tooltip="回到顶部"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
    </div>

    <!-- 标注交互层 -->
    <SelectionPopover
      :position="popoverPosition"
      :selection-type="selection.type"
      :selection-length="selection.text?.length || 0"
      @add-word="handleAddWord"
      @add-sentence="handleAddSentence"
    />

    <AnnotationForm
      v-if="showAnnotationForm"
      :type="annotationType"
      :selected-text="cachedSelectedText"
      :context-text="cachedContextText"
      @save="handleSaveAnnotation"
      @cancel="handleCloseForm"
    />

    <AnnotationTooltip
      v-if="tooltipState.visible"
      :content="tooltipState.content"
      :type="tooltipState.type"
      :position="tooltipState.position"
      @close="handleTooltipClose"
    />



    <!-- 内容编辑器 -->
    <ContentEditorModal
      v-if="currentArticle"
      :visible="showEditor"
      :article="currentArticle"
      @close="showEditor = false"
      @saved="handleEditorSaved"
    />

    <!-- 词句面板 -->
    <ArticleWordList
      v-if="currentArticle"
      :visible="showWordList"
      :article-id="currentArticle.id"
      :article-title="currentArticle.title"
      @close="showWordList = false"
      @deleted="handleWordListDeleted"
      @locate="handleWordListLocate"
    />

    <!-- 思维导图面板 -->
    <MindMapPanel
      v-if="currentArticle"
      :visible="showMindMap"
      :article-id="currentArticle.id"
      :article-content="currentArticle.content"
      :article-title="currentArticle.title"
      @close="showMindMap = false"
    />

    <Toast ref="toastRef" />
  </div>
</template>
