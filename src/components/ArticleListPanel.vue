<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { addArticle as apiAddArticle,
  type ArticleItem, type AddArticleRequest } from '../services/api'
import { useBatchSelection } from '../composables/useBatchSelection'
import { useAppStore } from '../stores/appStore'
import { formatDate } from '../utils/format'
import { useGlobalToast } from '../composables/useGlobalToast'

import '../styles/article-list.css'
import '../styles/reader-typography.css'

marked.setOptions({ gfm: true, breaks: true })
const turndown = new TurndownService({ headingStyle: 'atx', hr: '---', bulletListMarker: '-', codeBlockStyle: 'fenced' })
turndown.addRule('lineBreak', { filter: 'br', replacement: () => '\n' })

const props = defineProps<{
  articles: ArticleItem[]
}>()

const emit = defineEmits<{
  'open-reader': [article: ArticleItem]
  'open-reader-with-editor': [article: ArticleItem]
  'delete': [id: string]
  'batch-delete': [ids: string[]]
}>()

const appStore = useAppStore()
const toast = useGlobalToast()

const searchQuery = ref('')
const showAddForm = ref(false)
const showPreview = ref(false)

const newArticle = ref<AddArticleRequest>({
  title: '',
  content: '',
  author: '',
  category: '',
  description: '',
})

import { resolveLocalImages, resolveLocalImagesInMarkdown } from '../utils/imageResolver'

// Live Markdown preview for the add form
const previewHtml = computed(() => {
  if (!newArticle.value.content) return ''
  const resolved = resolveLocalImagesInMarkdown(newArticle.value.content)
  return resolveLocalImages(marked.parse(resolved) as string)
})

const filteredArticles = computed(() => {
  if (!searchQuery.value) return props.articles
  const q = searchQuery.value.toLowerCase()
  return props.articles.filter((a) =>
    a.title.toLowerCase().includes(q) ||
    (a.author?.toLowerCase().includes(q) ?? false) ||
    (a.category?.toLowerCase().includes(q) ?? false)
  )
})

const {
  selectionMode,
  selectedItems: selectedArticles,
  toggleSelectionMode,
  toggleItem: toggleArticleSelection,
  selectAll,
  clearSelection: clearBatchSelection,
} = useBatchSelection(filteredArticles)

const stats = computed(() => ({
  total: props.articles.length,
  totalWords: props.articles.reduce((sum, a) => sum + a.word_count, 0),
}))

async function handleAdd() {
  if (!newArticle.value.title.trim() || !newArticle.value.content.trim()) return
  try {
    await apiAddArticle(newArticle.value)
    newArticle.value = { title: '', content: '', author: '', category: '', description: '' }
    showAddForm.value = false
    showPreview.value = false
    await appStore.fetchArticles(true)
  } catch (e: any) {
    toast.error('添加失败: ' + e)
  }
}

function handleDelete(id: string) {
  emit('delete', id)
}

function deleteSelected() {
  if (selectedArticles.value.size === 0) return
  emit('batch-delete', Array.from(selectedArticles.value))
}

function isHtmlContent(text: string): boolean {
  return /<(?:p|div|h[1-6]|span|br|img|ul|ol|li|table|blockquote|pre|code|a|em|strong)\b[^>]*>/i.test(text)
}

async function handleImportFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.txt,.md,.html'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    let text = await file.text()
    const title = file.name.replace(/\.\w+$/, '')
    // Auto-convert HTML files to Markdown
    if (file.name.endsWith('.html') || file.name.endsWith('.htm') || isHtmlContent(text)) {
      text = turndown.turndown(text)
    }
    try {
      await apiAddArticle({ title, content: text })
      await appStore.fetchArticles(true)
    } catch (err: any) {
      toast.error('导入失败: ' + err)
    }
  }
  input.click()
}

// ── OCR 草稿联动：自动创建文章并打开编辑器 ────────
onMounted(async () => {
  const draft = appStore.consumePendingOcrDraft()
  if (draft) {
    try {
      toast.info('正在创建文章...')
      await apiAddArticle({
        title: draft.title,
        content: draft.content,
        author: '',
        category: 'OCR 导入',
        description: '',
      })
      await appStore.fetchArticles(true)
      // 取最新创建的文章（按创建时间取第一条）
      const created = appStore.articles.find(a => a.title === draft.title)
      if (created) {
        await nextTick()
        emit('open-reader-with-editor', created)
        toast.success('文章已创建，已打开编辑器')
      }
    } catch (e: any) {
      toast.error('OCR 文章创建失败: ' + e)
    }
  }
})

