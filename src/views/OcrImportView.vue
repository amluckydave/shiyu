<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'

// ── 类型 ──────────────────────────────────────────
interface OcrPageResult {
  page_index: number
  markdown: string
  saved_images: string[]
}

interface OcrProgress {
  current: number
  total: number
  status: string
}

// ── 路由 & Store ──────────────────────────────────
const router = useRouter()
const appStore = useAppStore()

// ── 状态 ──────────────────────────────────────────
const images = ref<{ path: string; name: string; preview: string }[]>([])
const ocrResults = ref<OcrPageResult[]>([])
const rawMarkdown = ref('')
const refinedMarkdown = ref('')
const progress = ref<OcrProgress | null>(null)
const isExtracting = ref(false)
const isRefining = ref(false)
const errorMsg = ref('')

// 当前阶段: upload → extracting → extracted → refining → done
const stage = computed(() => {
  if (isRefining.value) return 'refining'
  if (isExtracting.value) return 'extracting'
  if (refinedMarkdown.value) return 'done'
  if (rawMarkdown.value) return 'extracted'
  return 'upload'
})

// OCR 进度百分比：后端在开始处理第 i 页 *之前* 就发 current=i+1，
// 所以用 (current-1)/total 表示"正在处理"，完成时才到 100%
const ocrProgressPercent = computed(() => {
  if (!progress.value) return 0
  const { current, total, status } = progress.value
  if (status.includes('完成')) return 100
  return Math.round(((current - 1) / total) * 100)
})

// 拖拽排序
const dragging = ref(false)
const dragSourceIndex = ref(-1)
const dropTargetIndex = ref(-1)

// 事件监听器
let unlistenProgress: UnlistenFn | null = null

// ── 选择图片 ──────────────────────────────────────
async function selectImages() {
  try {
    const selected = await openDialog({
      multiple: true,
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp'] }],
    })
    if (!selected) return

    const paths = Array.isArray(selected) ? selected : [selected]
    for (const p of paths) {
      if (!images.value.find(img => img.path === p)) {
        const name = p.replace(/\\/g, '/').split('/').pop() || p
        images.value.push({ path: p, name, preview: '' })
      }
    }
  } catch (e: any) {
    errorMsg.value = '选择文件失败: ' + e
  }
}

function removeImage(index: number) {
  images.value.splice(index, 1)
}

