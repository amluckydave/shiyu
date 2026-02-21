<script setup lang="ts">
import { computed } from 'vue'
import { getSentenceMeaning } from '../utils/sentenceExplanation'
import type { VocabularyWord, SavedSentence, PopoverPosition } from '../types'

const props = defineProps<{
  position: PopoverPosition
  content: VocabularyWord | SavedSentence | null
  type: 'word' | 'sentence'
}>()

const style = computed(() => ({
  position: 'fixed' as const,
  top: `${props.position.top - 10}px`,
  left: `${props.position.left}px`,
  transform: 'translate(-50%, -100%)',
  zIndex: 1500,
}))

const displayContent = computed(() => {
  if (!props.content) return { title: '', body: '' }
  
  if (props.type === 'word') {
    const word = props.content as VocabularyWord
    return {
      title: word.word,
      body: word.meaning,
      context: word.context,
    }
  } else {
    const sentence = props.content as SavedSentence
    return {
      title: '长难句',
      body: getSentenceMeaning(sentence.explanation),
    }
  }
})
</script>

<template>
  <div
    v-if="position.visible && content"
    class="annotation-tooltip"
    :style="style"
    :class="{ 'is-sentence': type === 'sentence' }"
    @click.stop
  >
    <div class="tooltip-arrow"></div>
    <div class="tooltip-content">
      {{ displayContent.body }}
    </div>
  </div>
</template>

<style scoped>
.annotation-tooltip {
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.12));
  animation: tooltipIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.annotation-tooltip.is-sentence .tooltip-content {
  background: rgba(102, 126, 234, 0.85);
}

@keyframes tooltipIn {
  from {
    opacity: 0;
    transform: translate(-50%, -100%) translateY(6px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%) translateY(0);
  }
}

.tooltip-arrow {
  position: absolute;
  bottom: -5px;
  left: 50%;
  width: 10px;
  height: 10px;
  background: inherit;
  transform: translateX(-50%) rotate(45deg);
  border-radius: 0 0 2px 0;
}

.tooltip-content {
  position: relative;
  background: rgba(62, 175, 124, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 10px;
  padding: 12px 16px;
  max-width: 320px;
  font-size: 14px;
  line-height: 1.6;
  color: #ffffff;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  white-space: normal;
  word-wrap: break-word;
}

/* 深色模式适配 */
html.dark .tooltip-content {
  background: rgba(44, 140, 99, 0.9);
}

html.dark .annotation-tooltip.is-sentence .tooltip-content {
  background: rgba(90, 103, 216, 0.9);
}
</style>
