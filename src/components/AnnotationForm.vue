<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { translateText } from '../services/api'
import { buildSentenceExplanation } from '../utils/sentenceExplanation'

const props = defineProps<{
  selectedText: string
  contextText?: string
  type: 'word' | 'sentence'
}>()

const emit = defineEmits<{
  save: [meaning: string]
  cancel: []
}>()

const meaning = ref('')
const sentenceTranslation = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const isGenerating = ref(false)
const generateError = ref('')
const MAX_CONTEXT_LENGTH = 200

// 句子成分划分
const structureParsed = ref('')
const structureNote = ref('')
const isParsing = ref(false)
const parseError = ref('')

function parseModelResult(text: string) {
  const raw = text.trim()
  try {
    return JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
    return null
  }
}

function normalizePos(raw: string) {
  const pos = raw.trim().toLowerCase()
  const map: Record<string, string> = {
    noun: 'n.',
    n: 'n.',
    verb: 'v.',
    v: 'v.',
    adjective: 'adj.',
    adj: 'adj.',
    adverb: 'adv.',
    adv: 'adv.',
    preposition: 'prep.',
    prep: 'prep.',
    conjunction: 'conj.',
    conj: 'conj.',
    pronoun: 'pron.',
    pron: 'pron.',
    determiner: 'det.',
    det: 'det.',
    interjection: 'interj.',
    interj: 'interj.'
  }
  return map[pos] || raw
}

