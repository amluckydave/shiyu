<script setup lang="ts">
import { computed, onMounted, onActivated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { splitSentenceExplanation } from '../utils/sentenceExplanation'
import {
  deleteSentence,
  updateSentenceReview,
  type SentenceItem,
} from '../services/api'
import { useTTS } from '../composables/useTTS'
import { useHighlightNavigation } from '../composables/useHighlightNavigation'
import { formatDate } from '../utils/format'
import { useAppStore } from '../stores/appStore'
import { useGlobalToast } from '../composables/useGlobalToast'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'

const { isSpeaking, isLoading, speakingKey, loadingKey, speak } = useTTS()
const toast = useGlobalToast()

const route = useRoute()
const router = useRouter()

const appStore = useAppStore()

const items = computed(() => appStore.sentences)
const loading = ref(true)
const searchQuery = ref('')
const sortBy = ref<'date' | 'review'>('date')

let isDeleting = false
const showDeleteConfirm = ref(false)
const deleteTargetId = ref<string | null>(null)
const showRulesModal = ref(false)


function getSentenceTtsKey(text: string): string {
  return `${text.trim()}__+0%`
}

function isSentenceLoading(text: string): boolean {
  return isLoading.value && loadingKey.value === getSentenceTtsKey(text)
}

function isSentenceSpeaking(text: string): boolean {
  return isSpeaking.value && speakingKey.value === getSentenceTtsKey(text)
}

const filteredSentences = computed(() => {
  let result = [...items.value]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((s) =>
      s.sentence.toLowerCase().includes(query) ||
      s.explanation.toLowerCase().includes(query)
    )
  }

  switch (sortBy.value) {
    case 'review':
      result.sort((a, b) => a.review_count - b.review_count)
      break
    case 'date':
    default:
      result.sort((a, b) => b.created_at - a.created_at)
  }

  return result
})

const decoratedSentences = computed(() =>
  filteredSentences.value.map((sentence) => ({
    sentence,
    parts: splitSentenceExplanation(sentence.explanation),
  }))
)

// 高亮导航使用 composable
const {
  handleQueryHighlight,
  initHighlight,
  resetHighlight,
} = useHighlightNavigation(
  { dataAttr: 'sentence-id', expectedType: 'sentence', label: 'Sentences' },
  loading
)

async function loadSentences() {
  loading.value = true
  try {
    await appStore.fetchSentences(true)
  } catch (e) {
    console.error('加载长难句失败:', e)
  } finally {
    loading.value = false
  }
}

// formatDate is imported from '../utils/format'

