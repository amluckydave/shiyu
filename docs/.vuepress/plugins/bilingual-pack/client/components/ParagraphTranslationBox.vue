<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  paragraphIndex: number
  articlePath: string
  initialTranslation?: string
  isExpanded: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  save: [translation: string]
  toggle: []
}>()

const translation = ref(props.initialTranslation || '')
let saveTimer: number | null = null

// 监听初始翻译变化
watch(() => props.initialTranslation, (newVal) => {
  translation.value = newVal || ''
})

// 自动保存（防抖）
function handleInput() {
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveTimer = window.setTimeout(() => {
    emit('save', translation.value)
  }, 1000)
}

function handleToggle() {
  emit('toggle')
}
</script>

<template>
  <div class="translation-box-wrapper" :class="{ expanded: isExpanded }">
    <div v-if="isExpanded" class="translation-box">
      <div class="translation-box-header">
        <span class="translation-box-title">📝 段落翻译</span>
        <button class="translation-box-close" @click="handleToggle" title="收起翻译">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      </div>
      <textarea
        v-model="translation"
        class="translation-input"
        placeholder="在此输入翻译..."
        @input="handleInput"
        rows="4"
      />
      <div class="translation-box-hint">
        翻译会自动保存到本地存储
      </div>
    </div>
  </div>
</template>

<style scoped>
.translation-box-wrapper {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
}

.translation-box-wrapper.expanded {
  max-height: 300px;
}

.translation-box {
  margin: 12px 0;
  padding: 16px;
  background: rgba(var(--vp-c-bg-soft-rgb, 246, 248, 250), 0.8);
  border: 1px solid var(--vp-c-divider, #e2e8f0);
  border-radius: 8px;
  backdrop-filter: blur(8px);
}

.translation-box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.translation-box-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1, #213547);
}

.translation-box-close {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--vp-c-text-2, #476582);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.translation-box-close:hover {
  background: rgba(var(--vp-c-default-soft-rgb, 142, 150, 170), 0.14);
  color: var(--vp-c-text-1, #213547);
}

.translation-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--vp-c-divider, #e2e8f0);
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  color: var(--vp-c-text-1, #213547);
  background: var(--vp-c-bg, #ffffff);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.translation-input:focus {
  outline: none;
  border-color: var(--vp-c-brand, #3eaf7c);
  box-shadow: 0 0 0 3px rgba(62, 175, 124, 0.1);
}

.translation-input::placeholder {
  color: var(--vp-c-text-3, #a8b1bd);
}

.translation-box-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--vp-c-text-3, #a8b1bd);
}

/* 暗色模式适配 */
@media (prefers-color-scheme: dark) {
  .translation-box {
    background: rgba(30, 30, 30, 0.8);
    border-color: rgba(84, 84, 84, 0.65);
  }
  
  .translation-input {
    background: rgba(20, 20, 20, 0.6);
    border-color: rgba(84, 84, 84, 0.48);
    color: rgba(255, 255, 255, 0.86);
  }
}
</style>
