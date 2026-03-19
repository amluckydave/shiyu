<script setup lang="ts">
import { computed, onMounted, onActivated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  deleteVocabulary,
  getVocabularyGrouped,
  updateVocabularyReview,
  type VocabularyGrouped,
  type VocabularyItem,
} from '../services/api'
import { useHighlightNavigation } from '../composables/useHighlightNavigation'
import { useAppStore } from '../stores/appStore'
import { useGlobalToast } from '../composables/useGlobalToast'
import { useTTS } from '../composables/useTTS'
import { formatDate } from '../utils/format'
import { getMeaningDefinition } from '../composables/useVocabularyDisplay'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'
import '../styles/vocabulary-view.css'

const route = useRoute()
const toast = useGlobalToast()
const router = useRouter()
const appStore = useAppStore()
const { isSpeaking, isLoading, speakingKey, loadingKey, speak } = useTTS()

// ── Data ──
const grouped = ref<VocabularyGrouped[]>([])
const loading = ref(true)
const searchQuery = ref('')
const showDeleteConfirm = ref(false)
const deleteTargetId = ref<string | null>(null)
const sortBy = ref<'date' | 'alpha' | 'review'>('date')
const expandedWords = ref<Set<string>>(new Set())

let isDeleting = false

// ── TTS helpers ──
function getWordTtsKey(text: string) {
  return `${text.trim()}__-10%`
}
function isWordSpeaking(text: string) {
  return isSpeaking.value && speakingKey.value === getWordTtsKey(text)
}
function isWordLoading(text: string) {
  return isLoading.value && loadingKey.value === getWordTtsKey(text)
}

// ── Computed ──
const totalWords = computed(() => grouped.value.reduce((sum, g) => sum + g.entries.length, 0))
const totalReviewed = computed(() => grouped.value.reduce(
  (sum, g) => sum + g.entries.filter(e => e.review_count > 0).length, 0
))
const totalNew = computed(() => totalWords.value - totalReviewed.value)

const filteredGrouped = computed(() => {
  let result = [...grouped.value]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((g) =>
      g.word.toLowerCase().includes(query) ||
      g.entries.some(
        (e) =>
          e.meaning.toLowerCase().includes(query) ||
          (e.context && e.context.toLowerCase().includes(query))
      )
    )
  }

  switch (sortBy.value) {
    case 'alpha':
      result.sort((a, b) => a.word.localeCompare(b.word))
      break
    case 'review':
      result.sort((a, b) => a.total_review_count - b.total_review_count)
      break
    case 'date':
    default:
      // 默认按最新时间排序（API 已排好）
      break
  }

  return result
})

// 高亮导航使用 composable
const {
  handleQueryHighlight,
  initHighlight,
  resetHighlight,
} = useHighlightNavigation(
  { dataAttr: 'word-id', expectedType: 'word', label: 'Vocabulary' },
  loading
)

// ── Actions ──
async function loadVocabulary() {
  loading.value = true
  try {
    grouped.value = await getVocabularyGrouped()
    // 也刷新 appStore 保持一致
    await appStore.fetchVocabulary(true)
  } catch (e) {
    console.error('加载生词失败:', e)
  } finally {
    loading.value = false
  }
}

function toggleExpand(word: string) {
  const s = new Set(expandedWords.value)
  if (s.has(word)) {
    s.delete(word)
  } else {
    s.add(word)
  }
  expandedWords.value = s
}

function isExpanded(word: string) {
  return expandedWords.value.has(word)
}

async function markReviewed(id: string) {
  try {
    await updateVocabularyReview(id)
    // 更新本地数据
    for (const g of grouped.value) {
      const entry = g.entries.find((e) => e.id === id)
      if (entry) {
        entry.review_count += 1
        entry.last_reviewed_at = Date.now()
        g.total_review_count += 1
        break
      }
    }
  } catch (e) {
    console.error('更新复习状态失败:', e)
  }
}

function handleDelete(id: string, event: Event) {
  event.stopPropagation()
  event.preventDefault()
  if (isDeleting) return
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deleteTargetId.value) return
  isDeleting = true
  try {
    await deleteVocabulary(deleteTargetId.value)
    // 从分组中移除
    const deletedId = deleteTargetId.value
    for (let i = 0; i < grouped.value.length; i++) {
      const g = grouped.value[i]
      const idx = g.entries.findIndex((e) => e.id === deletedId)
      if (idx !== -1) {
        g.entries.splice(idx, 1)
        g.article_count = new Set(
          g.entries.filter((e) => e.article_path).map((e) => e.article_path)
        ).size
        // 如果该组已空，移除整个组
        if (g.entries.length === 0) {
          grouped.value.splice(i, 1)
        }
        break
      }
    }
    // 同步 appStore
    appStore.removeVocabularyItem(deleteTargetId.value)
  } catch (e) {
    console.error('删除生词失败:', e)
  } finally {
    showDeleteConfirm.value = false
    deleteTargetId.value = null
    setTimeout(() => { isDeleting = false }, 300)
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}




