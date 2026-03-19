<script setup lang="ts">
import { computed, onMounted, onActivated, onDeactivated, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getReviewQueue,
  gradeReviewItem,
  previewRatings,
  formatInterval,
  Rating,
  RATING_LABELS,
  type ReviewItem,
} from '../services/reviewScheduler'
import { useTTS } from '../composables/useTTS'
import { splitSentenceExplanation } from '../utils/sentenceExplanation'
import { getMeaningDefinition } from '../composables/useVocabularyDisplay'
import type { VocabularyItem } from '../services/api'

const router = useRouter()
const { speak, stop: stopTTS } = useTTS()

// ── 状态 ────────────────────────────────────────────────
const queue = ref<ReviewItem[]>([])
const currentIndex = ref(0)
const isFlipped = ref(false)
const isLoading = ref(true)
const isGrading = ref(false)
const showStructure = ref(false)
const sessionStats = ref({ total: 0, reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 })

const currentItem = computed(() => queue.value[currentIndex.value] ?? null)

const progress = computed(() => {
  if (sessionStats.value.total === 0) return 0
  return Math.round((sessionStats.value.reviewed / sessionStats.value.total) * 100)
})

const ratingPreviews = computed(() => {
  if (!currentItem.value) return null
  return previewRatings(currentItem.value)
})

const isComplete = computed(() => currentIndex.value >= queue.value.length && queue.value.length > 0)

// ── 方法 ────────────────────────────────────────────────
async function loadQueue() {
  isLoading.value = true
  try {
    queue.value = await getReviewQueue()
    currentIndex.value = 0
    isFlipped.value = false
    sessionStats.value = {
      total: queue.value.length,
      reviewed: 0, again: 0, hard: 0, good: 0, easy: 0,
    }
  } finally {
    isLoading.value = false
  }
}

function flipCard() {
  isFlipped.value = true
  showStructure.value = false
  // 自动朗读正面（单词/句子）
  if (currentItem.value) {
    speak(currentItem.value.front, '-10%')
  }
}

function toggleStructure() {
  showStructure.value = !showStructure.value
}

async function grade(rating: Rating) {
  if (!currentItem.value || isGrading.value) return
  isGrading.value = true
  stopTTS() // 切卡时立即停止朗读

  try {
    await gradeReviewItem(currentItem.value, rating)

    // 更新统计
    sessionStats.value.reviewed++
    if (rating === Rating.Again) sessionStats.value.again++
    else if (rating === Rating.Hard) sessionStats.value.hard++
    else if (rating === Rating.Good) sessionStats.value.good++
    else if (rating === Rating.Easy) sessionStats.value.easy++

    // 下一张
    currentIndex.value++
    isFlipped.value = false
    showStructure.value = false
  } finally {
    isGrading.value = false
  }
}

function getBackContent(item: ReviewItem) {
  if (item.type === 'vocabulary') {
    return getMeaningDefinition(item.raw as VocabularyItem)
  }
  // 句子：解析结构化解释
  const parsed = splitSentenceExplanation(item.back)
  return parsed.translation || item.back
}

function getStructureNote(item: ReviewItem) {
  if (item.type !== 'sentence') return null
  const parsed = splitSentenceExplanation(item.back)
  return parsed.structureNote || null
}

function getParsedHtml(item: ReviewItem) {
  if (item.type !== 'sentence') return null
  const parsed = splitSentenceExplanation(item.back)
  return parsed.parsedHtml || null
}

function hasSentenceDetail(item: ReviewItem) {
  return !!(getStructureNote(item) || getParsedHtml(item))
}

function handleKeydown(e: KeyboardEvent) {
  if (isComplete.value) return

  if (!isFlipped.value) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      flipCard()
    }
    return
  }

  // S 键切换结构分析
  if (e.key === 's' || e.key === 'S') {
    if (currentItem.value?.type === 'sentence' && hasSentenceDetail(currentItem.value)) {
      e.preventDefault()
      toggleStructure()
      return
    }
  }

  // 评分快捷键
  const keyMap: Record<string, Rating> = {
    '1': Rating.Again,
    '2': Rating.Hard,
    '3': Rating.Good,
    '4': Rating.Easy,
  }
  if (keyMap[e.key]) {
    e.preventDefault()
    grade(keyMap[e.key])
  }
}

