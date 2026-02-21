<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { buildSentenceExplanation, splitSentenceExplanation } from '../utils/sentenceExplanation'

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
const sentenceAnalysis = ref('')
const sentenceSummary = ref('')
const sentenceTranslation = ref('')
const wordLabel = '\u91CA\u4E49'
const sentenceLabel = '\u7ED3\u6784\u4E0E\u91CA\u4E49'
const summaryLabel = '\u7ED3\u6784\u603B\u8FF0'
const structureLabel = '\u7ED3\u6784'
const meaningLabel = '\u91CA\u4E49'
const summaryPlaceholder = '\u4E00\u53E5\u8BDD\u603B\u7ED3\u7ED3\u6784...'
const structurePlaceholder = '\u7ED3\u6784\uff08\u4E3B\u5E72/\u4ECE\u53E5/\u4FEE\u9970\u6210\u5206\uff09...'
const meaningPlaceholder = '\u91CA\u4E49\uff08\u81EA\u7136\u6D41\u7545\u7684\u4E2D\u6587\u7FFB\u8BD1\uff09...'
const inputRef = ref<HTMLTextAreaElement | null>(null)
const isGenerating = ref(false)
const generateError = ref('')

const SETTINGS_KEY = 'vuepress-api-settings'
const MAX_CONTEXT_LENGTH = 200

function buildChatUrl(baseUrl: string) {
  const trimmed = baseUrl.trim()
  if (!trimmed) return ''
  if (trimmed.endsWith('#')) {
    return trimmed.slice(0, -1).trim()
  }
  if (trimmed.endsWith('/')) {
    return `${trimmed}chat/completions`
  }
  if (trimmed.endsWith('/v1')) {
    return `${trimmed}/chat/completions`
  }
  return `${trimmed}/v1/chat/completions`
}

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
  const parts = cleanText.split(/[，,；;：:。.!?]/).map(part => part.trim()).filter(Boolean)
  if (parts.length === 0) return cleanText
  const lowerWord = word.toLowerCase()
  const hit = parts.find(part => part.toLowerCase().includes(lowerWord))
  const candidate = hit || parts[0]
  if (candidate.length > MAX_CONTEXT_LENGTH) {
    return candidate.slice(0, MAX_CONTEXT_LENGTH)
  }
  return candidate
}

async function handleAutoMeaning() {
  if (isGenerating.value) return
  if (props.type !== 'word') return

  generateError.value = ''
  isGenerating.value = true

  try {
    const { apiKey, apiUrl, modelId } = getApiSettings()
    const targetUrl = buildChatUrl(apiUrl)
    if (!targetUrl) {
      throw new Error('API 地址无效。')
    }

    const rawContext = (props.contextText || '').trim()
    const context = pickContextSegment(rawContext, props.selectedText) || props.selectedText
    const systemPrompt = '你是英语词义助手。请基于句子语义推断单词在句中的含义。输出 JSON，词性必须为缩写：n., v., adj., adv., prep., conj., pron., det., interj.。释义需先中文后英文。英文释义必须是清晰完整的英英解释（不少于8个英文单词），可以使用“related to”但必须把意思解释清楚；不要加“in this context/The term ... describes”这类多余前缀，直接给定义。只输出 JSON：{"pos":"词性缩写","zh":"中文释义","en":"英文释义(完整句子)"}'
    const userPrompt = `单词：${props.selectedText}\n语境：${context}`

    const content = await requestCompletion(targetUrl, apiKey, modelId, systemPrompt, userPrompt, 200)
    const parsed = parseModelResult(content)
    if (parsed && (parsed.zh || parsed.en)) {
      const pos = parsed.pos ? normalizePos(parsed.pos) : ''
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
    } else if (parsed && parsed.meaning) {
      const pos = parsed.pos ? normalizePos(parsed.pos) : ''
      meaning.value = pos ? `${pos} ${parsed.meaning}` : parsed.meaning
    } else if (content) {
      sentenceAnalysis.value = ''
      sentenceTranslation.value = content.trim()
    } else {
      throw new Error('模型未返回释义。')
    }
  } catch (error: any) {
    generateError.value = error?.message || '生成失败'
  } finally {
    isGenerating.value = false
  }
}

