<script setup lang="ts">
import { ref, computed } from 'vue'
import { open } from '@tauri-apps/plugin-dialog'
import { marked } from 'marked'
import { parseEpubToc, extractEpubChapter, addArticle, type TocEntry, type ChapterResult } from '../services/api'
import { useGlobalToast } from '../composables/useGlobalToast'
import { useAppStore } from '../stores/appStore'
import { resolveLocalImages, resolveLocalImagesInMarkdown } from '../utils/imageResolver'
import '../styles/reader-typography.css'

marked.setOptions({ gfm: true, breaks: true })

const toast = useGlobalToast()
const appStore = useAppStore()

/** Render markdown with local image path resolution */
function renderMarkdown(md: string): string {
  const resolved = resolveLocalImagesInMarkdown(md)
  return resolveLocalImages(marked.parse(resolved) as string)
}
// Toggle raw markdown vs rendered preview
const showRaw = ref<Record<number, boolean>>({})
const extractProgress = ref(0)

// Steps: 1=select, 2=toc, 3=result
const step = ref(1)
const filePath = ref('')
const fileName = ref('')
const toc = ref<TocEntry[]>([])
const selectedPaths = ref<Set<string>>(new Set())
const loading = ref(false)
const extracting = ref(false)
const results = ref<ChapterResult[]>([])
const savedCount = ref(0)
const previewIndex = ref(-1)

const hasSelection = computed(() => selectedPaths.value.size > 0)
const selectionCount = computed(() => selectedPaths.value.size)

// Flatten TOC for counting
function flattenToc(entries: TocEntry[]): TocEntry[] {
  const flat: TocEntry[] = []
  for (const e of entries) {
    flat.push(e)
    if (e.children?.length) flat.push(...flattenToc(e.children))
  }
  return flat
}

const flatToc = computed(() => flattenToc(toc.value))

async function selectFile() {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'EPUB', extensions: ['epub'] }]
    })
    if (!selected) return

    filePath.value = selected as string
    fileName.value = (selected as string).split(/[/\\]/).pop() || ''
    loading.value = true

    try {
      toc.value = await parseEpubToc(filePath.value)
      step.value = 2
    } catch (e: any) {
      toast.error('解析 EPUB 失败: ' + e)
    } finally {
      loading.value = false
    }
  } catch (e: any) {
    toast.error('选择文件失败: ' + e)
  }
}



// 级联选择：选中/取消父节点时自动覆盖所有子节点
function getDescendantPaths(entries: TocEntry[]): string[] {
  const paths: string[] = []
  for (const e of entries) {
    paths.push(e.path)
    if (e.children?.length) paths.push(...getDescendantPaths(e.children))
  }
  return paths
}

function toggleSelectWithChildren(entry: TocEntry) {
  const set = new Set(selectedPaths.value)
  const allPaths = [entry.path, ...getDescendantPaths(entry.children || [])]
  const isSelected = set.has(entry.path)
  for (const p of allPaths) {
    if (isSelected) {
      set.delete(p)
    } else {
      set.add(p)
    }
  }
  selectedPaths.value = set
}

// 折叠/展开状态
const collapsedPaths = ref<Set<string>>(new Set())
function toggleCollapse(path: string) {
  const set = new Set(collapsedPaths.value)
  if (set.has(path)) {
    set.delete(path)
  } else {
    set.add(path)
  }
  collapsedPaths.value = set
}

function selectAll() {
  const set = new Set<string>()
  for (const entry of flatToc.value) {
    set.add(entry.path)
  }
  selectedPaths.value = set
}

function deselectAll() {
  selectedPaths.value = new Set()
}

async function extractSelected() {
  const paths = Array.from(selectedPaths.value)
  if (paths.length === 0) return

  extracting.value = true
  results.value = []
  extractProgress.value = 0

  try {
    for (const path of paths) {
      const result = await extractEpubChapter(filePath.value, path)
      results.value.push(result)
      extractProgress.value++
    }
    step.value = 3
  } catch (e: any) {
    toast.error('提取章节失败: ' + e)
  } finally {
    extracting.value = false
  }
}

