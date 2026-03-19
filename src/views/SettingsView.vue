<script setup lang="ts">
// 设置页
import { ref, onMounted, onUnmounted } from 'vue'
import { getSetting, setSetting, testApiConnection } from '../services/api'
import { APP_VERSION } from '../constants/app'
import VersionAnnouncement from '../components/VersionAnnouncement.vue'

const apiKey = ref('')
const apiUrl = ref('https://api.deepseek.com/v1/chat/completions')
const apiModel = ref('deepseek-chat')
const saving = ref(false)
const testing = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const ocrApiUrl = ref('')
const ocrApiToken = ref('')

// ── 弹框 ──
const showAiModal = ref(false)
const showAbout = ref(false)


onMounted(async () => {
  try {
    const key = await getSetting('api_key')
    const url = await getSetting('api_url')
    const model = await getSetting('api_model')
    if (key) apiKey.value = key
    if (url) apiUrl.value = url
    if (model) apiModel.value = model
    const ocrUrl = await getSetting('ocr_api_url')
    const ocrToken = await getSetting('ocr_api_token')
    if (ocrUrl) ocrApiUrl.value = ocrUrl
    if (ocrToken) ocrApiToken.value = ocrToken
  } catch (e) {
    console.error('Failed to load settings:', e)
  }


  // 帮助卡片轮播
  startCarousel()
})

onUnmounted(() => {
  if (tipTimer) clearInterval(tipTimer)
})

// ── 帮助卡片 ──
const helpTips = [
  { icon: '📖', title: '智能阅读', desc: '选中单词或句子，一键添加到生词本和句库，AI 自动生成释义' },
  { icon: '🔄', title: '间隔复习', desc: '基于 FSRS 算法智能安排复习，用 1-4 键快速评分' },
  { icon: '📋', title: '长难句解析', desc: 'AI 自动分析句子成分，主谓宾定状一目了然' },
  { icon: '🌐', title: 'AI 翻译', desc: '单词/句子翻译，结果可直接存入生词本或句库' },
  { icon: '📚', title: 'EPUB 导入', desc: '直接导入电子书，按章节提取并保存为文章' },
  { icon: '📷', title: 'OCR 识别', desc: '拍照上传，自动识别文字并 AI 校正导入' },
]
const activeTip = ref(0)
const visibleCount = 3 // 同时显示 3 张卡片
const totalSteps = Math.ceil(helpTips.length / visibleCount) // 2 页
let tipTimer: ReturnType<typeof setInterval> | null = null

function startCarousel() {
  tipTimer = setInterval(() => {
    activeTip.value = (activeTip.value + 1) % totalSteps
  }, 4000)
}

function pauseCarousel() {
  if (tipTimer) { clearInterval(tipTimer); tipTimer = null }
}

function resumeCarousel() {
  if (!tipTimer) startCarousel()
}

// ── 拖拽切换 ──
let dragStartX = 0
let isDragging = false

function onDragStart(e: MouseEvent) {
  isDragging = true
  dragStartX = e.clientX
  pauseCarousel()
}

function onDragEnd(e: MouseEvent) {
  if (!isDragging) return
  isDragging = false
  const dx = e.clientX - dragStartX
  if (Math.abs(dx) > 50) {
    if (dx < 0 && activeTip.value < totalSteps - 1) {
      activeTip.value++
    } else if (dx > 0 && activeTip.value > 0) {
      activeTip.value--
    }
  }
  resumeCarousel()
}

async function handleSave() {
  saving.value = true
  message.value = ''
  try {
    await setSetting('api_key', apiKey.value.trim())
    await setSetting('api_url', apiUrl.value.trim())
    await setSetting('api_model', apiModel.value.trim())
    await setSetting('ocr_api_url', ocrApiUrl.value.trim())
    await setSetting('ocr_api_token', ocrApiToken.value.trim())
    message.value = '✅ 设置已保存'
    messageType.value = 'success'
  } catch (e: any) {
    message.value = `保存失败: ${e}`
    messageType.value = 'error'
  } finally {
    saving.value = false
  }
}

async function handleTest() {
  testing.value = true
  message.value = ''
  try {
    const result = await testApiConnection()
    message.value = `✅ ${result}`
    messageType.value = 'success'
  } catch (e: any) {
    message.value = `❌ ${e}`
    messageType.value = 'error'
  } finally {
    testing.value = false
  }
}


</script>