async function handleAutoSentence() {
  if (isGenerating.value) return
  if (props.type !== 'sentence') return

  generateError.value = ''
  isGenerating.value = true

  try {
    const { apiKey, apiUrl, modelId } = getApiSettings()
    const targetUrl = buildChatUrl(apiUrl)
    if (!targetUrl) {
      throw new Error('API 地址无效。')
    }

    const systemPrompt = '你是英语长难句解析助手。请分析句子结构（主干、从句、修饰成分）并给出信达雅的中文释义。结构分析中引用原文时不要全文，只保留开头和结尾，用 ... 连接，便于定位。请输出 JSON，格式为 {"summary":"一句话结构总述","analysis":"结构分解","translation":"中文释义"}。summary 用一句话串起主干/从句/修饰关系。analysis 用简洁的文字列出各成分，不需要换行。只输出 JSON。'
    const userPrompt = `句子：${props.selectedText}`

    const content = await requestCompletion(targetUrl, apiKey, modelId, systemPrompt, userPrompt, 300)
    const parsed = parseModelResult(content)
    if (parsed && (parsed.analysis || parsed.translation)) {
      const analysis = parsed.analysis ? String(parsed.analysis).trim() : ''
      const translation = parsed.translation ? String(parsed.translation).trim() : ''
      const summary = parsed.summary ? String(parsed.summary).trim() : ''
      if (analysis && translation) {
        sentenceSummary.value = summary
        sentenceAnalysis.value = analysis
        sentenceTranslation.value = translation
      } else if (translation) {
        sentenceSummary.value = summary
        sentenceAnalysis.value = ''
        sentenceTranslation.value = translation
      } else {
        sentenceSummary.value = summary
        sentenceAnalysis.value = analysis
        sentenceTranslation.value = ''
      }
    } else if (content) {
      const rawContent = content.trim()
      const parts = splitSentenceExplanation(rawContent)
      sentenceSummary.value = parts.summary
      sentenceAnalysis.value = parts.analysis
      sentenceTranslation.value = parts.translation || parts.raw
    } else {
      throw new Error('模型未返回解析。')
    }
  } catch (error: any) {
    generateError.value = error?.message || '生成失败'
  } finally {
    isGenerating.value = false
  }
}

function getApiSettings() {
  const stored = localStorage.getItem(SETTINGS_KEY)
  if (!stored) {
    throw new Error('请先在 API 设置里填写地址和密钥。')
  }
  const settings = JSON.parse(stored)
  if (!settings.enabled) {
    throw new Error('API 设置未启用。')
  }
  const apiKey = (settings.apiKey || '').split(/[\s,]+/).map((item: string) => item.trim()).filter(Boolean)[0]
  const apiUrl = settings.apiUrl || ''
  const modelId = settings.autoMeaningModelId || settings.checkModelId || settings.models?.[0]?.id

  if (!apiKey || !apiUrl || !modelId) {
    throw new Error('请先配置 API 地址、密钥和模型。')
  }
  return { apiKey, apiUrl, modelId }
}