onMounted(() => {
  loadQueue()
})

// KeepAlive: 切入时重新加载队列 + 绑定快捷键，切出时解绑
onActivated(() => {
  loadQueue()
  window.addEventListener('keydown', handleKeydown)
})

onDeactivated(() => {
  stopTTS() // 离开复习页时停止朗读
  window.removeEventListener('keydown', handleKeydown)
})

const ratingColors = {
  [Rating.Again]: '#ef4444',
  [Rating.Hard]: '#f59e0b',
  [Rating.Good]: '#22c55e',
  [Rating.Easy]: '#3b82f6',
} as Record<number, string>
</script>

<template>
  <div class="review-page">
    <!-- 顶部导航栏 -->
    <header class="review-header">
      <button class="review-back-btn" @click="router.push('/')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span>返回</span>
      </button>

      <div class="review-progress-section">
        <div class="review-progress-bar">
          <div class="review-progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <span class="review-progress-text">{{ sessionStats.reviewed }} / {{ sessionStats.total }}</span>
      </div>
    </header>

    <!-- 加载中 -->
    <div v-if="isLoading" class="review-loading">
      <div class="review-loading-spinner"></div>
      <p>正在加载复习队列…</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="queue.length === 0" class="review-empty">
      <div class="review-empty-icon">🎉</div>
      <h2>太棒了！</h2>
      <p>目前没有待复习的内容</p>
      <p class="review-empty-hint">新添加的单词和句子将自动加入复习队列</p>
      <button class="review-empty-btn" @click="router.push('/')">返回首页</button>
    </div>

    <!-- 完成状态 -->
    <div v-else-if="isComplete" class="review-complete">
      <div class="review-complete-icon">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#34C759" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/>
        </svg>
      </div>
      <h2>复习完成！</h2>
      <div class="review-complete-stats">
        <div class="review-stat-row">
          <span class="review-stat-label">总计复习</span>
          <span class="review-stat-value">{{ sessionStats.reviewed }} 项</span>
        </div>
        <div class="review-stat-row" v-if="sessionStats.easy > 0">
          <span class="review-stat-dot" style="background: #3b82f6"></span>
          <span>简单</span>
          <span class="review-stat-value">{{ sessionStats.easy }}</span>
        </div>
        <div class="review-stat-row" v-if="sessionStats.good > 0">
          <span class="review-stat-dot" style="background: #22c55e"></span>
          <span>记住了</span>
          <span class="review-stat-value">{{ sessionStats.good }}</span>
        </div>
        <div class="review-stat-row" v-if="sessionStats.hard > 0">
          <span class="review-stat-dot" style="background: #f59e0b"></span>
          <span>困难</span>
          <span class="review-stat-value">{{ sessionStats.hard }}</span>
        </div>
        <div class="review-stat-row" v-if="sessionStats.again > 0">
          <span class="review-stat-dot" style="background: #ef4444"></span>
          <span>忘了</span>
          <span class="review-stat-value">{{ sessionStats.again }}</span>
        </div>
      </div>
      <div class="review-complete-actions">
        <button class="review-action-btn review-action-btn--primary" @click="loadQueue()">继续复习</button>
        <button class="review-action-btn" @click="router.push('/')">返回首页</button>
      </div>
    </div>

    <!-- 闪卡主体 -->
    <div v-else class="review-card-area">
      <!-- 卡片类型标签 -->
      <div class="review-card-badge">
        <span v-if="currentItem?.type === 'vocabulary'" class="badge badge--word">单词</span>
        <span v-else class="badge badge--sentence">句子</span>
        <span class="review-card-index">#{{ currentIndex + 1 }}</span>
      </div>

      <!-- 闪卡 -->
      <div
        class="flashcard"
        :class="{ flipped: isFlipped }"
        @click="!isFlipped && flipCard()"
      >
        <!-- 正面 -->
        <div class="flashcard-face flashcard-front">
          <div class="flashcard-content">
            <p class="flashcard-main-text" :class="{ 'flashcard-main-text--sentence': currentItem?.type === 'sentence' }">
              {{ currentItem?.front }}
            </p>
            <p v-if="currentItem?.context && currentItem.type === 'vocabulary'" class="flashcard-context">
              "{{ currentItem.context }}"
            </p>
            <!-- 句子理解提示 -->
            <p v-if="currentItem?.type === 'sentence'" class="flashcard-sentence-prompt">
              💡 尝试理解这句话的含义和结构
            </p>
          </div>
          <p class="flashcard-hint">点击翻转 · 按空格键</p>
        </div>

        <!-- 背面 -->
        <div class="flashcard-face flashcard-back">
          <div class="flashcard-content">
            <!-- 原文（小号重复） -->
            <p class="flashcard-repeat-front" :class="{ 'flashcard-repeat-front--sentence': currentItem?.type === 'sentence' }">
              {{ currentItem?.front }}
            </p>

            <div class="flashcard-divider"></div>

            <!-- 释义/翻译 -->
            <p class="flashcard-meaning">{{ currentItem ? getBackContent(currentItem) : '' }}</p>

            <!-- 上下文（单词独有） -->
            <p v-if="currentItem?.context && currentItem.type === 'vocabulary'" class="flashcard-context flashcard-context--back">
              "{{ currentItem.context }}"
            </p>

            <!-- 句子渐进展开区域 -->
            <div v-if="currentItem && currentItem.type === 'sentence' && hasSentenceDetail(currentItem)" class="flashcard-detail-section">
              <button class="flashcard-detail-toggle" @click.stop="toggleStructure">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path v-if="!showStructure" d="M9 18l6-6-6-6" />
                  <path v-else d="M18 15l-6-6-6 6" />
                </svg>
                {{ showStructure ? '收起结构分析' : '展开结构分析' }}
                <span class="flashcard-detail-key">S</span>
              </button>
              <transition name="slide-down">
                <div v-if="showStructure" class="flashcard-detail-body">
                  <!-- 成分划分（彩色 HTML） -->
                  <div v-if="getParsedHtml(currentItem)" class="flashcard-parsed-html" v-html="getParsedHtml(currentItem)"></div>
                  <!-- 成分分析 -->
                  <p v-if="getStructureNote(currentItem)" class="flashcard-structure">
                    {{ getStructureNote(currentItem) }}
                  </p>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </div>

      <!-- 评分按钮（翻转后显示） -->
      <transition name="fade-up">
        <div v-if="isFlipped" class="rating-buttons">
          <button
            v-for="r in [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]"
            :key="r"
            class="rating-btn"
            :style="{ '--btn-color': ratingColors[r] }"
            :disabled="isGrading"
            @click="grade(r)"
          >
            <span class="rating-btn-label">{{ RATING_LABELS[r] }}</span>
            <span class="rating-btn-interval">
              {{ ratingPreviews ? formatInterval(ratingPreviews[r].intervalDays) : '' }}
            </span>
            <span class="rating-btn-key">{{ [1, 2, 3, 4][[Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].indexOf(r)] }}</span>
          </button>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