<template>
  <div class="page-container fade-in">

    <!-- ═══ 服务配置 分组 ═══ -->
    <h3 class="group-title">服务配置</h3>
    <div class="settings-group">
      <div class="setting-row clickable" @click="showAiModal = true">
        <label class="setting-label">AI模型</label>
        <div class="setting-content row-inline">
          <span class="setting-value">{{ apiModel || '未配置' }}</span>
          <svg class="row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 6 15 12 9 18"/></svg>
        </div>
      </div>
    </div>

    <!-- ═══ 关于 分组 ═══ -->
    <h3 class="group-title">关于</h3>
    <div class="settings-group">
      <div class="setting-row clickable" @click="showAbout = true">
        <label class="setting-label">版本</label>
        <div class="setting-content row-inline">
          <span class="setting-value">v{{ APP_VERSION }}</span>
          <svg class="row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 6 15 12 9 18"/></svg>
        </div>
      </div>
    </div>

    <!-- ═══ 帮助 分组 ═══ -->
    <h3 class="group-title">帮助</h3>
    <div class="help-carousel-wrapper">
      <div class="help-carousel" @mouseenter="pauseCarousel" @mouseleave="resumeCarousel"
        @mousedown.prevent="onDragStart" @mouseup="onDragEnd" @mouseleave.self="onDragEnd"
      >
        <div class="help-track" :style="{ transform: `translateX(-${activeTip * (100 / totalSteps)}%)` }">
          <div
            v-for="(tip, i) in helpTips"
            :key="i"
            class="help-tip-card"
          >
            <span class="tip-icon">{{ tip.icon }}</span>
            <div class="tip-body">
              <div class="tip-title">{{ tip.title }}</div>
              <div class="tip-desc">{{ tip.desc }}</div>
            </div>
          </div>
        </div>
        <div class="tip-dots">
          <span
            v-for="(_, i) in totalSteps"
            :key="i"
            class="tip-dot"
            :class="{ active: i === activeTip }"
            @click="activeTip = i"
          />
        </div>
      </div>
      <button class="btn btn-outline guide-link" @click="$router.push('/guide')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        查看完整使用指南
      </button>
    </div>

    <!-- ═══ 版权声明 ═══ -->
    <div class="settings-footer">
      <p class="footer-copyright">MIT License © 2026 amluckydave</p>
    </div>

    <!-- ===== AI模型 弹框（DeepSeek + OCR） ===== -->
    <Transition name="fade">
      <div v-if="showAiModal" class="modal-overlay" @click.self="showAiModal = false">
        <div class="modal-box">
          <h3 class="modal-title">AI 模型设置</h3>

          <p class="modal-section-label">DeepSeek API</p>
          <div class="modal-field">
            <label>API Key</label>
            <input v-model="apiKey" class="input" type="password" placeholder="输入你的 DeepSeek API Key" />
            <p class="setting-hint">从 <a href="https://platform.deepseek.com" target="_blank">DeepSeek 平台</a> 获取</p>
          </div>
          <div class="modal-field">
            <label>API URL</label>
            <input v-model="apiUrl" class="input" placeholder="https://api.deepseek.com/v1/chat/completions" />
          </div>
          <div class="modal-field">
            <label>模型</label>
            <input v-model="apiModel" class="input" placeholder="deepseek-chat" />
          </div>

          <p class="modal-section-label" style="margin-top: 20px;">OCR 识别</p>
          <div class="modal-field">
            <label>API URL</label>
            <input v-model="ocrApiUrl" class="input" placeholder="PP-StructureV3 API 地址" />
            <p class="setting-hint">从 <a href="https://aistudio.baidu.com/paddleocr/task" target="_blank">百度 AI Studio</a> 获取</p>
          </div>
          <div class="modal-field">
            <label>Token</label>
            <input v-model="ocrApiToken" class="input" type="password" placeholder="Access Token" />
          </div>

          <Transition name="slide">
            <div v-if="message" class="msg" :class="messageType" style="margin-top: 8px;">{{ message }}</div>
          </Transition>

          <div class="modal-actions">
            <button class="btn btn-outline" @click="handleTest" :disabled="testing || !apiKey.trim()">
              {{ testing ? '测试中...' : '测试连接' }}
            </button>
            <button class="btn btn-primary" @click="handleSave" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>



    <!-- ===== 关于弹窗（复用 VersionAnnouncement） ===== -->
    <VersionAnnouncement v-model="showAbout" manual />

    <!-- 底部收尾 -->
    <div class="settings-footer">
      <span>拾语 · 智能双语英语学习桌面应用</span>
    </div>

  </div>
</template>

<style scoped>
/* ══════════════════════════════════════
   Settings — Apple System Settings Style
   ══════════════════════════════════════ */

/* ── 分组标题 ── */
.group-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: #86868b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 0 16px;
  margin: 24px 0 6px 0;
}
.group-title:first-of-type {
  margin-top: 0;
}

/* ── 分组容器 ── */
.settings-group {
  background: var(--c-bg-light);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  overflow: hidden;
}

/* ── indent 分隔线 ── */
.row-divider {
  height: 0;
  border-bottom: 0.5px solid var(--c-border);
  margin-left: 76px;       /* 跳过 label 区域 */
}

/* ── 行布局 ── */
.setting-row {
  display: flex;
  align-items: center;
  padding: 13px 16px;
  cursor: default;
  transition: background 0.15s ease;
}
.setting-row.clickable {
  cursor: pointer;
}
.setting-row.clickable:hover {
  background: rgba(0, 0, 0, 0.025);
}