function toggleRaw(idx: number) {
  showRaw.value = { ...showRaw.value, [idx]: !showRaw.value[idx] }
}

async function saveToArticles(result: ChapterResult, index: number) {
  try {
    // Save Markdown content (images now stored as local file paths)
    const saved = await addArticle({
      title: result.title || `第 ${index + 1} 章`,
      content: result.markdown,
      category: fileName.value.replace(/\.epub$/i, ''),
    })
    appStore.addArticle(saved)  // sync appStore cache
    savedCount.value++
    toast.success(`"${result.title}" 已保存到文章库`)
  } catch (e: any) {
    toast.error('保存失败: ' + e)
  }
}

async function saveAllToArticles() {
  extracting.value = true
  let count = 0
  try {
    for (const r of results.value) {
      if (r.markdown) {
        const saved = await addArticle({
          title: r.title || `章节 ${count + 1}`,
          content: r.markdown,
          category: fileName.value.replace(/\.epub$/i, ''),
        })
        appStore.addArticle(saved)
        count++
      }
    }
    savedCount.value += count
    toast.success(`已保存 ${count} 篇文章到文章库`)
  } catch (e: any) {
    toast.error('批量保存失败: ' + e)
  } finally {
    extracting.value = false
  }
}

function reset() {
  step.value = 1
  filePath.value = ''
  fileName.value = ''
  toc.value = []
  selectedPaths.value = new Set()
  results.value = []
  savedCount.value = 0
  previewIndex.value = -1
}

function copyMarkdown(md: string) {
  navigator.clipboard.writeText(md)
  toast.success('Markdown 已复制到剪贴板')
}
</script>