async function markReviewed(id: string) {
  try {
    await updateSentenceReview(id)
    const target = items.value.find((s) => s.id === id)
    if (target) {
      target.review_count += 1
      target.last_reviewed_at = Date.now()
    }
  } catch (e) {
    console.error('更新长难句复习状态失败:', e)
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
    await deleteSentence(deleteTargetId.value)
    appStore.removeSentenceItem(deleteTargetId.value)
  } catch (e) {
    console.error('删除长难句失败:', e)
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

async function resolveSourceRoute(sourcePath: string): Promise<{ path: '/articles'; query: Record<string, string> } | null> {
  const normalized = sourcePath.trim()
  if (!normalized) return null

  try {
    const articles = await appStore.fetchArticles()
    const article = articles.find((item) => item.id === normalized)
    if (article) {
      return { path: '/articles', query: { articleId: article.id } }
    }

  } catch (error) {
    console.error('解析原文来源失败:', error)
  }

  return null
}

async function goToArticle(sentence: SentenceItem) {
  if (!sentence.article_path) {
    toast.warning('该句子未关联文章，无法跳转')
    return
  }

  const target = await resolveSourceRoute(sentence.article_path)
  if (!target) {
    toast.warning('未找到关联原文，可能已删除或来源不受支持')
    return
  }

  void router.push({
    path: target.path,
    query: {
      ...target.query,
      highlight: sentence.id,
      type: 'sentence',
    },
  })
}

// 获取文章标题
function getArticleTitle(articlePath: string | undefined): string {
  if (!articlePath) return ''
  const article = appStore.articles.find((a) => a.id === articlePath)
  if (article) return article.title
  return articlePath.length > 20 ? articlePath.substring(0, 20) + '...' : articlePath
}

onMounted(async () => {
  // 预加载文章列表以解析标题
  appStore.fetchArticles()
  await loadSentences()
  initHighlight()
})

// KeepAlive: 切回句库时刷新数据
onActivated(() => {
  loadSentences()
})

watch(filteredSentences, () => {
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
  <div class="sentence-bank">
    <div class="page-header">
      <h1 class="page-title">
        <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 6H3"/><path d="M21 12H8"/><path d="M17 18H3"/>
          <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/>
        </svg>
        长难句库
        <button class="rules-help-btn" title="句子成分标注规则" @click="showRulesModal = true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>
      </h1>
      <p class="page-subtitle">收集和复习阅读中的长难句 · 共 <strong>{{ items.length }}</strong> 个句子</p>
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
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="empty-icon">⏳</div>
      <p>加载中...</p>
    </div>

    <div v-else-if="filteredSentences.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 7c-1.5-2-4-3-7-3v13c3 0 5.5 1 7 3 1.5-2 4-3 7-3V4c-3 0-5.5 1-7 3z"/>
        </svg>
      </div>
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
          <span class="sentence-text">{{ item.sentence.sentence }}</span>
          <button
            class="tts-btn"
            :class="{ 'tts-btn--active': isSentenceSpeaking(item.sentence.sentence), 'tts-btn--loading': isSentenceLoading(item.sentence.sentence) }"
            title="朗读句子"
            @click.stop="speak(item.sentence.sentence)"
            :disabled="isLoading"
          >
            <svg v-if="!isSentenceLoading(item.sentence.sentence)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
            <svg v-else class="tts-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
            </svg>
          </button>
        </div>

        <!-- 成分划分（直接展示） -->
        <div v-if="item.parts.parsedHtml" class="sentence-parsed-inline" v-html="item.parts.parsedHtml"></div>

        <!-- 成分分析 -->
        <div v-if="item.parts.structureNote" class="sentence-note-inline">{{ item.parts.structureNote }}</div>

        <!-- 释义 -->
        <div
          v-if="item.parts.translation || (!item.parts.parsedHtml && item.parts.raw)"
          class="sentence-translation-inline"
        >{{ item.parts.translation || item.parts.raw }}</div>

        <div class="sentence-footer">
          <div class="sentence-footer__left">
            <button
              v-if="item.sentence.article_path"
              class="sentence-source-link"
              @click="goToArticle(item.sentence)"
              :title="'来源：' + getArticleTitle(item.sentence.article_path)"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {{ getArticleTitle(item.sentence.article_path) }}
            </button>
            <span class="sentence-date">{{ formatDate(item.sentence.created_at) }}</span>
            <span class="sentence-review">复习 {{ item.sentence.review_count }} 次</span>
          </div>

          <div class="sentence-actions">
            <button
              v-if="item.sentence.article_path"
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

    <DeleteConfirmModal
      :visible="showDeleteConfirm"
      message="确定要删除这个句子吗？此操作无法撤销。"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />

    <!-- 标注规则弹窗 -->
    <Teleport to="body">
      <Transition name="rules-fade">
        <div v-if="showRulesModal" class="rules-overlay" @click.self="showRulesModal = false">
          <div class="rules-modal">
            <div class="rules-header">
              <h2>句子成分标注规则</h2>
              <button class="rules-close" @click="showRulesModal = false">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="rules-body">
              <!-- 颜色体系 -->
              <div class="rules-section">
                <h3 class="rules-section-title">🎨 颜色体系</h3>

                <div class="rule-card">
                  <div class="rule-badge rule-badge--blue">蓝色粗体</div>
                  <div class="rule-desc">
                    <strong>谓语动词</strong>及其时态和语态。认准谓语是理清句子结构的关键。
                    <div class="rule-example">例：He <span class="ex-blue">has been working</span> on this project.</div>
                  </div>
                </div>

                <div class="rule-card">
                  <div class="rule-badge rule-badge--purple">紫色下划线</div>
                  <div class="rule-desc">
                    <strong>非谓语动词</strong>（不定式、动名词、现在分词、过去分词）。它们在句法层级上介于谓语和普通成分之间。
                    <div class="rule-example">例：<span class="ex-purple">To master</span> English requires <span class="ex-purple">reading</span> extensively.</div>
                  </div>
                </div>

                <div class="rule-card">
                  <div class="rule-badge rule-badge--red">红色</div>
                  <div class="rule-desc">
                    <strong>并列连词</strong>：<span class="ex-red">and, or, but, not only...but also, neither...nor, either...or, both...and, as well as</span> 等。
                    <br/><strong>先行 it</strong>：用作先行词代替后移主语从句、不定式等的 <span class="ex-red">it</span>；用于引导强调句的 <span class="ex-red">it</span> 也用红色<em>斜体</em>标记。
                  </div>
                </div>

                <div class="rule-card">
                  <div class="rule-badge rule-badge--green">绿色</div>
                  <div class="rule-desc">
                    需要特别注意的<strong>句子结构</strong>，分三类：
                    <ul class="rule-list">
                      <li><span class="ex-label">[比较]</span> <span class="ex-green">than, as...as, (not) so/as...as</span></li>
                      <li><span class="ex-label">[结果]</span> <span class="ex-green">so...that, such...that, too...to, too...not to</span></li>
                      <li><span class="ex-label">[倒装]</span> <span class="ex-green">hardly/scarcely/barely...when, no sooner...than</span></li>
                    </ul>
                  </div>
                </div>

                <div class="rule-card">
                  <div class="rule-badge rule-badge--bold">加粗</div>
                  <div class="rule-desc">
                    <strong>句子主要成分</strong>（主语、宾语、表语、宾语补足语等）通过加粗字体标示。
                  </div>
                </div>
              </div>

              <!-- 符号体系 -->
              <div class="rules-section">
                <h3 class="rules-section-title">🔣 符号体系</h3>

                <div class="rule-card">
                  <div class="rule-badge rule-badge--symbol">||</div>
                  <div class="rule-desc">
                    分隔独立分句的<strong>停顿</strong>。用于状语从句、并列句等。表示较大的语义切分。
                    <div class="rule-example">例：[When the sun set] <span class="ex-sym">||</span> he finally returned home.</div>
                  </div>
                </div>

                <div class="rule-card">
                  <div class="rule-badge rule-badge--symbol">|</div>
                  <div class="rule-desc">
                    分隔<strong>主语从句和表语从句</strong>的停顿。这两类从句是「句子级别的名词替换」，位置固定。（强调句型也用此符号）
                    <div class="rule-example">例：<span class="ex-sym">|</span> What he said <span class="ex-sym">|</span> surprised everyone.</div>
                  </div>
                </div>

                <div class="rule-card">
                  <div class="rule-badge rule-badge--symbol">{}</div>
                  <div class="rule-desc">
                    标出<strong>所有宾语从句</strong>。阅读时宜将整个从句当成一个名词来理解。
                    <div class="rule-example">例：He believed <span class="ex-sym">{</span>that she would come<span class="ex-sym">}</span>.</div>
                  </div>
                </div>

                <div class="rule-card">
                  <div class="rule-badge rule-badge--symbol">()</div>
                  <div class="rule-desc">
                    标出<strong>后置定语和同位语</strong>。包括定语从句、后置形容词定语、同位语从句等——它们的共同本质是「修饰/解释前面的名词」。
                    <div class="rule-example">例：The book <span class="ex-sym">(</span>that she recommended<span class="ex-sym">)</span> is excellent.</div>
                  </div>
                </div>

                <div class="rule-card">
                  <div class="rule-badge rule-badge--symbol">[]</div>
                  <div class="rule-desc">
                    标出<strong>状语</strong>。主要标记特殊位置（插入状语、前置状语等）；一般位置的状语（动词前、句首、句末）可省略。
                    <div class="rule-example">例：He, <span class="ex-sym">[</span>without hesitation<span class="ex-sym">]</span>, accepted the offer.</div>
                  </div>
                </div>

                <div class="rule-card">
                  <div class="rule-badge rule-badge--symbol">&lt;&gt;</div>
                  <div class="rule-desc">
                    标出<strong>插入成分</strong>。通常在句中用逗号或破折号隔开。辨认出插入成分有助于排除干扰、理清主干。（逗号隔开的同位语也用此符号）
                    <div class="rule-example">例：The plan, <span class="ex-sym">&lt;</span>I believe<span class="ex-sym">&gt;</span>, will succeed.</div>
                  </div>
                </div>
              </div>

              <!-- 省略与嵌套 -->
              <div class="rules-section">
                <h3 class="rules-section-title">📐 省略与嵌套规则</h3>

                <div class="rule-card rule-card--note">
                  <div class="rule-desc">
                    <ul class="rule-list rule-list--compact">
                      <li><strong>前置定语</strong>（名词前单个形容词等）一般<em>省略</em>标注，避免标记过密</li>
                      <li><strong>一般位置状语</strong>（动词前、句首、句末的短状语）可<em>省略</em>标注</li>
                      <li><strong>特殊位置状语</strong>（插入位置、前置长状语等）<em>必须</em>标注</li>
                      <li><strong>后置定语</strong>多数会标注（副词作后置定语、定语从句等）</li>
                      <li>嵌套超过 <strong>2 层</strong>时，最内层的定语/状语标注可省略，只保留外层结构</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.sentence-bank {
  max-width: 100%;
  padding: 1.5rem 2rem 3rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-top: 1rem;
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 2rem;
  font-weight: 700;
  color: var(--c-text);
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}




.page-subtitle {
  font-size: 1rem;
  color: var(--c-text-lighter);
  margin: 0;
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
  border-color: var(--c-primary);
}

.sort-select {
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider, #ddd);
  border-radius: 8px;
  font-size: 14px;
  background: var(--c-bg-light);
}

.export-btn {
  padding: 10px 16px;
  background: var(--c-primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.export-btn:hover:not(:disabled) {
  background: var(--c-primary-dark);
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
  border-left: 3px solid var(--c-primary);
  transition: background 0.2s;
  backdrop-filter: blur(8px);
}

:root.dark .sentence-card {
  background: rgba(30, 30, 32, 0.85);
}

.sentence-card:hover {
  background: rgba(240, 240, 242, 0.95);
}

@keyframes sentence-focus-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.35);
  }
  100% {
    box-shadow: 0 0 0 12px rgba(0, 122, 255, 0);
  }
}

.sentence-card.focus-highlight {
  outline: 2px solid var(--c-primary);
  outline-offset: 2px;
  animation: sentence-focus-pulse 1.6s ease;
}

.sentence-original {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 15px;
  line-height: 1.6;
  color: var(--vp-c-text-1, #333);
  margin-bottom: 12px;
}

.sentence-text {
  flex: 1;
}

.tts-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 122, 255, 0.08);
  color: var(--c-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  padding: 0;
  margin-top: 1px;
}

.tts-btn svg {
  width: 15px;
  height: 15px;
}

.tts-btn:hover {
  background: rgba(0, 122, 255, 0.18);
  transform: scale(1.1);
}

.tts-btn:active {
  transform: scale(0.95);
}

.tts-btn--active {
  background: var(--c-primary);
  color: #fff;
  animation: tts-pulse 1s ease infinite;
}

@keyframes tts-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.3); }
  50% { box-shadow: 0 0 0 6px rgba(0, 122, 255, 0); }
}

