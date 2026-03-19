<script setup lang="ts">
import { ref } from 'vue'
import { translateText, addVocabulary, addSentence } from '../services/api'

const inputText = ref('')
const result = ref('')
const loading = ref(false)
const promptType = ref<'word' | 'sentence' | 'complex_sentence'>('sentence')
const saveMsg = ref('')

async function handleTranslate() {
  if (!inputText.value.trim()) return
  loading.value = true
  result.value = ''
  saveMsg.value = ''
  try {
    const res = await translateText({
      text: inputText.value.trim(),
      prompt_type: promptType.value,
    })
    result.value = res.result
  } catch (e: any) {
    result.value = `错误：${e}`
  } finally {
    loading.value = false
  }
}

async function saveToVocab() {
  if (!inputText.value.trim() || !result.value) return
  try {
    await addVocabulary({ word: inputText.value.trim(), meaning: result.value })
    saveMsg.value = '✅ 已保存到生词本'
  } catch (e: any) {
    saveMsg.value = `保存失败: ${e}`
  }
}

async function saveToSentences() {
  if (!inputText.value.trim() || !result.value) return
  try {
    await addSentence({ sentence: inputText.value.trim(), explanation: result.value })
    saveMsg.value = '✅ 已保存到句库'
  } catch (e: any) {
    saveMsg.value = `保存失败: ${e}`
  }
}
</script>

<template>
  <div class="page-container fade-in">
    <div class="page-header">
      <h1 class="page-title">
        <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20"/>
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
        AI 翻译
      </h1>
      <p class="page-subtitle">智能翻译单词或句子，支持 Ctrl+Enter 快捷翻译</p>
    </div>

    <div class="card translate-card">
      <!-- Mode selector -->
      <div class="mode-selector">
        <button
          v-for="mode in [
            { key: 'word', label: '单词释义' },
            { key: 'sentence', label: '句子翻译' },
            { key: 'complex_sentence', label: '复杂句分析' },
          ] as const"
          :key="mode.key"
          class="mode-btn"
          :class="{ active: promptType === mode.key }"
          @click="promptType = mode.key"
        >
          {{ mode.label }}
        </button>
      </div>

      <!-- Input -->
      <textarea
        v-model="inputText"
        class="textarea translate-input"
        :placeholder="promptType === 'word' ? '输入英文单词...' : '输入英文句子...'"
        rows="4"
        @keydown.ctrl.enter="handleTranslate"
      ></textarea>

      <div class="translate-actions">
        <button class="btn btn-primary" @click="handleTranslate" :disabled="loading || !inputText.trim()">
          {{ loading ? '翻译中...' : '翻译' }}
        </button>
        <span class="shortcut-hint">Ctrl + Enter</span>
      </div>

      <!-- Result -->
      <Transition name="slide">
        <div v-if="result" class="result-box">
          <div class="result-label">翻译结果</div>
          <div class="result-content">{{ result }}</div>
          <div class="result-actions">
            <button class="btn btn-outline btn-sm" @click="saveToVocab" v-if="promptType === 'word'">
              存入生词本
            </button>
            <button class="btn btn-outline btn-sm" @click="saveToSentences" v-if="promptType !== 'word'">
              存入句库
            </button>
            <span v-if="saveMsg" class="save-msg">{{ saveMsg }}</span>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-top: 1rem;
}
.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 2rem;
  font-weight: 700;
  color: var(--c-text);
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}
.page-subtitle {
  font-size: 1rem;
  color: var(--c-text-lighter);
  margin: 0;
}
.translate-card { display: flex; flex-direction: column; gap: 16px; }

.mode-selector { display: flex; gap: 6px; }
.mode-btn {
  padding: 8px 18px;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: var(--c-bg);
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-lighter);
  cursor: pointer;
  transition: all 0.2s;
}
.mode-btn:hover { border-color: var(--c-primary); color: var(--c-primary); }
.mode-btn.active {
  color: #fff;
  background: var(--c-primary);
  border-color: transparent;
}

.translate-input { min-height: 100px; font-size: 15px; line-height: 1.7; }
.translate-actions { display: flex; align-items: center; gap: 12px; }
.shortcut-hint { font-size: 12px; color: var(--c-text-lighter); }

.result-box {
  border-top: 1px solid var(--c-border);
  padding-top: 16px;
}
.result-label {
  font-size: 12px;
  font-weight: 600;
  color: #86868b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 8px;
}
.result-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--c-text);
  white-space: pre-wrap;
  background: var(--c-bg-lighter);
  border-radius: 10px;
  padding: 16px;
}

.result-actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.btn-sm { height: 32px; padding: 0 14px; font-size: 12px; }
.save-msg { font-size: 13px; color: var(--c-accent); font-weight: 600; }

.slide-enter-active { animation: slide-in 0.3s ease; }
.slide-leave-active { animation: slide-in 0.2s ease reverse; }
@keyframes slide-in { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
</style>
