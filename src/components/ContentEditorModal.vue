<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { MdEditor, type ToolbarNames } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import TurndownService from 'turndown'
import { updateArticleContent, type ArticleItem } from '../services/api'
import { useGlobalToast } from '../composables/useGlobalToast'
import { resolveLocalImages } from '../utils/imageResolver'
import '../styles/content-editor.css'

// Turndown: HTML → Markdown
const turndown = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
})

// 保留 <br> 为换行
turndown.addRule('lineBreak', {
  filter: 'br',
  replacement: () => '\n',
})

const props = defineProps<{
  visible: boolean
  article: ArticleItem
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', article: ArticleItem): void
}>()

const toast = useGlobalToast()

// Editor state
const editTitle = ref('')
const editContent = ref('')
const originalContent = ref('') // 用于检测是否有修改
const saving = ref(false)
const hasChanges = ref(false)
const wasConverted = ref(false) // 标记是否做了 HTML→MD 转换

// md-editor-v3 toolbar configuration
const toolbarConfig: ToolbarNames[] = [
  'bold', 'underline', 'italic', 'strikeThrough', '-',
  'title', 'sub', 'sup', 'quote', '-',
  'unorderedList', 'orderedList', 'task', '-',
  'codeRow', 'code', 'link', 'image', 'table', '-',
  'revoke', 'next', '=',
  'prettier', 'pageFullscreen', 'preview', 'catalog'
]

// Detect HTML content
function isHtmlContent(content: string): boolean {
  return /<(?:p|div|h[1-6]|span|br|img|ul|ol|li|table|blockquote|pre|code|a|em|strong|section|article|figure)\b[^>]*>/i.test(content)
}

// Initialize: auto-convert HTML to Markdown
watch(() => props.visible, (visible) => {
  if (visible && props.article) {
    editTitle.value = props.article.title
    const raw = props.article.content
    if (isHtmlContent(raw)) {
      // HTML → Markdown for editing
      editContent.value = turndown.turndown(raw)
      wasConverted.value = true
    } else {
      editContent.value = raw
      wasConverted.value = false
    }
    originalContent.value = editContent.value
    hasChanges.value = false
  }
}, { immediate: true })

// Track changes (compare to the converted content, not original HTML)
watch([editTitle, editContent], () => {
  if (props.visible) {
    hasChanges.value =
      editTitle.value !== props.article.title ||
      editContent.value !== originalContent.value
  }
})

// Word count
const wordCount = computed(() => {
  const text = editContent.value.replace(/<[^>]*>/g, '').trim()
  if (!text) return 0
  // Count English words + Chinese characters
  const english = text.match(/[a-zA-Z]+/g)?.length || 0
  const chinese = text.match(/[\u4e00-\u9fff]/g)?.length || 0
  return english + chinese
})

// Save — also used as md-editor-v3 onSave callback
async function handleSave() {
  if (saving.value || !hasChanges.value) return
  saving.value = true
  try {
    const updated = await updateArticleContent({
      id: props.article.id,
      title: editTitle.value,
      content: editContent.value,
    })
    hasChanges.value = false
    toast.success('保存成功')
    emit('saved', updated)
  } catch (e: any) {
    toast.error('保存失败: ' + e)
  } finally {
    saving.value = false
  }
}

// Close with unsaved changes warning
function handleClose() {
  if (hasChanges.value) {
    if (!confirm('有未保存的修改，确定关闭？')) return
  }
  emit('close')
}

// Keyboard shortcuts (Esc only — Ctrl+S handled by md-editor-v3 onSave)
function handleKeydown(e: KeyboardEvent) {
  if (!props.visible) return
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    handleSave()
  }
  if (e.key === 'Escape') {
    handleClose()
  }
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
    <div v-if="visible" class="content-editor-overlay" @mousedown.self="handleClose">
      <div class="content-editor-modal">
        <!-- 顶部工具栏 -->
        <div class="ce-toolbar">
          <input
            v-model="editTitle"
            class="ce-title-input"
            placeholder="文章标题"
          />
          <span class="ce-save-hint">Ctrl+S 保存</span>
          <button class="ce-btn ce-btn-save" @click="handleSave" :disabled="saving || !hasChanges">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            {{ saving ? '保存中...' : '保存' }}
          </button>
          <button class="ce-btn ce-btn-close" @click="handleClose">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            关闭
          </button>
        </div>

        <!-- md-editor-v3 编辑器 -->
        <div class="ce-editor-wrapper">
          <MdEditor
            v-model="editContent"
            language="zh-CN"
            :toolbars="toolbarConfig"
            :toolbarsExclude="['github', 'htmlPreview']"
            :noMermaid="true"
            :noKatex="true"
            :onSave="handleSave"
            :sanitize="resolveLocalImages"
            previewTheme="default"
          />
        </div>

        <!-- 底部状态栏 -->
        <div class="ce-statusbar">
          <div class="ce-status-left">
            <span>
              <span class="ce-status-dot" :class="hasChanges ? 'modified' : 'saved'"></span>
              {{ hasChanges ? '已修改' : '已保存' }}
            </span>
            <span>{{ wordCount.toLocaleString() }} 字</span>
          </div>
          <div class="ce-status-right">
            <span v-if="wasConverted" style="color: #007AFF;">HTML → Markdown 已转换</span>
            <span>Markdown</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
