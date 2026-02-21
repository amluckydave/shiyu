<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useVocabulary } from '../composables'
import { useBilingualData } from '../composables/useBilingualData'
import { createArticleOpener } from '../utils/articleNavigation'
import { listenForNavigation, listenForDataChanges, WINDOW_NAMES } from '../utils/channelMessaging'
import type { VocabularyWord } from '../types'

const { vocabulary, removeWord, markReviewed, exportToCSV } = useVocabulary()
const { reloadData } = useBilingualData()

const searchQuery = ref('')
const sortBy = ref<'date' | 'alpha' | 'review'>('date')

const filteredVocabulary = computed(() => {
  let result = [...vocabulary.value]
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(w => 
      w.word.toLowerCase().includes(query) ||
      w.meaning.toLowerCase().includes(query)
    )
  }
  
  // 排序
  switch (sortBy.value) {
    case 'alpha':
      result.sort((a, b) => a.word.localeCompare(b.word))
      break
    case 'review':
      result.sort((a, b) => a.reviewCount - b.reviewCount)
      break
    case 'date':
    default:
      result.sort((a, b) => b.createdAt - a.createdAt)
  }
  
  return result
})

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
  if (type && type !== 'word') return null
  return id
}

function clearHighlightParams() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete('highlight')
  url.searchParams.delete('type')
  window.history.replaceState({}, '', url.toString())
}

function focusWordCard(id: string): boolean {
  const element = document.querySelector(`[data-word-id="${id}"]`) as HTMLElement | null
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
    if (focusWordCard(pendingHighlightId.value as string)) {
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
  if (highlightType && highlightType !== 'word') return
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
    window.name = WINDOW_NAMES.VOCABULARY
    cleanupListener = listenForNavigation('vocabulary', handleChannelNavigate)
    cleanupDataListener = listenForDataChanges('vocabulary', reloadData)
  }
  handleQueryHighlight()
})

onUnmounted(() => {
  cleanupListener?.()
  cleanupDataListener?.()
})