/* ── 页面布局 ────────────────────────────────────────── */
.review-page {
  min-height: 100vh;
  background: var(--c-bg-lighter);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 24px 48px;
}

/* ── 顶部导航 ────────────────────────────────────────── */
.review-header {
  width: 100%;
  max-width: 720px;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 0 12px;
}

.review-back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--c-text-lighter);
  font-size: 14px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s;
  white-space: nowrap;
}
.review-back-btn svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}
.review-back-btn:hover {
  background: var(--c-border-light, #f1f5f9);
  color: var(--c-text);
}

.review-progress-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.review-progress-bar {
  flex: 1;
  height: 6px;
  background: var(--c-border);
  border-radius: 3px;
  overflow: hidden;
}
.review-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.review-progress-text {
  font-size: 13px;
  color: var(--c-text-lighter);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── 加载 ────────────────────────────────────────────── */
.review-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--c-text-lighter);
}
.review-loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--c-border);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── 空状态 / 完成状态 ──────────────────────────────── */
.review-empty,
.review-complete {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
}
.review-empty-icon,
.review-complete-icon {
  font-size: 56px;
  margin-bottom: 8px;
}
.review-empty h2,
.review-complete h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--c-text);
  margin: 0;
}
.review-empty p {
  color: var(--c-text-lighter);
  font-size: 15px;
  margin: 0;
}
.review-empty-hint {
  color: var(--c-text-lighter) !important;
  font-size: 13px !important;
  margin-top: 4px !important;
}
.review-empty-btn {
  margin-top: 24px;
  padding: 10px 28px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.review-empty-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

/* ── 完成统计 ────────────────────────────────────────── */
.review-complete-stats {
  margin-top: 20px;
  background: var(--c-bg-light);
  border-radius: 14px;
  padding: 20px 28px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  min-width: 260px;
}
.review-stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 14px;
  color: var(--c-text-lighter);
}
.review-stat-row:first-child {
  font-weight: 600;
  font-size: 15px;
  color: var(--c-text);
  padding-bottom: 10px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--c-border-light, #f1f5f9);
}
.review-stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.review-stat-value {
  margin-left: auto;
  font-weight: 600;
  color: var(--c-text);
}
.review-stat-label {
  flex: 1;
}