.tts-btn--loading {
  background: rgba(0, 122, 255, 0.2);
  color: #2e7d32;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
  cursor: wait;
}

.tts-spinner {
  animation: tts-spin 1s linear infinite;
}

@keyframes tts-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

.sentence-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-3, #999);
  background: transparent;
  border: 1px solid var(--vp-c-divider, var(--c-border));
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 4px;
}

.sentence-toggle-btn:hover {
  color: #4a90e2;
  border-color: rgba(74, 144, 226, 0.3);
  background: rgba(74, 144, 226, 0.05);
}

.sentence-toggle-btn svg {
  transition: transform 0.2s ease;
}

.sentence-toggle-btn svg.rotated {
  transform: rotate(180deg);
}

.sentence-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: var(--vp-c-text-3, #999);
}

.sentence-footer__left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.sentence-source-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #667eea;
  background: rgba(102, 126, 234, 0.08);
  border: 1px solid rgba(102, 126, 234, 0.15);
  border-radius: 6px;
  padding: 0.15rem 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sentence-source-link:hover {
  background: rgba(102, 126, 234, 0.15);
  color: #818cf8;
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

/* Help icon button */
.rules-help-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--vp-c-divider, var(--c-border));
  border-radius: 50%;
  background: transparent;
  color: var(--vp-c-text-3, #999);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 6px;
  vertical-align: middle;
}
.rules-help-btn:hover {
  color: #4a90e2;
  border-color: rgba(74, 144, 226, 0.4);
  background: rgba(74, 144, 226, 0.06);
}
</style>