/** 批量删除完成后由父组件调用，清理选择状态 */
function resetBatchSelection() {
  clearBatchSelection()
}

defineExpose({ resetBatchSelection })
</script>
<template>
  <section class="page-container">
    <header class="page-header">
      <h1 class="page-title">
        <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 7c-1.5-2-4-3-7-3v13c3 0 5.5 1 7 3 1.5-2 4-3 7-3V4c-3 0-5.5 1-7 3z"/>
        </svg>
        文章库
      </h1>
      <p class="page-subtitle">共 <strong>{{ stats.total }}</strong> 篇文章 · <strong>{{ stats.totalWords.toLocaleString() }}</strong> 总词数</p>
      <div class="header-actions">
        <button class="btn btn-outline" @click="handleImportFile">导入文件</button>
        <button class="btn btn-primary" @click="showAddForm = !showAddForm">
          {{ showAddForm ? '取消' : '+ 新建文章' }}
        </button>
      </div>
    </header>

    <!-- 添加文章表单 -->
    <transition name="slide-down">
      <form v-if="showAddForm" class="add-form glass-card" @submit.prevent="handleAdd">
        <div class="form-row">
          <input v-model="newArticle.title" placeholder="文章标题 *" required class="form-input" />
          <input v-model="newArticle.author" placeholder="作者" class="form-input short" />
          <input v-model="newArticle.category" placeholder="分类" class="form-input short" />
        </div>
        <input v-model="newArticle.description" placeholder="简要描述" class="form-input" />
        <div class="md-editor-wrap">
          <div class="md-editor-toolbar">
            <span class="md-label">Markdown 编辑</span>
            <button type="button" class="btn-sm" @click="showPreview = !showPreview">
              {{ showPreview ? '隐藏预览' : '显示预览' }}
            </button>
          </div>
          <textarea v-model="newArticle.content" placeholder="输入 Markdown 格式内容… *" required class="form-textarea" rows="10"></textarea>
          <transition name="slide-down">
            <div v-if="showPreview && previewHtml" class="md-preview reader-typography" v-html="previewHtml"></div>
          </transition>
        </div>
        <button type="submit" class="btn btn-primary">添加文章</button>
      </form>
    </transition>

    <!-- 搜索栏 -->
    <div class="toolbar">
      <div class="search-box">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input v-model="searchQuery" placeholder="搜索文章标题、作者、分类..." class="search-input" />
      </div>
      <div class="toolbar-actions">
        <button v-if="!selectionMode" class="toolbar-btn" @click="toggleSelectionMode" title="批量选择">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          批量选择
        </button>
        <template v-if="selectionMode">
          <button class="toolbar-btn" @click="selectAll" title="全选/取消全选">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            {{ selectedArticles.size === filteredArticles.length ? '取消全选' : '全选' }}
          </button>
          <button class="toolbar-btn danger" @click="deleteSelected" :disabled="selectedArticles.size === 0" title="删除选中">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            删除 ({{ selectedArticles.size }})
          </button>
          <button class="toolbar-btn" @click="toggleSelectionMode" title="取消">取消</button>
        </template>
        <span class="result-count">{{ filteredArticles.length }} 篇</span>
      </div>
    </div>

    <!-- 文章列表 -->
    <div class="article-grid">
      <div v-for="article in filteredArticles" :key="article.id"
           class="article-card glass-card"
           :class="{ 'selected': selectedArticles.has(article.id) }"
           @click="selectionMode ? toggleArticleSelection(article.id) : $emit('open-reader', article)">
        <div v-if="selectionMode" class="article-checkbox" @click.stop="toggleArticleSelection(article.id)">
          <input type="checkbox" :checked="selectedArticles.has(article.id)" @click.stop>
        </div>
        <div class="card-body">
          <div class="card-top">
            <h3 class="card-title">{{ article.title }}</h3>
            <button v-if="!selectionMode" class="delete-btn" @click.stop="handleDelete(article.id)" title="删除">×</button>
          </div>
          <p v-if="article.description" class="card-desc">{{ article.description }}</p>
          <div class="card-meta">
            <span v-if="article.author" class="meta-tag">{{ article.author }}</span>
            <span v-if="article.category" class="meta-tag category">{{ article.category }}</span>
            <span class="meta-tag">{{ article.word_count }} 词</span>
            <span class="meta-tag">{{ formatDate(article.created_at) }}</span>
          </div>
        </div>
        <div v-if="!selectionMode" class="card-action">阅读 →</div>
      </div>
    </div>

    <div v-if="filteredArticles.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
      <p>暂无文章</p>
      <span>点击"新建文章"或"导入文件"添加你的第一篇文章</span>
    </div>
  </section>
</template>
