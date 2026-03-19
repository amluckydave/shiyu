<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import { useMindMap } from '../composables/useMindMap'
import '../styles/mindmap-panel.css'

const props = defineProps<{
  visible: boolean
  articleId: string
  articleContent: string
  articleTitle: string
}>()

const emit = defineEmits<{
  close: []
}>()

const svgRef = ref<SVGSVGElement | null>(null)
let markmapInstance: Markmap | null = null
const transformer = new Transformer()

const {
  mindMapMarkdown,
  mindMapLoading,
  mindMapError,
  currentLang,
  switchLang,
  generateMindMap,
  regenerateMindMap,
} = useMindMap()

function handleSwitchLang() {
  switchLang()
}

// Render markmap when markdown changes
watch(mindMapMarkdown, async (md) => {
  if (!md || !props.visible) return
  await nextTick()
  renderMarkmap(md)
})

// Auto-generate on open
watch(() => props.visible, async (visible) => {
  if (visible && props.articleContent && props.articleId) {
    await generateMindMap(props.articleContent, props.articleId)
    await nextTick()
    if (mindMapMarkdown.value) {
      renderMarkmap(mindMapMarkdown.value)
    }
  }
})

function renderMarkmap(md: string) {
  if (!svgRef.value) return

  if (markmapInstance) {
    markmapInstance.destroy()
    markmapInstance = null
  }
  svgRef.value.innerHTML = ''

  const { root } = transformer.transform(md)

  // 使用 d3 默认配色（10 种鲜艳颜色），不自定义 color
  markmapInstance = Markmap.create(svgRef.value, {
    autoFit: true,
    duration: 500,
    maxWidth: 260,
    paddingX: 16,
    spacingHorizontal: 100,
    spacingVertical: 8,
    initialExpandLevel: -1,
    zoom: true,
    pan: true,
  }, root)
}

async function handleRegenerate() {
  await regenerateMindMap(props.articleContent, props.articleId)
}

function handleClose() {
  emit('close')
}

function handleOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('mindmap-overlay')) {
    handleClose()
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) {
    handleClose()
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    document.addEventListener('keydown', handleKeyDown)
  } else {
    document.removeEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  if (markmapInstance) {
    markmapInstance.destroy()
    markmapInstance = null
  }
})
</script>

<template>
  <teleport to="body">
    <div v-if="visible" class="mindmap-overlay" @click="handleOverlayClick">
      <div class="mindmap-modal">
        <!-- 工具栏 -->
        <div class="mm-toolbar">
          <div class="mm-title">
            <div class="mm-title-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.5">
                <circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/>
                <path d="M12 7.5V12m0 0l-5.5 4.5M12 12l5.5 4.5"/>
              </svg>
            </div>
            <span class="mm-title-text">{{ articleTitle }}</span>
          </div>
          <button class="mm-btn" @click="handleRegenerate" :disabled="mindMapLoading">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            重新生成
          </button>
          <button
            class="mm-btn mm-btn-lang"
            @click="handleSwitchLang"
            :disabled="mindMapLoading || !mindMapMarkdown"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 8l4 0m4 0l-2.5-3M9 8l1.5 3m0 0l2 4m-2-4h-3m3 0l2.5 4"/>
              <path d="M13.5 3h3.75a1.5 1.5 0 0 1 0 3h-1.5m0 0h1.5a1.5 1.5 0 0 1 0 3h-3.75"/>
            </svg>
            {{ currentLang === 'en' ? '切换中文' : 'Switch EN' }}
          </button>
          <button class="mm-btn mm-btn-close" @click="handleClose">✕</button>
        </div>

        <!-- 内容区 -->
        <div class="mm-canvas">
          <div v-if="mindMapLoading" class="mm-loading">
            <div class="mm-spinner-wrap">
              <div class="mm-spinner"></div>
              <div class="mm-spinner-inner"></div>
            </div>
            <span class="mm-loading-text">AI 正在分析文章结构...</span>
            <span class="mm-loading-hint">首次生成约 3-8 秒</span>
          </div>

          <div v-else-if="mindMapError" class="mm-error">
            <div class="mm-error-icon">⚠️</div>
            <span class="mm-error-text">{{ mindMapError }}</span>
            <button class="mm-btn" @click="handleRegenerate">重试</button>
          </div>

          <svg v-show="!mindMapLoading && !mindMapError && mindMapMarkdown" ref="svgRef"></svg>

          <div v-if="!mindMapLoading && !mindMapError && mindMapMarkdown" class="mm-zoom-hint">
            滚轮缩放 · 拖拽平移 · 点击圆圈折叠
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>
