<script setup lang="ts">
import type { VocabularyItem } from '../services/api'
import { useTTS } from '../composables/useTTS'
import { formatDate } from '../utils/format'
import {
  getContextSentence,
  getMeaningDefinition,
  getMeaningPhonetic,
  getMeaningPos,
} from '../composables/useVocabularyDisplay'

defineProps<{
  word: VocabularyItem
  index: number
}>()

defineEmits<{
  delete: [id: string, event: Event]
  review: [id: string]
  'go-to-article': [word: VocabularyItem]
  speak: [text: string, rate: string]
}>()

const { isSpeaking, isLoading, speakingKey, loadingKey, speak } = useTTS()

function getWordTtsKey(text: string): string {
  return `${text.trim()}__-10%`
}

function isWordLoading(text: string): boolean {
  return isLoading.value && loadingKey.value === getWordTtsKey(text)
}

function isWordSpeaking(text: string): boolean {
  return isSpeaking.value && speakingKey.value === getWordTtsKey(text)
}
</script>
<template>
  <div
    class="word-card"
    :data-word-id="word.id"
    :style="{ '--delay': index * 0.03 + 's' }"
  >
    <div class="word-card__indicator" :class="{ 'word-card__indicator--reviewed': word.review_count > 0 }"></div>

    <div class="word-card__content">
      <div class="word-card__header">
        <div class="word-card__word-row">
          <div class="word-card__word">{{ word.word }}</div>
          <button
            class="tts-btn"
            :class="{ 'tts-btn--active': isWordSpeaking(word.word), 'tts-btn--loading': isWordLoading(word.word) }"
            title="朗读发音"
            @click.stop="speak(word.word, '-10%')"
            :disabled="isLoading"
          >
            <svg v-if="!isWordLoading(word.word)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
            <svg v-else class="tts-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
            </svg>
          </button>
        </div>
        <div class="word-card__badges">
          <span v-if="word.review_count > 0" class="review-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            {{ word.review_count }}
          </span>
          <span v-else class="new-badge">NEW</span>
        </div>
      </div>

      <div class="word-card__meaning" :title="word.meaning">
        <div class="meaning-main">{{ getMeaningDefinition(word) }}</div>
        <div
          v-if="getMeaningPhonetic(word) || getMeaningPos(word)"
          class="meaning-meta"
        >
          <span v-if="getMeaningPhonetic(word)" class="meaning-chip meaning-chip--phonetic">
            {{ getMeaningPhonetic(word) }}
          </span>
          <span v-if="getMeaningPos(word)" class="meaning-chip meaning-chip--pos">
            {{ getMeaningPos(word) }}
          </span>
        </div>
      </div>

      <div v-if="getContextSentence(word)" class="word-card__context">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>{{ getContextSentence(word) }}</span>
      </div>

      <div class="word-card__footer">
        <div class="word-card__meta">
          <span class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {{ formatDate(word.created_at) }}
          </span>
        </div>

        <div class="word-card__actions">
          <button
            v-if="word.article_path"
            class="action-btn action-btn--link"
            title="跳转原文"
            @click="$emit('go-to-article', word)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </button>
          <button
            class="action-btn action-btn--review"
            title="标记复习"
            @click="$emit('review', word.id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </button>
          <button
            class="action-btn action-btn--delete"
            title="删除"
            @click="$emit('delete', word.id, $event)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