<!-- 非 scoped：Teleported rules modal -->
<style>
.rules-overlay {
  position: fixed;
  inset: 0;
  z-index: 10100;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: rules-blur-in 0.2s ease;
}

@keyframes rules-blur-in {
  from {
    opacity: 0;
    backdrop-filter: blur(0);
    -webkit-backdrop-filter: blur(0);
  }
}

.rules-modal {
  width: 640px;
  max-width: 92vw;
  max-height: 85vh;
  background: var(--c-bg-light);
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: card-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform, opacity;
}
:root.dark .rules-modal {
  background: #1e1e20;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
}
@keyframes card-pop {
  from { opacity: 0; transform: scale(0.9) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-bg-lighter);
}
:root.dark .rules-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}
.rules-header h2 {
  font-size: 16px;
  font-weight: 700;
  color: var(--c-text);
  margin: 0;
}
:root.dark .rules-header h2 { color: #e0e0e0; }

.rules-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-lighter);
  cursor: pointer;
  transition: all 0.15s;
}
.rules-close:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.rules-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 24px;
}
.rules-body::-webkit-scrollbar { width: 5px; }
.rules-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 3px; }

.rules-section { margin-bottom: 20px; }
.rules-section:last-child { margin-bottom: 0; }

.rules-section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--c-text);
  margin: 0 0 10px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--c-border-light, #f1f5f9);
}
:root.dark .rules-section-title { color: var(--c-border); border-bottom-color: rgba(255,255,255,0.06); }