.setting-label {
  flex: 0 0 60px;
  font-size: 14px;
  font-weight: 400;
  color: #86868b;
}

.setting-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row-inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.setting-value {
  font-size: 14px;
  color: var(--c-text);
}

/* ── Chevron 箭头 ── */
.row-chevron {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: #c7c7cc;
  flex-shrink: 0;
  margin-left: auto;
}

/* ── 辅助文字 / 链接 ── */
.setting-hint {
  font-size: var(--fs-sm);
  color: var(--c-text-lighter);
  line-height: 1.5;
}
.setting-hint a {
  color: var(--c-primary);
  text-decoration: none;
  font-weight: 500;
}
.setting-hint a:hover { text-decoration: underline; }

/* ── 消息反馈 ── */
.msg {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: var(--fs-base);
  font-weight: 600;
}
.msg.success {
  background: rgba(0, 122, 255, 0.06);
  color: #388E3C;
  border: 1px solid rgba(0, 122, 255, 0.15);
}
.msg.error {
  background: rgba(239, 68, 68, 0.06);
  color: #c0392b;
  border: 1px solid rgba(239, 68, 68, 0.15);
}



/* ── 通用弹框（Apple 风格微调） ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: overlay-blur-in 0.25s ease;
}

@keyframes overlay-blur-in {
  from {
    backdrop-filter: blur(0);
    -webkit-backdrop-filter: blur(0);
    background: rgba(15, 23, 42, 0);
  }
}
.modal-box {
  background: var(--c-bg-light);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  padding: 28px 32px 24px;
  width: 440px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.1), 0 0 0 0.5px rgba(0, 0, 0, 0.05);
  animation: card-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform, opacity;
}
@keyframes card-pop {
  from { opacity: 0; transform: scale(0.9) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.modal-title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text);
  margin: 0 0 20px 0;
}
.modal-section-label {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: #86868b;
  letter-spacing: 0.3px;
  margin: 0 0 12px 0;
}
.modal-field {
  margin-bottom: 16px;
}
.modal-field label {
  display: block;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text);
  margin-bottom: 6px;
}
.modal-field .input {
  width: 100%;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.025);
  border-color: rgba(0, 0, 0, 0.06);
  backdrop-filter: none;
}
.modal-field .input:focus {
  background: rgba(0, 0, 0, 0.04);
}
.modal-field .setting-hint {
  margin-top: 4px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

/* ── 弹框信息行 ── */
.modal-info-row {
  display: flex;
  align-items: center;
  padding: 10px 0;
  font-size: var(--fs-base);
  color: var(--c-text);
}
.modal-info-label {
  flex: 0 0 60px;
  font-weight: 600;
  color: #86868b;
  font-size: var(--fs-sm);
}


.btn-danger-outline { align-self: flex-start; }

/* ── 底部收尾 ── */
.settings-footer {
  margin-top: 32px;
  padding: 0 16px;
  font-size: var(--fs-sm);
  color: #86868b;
  opacity: 0.5;
}

/* ── 过渡动画 ── */
.slide-enter-active { animation: slide-in 0.3s ease; }
.slide-leave-active { animation: slide-in 0.2s ease reverse; }
@keyframes slide-in {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── 帮助卡片轮播 ── */
.help-carousel-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.help-carousel {
  width: 100%;
  background: var(--c-bg-light);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  padding: 16px 0 12px;
  overflow: hidden;
  cursor: grab;
  user-select: none;
}

.help-carousel:active {
  cursor: grabbing;
}

.help-track {
  display: flex;
  width: 200%; /* 6 cards / 3 visible = 2 pages */
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.help-tip-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 0 0 calc(100% / 6); /* 1/6 of track = 1/3 of container */
  min-width: 0;
  padding: 4px 16px;
  box-sizing: border-box;
}

.tip-icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.tip-body { flex: 1; min-width: 0; }

.tip-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--c-text);
  margin-bottom: 4px;
}

.tip-desc {
  font-size: 0.85rem;
  color: var(--c-text-lighter);
  line-height: 1.5;
}

.tip-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
}

.tip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-border);
  cursor: pointer;
  transition: all 0.25s;
}

.tip-dot.active {
  width: 18px;
  border-radius: 3px;
  background: var(--c-primary);
}

.guide-link {
  font-size: 0.85rem;
  gap: 6px;
}

/* 卡片切换动画 */
.tip-slide-enter-active { animation: tipIn 0.35s ease; }
.tip-slide-leave-active { animation: tipIn 0.25s ease reverse; position: absolute; width: calc(100% - 48px); }
@keyframes tipIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* ── 版权声明页脚 ── */
.settings-footer {
  text-align: center;
  padding: 32px 0 16px;
  margin-top: 8px;
  border-top: 1px solid var(--c-border);
}
.footer-copyright {
  font-size: 12px;
  color: var(--c-text-lighter);
  margin: 0 0 6px;
  letter-spacing: 0.3px;
}


</style>

