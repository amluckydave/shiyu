<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { splitSentenceExplanation } from '../utils/sentenceExplanation'
import { createArticleOpener } from '../utils/articleNavigation'
import { listenForNavigation, listenForDataChanges, WINDOW_NAMES } from '../utils/channelMessaging'
import { useSentenceBank } from '../composables'
import { useBilingualData } from '../composables/useBilingualData'
import type { SavedSentence } from '../types'

const { sentences, removeSentence, markReviewed, exportToCSV } = useSentenceBank()
const { reloadData } = useBilingualData()

const searchQuery = ref('')
const sortBy = ref<'date' | 'review'>('date')

const filteredSentences = computed(() => {
  let result = [...sentences.value]
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s => 
      s.sentence.toLowerCase().includes(query) ||
      s.explanation.toLowerCase().includes(query)
    )
  }
  
  // 排序
  switch (sortBy.value) {
    case 'review':
      result.sort((a, b) => a.reviewCount - b.reviewCount)
      break
    case 'date':
    default:
      result.sort((a, b) => b.createdAt - a.createdAt)
  }
  
  return result
})

const decoratedSentences = computed(() =>
  filteredSentences.value.map(sentence => ({
    sentence,
    parts: splitSentenceExplanation(sentence.explanation)
  }))
)

const pendingHighlightId = ref<string | null>(null)
const hasProcessedHighlight = ref(false)
let highlightRetryCount = 0
const highlightRetryLimit = 6

function readHighlightId(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const type = params.get('type')
  const id = params.get('highlight')
  if (!id) return null
  if (type && type !== 'sentence') return null
  return id
}

function clearHighlightParams() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete('highlight')
  url.searchParams.delete('type')
  window.history.replaceState({}, '', url.toString())
}

function focusSentenceCard(id: string): boolean {
  const element = document.querySelector(`[data-sentence-id="${id}"]`) as HTMLElement | null
  if (!element) return false
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  requestAnimationFrame(() => {
    const rect = element.getBoundingClientRect()
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      const target = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2
      window.scrollTo({ top: target, behavior: 'smooth' })
    }
  })
  setTimeout(() => {
    const rect = element.getBoundingClientRect()
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      const target = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2
      window.scrollTo({ top: target, behavior: 'smooth' })
    }
  }, 250)
  element.classList.add('focus-highlight')
  setTimeout(() => {
    element.classList.remove('focus-highlight')
  }, 2000)
  return true
}

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
    if (focusSentenceCard(pendingHighlightId.value as string)) {
      hasProcessedHighlight.value = true
      clearHighlightParams()
      return
    }

    highlightRetryCount += 1
    if (highlightRetryCount >= highlightRetryLimit) {
      hasProcessedHighlight.value = true
      return
    }
    setTimeout(() => {
      handleQueryHighlight()
    }, 300)
  })
}

function handleChannelNavigate(path: string, highlightId?: string, highlightType?: 'word' | 'sentence') {
  if (highlightType && highlightType !== 'sentence') return
  if (highlightId) {
    pendingHighlightId.value = highlightId
    hasProcessedHighlight.value = false
    highlightRetryCount = 0
    nextTick(() => handleQueryHighlight())
  }
}

let cleanupListener: (() => void) | null = null
let cleanupDataListener: (() => void) | null = null

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.name = WINDOW_NAMES.SENTENCES
    cleanupListener = listenForNavigation('sentences', handleChannelNavigate)
    cleanupDataListener = listenForDataChanges('sentences', reloadData)
  }
  handleQueryHighlight()
})

onUnmounted(() => {
  cleanupListener?.()
  cleanupDataListener?.()
})

watch(filteredSentences, () => {
  handleQueryHighlight()
})

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

function handleExport() {
  const csv = exportToCSV()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `sentences_${Date.now()}.csv`
  link.click()
}

let isDeleting = false

function handleDelete(id: string, event: Event) {
  event.stopPropagation()
  event.preventDefault()
  if (isDeleting) return
  isDeleting = true
  
  if (confirm('确定要删除这个句子吗？')) {
    removeSentence(id)
  }
  
  setTimeout(() => {
    isDeleting = false
  }, 300)
}

const openArticle = createArticleOpener({
  getOrigin: () => window.location.origin,
  openWindow: (url, name) => window.open(url, name)
})

function goToArticle(sentence: SavedSentence) {
  if (sentence.articlePath) {
    openArticle(sentence.articlePath, sentence.id, 'sentence')
  }
}
</script>