async function requestCompletion(
  targetUrl: string,
  apiKey: string,
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
) {
  const res = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: maxTokens
    })
  })

  const text = await res.text()
  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`
    try {
      const payload = JSON.parse(text || '{}')
      errorMessage = payload?.error?.message || errorMessage
    } catch {
      // ignore
    }
    throw new Error(errorMessage)
  }

  let content = ''
  try {
    const payload = JSON.parse(text || '{}')
    content = payload?.choices?.[0]?.message?.content || ''
  } catch {
    content = text
  }
  return content
}

function handleSave() {
  if (props.type === 'word') {
    if (meaning.value.trim()) {
      emit('save', meaning.value.trim())
    }
    return
  }
  const combined = buildSentenceExplanation(sentenceAnalysis.value, sentenceTranslation.value, sentenceSummary.value)
  if (combined) {
    emit('save', combined)
  }
}

function handleCancel(e: Event) {
  e.stopPropagation()
  emit('cancel')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('cancel')
  }
  if (e.key === 'Enter' && e.ctrlKey) {
    handleSave()
  }
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
        <h3>{{ type === 'word' ? '📝 添加生词' : '📖 添加长难句' }}</h3>
        <button class="close-btn" @click="handleCancel">✕</button>
      </div>
      
      <div class="form-content">
        <div class="selected-text">
          <label>选中内容</label>
          <div class="text-display">{{ selectedText }}</div>
        </div>
        
        <div class="input-group">
          <div class="label-row">
            <label>{{ type === 'word' ? '\u91ca\u4e49' : '\u7ed3\u6784\u4e0e\u91ca\u4e49' }}</label>
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
              @click="handleAutoSentence"
              :disabled="isGenerating"
            >
              <span v-if="!isGenerating">AI 句子解析</span>
              <span v-else>生成中...</span>
            </button>
          </div>
          <template v-if="type === 'word'">
            <textarea
              ref="inputRef"
              v-model="meaning"
              placeholder="请输入单词释义..."
              rows="3"
            />
          </template>
          <template v-else>
            <div class="sentence-fields">
              <!-- 结构框（包含总述和分解） -->
              <div class="sentence-box structure-box">
                <div class="box-header">结构</div>
                <div class="sentence-field sentence-summary">
                  <label class="sub-label">{{ summaryLabel }}</label>
                  <input
                    ref="inputRef"
                    v-model="sentenceSummary"
                    :placeholder="summaryPlaceholder"
                  />
                </div>
                <div class="sentence-field">
                  <label class="sub-label">{{ structureLabel }}</label>
                  <textarea
                    v-model="sentenceAnalysis"
                    :placeholder="structurePlaceholder"
                    rows="4"
                  />
                </div>
              </div>
              <!-- 释义框 -->
              <div class="sentence-box meaning-box">
                <div class="box-header">释义</div>
                <div class="sentence-field">
                  <textarea
                    v-model="sentenceTranslation"
                    :placeholder="meaningPlaceholder"
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
          <button class="btn btn-save" @click="handleSave" :disabled="type === 'word' ? !meaning.trim() : !(sentenceSummary.trim() || sentenceAnalysis.trim() || sentenceTranslation.trim())">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.annotation-form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.annotation-form {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.25s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.form-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 4px;
}

.close-btn:hover {
  color: #333;
}

.form-content {
  padding: 20px;
}

.selected-text {
  margin-bottom: 16px;
}

.selected-text label,
.input-group label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.text-display {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 15px;
  color: #333;
  line-height: 1.5;
  max-height: 100px;
  overflow-y: auto;
}

.input-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.sentence-field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.4;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.input-group textarea:focus {
  outline: none;
  border-color: #3eaf7c;
}

.sentence-field input:focus {
  outline: none;
  border-color: #3eaf7c;
}

.sentence-fields {
  display: grid;
  gap: 14px;
}

.sentence-box {
  background: #f8f9fb;
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid #e8eaed;
}

:root.dark .sentence-box {
  background: rgba(40, 40, 42, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
}

.box-header {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e0e3e7;
}

:root.dark .box-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.structure-box .box-header {
  color: #7b61ff;
}

.meaning-box .box-header {
  color: #4a90e2;
}

.sentence-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sentence-box .sentence-field + .sentence-field {
  margin-top: 10px;
}

.sub-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

:root.dark .sub-label {
  color: #aaa;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #eee;
  background: #fafafa;
  border-radius: 0 0 12px 12px;
}

.hint {
  font-size: 12px;
  color: #999;
}

.btn-group {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f0f0f0;
  color: #666;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-save {
  background: linear-gradient(135deg, #3eaf7c, #2d9d6c);
  color: #fff;
}

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #2d9d6c, #1e8d5c);
  transform: translateY(-1px);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ai {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  background: #f0f7f3;
  color: #2d9d6c;
  border: 1px solid rgba(45, 157, 108, 0.3);
}

.btn-ai:hover:not(:disabled) {
  background: #e2f2ea;
}

.btn-ai:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ai-error {
  margin-top: 8px;
  font-size: 12px;
  color: #b03a2e;
}
</style>
