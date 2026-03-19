<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { deleteArticle, type ArticleItem } from '../services/api'
import { clearTranslationCache } from '../composables/useTranslation'
import { useRouteQuery, type HighlightType } from '../composables/useRouteQuery'
import { useAppStore } from '../stores/appStore'
import { useGlobalToast } from '../composables/useGlobalToast'

import ArticleReader from '../components/ArticleReader.vue'
import ArticleListPanel from '../components/ArticleListPanel.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'

const route = useRoute()
const { getQueryValue, normalizeHighlightType, clearNavigationQuery } = useRouteQuery()
const appStore = useAppStore()
const toast = useGlobalToast()

// ── Reader state ──
const showReader = ref(false)
const readerArticle = ref<ArticleItem | null>(null)
const readerHighlightId = ref<string | null>(null)
const readerHighlightType = ref<HighlightType | null>(null)
const autoOpenEditor = ref(false)

// ── Delete dialog ──
const showDeleteConfirm = ref(false)
const deleteTarget = ref<{ type: 'single' | 'batch'; id?: string; ids?: string[] } | null>(null)
const listPanelRef = ref<InstanceType<typeof ArticleListPanel> | null>(null)

// ── Reader open/close ──

function openReader(
  article: ArticleItem,
  options?: { highlightId?: string | null; highlightType?: HighlightType | null }
) {
  readerArticle.value = article
  readerHighlightId.value = options?.highlightId ?? null
  readerHighlightType.value = options?.highlightType ?? null
  autoOpenEditor.value = false
  showReader.value = true
}

// OCR 导入：打开阅读器并自动弹出编辑器
function openReaderWithEditor(article: ArticleItem) {
  readerArticle.value = article
  readerHighlightId.value = null
  readerHighlightType.value = null
  autoOpenEditor.value = true
  showReader.value = true
}


function handleArticleUpdated(updated: ArticleItem) {
  appStore.updateArticle(updated)
}
function closeReader() {
  showReader.value = false
  readerArticle.value = null
  readerHighlightId.value = null
  readerHighlightType.value = null
}

async function openReaderFromRouteQuery() {
  const articleId = getQueryValue(route.query.articleId)
  if (!articleId) return

  if (appStore.articles.length === 0) {
    await appStore.fetchArticles()
  }

  const target = appStore.articles.find((item) => item.id === articleId)
  if (!target) {
    clearNavigationQuery()
    return
  }

  const highlightId = getQueryValue(route.query.highlight)
  const highlightType = normalizeHighlightType(getQueryValue(route.query.type))
  openReader(target, { highlightId, highlightType })
  clearNavigationQuery()
}

// ── Delete handlers ──

function handleDelete(id: string) {
  deleteTarget.value = { type: 'single', id }
  showDeleteConfirm.value = true
}

function handleBatchDelete(ids: string[]) {
  deleteTarget.value = { type: 'batch', ids }
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return

  try {
    if (deleteTarget.value.type === 'single' && deleteTarget.value.id) {
      await deleteArticle(deleteTarget.value.id)
      clearTranslationCache(deleteTarget.value.id)
      if (readerArticle.value?.id === deleteTarget.value.id) {
        closeReader()
      }
      appStore.removeArticle(deleteTarget.value.id)
    } else if (deleteTarget.value.type === 'batch' && deleteTarget.value.ids) {
      await Promise.all(deleteTarget.value.ids.map(id => deleteArticle(id)))
      deleteTarget.value.ids.forEach(id => {
        clearTranslationCache(id)
        appStore.removeArticle(id)
      })

      if (readerArticle.value && deleteTarget.value.ids.includes(readerArticle.value.id)) {
        closeReader()
      }

      listPanelRef.value?.resetBatchSelection()
    }
  } catch (e: any) {
    toast.error('删除失败: ' + e)
  } finally {
    showDeleteConfirm.value = false
    deleteTarget.value = null
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

// ── Lifecycle ──

onMounted(async () => {
  await appStore.fetchArticles()
  await openReaderFromRouteQuery()
})

watch(
  () => route.fullPath,
  () => {
    if (route.path !== '/articles') return
    void openReaderFromRouteQuery()
  }
)
</script>
<template>
  <!-- 阅读器模式 -->
  <ArticleReader
    v-if="showReader && readerArticle"
    :article="readerArticle"
    :highlight-id="readerHighlightId"
    :highlight-type="readerHighlightType"
    :auto-open-editor="autoOpenEditor"
    @close="closeReader"
    @updated="handleArticleUpdated"
  />

  <!-- 文章列表模式 -->
  <ArticleListPanel
    v-else
    ref="listPanelRef"
    :articles="appStore.articles"
    @open-reader="openReader"
    @open-reader-with-editor="openReaderWithEditor"
    @delete="handleDelete"
    @batch-delete="handleBatchDelete"
  />

  <!-- Delete Confirmation Modal -->
  <DeleteConfirmModal
    :visible="showDeleteConfirm"
    :type="deleteTarget?.type || 'single'"
    :count="deleteTarget?.ids?.length || 0"
    @confirm="confirmDelete"
    @cancel="cancelDelete"
  />
</template>
