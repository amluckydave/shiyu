<script setup lang="ts">
import { computed } from 'vue'
import type { PopoverPosition } from '../types'

const WORD_THRESHOLD = 30  // 超过30个字符只显示句子选项

const props = defineProps<{
  position: PopoverPosition
  selectionType: 'word' | 'sentence' | null
  selectionLength?: number
}>()

const emit = defineEmits<{
  addWord: []
  addSentence: []
}>()

const style = computed(() => ({
  position: 'fixed' as const,
  top: `${props.position.top}px`,
  left: `${props.position.left}px`,
  transform: 'translateX(-50%)',
  zIndex: 1000,
}))

// 根据选择长度决定是否显示单词按钮
const showWordButton = computed(() => {
  if (!props.selectionLength) return true
  return props.selectionLength <= WORD_THRESHOLD
})

function handleAddWord(e: Event) {
  e.stopPropagation()
  emit('addWord')
}

function handleAddSentence(e: Event) {
  e.stopPropagation()
  emit('addSentence')
}


</script>

<template>
  <div
    v-if="position.visible"
    class="selection-popover"
    :style="style"
    @mousedown.stop
  >
    <button
      v-if="showWordButton"
      class="popover-btn word-btn"
      title="添加生词"
      @click="handleAddWord"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
    </button>
    <button
      class="popover-btn sentence-btn"
      title="添加长难句"
      @click="handleAddSentence"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    </button>

  </div>
</template>

<style scoped>
.selection-popover {
  display: flex;
  gap: 6px;
  padding: 6px 8px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.92), rgba(241, 245, 249, 0.88));
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  animation: popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

html.dark .selection-popover {
  background: linear-gradient(135deg, rgba(45, 50, 56, 0.92), rgba(38, 42, 48, 0.88));
  border: 1px solid rgba(75, 85, 99, 0.6);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 1px 3px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: translateX(-50%) scale(0.85) translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) scale(1) translateY(0);
  }
}

.popover-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
}

.popover-btn:hover {
  transform: scale(1.15);
}

.popover-btn:active {
  transform: scale(0.95);
}

.word-btn {
  background: linear-gradient(145deg, #e8f5e9, #c8e6c9);
  color: #2e7d32;
}

.word-btn:hover {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.35);
}

html.dark .word-btn {
  background: linear-gradient(145deg, #2e7d32, #388e3c);
  color: #a5d6a7;
}

html.dark .word-btn:hover {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.5);
}

.sentence-btn {
  background: linear-gradient(145deg, #e3f2fd, #bbdefb);
  color: #1565c0;
}

.sentence-btn:hover {
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.35);
}

html.dark .sentence-btn {
  background: linear-gradient(145deg, #1565c0, #1976d2);
  color: #90caf9;
}

html.dark .sentence-btn:hover {
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.5);
}

</style>
