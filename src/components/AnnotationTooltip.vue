<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { getSentenceMeaning } from '../utils/sentenceExplanation'

const props = defineProps<{
  content: string
  type: 'word' | 'sentence'
  position: { top: number; left: number }
}>()

const emit = defineEmits<{
  close: []
}>()

const tooltipRef = ref<HTMLElement | null>(null)

const displayContent = computed(() => {
  if (props.type === 'sentence') {
    return getSentenceMeaning(props.content) || props.content
  }
  return props.content
})

const style = computed(() => {
  return {
    position: 'fixed' as const,
    top: `${props.position.top}px`,
    left: `${props.position.left}px`,
    transform: 'translateX(-50%)',
    zIndex: 1500,
  }
})

function handleMouseLeave() {
  setTimeout(() => {
    emit('close')
  }, 200)
}

onMounted(() => {
  // 自适应窗口边界
  if (tooltipRef.value) {
    const rect = tooltipRef.value.getBoundingClientRect()
    if (rect.right > window.innerWidth - 10) {
      tooltipRef.value.style.left = `${window.innerWidth - rect.width - 10}px`
      tooltipRef.value.style.transform = 'none'
    }
    if (rect.left < 10) {
      tooltipRef.value.style.left = '10px'
      tooltipRef.value.style.transform = 'none'
    }
  }
})
</script>

<template>
  <div
    ref="tooltipRef"
    class="annotation-tooltip"
    :class="type === 'sentence' ? 'sentence-tooltip' : 'word-tooltip'"
    :style="style"
    @mouseleave="handleMouseLeave"
  >
    <div class="tooltip-content" v-text="displayContent" />
  </div>
</template>

<style scoped>
.annotation-tooltip {
  max-width: 320px;
  min-width: 100px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  border-radius: 10px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(226, 232, 240, 0.6);
  animation: tooltipIn 0.15s ease-out;
  pointer-events: auto;
}

@keyframes tooltipIn {
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ⚠️ 颜色需与标注一致 */
.word-tooltip { border-left: 3px solid rgba(244, 63, 94, 0.7); }
.sentence-tooltip { border-left: 3px solid rgba(59, 130, 246, 0.7); }

.tooltip-content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
