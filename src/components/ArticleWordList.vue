<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  getVocabularyByArticle,
  getSentencesByArticle,
  deleteVocabulary,
  deleteSentence,
  updateVocabularyReview,
  updateSentenceReview,
  type VocabularyItem,
  type SentenceItem,
} from '../services/api'
import { useTTS } from '../composables/useTTS'
import { useGlobalToast } from '../composables/useGlobalToast'
import { formatDate } from '../utils/format'
import {
  getContextSentence,
  getMeaningDefinition,
  getMeaningPhonetic,
  getMeaningPos,
} from '../composables/useVocabularyDisplay'
import { splitSentenceExplanation } from '../utils/sentenceExplanation'
import DeleteConfirmModal from './DeleteConfirmModal.vue'
import '../styles/article-wordlist.css'

const props = defineProps<{
  visible: boolean
  articleId: string
  articleTitle: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'deleted', type: 'word' | 'sentence', id: string): void
  (e: 'locate', type: 'word' | 'sentence', id: string): void
}>()

const toast = useGlobalToast()
const { isSpeaking, isLoading, speakingKey, loadingKey, speak } = useTTS()

// Active tab
const activeTab = ref<'words' | 'sentences'>('words')

// Data
const words = ref<VocabularyItem[]>([])
const sentences = ref<SentenceItem[]>([])
const loading = ref(false)

// Sort
const sortBy = ref<'date' | 'alpha' | 'review'>('date')

// Delete
const showDeleteConfirm = ref(false)
const deleteTarget = ref<{ type: 'word' | 'sentence'; id: string } | null>(null)

// Computed
const sortedWords = computed(() => {
  const result = [...words.value]
  switch (sortBy.value) {
    case 'alpha':
      result.sort((a, b) => a.word.localeCompare(b.word))
      break
    case 'review':
      result.sort((a, b) => a.review_count - b.review_count)
      break
    case 'date':
    default:
      result.sort((a, b) => b.created_at - a.created_at)
  }
  return result
})

const sortedSentences = computed(() => {
  return [...sentences.value].sort((a, b) => b.created_at - a.created_at)
})

// 句子结构化解析
const parsedSentences = computed(() => {
  return sortedSentences.value.map(s => ({
    sentence: s,
    parts: splitSentenceExplanation(s.explanation),
  }))
})