function pickContextSegment(fullText: string, word: string) {
  const cleanText = fullText.trim()
  if (!cleanText) return ''
  const parts = cleanText
    .split(/[，,；;：:。.!?]/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return cleanText
  const lowerWord = word.toLowerCase()
  const hit = parts.find((part) => part.toLowerCase().includes(lowerWord))
  const candidate = hit || parts[0]
  if (candidate.length > MAX_CONTEXT_LENGTH) {
    return candidate.slice(0, MAX_CONTEXT_LENGTH)
  }
  return candidate
}

/**
 * AI 自动释义（调用 Tauri 后端 translate_text）
 */
async function handleAutoMeaning() {
  if (isGenerating.value || props.type !== 'word') return
  generateError.value = ''
  isGenerating.value = true

  try {
    const context = pickContextSegment((props.contextText || '').trim(), props.selectedText) || props.selectedText
    const text = context
      ? `单词：${props.selectedText}\n语境：${context}`
      : props.selectedText

    const { result } = await translateText({
      text,
      prompt_type: 'word',
    })
    const content = result.trim()
    const parsed = parseModelResult(content)
    if (parsed && (parsed.zh || parsed.en)) {
      const pos = parsed.pos ? normalizePos(String(parsed.pos)) : ''
      const zh = parsed.zh ? String(parsed.zh).trim() : ''
      const en = parsed.en ? String(parsed.en).trim() : ''
      if (pos && zh && en) {
        meaning.value = `${pos} ${zh}；${en}`
      } else if (pos && zh) {
        meaning.value = `${pos} ${zh}`
      } else if (zh && en) {
        meaning.value = `${zh}；${en}`
      } else {
        meaning.value = (zh || en).trim()
      }
      return
    }

    if (parsed && parsed.meaning) {
      const pos = parsed.pos ? normalizePos(String(parsed.pos)) : ''
      const coreMeaning = String(parsed.meaning).trim()
      meaning.value = pos ? `${pos} ${coreMeaning}` : coreMeaning
      return
    }

    if (content) {
      meaning.value = content
      return
    }

    throw new Error('模型未返回释义。')
  } catch (error: any) {
    generateError.value = error?.message || error?.toString() || '生成失败'
  } finally {
    isGenerating.value = false
  }
}

/**
 * AI 智能解析（成分划分 + 释义）
 */
async function handleAIAnalyze() {
  if (isParsing.value || props.type !== 'sentence') return
  generateError.value = ''
  parseError.value = ''
  isParsing.value = true

  try {
    const { result } = await translateText({
      text: `句子：${props.selectedText}`,
      prompt_type: 'sentence_structure',
    })
    const content = result.trim()
    const parsed = parseModelResult(content)
    if (parsed && parsed.parsed_html) {
      structureParsed.value = parsed.parsed_html
      structureNote.value = parsed.structure_note || ''
      if (parsed.translation) {
        sentenceTranslation.value = String(parsed.translation).trim()
      }
    } else if (content) {
      structureParsed.value = content
    }
  } catch (e: any) {
    parseError.value = e?.message || e?.toString() || '划分失败'
  } finally {
    isParsing.value = false
  }
}

function handleSave() {
  if (props.type === 'word') {
    if (meaning.value.trim()) {
      emit('save', meaning.value.trim())
    }
    return
  }
  const combined = buildSentenceExplanation(
    structureParsed.value,
    structureNote.value,
    sentenceTranslation.value
  )
  if (combined) {
    emit('save', combined)
  }
}

function handleCancel(e: Event) {
  e.stopPropagation()
  emit('cancel')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
  if (e.key === 'Enter' && e.ctrlKey) handleSave()
}

onMounted(() => {
  inputRef.value?.focus()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="annotation-form-overlay" @click="handleCancel">
    <div class="annotation-form" @click.stop>
      <div class="form-header">
        <h3>{{ type === 'word' ? '添加生词' : '添加长难句' }}</h3>
        <button class="close-btn" @click="handleCancel">✕</button>
      </div>

      <div class="form-content">
        <div class="selected-text">
          <label>选中内容</label>
          <div class="text-display">{{ selectedText }}</div>
        </div>

        <div class="input-group">
          <div class="label-row">
            <label>{{ type === 'word' ? '释义' : '成分划分与释义' }}</label>
            <button
              v-if="type === 'word'"
              class="btn btn-ai"
              @click="handleAutoMeaning"
              :disabled="isGenerating"
            >
              <span v-if="!isGenerating">AI 自动释义</span>
              <span v-else>生成中...</span>
            </button>
            <button
              v-else
              class="btn btn-ai"
              @click="handleAIAnalyze"
              :disabled="isParsing"
            >
              <span v-if="!isParsing">AI 智能解析</span>
              <span v-else>解析中...</span>
            </button>
          </div>

          <!-- 单词模式 -->
          <template v-if="type === 'word'">
            <textarea
              ref="inputRef"
              v-model="meaning"
              placeholder="请输入单词释义..."
              rows="3"
            />
          </template>

          <!-- 长难句模式 -->
          <template v-else>
            <!-- AI解析中占位 -->
            <div v-if="isGenerating || isParsing" class="ai-loading">
              <div class="loading-shimmer"></div>
              <div class="loading-shimmer short"></div>
            </div>

            <!-- 成分划分结果 -->
            <div v-if="structureParsed" class="parsed-structure-panel">
              <div class="parsed-header">
                <span class="parsed-label">🔬 成分划分</span>
              </div>
              <div class="parsed-content" v-html="structureParsed"></div>
              <div v-if="structureNote" class="parsed-note">{{ structureNote }}</div>
            </div>
            <div v-if="parseError" class="ai-error">{{ parseError }}</div>

            <div class="sentence-fields">
              <div class="sentence-box meaning-box">
                <div class="box-header">释义</div>
                <div class="sentence-field">
                  <textarea
                    ref="inputRef"
                    v-model="sentenceTranslation"
                    placeholder="释义（自然流畅的中文翻译）..."
                    rows="3"
                  />
                </div>
              </div>
            </div>
          </template>

          <div v-if="generateError" class="ai-error">{{ generateError }}</div>
        </div>
      </div>

      <div class="form-actions">
        <span class="hint">Ctrl+Enter 保存 | Esc 取消</span>
        <div class="btn-group">
          <button class="btn btn-cancel" @click="handleCancel">取消</button>
          <button
            class="btn btn-save"
            @click="handleSave"
            :disabled="type === 'word' ? !meaning.trim() : !(structureParsed || sentenceTranslation.trim())"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.annotation-form-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.annotation-form {
  font-family: var(--font-sans);
  background: var(--c-bg-light);
  border-radius: 16px;
  width: 90%;
  max-width: 520px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--c-border-light, #f1f5f9);
  background: linear-gradient(135deg, var(--c-bg-lighter), var(--c-bg-lighter));
}
.form-header h3 { 
  margin: 0; 
  font-size: 18px; 
  font-weight: 700;
  color: var(--c-text); 
}

.close-btn {
  background: none; border: none;
  font-size: 20px; color: var(--c-text-lighter);
  cursor: pointer; padding: 4px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.close-btn:hover { color: var(--c-text); background: var(--c-border); }

.form-content { padding: 24px; max-height: 70vh; overflow-y: auto; }

.selected-text { margin-bottom: 20px; }
.selected-text label,
.input-group label {
  display: block; font-size: 14px; font-weight: 600;
  color: var(--c-text-lighter); margin-bottom: 8px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.text-display {
  padding: 14px 16px;
  background: var(--c-bg-lighter);
  border-radius: 10px;
  font-size: 15px;
  font-family: var(--font-serif);
  color: var(--c-text);
  line-height: 1.75;
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid var(--c-border);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}

.input-group textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--c-border);
  background: var(--c-bg-light);
  color: var(--c-text);
  border-radius: 10px;
  font-size: 15px;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.2s;
  box-sizing: border-box;
  font-family: inherit;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.input-group textarea:focus { 
  outline: none; 
  border-color: #007AFF; 
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1); 
}

.sentence-field input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--c-border);
  background: var(--c-bg-light);
  color: var(--c-text);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  transition: border-color 0.2s;
  box-sizing: border-box;
  font-family: inherit;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}
.sentence-field input:focus { 
  outline: none; 
  border-color: #007AFF; 
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1); 
}