.review-complete-actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
}
.review-action-btn {
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid var(--c-border);
  background: var(--c-bg-light);
  color: var(--c-text);
}
.review-action-btn:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
  background: rgba(0, 122, 255, 0.04);
}
.review-action-btn--primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  border-color: transparent;
}
.review-action-btn--primary:hover {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

/* ── 卡片区域 ────────────────────────────────────────── */
.review-card-area {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 32px;
}

.review-card-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.badge {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.badge--word {
  background: #ede9fe;
  color: #7c3aed;
}
.badge--sentence {
  background: #dbeafe;
  color: #2563eb;
}
.review-card-index {
  font-size: 12px;
  color: var(--c-text-lighter);
}

/* ── 闪卡 ────────────────────────────────────────────── */
.flashcard {
  width: 100%;
  min-height: 320px;
  perspective: 1200px;
  cursor: pointer;
  position: relative;
}

.flashcard-face {
  width: 100%;
  min-height: 320px;
  background: var(--c-bg-light);
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 8px 32px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 36px;
  transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.flashcard-front {
  display: flex;
}
.flashcard-back {
  display: none;
}
.flashcard.flipped .flashcard-front {
  display: none;
}
.flashcard.flipped .flashcard-back {
  display: flex;
  cursor: default;
}

.flashcard-content {
  width: 100%;
  text-align: center;
}

.flashcard-main-text {
  font-size: 32px;
  font-weight: 700;
  color: var(--c-text);
  line-height: 1.3;
  margin: 0;
  word-break: break-word;
}
.flashcard-main-text--sentence {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.5;
  text-align: left;
}

.flashcard-context {
  margin-top: 16px;
  font-size: 14px;
  color: var(--c-text-lighter);
  font-style: italic;
  line-height: 1.5;
}
.flashcard-context--back {
  text-align: left;
}

.flashcard-hint {
  margin-top: 24px;
  font-size: 13px;
  color: #c0c9d6;
  animation: pulse-hint 2s ease-in-out infinite;
}
@keyframes pulse-hint {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.flashcard-sentence-prompt {
  margin-top: 20px;
  font-size: 14px;
  color: var(--c-text-lighter);
  padding: 10px 16px;
  background: var(--c-border-light, #f1f5f9);
  border-radius: 8px;
  line-height: 1.5;
}

/* 背面内容 */
.flashcard-repeat-front {
  font-size: 20px;
  font-weight: 600;
  color: #6366f1;
  margin: 0 0 12px;
}
.flashcard-repeat-front--sentence {
  font-size: 16px;
  text-align: left;
  line-height: 1.5;
}

.flashcard-divider {
  width: 48px;
  height: 2px;
  background: linear-gradient(90deg, #6366f1, #a78bfa);
  border-radius: 1px;
  margin: 0 auto 16px;
}

.flashcard-meaning {
  font-size: 18px;
  color: var(--c-text);
  line-height: 1.6;
  margin: 0;
  text-align: left;
}

.flashcard-structure {
  margin-top: 12px;
  padding: 12px 16px;
  background: var(--c-bg-lighter);
  border-radius: 10px;
  font-size: 13px;
  color: var(--c-text-lighter);
  line-height: 1.6;
  text-align: left;
}

/* ── 句子渐进展开 ── */
.flashcard-detail-section {
  margin-top: 16px;
  width: 100%;
}

.flashcard-detail-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 14px;
  background: #f0f4ff;
  border: 1px solid #e0e7ff;
  border-radius: 10px;
  color: #6366f1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.flashcard-detail-toggle svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.flashcard-detail-toggle:hover {
  background: #e0e7ff;
}

.flashcard-detail-key {
  margin-left: auto;
  padding: 2px 6px;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #6366f1;
}

.flashcard-detail-body {
  margin-top: 12px;
}

.flashcard-parsed-html {
  padding: 12px 16px;
  background: #fefce8;
  border: 1px solid #fef08a;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.8;
  text-align: left;
  color: var(--c-text);
  margin-bottom: 8px;
}

/* slide-down 过渡 */
.slide-down-enter-active {
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}
.slide-down-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.slide-down-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateY(-8px);
}
.slide-down-enter-to {
  opacity: 1;
  max-height: 500px;
  transform: translateY(0);
}
.slide-down-leave-from {
  opacity: 1;
  max-height: 500px;
}
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
}

/* ── 评分按钮 ────────────────────────────────────────── */
.rating-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  width: 100%;
  margin-top: 24px;
}

.rating-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px 10px;
  background: var(--c-bg-light);
  border: 2px solid var(--c-border);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.rating-btn:hover {
  border-color: var(--btn-color);
  background: color-mix(in srgb, var(--btn-color) 6%, #fff);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--btn-color) 20%, transparent);
}
.rating-btn:active {
  transform: translateY(0);
}
.rating-btn:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.rating-btn-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--btn-color);
}
.rating-btn-interval {
  font-size: 12px;
  color: var(--c-text-lighter);
}
.rating-btn-key {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 10px;
  color: var(--c-border);
  font-weight: 500;
}

/* ── 过渡动画 ────────────────────────────────────────── */
.fade-up-enter-active {
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.fade-up-leave-active {
  transition: all 0.2s ease;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
/* ── 句子复习专用样式 ──────────────────────────────────── */
.flashcard-sentence-prompt {
  font-size: 13px;
  color: var(--c-text-lighter);
  margin-top: 16px;
  font-style: italic;
}

.flashcard-detail-section {
  margin-top: 16px;
}

.flashcard-detail-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-lighter);
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.flashcard-detail-toggle:hover {
  color: #6366f1;
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.3);
}
.flashcard-detail-toggle svg {
  width: 14px;
  height: 14px;
}

.flashcard-detail-key {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 700;
  color: var(--c-text-lighter);
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 4px;
  font-family: var(--font-mono);
}

.flashcard-detail-body {
  margin-top: 12px;
  border-radius: 12px;
  overflow: hidden;
}

.flashcard-parsed-html {
  padding: 14px 18px;
  font-size: 15px;
  line-height: 2.2;
  color: var(--c-text);
  word-break: break-word;
  font-family: var(--font-serif);
  background: linear-gradient(135deg, #faf5ff 0%, var(--c-bg-lighter) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.12);
}

.flashcard-structure {
  margin-top: 10px;
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--c-text-lighter);
  font-style: italic;
  background: #fefce8;
  border-radius: 10px;
  border: 1px solid rgba(234, 179, 8, 0.15);
}

/* ── slide-down 过渡 ──────────────────────────────────── */
.slide-down-enter-active {
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}
.slide-down-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.slide-down-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateY(-8px);
}
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
}

</style>

<!-- non-scoped: ps-* color classes for v-html -->
<style>
@import '../styles/parsed-sentence.css';
</style>