watch(filteredVocabulary, () => {
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
  link.download = `vocabulary_${Date.now()}.csv`
  link.click()
}

let isDeleting = false

function handleDelete(id: string, event: Event) {
  event.stopPropagation()
  event.preventDefault()
  if (isDeleting) return
  isDeleting = true
  
  if (confirm('确定要删除这个单词吗？')) {
    removeWord(id)
  }
  
  setTimeout(() => {
    isDeleting = false
  }, 300)
}

const openArticle = createArticleOpener({
  getOrigin: () => window.location.origin,
  openWindow: (url, name) => window.open(url, name)
})

function goToArticle(word: VocabularyWord) {
  if (word.articlePath) {
    openArticle(word.articlePath, word.id, 'word')
  }
}
</script>

<template>
  <div class="vocabulary-notebook">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        生词本
      </h1>
      <p class="page-subtitle">记录和复习你的英语生词</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="mini-stat">
        <div class="mini-stat__icon mini-stat__icon--total">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <div class="mini-stat__info">
          <span class="mini-stat__value">{{ vocabulary.length }}</span>
          <span class="mini-stat__label">总单词</span>
        </div>
      </div>
      <div class="mini-stat">
        <div class="mini-stat__icon mini-stat__icon--reviewed">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </div>
        <div class="mini-stat__info">
          <span class="mini-stat__value">{{ vocabulary.filter(w => w.reviewCount > 0).length }}</span>
          <span class="mini-stat__label">已复习</span>
        </div>
      </div>
      <div class="mini-stat">
        <div class="mini-stat__icon mini-stat__icon--new">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </div>
        <div class="mini-stat__info">
          <span class="mini-stat__value">{{ vocabulary.filter(w => w.reviewCount === 0).length }}</span>
          <span class="mini-stat__label">待复习</span>
        </div>
      </div>
    </div>
    
    <!-- 工具栏 -->
    <div class="notebook-toolbar">
      <div class="search-box">
        <div class="search-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索单词或释义..."
          class="search-input"
        />
        <div v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      </div>
      
      <div class="toolbar-actions">
        <div class="sort-wrapper">
          <svg class="sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="4" y1="12" x2="14" y2="12"></line>
            <line x1="4" y1="18" x2="8" y2="18"></line>
          </svg>
          <select v-model="sortBy" class="sort-select">
            <option value="date">按时间</option>
            <option value="alpha">按字母</option>
            <option value="review">按复习次数</option>
          </select>
        </div>
        
        <button class="export-btn" @click="handleExport" :disabled="vocabulary.length === 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          导出
        </button>
      </div>
    </div>

    <!-- 搜索结果提示 -->
    <div class="filter-hint" v-if="searchQuery">
      找到 <strong>{{ filteredVocabulary.length }}</strong> 个匹配单词
    </div>
    
    <!-- 空状态 -->
    <Transition name="fade">
      <div v-if="filteredVocabulary.length === 0" class="empty-state">
        <div class="empty-state__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </div>
        <h3 class="empty-state__title">{{ searchQuery ? '没有找到匹配的单词' : '生词本是空的' }}</h3>
        <p class="empty-state__text">{{ searchQuery ? '尝试其他关键词' : '去阅读文章添加生词吧！' }}</p>
        <button v-if="searchQuery" class="empty-state__btn" @click="searchQuery = ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          清除搜索
        </button>
      </div>
    </Transition>
    
    <!-- 单词列表 -->
    <TransitionGroup name="word-list" tag="div" class="word-list" v-if="filteredVocabulary.length > 0">
      <div
        v-for="(word, index) in filteredVocabulary"
        :key="word.id"
        class="word-card"
        :data-word-id="word.id"
        :style="{ '--delay': index * 0.03 + 's' }"
      >
        <div class="word-card__indicator" :class="{ 'word-card__indicator--reviewed': word.reviewCount > 0 }"></div>
        
        <div class="word-card__content">
          <div class="word-card__header">
            <div class="word-card__word">{{ word.word }}</div>
            <div class="word-card__badges">
              <span v-if="word.reviewCount > 0" class="review-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                {{ word.reviewCount }}
              </span>
              <span v-else class="new-badge">NEW</span>
            </div>
          </div>
          
          <div class="word-card__meaning">{{ word.meaning }}</div>
          
          <div v-if="word.context" class="word-card__context">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>{{ word.context }}</span>
          </div>
          
          <div class="word-card__footer">
            <div class="word-card__meta">
              <span class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {{ formatDate(word.createdAt) }}
              </span>
            </div>
            
            <div class="word-card__actions">
              <button
                v-if="word.articlePath"
                class="action-btn action-btn--link"
                title="跳转原文"
                @click="goToArticle(word)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
              <button
                class="action-btn action-btn--review"
                title="标记复习"
                @click="markReviewed(word.id)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
              </button>
              <button
                class="action-btn action-btn--delete"
                title="删除"
                @click="handleDelete(word.id, $event)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.vocabulary-notebook {
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
  color: #11998e;
}

.page-subtitle {
  font-size: 1rem;
  color: var(--c-text-lighter);
  margin: 0;
}

/* 统计行 */
.stats-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.mini-stat {
  flex: 1;
  min-width: 140px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.mini-stat:hover {
  border-color: transparent;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.mini-stat__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mini-stat__icon svg {
  width: 20px;
  height: 20px;
}

.mini-stat__icon--total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.mini-stat__icon--reviewed {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.mini-stat__icon--new {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.mini-stat__info {
  display: flex;
  flex-direction: column;
}

.mini-stat__value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--c-text);
  line-height: 1.2;
}

.mini-stat__label {
  font-size: 0.8rem;
  color: var(--c-text-lighter);
}

/* 工具栏 */
.notebook-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.toolbar-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

/* 搜索框 */
.search-box {
  flex: 1;
  min-width: 200px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 1rem;
  width: 18px;
  height: 18px;
  color: var(--c-text-lighter);
  pointer-events: none;
}

.search-icon svg {
  width: 100%;
  height: 100%;
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 2.75rem;
  border: 2px solid var(--c-border);
  border-radius: 10px;
  font-size: 0.9rem;
  background: var(--c-bg);
  color: var(--c-text);
  transition: all 0.2s ease;
}

.search-input::placeholder {
  color: var(--c-text-lighter);
}

.search-input:focus {
  outline: none;
  border-color: #11998e;
  box-shadow: 0 0 0 4px rgba(17, 153, 142, 0.1);
}

.search-clear {
  position: absolute;
  right: 0.75rem;
  width: 18px;
  height: 18px;
  color: var(--c-text-lighter);
  cursor: pointer;
  transition: color 0.2s ease;
}

.search-clear:hover {
  color: var(--c-text);
}

.search-clear svg {
  width: 100%;
  height: 100%;
}

/* 排序选择器 */
.sort-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.sort-icon {
  position: absolute;
  left: 0.75rem;
  width: 16px;
  height: 16px;
  color: var(--c-text-lighter);
  pointer-events: none;
}

.sort-select {
  padding: 0.75rem 1rem 0.75rem 2.25rem;
  border: 2px solid var(--c-border);
  border-radius: 10px;
  font-size: 0.9rem;
  background: var(--c-bg);
  color: var(--c-text);
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  padding-right: 2rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
}

.sort-select:focus {
  outline: none;
  border-color: #11998e;
}

/* 导出按钮 */
.export-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.export-btn svg {
  width: 16px;
  height: 16px;
}

.export-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 过滤提示 */
.filter-hint {
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: var(--c-text-lighter);
  padding-left: 0.25rem;
}

.filter-hint strong {
  color: var(--c-text);
  font-weight: 600;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-state__icon {
  width: 80px;
  height: 80px;
  margin-bottom: 1.5rem;
  color: var(--c-text-lighter);
  opacity: 0.5;
}

.empty-state__icon svg {
  width: 100%;
  height: 100%;
}

.empty-state__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--c-text);
  margin: 0 0 0.5rem;
}

.empty-state__text {
  font-size: 0.95rem;
  color: var(--c-text-lighter);
  margin: 0 0 1.5rem;
}

.empty-state__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.empty-state__btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4);
}