.sentence-fields { display: grid; gap: 16px; }
.sentence-box {
  background: var(--c-bg-lighter);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--c-border);
}
.box-header {
  font-size: 14px; font-weight: 700;
  margin-bottom: 12px; padding-bottom: 8px;
  border-bottom: 1px solid var(--c-border);
}
.structure-box .box-header { color: #8b5cf6; }
.meaning-box .box-header { color: #007AFF; }
.sentence-field { display: flex; flex-direction: column; gap: 6px; }
.sentence-box .sentence-field + .sentence-field { margin-top: 12px; }
.sub-label { font-size: 12px; color: var(--c-text-lighter); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid var(--c-border-light, #f1f5f9);
  background: var(--c-bg-lighter);
}

.hint { font-size: 13px; color: var(--c-text-lighter); }
.btn-group { display: flex; gap: 12px; }

.btn {
  padding: 10px 24px; border: none;
  border-radius: 8px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
  font-family: inherit;
}
.btn-cancel { background: var(--c-border); color: var(--c-text-lighter); }
.btn-cancel:hover { background: var(--c-border); color: var(--c-text); }
.btn-save {
  background: linear-gradient(135deg, #007AFF, #409CFF);
  color: #fff;
  box-shadow: 0 4px 12px rgba(95,186,125,0.25);
}
.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(95,186,125,0.35);
}
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }

.btn-ai {
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  background: var(--c-bg-lighter);
  color: #007AFF;
  border: 1px solid #bae6fd;
  transition: all 0.2s;
}
.btn-ai:hover:not(:disabled) { 
  background: #e0f2fe; 
  border-color: #7dd3fc;
}
.btn-ai:disabled { opacity: 0.6; cursor: not-allowed; }
.ai-error { margin-top: 12px; font-size: 13px; color: #ef4444; background: #fef2f2; padding: 8px 12px; border-radius: 6px; border: 1px solid #fecaca; }

/* Loading shimmer */
.ai-loading { display: grid; gap: 10px; margin-bottom: 16px; }
.loading-shimmer {
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(90deg, var(--c-border-light, #f1f5f9) 25%, var(--c-border) 50%, var(--c-border-light, #f1f5f9) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
.loading-shimmer.short { height: 24px; width: 60%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Parsed structure panel */
.parsed-structure-panel { margin-bottom: 16px; background: var(--c-bg-lighter); border: 1px solid var(--c-border); border-radius: 12px; overflow: hidden; }
.parsed-header { display: flex; align-items: center; padding: 10px 16px; background: linear-gradient(135deg, #faf5ff, #ede9fe); border-bottom: 1px solid var(--c-border); }
.parsed-label { font-size: 14px; font-weight: 700; color: #7c3aed; }
.parsed-content { padding: 14px 16px; font-size: 15px; line-height: 2.2; color: var(--c-text); word-break: break-word; font-family: var(--font-serif); }
.parsed-note { padding: 8px 16px 12px; font-size: 13px; color: var(--c-text-lighter); font-style: italic; border-top: 1px solid var(--c-border-light, #f1f5f9); }
</style>

<!-- non-scoped: ps-* color classes for v-html -->
<style>
@import '../styles/parsed-sentence.css';
</style>