// ── 拖拽排序 (floating clone + push animation) ────
function onGripMouseDown(e: MouseEvent, index: number) {
  e.preventDefault()
  e.stopPropagation()

  const gripEl = e.currentTarget as HTMLElement
  const itemEl = gripEl.closest('.image-item') as HTMLElement
  const listEl = gripEl.closest('.image-list') as HTMLElement
  if (!itemEl || !listEl) return

  // 状态
  dragging.value = true
  dragSourceIndex.value = index
  dropTargetIndex.value = index

  // 测量 item 高度 + gap 用于位移计算
  const items = listEl.querySelectorAll('.image-item') as NodeListOf<HTMLElement>
  const itemHeight = itemEl.offsetHeight + 4 // 4px = gap in .image-list

  // 给所有 item 加上 transition 用于动画
  items.forEach(el => {
    el.style.transition = 'transform 0.2s ease'
  })

  // 创建悬浮克隆
  const rect = itemEl.getBoundingClientRect()
  const offsetY = e.clientY - rect.top
  const clone = itemEl.cloneNode(true) as HTMLElement
  clone.classList.add('drag-clone')
  clone.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    z-index: 9999;
    pointer-events: none;
    opacity: 0.92;
    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
    border: 1.5px solid var(--c-primary);
    border-radius: 8px;
    background: var(--c-bg-light);
    transition: none;
    transform: scale(1.02);
  `
  document.body.appendChild(clone)

  // 原始项隐藏（占位但不可见）
  itemEl.style.opacity = '0'
  itemEl.style.height = itemEl.offsetHeight + 'px'

  // 位移计算函数
  function applyTransforms(target: number) {
    const src = dragSourceIndex.value
    items.forEach((el, i) => {
      if (i === src) return // 源项不动（已隐藏）
      if (src < target) {
        // 向下拖：src 和 target 之间的项向上移
        el.style.transform = (i > src && i <= target) ? `translateY(-${itemHeight}px)` : ''
      } else if (src > target) {
        // 向上拖：target 和 src 之间的项向下移
        el.style.transform = (i >= target && i < src) ? `translateY(${itemHeight}px)` : ''
      } else {
        el.style.transform = ''
      }
    })
  }

  const onMouseMove = (ev: MouseEvent) => {
    // 移动悬浮克隆跟随鼠标
    clone.style.top = `${ev.clientY - offsetY}px`

    // 计算 drop 目标索引
    let newTarget = dragSourceIndex.value
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect()
      // 需要用未偏移的原始位置计算，但 getBoundingClientRect 已包含 transform
      // 所以用中点判断
      const midY = r.top + r.height / 2
      if (ev.clientY < midY) {
        newTarget = i
        break
      }
      if (i === items.length - 1) {
        newTarget = i
      }
    }

    if (newTarget !== dropTargetIndex.value) {
      dropTargetIndex.value = newTarget
      applyTransforms(newTarget)
    }
  }

  const onMouseUp = () => {
    // 执行实际移动
    const from = dragSourceIndex.value
    const to = dropTargetIndex.value
    if (from !== to && from >= 0 && to >= 0) {
      const item = images.value.splice(from, 1)[0]
      images.value.splice(to, 0, item)
    }

    // 清理
    clone.remove()
    items.forEach(el => {
      el.style.transition = ''
      el.style.transform = ''
      el.style.opacity = ''
      el.style.height = ''
    })
    dragging.value = false
    dragSourceIndex.value = -1
    dropTargetIndex.value = -1

    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// ── 上下移动（按钮 fallback）─────────────────────
function moveUp(index: number) {
  if (index <= 0) return
  const item = images.value.splice(index, 1)[0]
  images.value.splice(index - 1, 0, item)
}

function moveDown(index: number) {
  if (index >= images.value.length - 1) return
  const item = images.value.splice(index, 1)[0]
  images.value.splice(index + 1, 0, item)
}

// ── OCR 提取 ──────────────────────────────────────
async function startOcr() {
  if (images.value.length === 0) return

  errorMsg.value = ''
  isExtracting.value = true
  ocrResults.value = []
  rawMarkdown.value = ''
  refinedMarkdown.value = ''

  // 监听进度
  unlistenProgress = await listen<OcrProgress>('ocr-progress', (event) => {
    progress.value = event.payload
  })

  try {
    const paths = images.value.map(img => img.path)
    const results: OcrPageResult[] = await invoke('ocr_extract_pages', { imagePaths: paths })
    ocrResults.value = results

    // 合并所有页面的 Markdown
    rawMarkdown.value = results.map(r => r.markdown).join('\n\n---\n\n')
  } catch (e: any) {
    errorMsg.value = typeof e === 'string' ? e : e?.message || 'OCR 识别失败'
  } finally {
    isExtracting.value = false
    progress.value = null
    if (unlistenProgress) {
      unlistenProgress()
      unlistenProgress = null
    }
  }
}

// ── AI 校正 ──────────────────────────────────────
async function startRefine() {
  if (!rawMarkdown.value) return

  errorMsg.value = ''
  isRefining.value = true

  try {
    const result: string = await invoke('ocr_refine_with_ai', { rawMarkdown: rawMarkdown.value })
    refinedMarkdown.value = result
  } catch (e: any) {
    errorMsg.value = typeof e === 'string' ? e : e?.message || 'AI 校正失败'
  } finally {
    isRefining.value = false
  }
}

// ── 导入为文章 ──────────────────────────────────
function importAsArticle() {
  const text = refinedMarkdown.value || rawMarkdown.value
  if (!text) return
  appStore.setPendingOcrDraft('OCR 导入文章', text)
  router.push('/articles')
}

// ── 复制到剪贴板 ──────────────────────────────────
async function copyResult() {
  const text = refinedMarkdown.value || rawMarkdown.value
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    errorMsg.value = '' // clear any previous error
  } catch {
    // fallback
  }
}

// ── 重置 ──────────────────────────────────────────
function resetAll() {
  images.value = []
  ocrResults.value = []
  rawMarkdown.value = ''
  refinedMarkdown.value = ''
  progress.value = null
  errorMsg.value = ''
}

onUnmounted(() => {
  if (unlistenProgress) unlistenProgress()
})
</script>

<template>
  <div class="page-container fade-in">
    <div class="page-header">
      <h1 class="page-title">
        <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 8V6a2 2 0 012-2h3"/><path d="M17 4h3a2 2 0 012 2v2"/>
          <path d="M22 16v2a2 2 0 01-2 2h-3"/><path d="M7 20H4a2 2 0 01-2-2v-2"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        OCR 图片导入
      </h1>
      <p class="page-subtitle">上传图片，自动 OCR 识别文字，DeepSeek 校正后导入为文章</p>
    </div>

    <!-- 错误提示 -->
    <Transition name="slide">
      <div v-if="errorMsg" class="msg error">{{ errorMsg }}</div>
    </Transition>

    <!-- 阶段一：上传图片 -->
    <div v-if="stage === 'upload' || stage === 'extracting'" class="card upload-card">
      <div class="upload-header">
        <h3>选择图片</h3>
        <span class="upload-count">{{ images.length }} 张</span>
      </div>

      <!-- 图片列表 -->
      <div v-if="images.length > 0" class="image-list">
        <div
          v-for="(img, i) in images"
          :key="img.path"
          class="image-item"
          :class="{
            'drag-source': dragging && dragSourceIndex === i,
            'drop-target': dragging && dropTargetIndex === i && dropTargetIndex !== dragSourceIndex,
          }"
        >
          <span class="image-index">{{ i + 1 }}</span>
          <span
            class="image-grip"
            @mousedown="onGripMouseDown($event, i)"
          >⠿</span>
          <span class="image-name" :title="img.path">{{ img.name }}</span>
          <button class="image-move-btn" @click="moveUp(i)" :disabled="i === 0" title="上移">↑</button>
          <button class="image-move-btn" @click="moveDown(i)" :disabled="i === images.length - 1" title="下移">↓</button>
          <button class="image-remove" @click="removeImage(i)" title="移除">✕</button>
        </div>
      </div>

      <!-- 上传按钮区 -->
      <div class="upload-actions">
        <button class="btn btn-outline" @click="selectImages" :disabled="isExtracting">
          ➕ 添加图片
        </button>
        <button
          class="btn btn-primary"
          @click="startOcr"
          :disabled="images.length === 0 || isExtracting"
        >
          {{ isExtracting ? '识别中...' : '开始 OCR 识别' }}
        </button>
      </div>

      <!-- 进度条 -->
      <div v-if="progress" class="progress-bar">
        <div class="progress-fill" :style="{ width: ocrProgressPercent + '%' }"></div>
        <span class="progress-text">{{ progress.status }}</span>
      </div>
    </div>

    <!-- 阶段二：OCR 原始结果 -->
    <div v-if="stage === 'extracted' || stage === 'refining'" class="card result-card">
      <div class="result-header">
        <h3>OCR 识别结果</h3>
        <div class="result-actions">
          <button class="btn btn-outline btn-sm" @click="resetAll">重新开始</button>
          <button class="btn btn-outline btn-sm" @click="copyResult">复制</button>
          <button
            class="btn btn-primary btn-sm"
            @click="startRefine"
            :disabled="isRefining"
          >
            {{ isRefining ? '校正中...' : 'DeepSeek 校正' }}
          </button>
        </div>
      </div>
      <div class="result-hint">
        OCR 初步识别完成。可直接复制使用，或点击「DeepSeek 校正」修复错字和断句。
      </div>
      <pre class="result-preview">{{ rawMarkdown }}</pre>
    </div>

    <!-- 阶段三：AI 校正后结果 -->
    <div v-if="stage === 'done'" class="card result-card done-card">
      <div class="result-header">
        <h3>校正完成</h3>
        <div class="result-actions">
          <button class="btn btn-primary btn-sm" @click="importAsArticle">导入为文章</button>
          <button class="btn btn-outline btn-sm" @click="copyResult">复制</button>
          <button class="btn btn-outline btn-sm" @click="resetAll">重新开始</button>
        </div>
      </div>
      <pre class="result-preview">{{ refinedMarkdown }}</pre>
    </div>

    <p class="page-hint">
      提示：拖拽调整图片顺序 → OCR 识别 → AI 校正 → 复制到文章编辑器
    </p>
  </div>
</template>

<style scoped>
.page-header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-top: 1rem;
}
.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--c-text);
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}
.page-subtitle {
  font-size: 0.95rem;
  color: var(--c-text-lighter);
  margin: 0;
}

.page-desc {
  font-size: 13px;
  color: var(--c-text-lighter);
  margin-bottom: 20px;
}

/* ── 上传卡片 ── */
.upload-card { display: flex; flex-direction: column; gap: 16px; }
.upload-header { display: flex; align-items: center; justify-content: space-between; }
.upload-header h3 { font-size: 16px; margin: 0; }
.upload-count {
  font-size: 12px;
  color: var(--c-text-lighter);
  background: var(--c-bg-lighter);
  padding: 2px 10px;
  border-radius: 99px;
}

/* ── 图片列表 ── */
.image-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
}

.image-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--c-bg-light);
  border: 1px solid var(--c-border);
  transition: all 0.15s;
}

.image-item:hover { border-color: var(--c-primary); background: var(--c-bg-lighter); }
.image-item.drag-source { opacity: 0.3; border-style: dashed; border-color: var(--c-primary); }
.image-item.drop-target { border-top: 2.5px solid var(--c-primary); border-radius: 2px 2px 8px 8px; }

.image-index {
  font-size: 11px;
  font-weight: 700;
  color: var(--c-primary);
  background: rgba(0, 122, 255, 0.1);
  width: 22px; height: 22px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.image-grip {
  color: var(--c-text-lighter);
  font-size: 16px;
  cursor: grab;
  user-select: none;
  flex-shrink: 0;
  padding: 4px 6px;
  border-radius: 4px;
  transition: background 0.15s;
}
.image-grip:hover { background: rgba(0,0,0,0.05); }
.image-grip:active { cursor: grabbing; }

.image-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-move-btn {
  background: none;
  border: 1px solid var(--c-border);
  color: var(--c-text-lighter);
  cursor: pointer;
  font-size: 12px;
  width: 24px; height: 24px;
  border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.image-move-btn:hover:not(:disabled) { border-color: var(--c-primary); color: var(--c-primary); }
.image-move-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.image-remove {
  background: none;
  border: none;
  color: var(--c-text-lighter);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}
.image-remove:hover { color: var(--c-danger); background: rgba(239, 68, 68, 0.08); }

/* ── 上传按钮 ── */
.upload-actions { display: flex; gap: 10px; }

/* ── 进度条 ── */
.progress-bar {
  position: relative;
  height: 36px;
  background: var(--c-bg-lighter, #f1f5f9);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007AFF, #34aadc);
  border-radius: 10px;
  transition: width 0.4s ease;
  min-width: 0;
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text);
  text-shadow: none;
}

/* ── 结果卡片 ── */
.result-card { display: flex; flex-direction: column; gap: 12px; }
.result-header { display: flex; align-items: center; justify-content: space-between; }
.result-header h3 { font-size: 16px; margin: 0; }
.result-actions { display: flex; gap: 8px; }

.result-hint {
  font-size: 12px;
  color: var(--c-text-lighter);
  background: rgba(0, 122, 255, 0.06);
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 3px solid var(--c-primary);
}

.result-preview {
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 480px;
  overflow-y: auto;
  background: var(--c-bg-light);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 16px;
  font-family: var(--font-sans);
}

.done-card .result-preview {
  border-color: var(--c-accent);
  background: rgba(20, 184, 166, 0.04);
}

.btn-sm { font-size: 12px; padding: 5px 12px; }

.page-hint {
  font-size: 12px;
  color: var(--c-text-lighter);
  margin-top: 12px;
  text-align: center;
}

/* ── 消息 ── */
.msg {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 12px;
}
.msg.error { background: rgba(255,59,48,0.06); color: #D70015; }

.slide-enter-active, .slide-leave-active { transition: all 0.25s; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