.rule-card {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 6px;
  background: var(--c-bg-lighter);
  border: 1px solid var(--c-border-light, #f1f5f9);
  transition: background 0.15s;
}
:root.dark .rule-card {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.04);
}
.rule-card:hover { background: var(--c-border-light, #f1f5f9); }
:root.dark .rule-card:hover { background: rgba(255, 255, 255, 0.04); }

.rule-card--note {
  background: rgba(0, 122, 255, 0.03);
  border-color: rgba(0, 122, 255, 0.1);
}

/* Badges */
.rule-badge {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  margin-top: 1px;
}
.rule-badge--blue { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
.rule-badge--purple { background: rgba(139, 92, 246, 0.12); color: #7c3aed; }
.rule-badge--red { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
.rule-badge--green { background: rgba(16, 185, 129, 0.1); color: #059669; }
.rule-badge--bold { background: rgba(30, 41, 59, 0.08); color: var(--c-text); font-weight: 900; }
:root.dark .rule-badge--bold { background: rgba(255,255,255,0.08); color: #e0e0e0; }
.rule-badge--symbol {
  background: rgba(100, 116, 139, 0.08);
  color: var(--c-text-lighter);
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 1px;
  min-width: 36px;
  text-align: center;
}
:root.dark .rule-badge--symbol { background: rgba(255,255,255,0.06); color: var(--c-text-lighter); }

/* Desc & Examples */
.rule-desc {
  flex: 1;
  font-size: 13px;
  line-height: 1.6;
  color: var(--c-text-lighter);
}
:root.dark .rule-desc { color: var(--c-text-lighter); }

.rule-example {
  margin-top: 6px;
  padding: 5px 8px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  font-size: 12.5px;
  font-style: italic;
  color: var(--c-text-lighter);
  border-left: 2px solid var(--c-border);
}
:root.dark .rule-example { background: rgba(255,255,255,0.02); border-left-color: #374151; color: var(--c-text-lighter); }

/* Inline colored spans */
.ex-blue { color: #2563eb; font-weight: 700; }
.ex-purple { color: #7c3aed; text-decoration: underline; text-decoration-style: wavy; text-underline-offset: 3px; }
.ex-red { color: #dc2626; font-weight: 600; }
.ex-green { color: #059669; font-weight: 600; }
.ex-sym { color: #e07b39; font-weight: 800; font-family: var(--font-mono); }
.ex-label {
  display: inline-block;
  padding: 0 5px;
  background: rgba(16, 185, 129, 0.08);
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
  color: #059669;
  font-style: normal;
}

.rule-list {
  margin: 6px 0 0 0;
  padding-left: 16px;
}
.rule-list li { margin-bottom: 3px; }

.rule-list--compact {
  padding-left: 18px;
}
.rule-list--compact li {
  margin-bottom: 5px;
  line-height: 1.55;
}

/* Transition */
.rules-fade-enter-active { transition: opacity 0.2s ease; }
.rules-fade-leave-active { transition: opacity 0.15s ease; }
.rules-fade-enter-from,
.rules-fade-leave-to { opacity: 0; }

</style>

<!-- non-scoped: ps-* color classes for v-html -->
<style>
.ps-predicate { color: #2563eb; font-weight: 700; }
.ps-nonfinite { color: #7c3aed; text-decoration: underline; text-decoration-style: wavy; text-underline-offset: 3px; }
.ps-connector { color: #dc2626; font-weight: 600; }
.ps-italic { font-style: italic; }
.ps-main { font-weight: 700; }
.ps-structure { color: #059669; font-weight: 600; }
.ps-symbol { color: #e07b39; font-weight: 800; font-family: var(--font-mono); }
.parsed-html-content { line-height: 2.2; font-family: var(--font-serif); }
.sentence-parsed-box { background: linear-gradient(135deg, #faf5ff 0%, var(--c-bg-lighter) 100%); }
.sentence-parsed-inline {
  padding: 12px 16px;
  font-size: 15px;
  line-height: 2.2;
  color: var(--c-text);
  word-break: break-word;
  font-family: var(--font-serif);
}
.sentence-note-inline {
  padding: 2px 14px 4px;
  font-size: 13px;
  line-height: 1.5;
  color: #8b5cf6;
  font-style: italic;
}
.sentence-translation-inline {
  padding: 8px 16px 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--c-text-lighter);
  border-top: 1px solid var(--c-border-light, #f1f5f9);
}
</style>