<template>
  <section class="page-container">
    <!-- Step Indicator -->
    <div class="steps-bar">
      <div class="step-item" :class="{ active: step === 1, done: step > 1 }" @click="step > 1 && reset()">
        <span class="step-num">1</span>
        <span class="step-label">选择文件</span>
      </div>
      <div class="step-line" :class="{ done: step > 1 }"></div>
      <div class="step-item" :class="{ active: step === 2, done: step > 2 }">
        <span class="step-num">2</span>
        <span class="step-label">选择章节</span>
      </div>
      <div class="step-line" :class="{ done: step > 2 }"></div>
      <div class="step-item" :class="{ active: step === 3 }">
        <span class="step-num">3</span>
        <span class="step-label">提取结果</span>
      </div>
    </div>

    <!-- Step 1: Select EPUB File -->
    <div v-if="step === 1" class="step-content">
      <div class="upload-area" @click="selectFile">
        <div v-if="loading" class="spinner"></div>
        <template v-else>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <h3>选择 EPUB 文件</h3>
          <p>点击选择本地 EPUB 电子书，解析其中的章节目录</p>
          <span class="supported-formats">支持格式: .epub</span>
        </template>
      </div>
    </div>

    <!-- Step 2: TOC Selection -->
    <div v-if="step === 2" class="step-content">
      <div class="toc-header">
        <div class="toc-info">
          <h2>{{ fileName }}</h2>
          <span class="toc-count">共 {{ flatToc.length }} 个章节</span>
        </div>
        <div class="toc-actions">
          <button class="btn-sm" @click="selectAll">全选</button>
          <button class="btn-sm" @click="deselectAll">取消全选</button>
          <button class="btn btn-primary" :disabled="!hasSelection || extracting" @click="extractSelected">
            <span v-if="extracting" class="spinner-sm"></span>
            {{ extracting ? `提取中 (${extractProgress}/${selectionCount})...` : `提取 ${selectionCount} 个章节` }}
          </button>
        </div>
      </div>

      <div class="toc-list">
        <template v-for="entry in toc" :key="entry.path + '-' + entry.index">
          <div
            class="toc-item"
            :class="{ selected: selectedPaths.has(entry.path) }"
            :style="{ paddingLeft: (16 + entry.level * 24) + 'px' }"
            @click="toggleSelectWithChildren(entry)"
          >
            <!-- 展开/折叠箭头 -->
            <span
              v-if="entry.children && entry.children.length"
              class="toc-toggle"
              @click.stop="toggleCollapse(entry.path)"
            >
              <svg :class="{ collapsed: collapsedPaths.has(entry.path) }" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
            <span v-else class="toc-toggle-placeholder"></span>
            <div class="toc-checkbox">
              <svg v-if="selectedPaths.has(entry.path)" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <span class="toc-label">{{ entry.label }}</span>
            <span v-if="entry.children && entry.children.length" class="toc-child-count">{{ entry.children.length }}</span>
          </div>
          <!-- 递归渲染子目录 -->
          <template v-if="entry.children && entry.children.length && !collapsedPaths.has(entry.path)">
            <template v-for="child in entry.children" :key="child.path + '-' + child.index">
              <div
                class="toc-item"
                :class="{ selected: selectedPaths.has(child.path) }"
                :style="{ paddingLeft: (16 + child.level * 24) + 'px' }"
                @click="toggleSelectWithChildren(child)"
              >
                <span
                  v-if="child.children && child.children.length"
                  class="toc-toggle"
                  @click.stop="toggleCollapse(child.path)"
                >
                  <svg :class="{ collapsed: collapsedPaths.has(child.path) }" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
                <span v-else class="toc-toggle-placeholder"></span>
                <div class="toc-checkbox">
                  <svg v-if="selectedPaths.has(child.path)" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span class="toc-label">{{ child.label }}</span>
                <span v-if="child.children && child.children.length" class="toc-child-count">{{ child.children.length }}</span>
              </div>
              <!-- 第 3 层子级 -->
              <template v-if="child.children && child.children.length && !collapsedPaths.has(child.path)">
                <div
                  v-for="grandchild in child.children"
                  :key="grandchild.path + '-' + grandchild.index"
                  class="toc-item"
                  :class="{ selected: selectedPaths.has(grandchild.path) }"
                  :style="{ paddingLeft: (16 + grandchild.level * 24) + 'px' }"
                  @click="toggleSelectWithChildren(grandchild)"
                >
                  <span class="toc-toggle-placeholder"></span>
                  <div class="toc-checkbox">
                    <svg v-if="selectedPaths.has(grandchild.path)" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <span class="toc-label">{{ grandchild.label }}</span>
                </div>
              </template>
            </template>
          </template>
        </template>
      </div>
    </div>

    <!-- Step 3: Results -->
    <div v-if="step === 3" class="step-content">
      <div class="result-header">
        <h2>提取完成</h2>
        <div class="result-actions">
          <button class="btn btn-primary" @click="saveAllToArticles" :disabled="extracting">
            {{ extracting ? '保存中...' : `全部保存到文章库 (${results.length})` }}
          </button>
          <button class="btn-sm" @click="reset">重新选择</button>
        </div>
      </div>

      <div class="result-list">
        <div v-for="(result, idx) in results" :key="idx" class="result-card">
          <div class="result-card-header" @click="previewIndex = previewIndex === idx ? -1 : idx">
            <div class="result-info">
              <h3>{{ result.title || `章节 ${idx + 1}` }}</h3>
              <div class="result-stats">
                <span>{{ result.markdown.length.toLocaleString() }} 字符</span>
                <span v-if="result.images.length">{{ result.images.length }} 张图片</span>
              </div>
            </div>
            <div class="result-btns">
              <button class="btn-sm" @click.stop="copyMarkdown(result.markdown)">复制</button>
              <button class="btn-sm save" @click.stop="saveToArticles(result, idx)">保存</button>
              <svg :class="{ rotated: previewIndex === idx }" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          <transition name="expand">
            <div v-if="previewIndex === idx" class="result-preview">
              <!-- Toggle between rendered and raw -->
              <div class="preview-toolbar">
                <button class="btn-sm" :class="{ active: !showRaw[idx] }" @click="showRaw[idx] = false">渲染预览</button>
                <button class="btn-sm" :class="{ active: showRaw[idx] }" @click="toggleRaw(idx)">原始 Markdown</button>
                <span v-if="result.images.length" class="img-badge">{{ result.images.length }} 张图片</span>
              </div>
              <!-- Rendered Markdown preview -->
              <div
                v-if="!showRaw[idx]"
                class="rendered-preview reader-typography"
                v-html="renderMarkdown(result.markdown) || '<p>无内容</p>'"
              ></div>
              <!-- Raw Markdown -->
              <pre v-else class="markdown-preview">{{ result.markdown }}</pre>
              <!-- Image Gallery (always shown if images exist) -->
              <div v-if="result.images && result.images.length" class="image-gallery">
                <div class="gallery-title">章节图片 ({{ result.images.length }})</div>
                <div class="gallery-grid">
                  <div v-for="(img, imgIdx) in result.images" :key="imgIdx" class="gallery-item">
                    <img :src="'data:' + img.mime_type + ';base64,' + img.data_base64" :alt="img.filename" />
                    <span>{{ img.filename }}</span>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-container {
  max-width: 100%;
  padding: 1.5rem 2rem 2rem;
}