// 跳转到文章
async function goToArticle(entry: VocabularyItem) {
  if (!entry.article_path) {
    toast.warning('该单词未关联文章，无法跳转')
    return
  }

  try {
    const articles = await appStore.fetchArticles()
    const article = articles.find((item) => item.id === entry.article_path)
    if (article) {
      void router.push({
        path: '/articles',
        query: { articleId: article.id, highlight: entry.id, type: 'word' },
      })
      return
    }

  } catch (_e) { /* ignore */ }
  toast.warning('未找到关联原文')
}

// 获取文章标题（用于显示）
function getArticleTitle(articlePath: string | undefined): string {
  if (!articlePath) return '未知来源'
  const article = appStore.articles.find((a) => a.id === articlePath)
  if (article) return article.title

  return articlePath.length > 20 ? articlePath.substring(0, 20) + '...' : articlePath
}

onMounted(async () => {
  // 预加载文章列表以解析标题
  appStore.fetchArticles()
  await loadVocabulary()
  initHighlight()
})

// KeepAlive: 切回生词本时刷新数据
onActivated(() => {
  loadVocabulary()
})

watch(filteredGrouped, () => {
  handleQueryHighlight()
})

watch(
  () => route.fullPath,
  () => {
    resetHighlight()
  }
)
</script>

<template>
  <div class="vocabulary-notebook">
    <div class="page-header">
      <h1 class="page-title">
        <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          <path d="M9 7h6"/><path d="M9 11h4"/>
        </svg>
        生词本
      </h1>
      <p class="page-subtitle">聚合所有文章的标注生词，点击展开查看各来源</p>
    </div>

    <div class="stats-row">
      <div class="mini-stat">
        <div class="mini-stat__icon mini-stat__icon--total">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <div class="mini-stat__info">
          <span class="mini-stat__value">{{ filteredGrouped.length }}</span>
          <span class="mini-stat__label">唯一单词</span>
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
          <span class="mini-stat__value">{{ totalReviewed }}</span>
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
          <span class="mini-stat__value">{{ totalNew }}</span>
          <span class="mini-stat__label">待复习</span>
        </div>
      </div>
    </div>

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
          placeholder="搜索单词、释义或上下文..."
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
      </div>
    </div>

    <div class="filter-hint" v-if="searchQuery">
      找到 <strong>{{ filteredGrouped.length }}</strong> 个匹配单词
    </div>

    <Transition name="fade">
      <div v-if="!loading && filteredGrouped.length === 0" class="empty-state">
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

    <!-- 聚合分组列表（精简版：便于检索与复习） -->
    <TransitionGroup name="word-list" tag="div" class="word-list" v-if="filteredGrouped.length > 0">
      <div
        v-for="(group, index) in filteredGrouped"
        :key="group.word"
        class="word-card grouped-card"
        :data-word-id="group.entries[0]?.id"
        :style="{ '--delay': index * 0.03 + 's' }"
      >
        <!-- 精简卡片：单词 + 徽章（释义隐藏，点击展开） -->
        <div class="grouped-header" @click="toggleExpand(group.word)">
          <div class="word-card__indicator" :class="{ 'word-card__indicator--reviewed': group.total_review_count > 0 }"></div>
          <div class="grouped-header__main">
            <div class="word-card__word-row">
              <div class="word-card__word">{{ group.word }}</div>
              <button
                class="tts-btn"
                :class="{ 'tts-btn--active': isWordSpeaking(group.word), 'tts-btn--loading': isWordLoading(group.word) }"
                title="朗读发音"
                @click.stop="speak(group.word, '-10%')"
                :disabled="isLoading"
              >
                <svg v-if="!isWordLoading(group.word)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
                <svg v-else class="tts-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="grouped-header__right">
            <span v-if="group.article_count > 0" class="article-count-badge" :title="`出现在 ${group.article_count} 篇文章`">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {{ group.article_count }}
            </span>
            <span v-if="group.total_review_count > 0" class="review-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              {{ group.total_review_count }}
            </span>
            <span v-else class="new-badge">NEW</span>
            <svg class="expand-chevron" :class="{ expanded: isExpanded(group.word) }" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <!-- 展开：释义 + 文章来源列表 -->
        <Transition name="expand">
          <div v-if="isExpanded(group.word)" class="grouped-entries">
            <div class="grouped-definition">{{ getMeaningDefinition(group.entries[0]) }}</div>
            <div
              v-for="entry in group.entries"
              :key="entry.id"
              class="grouped-entry"
            >
              <button class="entry-article-link" @click="goToArticle(entry)" :title="getArticleTitle(entry.article_path)">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                {{ getArticleTitle(entry.article_path) }}
              </button>
              <span class="entry-date">{{ formatDate(entry.created_at) }}</span>
              <div class="entry-actions">
                <button class="action-btn action-btn--review" title="标记复习" @click="markReviewed(entry.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                </button>
                <button class="action-btn action-btn--delete" title="删除" @click="handleDelete(entry.id, $event)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </TransitionGroup>

    <DeleteConfirmModal
      :visible="showDeleteConfirm"
      message="确定要删除这个单词吗？此操作无法撤销。"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