// Data loading
async function loadData() {
  if (!props.articleId) return
  loading.value = true
  try {
    const [wordData, sentenceData] = await Promise.all([
      getVocabularyByArticle(props.articleId),
      getSentencesByArticle(props.articleId),
    ])
    words.value = wordData
    sentences.value = sentenceData
  } catch (e) {
    console.error('Failed to load article annotations:', e)
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (val) => {
  if (val) loadData()
})

// TTS helpers
function getWordTtsKey(text: string) {
  return `${text.trim()}__-10%`
}
function getSentenceTtsKey(text: string) {
  return `${text.trim()}__+0%`
}
function isWordSpeaking(text: string) {
  return isSpeaking.value && speakingKey.value === getWordTtsKey(text)
}
function isWordLoading(text: string) {
  return isLoading.value && loadingKey.value === getWordTtsKey(text)
}
function isSentenceSpeaking(text: string) {
  return isSpeaking.value && speakingKey.value === getSentenceTtsKey(text)
}
function isSentenceLoading(text: string) {
  return isLoading.value && loadingKey.value === getSentenceTtsKey(text)
}

// Actions
function handleLocate(type: 'word' | 'sentence', id: string) {
  emit('locate', type, id)
}

async function markReviewed(type: 'word' | 'sentence', id: string) {
  try {
    if (type === 'word') {
      await updateVocabularyReview(id)
      const target = words.value.find(w => w.id === id)
      if (target) {
        target.review_count += 1
        target.last_reviewed_at = Date.now()
      }
    } else {
      await updateSentenceReview(id)
      const target = sentences.value.find(s => s.id === id)
      if (target) {
        target.review_count += 1
        target.last_reviewed_at = Date.now()
      }
    }
  } catch (e) {
    console.error('更新复习状态失败:', e)
  }
}

function handleDelete(type: 'word' | 'sentence', id: string) {
  deleteTarget.value = { type, id }
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const { type, id } = deleteTarget.value
  try {
    if (type === 'word') {
      await deleteVocabulary(id)
      words.value = words.value.filter(w => w.id !== id)
    } else {
      await deleteSentence(id)
      sentences.value = sentences.value.filter(s => s.id !== id)
    }
    emit('deleted', type, id)
    toast.success('已删除')
  } catch (e: any) {
    toast.error('删除失败: ' + e)
  }
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

function handleClose() {
  emit('close')
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.visible) return
  if (e.key === 'Escape') handleClose()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="awl-overlay" @mousedown.self="handleClose">
      <div class="awl-modal">
        <!-- 顶部工具栏 -->
        <div class="awl-toolbar">
          <div class="awl-title">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            {{ articleTitle }}
          </div>
          <div class="awl-tabs">
            <button
              class="awl-tab"
              :class="{ active: activeTab === 'words' }"
              @click="activeTab = 'words'"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              生词 ({{ words.length }})
            </button>
            <button
              class="awl-tab"
              :class="{ active: activeTab === 'sentences' }"
              @click="activeTab = 'sentences'"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="17" y1="10" x2="3" y2="10"/>
                <line x1="21" y1="6" x2="3" y2="6"/>
                <line x1="21" y1="14" x2="3" y2="14"/>
                <line x1="17" y1="18" x2="3" y2="18"/>
              </svg>
              长难句 ({{ sentences.length }})
            </button>
          </div>
          <div class="awl-toolbar-right">
            <select v-if="activeTab === 'words'" v-model="sortBy" class="awl-sort-select">
              <option value="date">按时间</option>
              <option value="alpha">按字母</option>
              <option value="review">按复习</option>
            </select>
            <button class="awl-btn-close" @click="handleClose">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 主内容 -->
        <div class="awl-body">
          <!-- Loading -->
          <div v-if="loading" class="awl-empty">
            <div class="awl-spinner"></div>
            加载中...
          </div>

          <!-- ═══ 生词列表（详细版） ═══ -->
          <template v-else-if="activeTab === 'words'">
            <div v-if="sortedWords.length === 0" class="awl-empty">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              <span>本文暂无标注生词</span>
            </div>
            <div v-else class="awl-list">
              <div
                v-for="word in sortedWords"
                :key="word.id"
                class="awl-card awl-word-card"
              >
                <!-- 左侧指示条 -->
                <div class="awl-indicator" :class="{ 'awl-indicator--reviewed': word.review_count > 0 }"></div>
                <div class="awl-card-body">
                  <!-- 头部：单词 + TTS + 徽章 -->
                  <div class="awl-card-header">
                    <div class="awl-word-row">
                      <span class="awl-word-text" @click="handleLocate('word', word.id)">{{ word.word }}</span>
                      <button
                        class="awl-tts-btn"
                        :class="{ 'awl-tts-active': isWordSpeaking(word.word), 'awl-tts-loading': isWordLoading(word.word) }"
                        @click="speak(word.word, '-10%')"
                        :disabled="isLoading"
                        title="朗读发音"
                      >
                        <svg v-if="!isWordLoading(word.word)" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                        </svg>
                        <svg v-else class="awl-spin-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                        </svg>
                      </button>
                    </div>
                    <div class="awl-badges">
                      <span v-if="word.review_count > 0" class="awl-review-badge">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="9 11 12 14 22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                        {{ word.review_count }}
                      </span>
                      <span v-else class="awl-new-badge">NEW</span>
                    </div>
                  </div>

                  <!-- 释义 + 音标/词性 -->
                  <div class="awl-meaning-block">
                    <div class="awl-meaning-main">{{ getMeaningDefinition(word) }}</div>
                    <div v-if="getMeaningPhonetic(word) || getMeaningPos(word)" class="awl-meaning-meta">
                      <span v-if="getMeaningPhonetic(word)" class="awl-chip awl-chip--phonetic">{{ getMeaningPhonetic(word) }}</span>
                      <span v-if="getMeaningPos(word)" class="awl-chip awl-chip--pos">{{ getMeaningPos(word) }}</span>
                    </div>
                  </div>

                  <!-- 上下文 -->
                  <div v-if="getContextSentence(word)" class="awl-context">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span>{{ getContextSentence(word) }}</span>
                  </div>

                  <!-- 底部操作 -->
                  <div class="awl-card-footer">
                    <span class="awl-card-date">{{ formatDate(word.created_at) }}</span>
                    <div class="awl-card-actions">
                      <button class="awl-action-btn awl-action-review" title="标记复习" @click="markReviewed('word', word.id)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="9 11 12 14 22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                      </button>
                      <button class="awl-action-btn awl-action-locate" title="定位到文中" @click="handleLocate('word', word.id)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="11" cy="11" r="8"/>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                      </button>
                      <button class="awl-action-btn awl-action-delete" title="删除" @click="handleDelete('word', word.id)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- ═══ 长难句列表（详细版） ═══ -->
          <template v-else>
            <div v-if="parsedSentences.length === 0" class="awl-empty">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
                <line x1="17" y1="10" x2="3" y2="10"/>
                <line x1="21" y1="6" x2="3" y2="6"/>
                <line x1="21" y1="14" x2="3" y2="14"/>
                <line x1="17" y1="18" x2="3" y2="18"/>
              </svg>
              <span>本文暂无标注长难句</span>
            </div>
            <div v-else class="awl-list">
              <div
                v-for="item in parsedSentences"
                :key="item.sentence.id"
                class="awl-card awl-sentence-card"
              >
                <div class="awl-indicator" :class="{ 'awl-indicator--reviewed': item.sentence.review_count > 0 }"></div>
                <div class="awl-card-body">
                  <!-- 原句 + TTS -->
                  <div class="awl-sentence-header">
                    <span class="awl-sentence-text" @click="handleLocate('sentence', item.sentence.id)">{{ item.sentence.sentence }}</span>
                    <button
                      class="awl-tts-btn"
                      :class="{ 'awl-tts-active': isSentenceSpeaking(item.sentence.sentence), 'awl-tts-loading': isSentenceLoading(item.sentence.sentence) }"
                      @click="speak(item.sentence.sentence)"
                      :disabled="isLoading"
                      title="朗读句子"
                    >
                      <svg v-if="!isSentenceLoading(item.sentence.sentence)" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                      <svg v-else class="awl-spin-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                    </button>
                  </div>

                  <!-- 结构化解释 -->
                  <div v-if="item.parts.parsedHtml" class="awl-explanation awl-explanation--parsed">
                    <div class="awl-explanation-label"> 成分划分</div>
                    <div class="awl-explanation-text awl-parsed-html" v-html="item.parts.parsedHtml"></div>
                  </div>

                  <div
                    v-if="item.parts.translation || (!item.parts.parsedHtml && item.parts.raw)"
                    class="awl-explanation awl-explanation--translation"
                  >
                    <div class="awl-explanation-label">释义</div>
                    <div class="awl-explanation-text">{{ item.parts.translation || item.parts.raw }}</div>
                  </div>

                  <!-- 底部操作 -->
                  <div class="awl-card-footer">
                    <div class="awl-card-footer-left">
                      <span class="awl-card-date">{{ formatDate(item.sentence.created_at) }}</span>
                      <span class="awl-card-review">复习 {{ item.sentence.review_count }} 次</span>
                    </div>
                    <div class="awl-card-actions">
                      <button class="awl-action-btn awl-action-review" title="标记复习" @click="markReviewed('sentence', item.sentence.id)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      </button>
                      <button class="awl-action-btn awl-action-locate" title="定位到文中" @click="handleLocate('sentence', item.sentence.id)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="11" cy="11" r="8"/>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                      </button>
                      <button class="awl-action-btn awl-action-delete" title="删除" @click="handleDelete('sentence', item.sentence.id)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- 底部状态栏 -->
        <div class="awl-statusbar">
          <span>{{ words.length }} 个生词</span>
          <span class="awl-status-sep">·</span>
          <span>{{ sentences.length }} 个长难句</span>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 删除确认 -->
  <DeleteConfirmModal
    :visible="showDeleteConfirm"
    :title="deleteTarget?.type === 'word' ? '删除生词' : '删除长难句'"
    :message="deleteTarget?.type === 'word' ? '确定删除这个生词吗？文章中的高亮也会移除。' : '确定删除这个长难句吗？文章中的高亮也会移除。'"
    @confirm="confirmDelete"
    @cancel="showDeleteConfirm = false"
  />
</template>