/* Steps Bar */
.steps-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 2rem;
  padding: 0 2rem;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: default;
  transition: all 0.2s;
}

.step-item.active { background: linear-gradient(135deg, #007AFF, #409CFF); }
.step-item.active .step-num { background: rgba(255,255,255,0.25); color: #fff; }
.step-item.active .step-label { color: #fff; font-weight: 700; }

.step-item.done { cursor: pointer; }
.step-item.done .step-num { background: #10b981; color: #fff; }
.step-item.done .step-label { color: #10b981; }

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--c-border);
  color: var(--c-text-lighter);
}

.step-label { font-size: 0.9rem; color: var(--c-text-lighter); white-space: nowrap; }

.step-line {
  width: 50px;
  height: 2px;
  background: var(--c-border);
  margin: 0 4px;
  transition: background 0.3s;
}

.step-line.done { background: #10b981; }

/* Upload Area */
.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  padding: 4rem 2rem;
  border: 2px dashed var(--c-border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.upload-area:hover {
  border-color: #007AFF;
  background: rgba(0, 122, 255, 0.04);
  transform: translateY(-2px);
}

.upload-area svg { color: var(--c-text-lighter); }
.upload-area:hover svg { color: #007AFF; }
.upload-area h3 { margin: 0; font-size: 1.2rem; color: var(--c-text); }
.upload-area p { margin: 0; font-size: 0.9rem; color: var(--c-text-lighter); }
.supported-formats { font-size: 0.8rem; color: var(--c-text-lighter); }

/* TOC */
.toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.toc-info h2 { margin: 0; font-size: 1.2rem; color: var(--c-text); }
.toc-count { font-size: 0.85rem; color: var(--c-text-lighter); }
.toc-actions { display: flex; gap: 8px; align-items: center; }

.toc-list {
  border: 1px solid var(--c-border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--c-bg-light);
}

.toc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--c-border-light, #f1f5f9);
  transition: all 0.15s;
}

.toc-item:last-child { border-bottom: none; }
.toc-item:hover { background: var(--c-bg-lighter); }
.toc-item.selected { background: var(--c-bg-lighter); }
.toc-child { padding-left: 40px; }

.toc-toggle {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  color: var(--c-text-lighter);
  border-radius: 4px;
  transition: all 0.15s;
}

.toc-toggle:hover { background: var(--c-border); color: var(--c-text-lighter); }

.toc-toggle svg {
  transition: transform 0.2s;
}

.toc-toggle svg.collapsed {
  transform: rotate(-90deg);
}

.toc-toggle-placeholder {
  width: 20px;
  flex-shrink: 0;
}

.toc-child-count {
  font-size: 0.7rem;
  color: var(--c-text-lighter);
  background: var(--c-border-light, #f1f5f9);
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

.toc-checkbox {
  width: 22px;
  height: 22px;
  border: 2px solid var(--c-border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.toc-item.selected .toc-checkbox {
  background: linear-gradient(135deg, #007AFF, #409CFF);
  border-color: transparent;
}

.toc-item.selected .toc-checkbox svg { color: #fff; }

.toc-label {
  font-size: 0.95rem;
  color: var(--c-text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Buttons */
/* btn-primary 继承自 App.vue 全局样式 */

.btn-sm {
  padding: 5px 12px;
  border: 1.5px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-bg-light);
  color: var(--c-text);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-sm:hover { border-color: var(--c-primary); color: var(--c-primary); background: rgba(0, 122, 255, 0.04); }
.btn-sm.save { border-color: #86efac; color: #15803d; background: #f0fdf4; }
.btn-sm.save:hover { background: #dcfce7; }

/* Results */
.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.result-header h2 { margin: 0; font-size: 1.2rem; }
.result-actions { display: flex; gap: 8px; }

.result-list { display: flex; flex-direction: column; gap: 8px; }

.result-card {
  border: 1px solid var(--c-border);
  border-radius: 14px;
  background: var(--c-bg-light);
  overflow: hidden;
  transition: all 0.2s;
}

.result-card:hover { border-color: #bae6fd; }

.result-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
}

.result-info h3 { margin: 0 0 2px; font-size: 1rem; color: var(--c-text); }

.result-stats {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--c-text-lighter);
}

.result-btns {
  display: flex;
  align-items: center;
  gap: 6px;
}

.result-btns svg {
  color: var(--c-text-lighter);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.result-btns svg.rotated { transform: rotate(180deg); }

.result-preview {
  border-top: 1px solid var(--c-border-light, #f1f5f9);
  padding: 16px;
  background: var(--c-bg-lighter);
}

.preview-toolbar {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 12px;
}

.preview-toolbar .btn-sm.active {
  background: #007AFF;
  color: #fff;
  border-color: #007AFF;
}

.img-badge {
  font-size: 0.8rem;
  color: var(--c-text-lighter);
  margin-left: auto;
}

.rendered-preview {
  padding: 1rem;
  background: var(--c-bg-light);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  font-size: 0.95rem;
  line-height: 1.8;
  color: var(--c-text);
  max-height: 500px;
  overflow-y: auto;
}

.rendered-preview img {
  max-width: 100%;
  border-radius: 8px;
  margin: 8px 0;
}

.rendered-preview h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; color: var(--c-text); }
.rendered-preview h2 { font-size: 1.3rem; font-weight: 700; margin: 1rem 0 0.5rem; color: var(--c-text); }
.rendered-preview h3 { font-size: 1.1rem; font-weight: 600; margin: 0.8rem 0 0.4rem; color: var(--c-text); }
.rendered-preview p { margin: 0.5rem 0; }

.markdown-preview {
  margin: 0;
  padding: 1rem;
  background: var(--c-bg-lighter);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--c-text);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
  font-family: var(--font-mono);
}

/* Image Gallery */
.image-gallery {
  margin-top: 16px;
  border-top: 1px solid var(--c-border);
  padding-top: 12px;
}

.gallery-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--c-text-lighter);
  margin-bottom: 10px;
}

.gallery-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.gallery-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.gallery-item img {
  max-width: 240px;
  max-height: 180px;
  border-radius: 8px;
  border: 1px solid var(--c-border);
  object-fit: contain;
  background: var(--c-bg-light);
}

.gallery-item span {
  font-size: 0.7rem;
  color: var(--c-text-lighter);
}

/* Spinner */
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--c-border);
  border-top-color: #007AFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Transition */
.expand-enter-active, .expand-leave-active { transition: all 0.3s ease; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; padding: 0 16px; }

.rendered-preview-iframe {
  width: 100%;
  min-height: 400px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-bg-light);
}
</style>