.empty-state__btn svg {
  width: 16px;
  height: 16px;
}

/* 单词列表 */
.word-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
}

/* 单词卡片 */
.word-card {
  position: relative;
  display: flex;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.word-card:hover {
  border-color: transparent;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.word-card__indicator {
  width: 4px;
  background: linear-gradient(180deg, #f093fb 0%, #f5576c 100%);
  flex-shrink: 0;
}

.word-card__indicator--reviewed {
  background: linear-gradient(180deg, #11998e 0%, #38ef7d 100%);
}

.word-card__content {
  flex: 1;
  padding: 1rem 1.25rem;
  min-width: 0;
}

.word-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.word-card__word {
  font-size: 1.25rem;
  font-weight: 700;
  color: #11998e;
}

.word-card__badges {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.review-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(17, 153, 142, 0.1);
  color: #11998e;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.review-badge svg {
  width: 12px;
  height: 12px;
}

.new-badge {
  padding: 0.25rem 0.5rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.word-card__meaning {
  font-size: 0.95rem;
  color: var(--c-text);
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.word-card__context {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--c-bg-light);
  border-radius: 8px;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  color: var(--c-text-lighter);
  line-height: 1.5;
}

.word-card__context svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 2px;
  opacity: 0.6;
}

.word-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.word-card__meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--c-text-lighter);
}

.meta-item svg {
  width: 14px;
  height: 14px;
}

.word-card__actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.2s ease;
}

.word-card:hover .word-card__actions {
  opacity: 1;
  transform: translateX(0);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--c-bg-light);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--c-text-lighter);
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

.action-btn--link:hover {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.action-btn--review:hover {
  background: rgba(17, 153, 142, 0.1);
  color: #11998e;
}

.action-btn--delete:hover {
  background: rgba(245, 87, 108, 0.1);
  color: #f5576c;
}

/* 高亮动画 */
@keyframes word-focus-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(17, 153, 142, 0.4);
  }
  100% {
    box-shadow: 0 0 0 12px rgba(17, 153, 142, 0);
  }
}

.word-card.focus-highlight {
  border-color: #11998e;
  box-shadow: 0 4px 20px rgba(17, 153, 142, 0.2);
  animation: word-focus-pulse 1.5s ease;
}

/* 列表动画 */
.word-list-enter-active {
  transition: all 0.3s ease;
  transition-delay: var(--delay, 0s);
}

.word-list-leave-active {
  transition: opacity 0.25s ease;
  position: absolute;
  left: 0;
  right: 0;
}

.word-list-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.word-list-leave-to {
  opacity: 0;
}

.word-list-move {
  transition: none;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 640px) {
  .vocabulary-notebook {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .title-icon {
    width: 28px;
    height: 28px;
  }

  .stats-row {
    flex-direction: column;
  }

  .mini-stat {
    min-width: 100%;
  }

  .notebook-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-actions {
    justify-content: space-between;
  }

  .word-card__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .word-card__actions {
    opacity: 1;
    transform: none;
  }
}
</style>