<template>
  <div class="sentence-bank">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        长难句库
      </h1>
      <p class="page-subtitle">收集和复习阅读中的长难句 · 共 <strong>{{ sentences.length }}</strong> 个句子</p>
    </div>

    
    <div class="bank-toolbar">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索句子或翻译..."
        />
      </div>
      
      <div class="toolbar-actions">
        <select v-model="sortBy" class="sort-select">
          <option value="date">按时间</option>
          <option value="review">按复习次数</option>
        </select>
        
        <button class="export-btn" @click="handleExport" :disabled="sentences.length === 0">
          📤 导出 CSV
        </button>
      </div>
    </div>
    
    <div v-if="filteredSentences.length === 0" class="empty-state">
      <div class="empty-icon">📖</div>
      <p>{{ searchQuery ? '没有找到匹配的句子' : '长难句库是空的，去阅读文章添加长难句吧！' }}</p>
    </div>
    
    <TransitionGroup v-else name="sentence-list" tag="div" class="sentence-list">
      <div
        v-for="item in decoratedSentences"
        :key="item.sentence.id"
        class="sentence-card"
        :data-sentence-id="item.sentence.id"
      >
        <div class="sentence-original">
          {{ item.sentence.sentence }}
        </div>
        
        <!-- 总述框 -->
        <div v-if="item.parts.summary" class="sentence-explanation sentence-summary-box">
          <div class="explanation-label">总述</div>
          <div class="explanation-text">{{ item.parts.summary }}</div>
        </div>

        <!-- 结构框 -->
        <div v-if="item.parts.analysis" class="sentence-explanation sentence-analysis">
          <div class="explanation-label">结构</div>
          <div class="explanation-text">{{ item.parts.analysis }}</div>
        </div>

        <!-- 释义框 -->
        <div v-if="item.parts.translation || (!item.parts.analysis && !item.parts.summary && item.parts.raw)" class="sentence-explanation sentence-translation">
          <div class="explanation-label">释义</div>
          <div class="explanation-text">{{ item.parts.translation || item.parts.raw }}</div>
        </div>
        
        <div class="sentence-footer">
          <span class="sentence-date">{{ formatDate(item.sentence.createdAt) }}</span>
          <span class="sentence-review">复习 {{ item.sentence.reviewCount }} 次</span>
          
          <div class="sentence-actions">
            <button
              v-if="item.sentence.articlePath"
              class="action-btn"
              title="跳转原文"
              @click="goToArticle(item.sentence)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </button>
            <button
              class="action-btn review-btn"
              title="标记复习"
              @click="markReviewed(item.sentence.id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </button>
            <button
              class="action-btn delete-btn"
              title="删除"
              @click="handleDelete(item.sentence.id, $event)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.sentence-bank {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem 1.5rem 3rem;
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-top: 4rem;
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 2rem;
  font-weight: 800;
  color: var(--c-text);
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}

.title-icon {
  width: 36px;
  height: 36px;
  color: #4a90e2;
}

.page-subtitle {
  font-size: 1rem;
  color: var(--c-text-lighter);
  margin: 0;
}

.bank-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #4a90e2;
}

.bank-header h2 {
  margin: 0;
  font-size: 24px;
}

.header-stats {
  color: var(--vp-c-text-2, #666);
}

.bank-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  flex: 1;
  min-width: 200px;
}

.search-box input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider, #ddd);
  border-radius: 8px;
  font-size: 14px;
}

.search-box input:focus {
  outline: none;
  border-color: #4a90e2;
}

.sort-select {
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider, #ddd);
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
}

.export-btn {
  padding: 10px 16px;
  background: linear-gradient(135deg, #4a90e2, #357abd);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.export-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--vp-c-text-2, #666);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.sentence-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}

.sentence-card {
  background: rgba(246, 246, 247, 0.85);
  border-radius: 10px;
  padding: 14px 16px;
  border-left: 3px solid #4a90e2;
  transition: transform 0.2s, box-shadow 0.2s;
  backdrop-filter: blur(8px);
}

:root.dark .sentence-card {
  background: rgba(30, 30, 32, 0.85);
}

.sentence-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

@keyframes sentence-focus-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.35);
  }
  100% {
    box-shadow: 0 0 0 12px rgba(74, 144, 226, 0);
  }
}

.sentence-card.focus-highlight {
  outline: 2px solid #4a90e2;
  outline-offset: 2px;
  animation: sentence-focus-pulse 1.6s ease;
}

.sentence-original {
  font-size: 15px;
  line-height: 1.6;
  color: var(--vp-c-text-1, #333);
  margin-bottom: 12px;
}

.sentence-explanation {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

:root.dark .sentence-explanation {
  background: rgba(40, 40, 42, 0.7);
}

.explanation-label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
}

.sentence-analysis .explanation-label {
  color: #7b61ff;
}

.sentence-translation .explanation-label {
  color: #4a90e2;
}

.explanation-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2, #666);
  white-space: pre-wrap;
}

.sentence-summary-box .explanation-label {
  color: #e07b39;
}

.sentence-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: var(--vp-c-text-3, #999);
}

.sentence-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.action-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--vp-c-text-2, #666);
  transition: transform 0.2s, color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  transform: scale(1.25);
  color: #4a90e2;
}

.review-btn:hover {
  color: #22c55e;
}

.delete-btn:hover {
  color: #ef4444;
}

/* 列表动画 */
.sentence-list-enter-active {
  transition: all 0.3s ease;
}

.sentence-list-leave-active {
  transition: opacity 0.25s ease;
  position: absolute;
  left: 0;
  right: 0;
}

.sentence-list-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.sentence-list-leave-to {
  opacity: 0;
}

.sentence-list-move {
  transition: none;
}
</style>
