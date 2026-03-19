<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'

const router = useRouter()
const appStore = useAppStore()

/* ── 动态问候（含时段配色主题） ── */
function getGreeting() {
  const h = new Date().getHours()
  if (h < 6)  return { text: '夜深了', emoji: '🌙', theme: 'hero--night' }
  if (h < 12) return { text: '早上好', emoji: '☀️', theme: 'hero--morning' }
  if (h < 18) return { text: '下午好', emoji: '👋', theme: 'hero--afternoon' }
  return { text: '晚上好', emoji: '🌙', theme: 'hero--evening' }
}

const greeting = getGreeting()

/* ── 统计数据（从store获取，支持缓存）── */
const stats = computed(() => ({
  vocabulary: appStore.vocabularyCount,
  sentences: appStore.sentencesCount,
  articles: appStore.articlesCount,
}))

const loading = computed(() =>
  !appStore.vocabularyLoaded ||
  !appStore.sentencesLoaded ||
  !appStore.articlesLoaded
)

onMounted(async () => {
  await Promise.all([
    appStore.fetchVocabulary(),
    appStore.fetchSentences(),
    appStore.fetchArticles(),
  ])
})

/* ── 快捷操作 ── */
const quickActions = [
  { label: 'AI 翻译', desc: '智能翻译单词或句子', icon: 'ai', route: '/translate', color: '#007AFF' },
  { label: '生词本', desc: '管理你的词汇积累', icon: 'book', route: '/vocabulary', color: '#5856D6' },
  { label: '句库', desc: '收藏精彩长难句', icon: 'text', route: '/sentences', color: '#FF9500' },
  { label: '文章阅读', desc: '沉浸式英文阅读', icon: 'article', route: '/articles', color: '#34C759' },
  { label: 'EPUB 导入', desc: '提取电子书章节', icon: 'epub', route: '/epub-import', color: '#AF52DE' },
  { label: 'OCR 导入', desc: '图片识别导入文章', icon: 'ocr', route: '/ocr-import', color: '#FF2D55' },
]

function go(route: string) {
  router.push(route)
}
</script>

<template>
  <div class="dashboard">
    <!-- Hero 欢迎横幅 -->
    <section class="hero" :class="greeting.theme">
      <div class="hero-content">
        <h1 class="hero-title">{{ greeting.text }} {{ greeting.emoji }}</h1>
        <p class="hero-subtitle">继续你的英语学习之旅</p>
      </div>
      <!-- CSS 动态装饰 -->
      <div class="hero-decor">
        <span class="decor decor-circle decor-1"></span>
        <span class="decor decor-circle decor-2"></span>
        <span class="decor decor-ring decor-3"></span>
        <span class="decor decor-circle decor-4"></span>
        <span class="decor decor-ring decor-5"></span>
        <span class="decor decor-circle decor-6"></span>
        <span class="decor decor-dot decor-7"></span>
        <span class="decor decor-dot decor-8"></span>
        <div class="hero-shimmer"></div>
      </div>
    </section>

    <!-- 统计卡片 -->
    <section class="stats-grid">
      <div class="stat-card" @click="go('/vocabulary')" style="--dot-color: #8b5cf6">
        <div class="stat-dot"></div>
        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M4 5h8a3 3 0 013 3v11H7a3 3 0 00-3 3z"/><path d="M20 5h-8a3 3 0 00-3 3v11h8a3 3 0 013 3z"/>
        </svg>
        <div class="stat-body">
          <span class="stat-number" :class="{ skeleton: loading }">{{ loading ? '' : stats.vocabulary }}</span>
          <span class="stat-label">生词</span>
        </div>
      </div>

      <div class="stat-card" @click="go('/sentences')" style="--dot-color: #f59e0b">
        <div class="stat-dot"></div>
        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M4 6h16"/><path d="M4 12h11"/><path d="M4 18h8"/>
        </svg>
        <div class="stat-body">
          <span class="stat-number" :class="{ skeleton: loading }">{{ loading ? '' : stats.sentences }}</span>
          <span class="stat-label">句子</span>
        </div>
      </div>

      <div class="stat-card" @click="go('/articles')" style="--dot-color: #10b981">
        <div class="stat-dot"></div>
        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        <div class="stat-body">
          <span class="stat-number" :class="{ skeleton: loading }">{{ loading ? '' : stats.articles }}</span>
          <span class="stat-label">文章</span>
        </div>
      </div>
    </section>

    <!-- 快捷操作 -->
    <section class="quick-section">
      <h2 class="section-title">快捷操作</h2>
      <div class="quick-grid">
        <button
          v-for="(action, idx) in quickActions"
          :key="action.route"
          class="quick-card"
          :style="{ '--accent': action.color, '--accent-soft': action.color + '14', '--delay': idx * 60 + 'ms' }"
          @click="go(action.route)"
        >
          <div class="quick-icon-wrap">
            <!-- AI 翻译 — globe -->
            <svg v-if="action.icon === 'ai'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            <!-- 生词本 — book.closed -->
            <svg v-else-if="action.icon === 'book'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M9 7h6"/><path d="M9 11h4"/></svg>
            <!-- 句库 — text.quote -->
            <svg v-else-if="action.icon === 'text'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 6H3"/><path d="M21 12H8"/><path d="M17 18H3"/><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/></svg>
            <!-- 文章 — book.open -->
            <svg v-else-if="action.icon === 'article'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 7c-1.5-2-4-3-7-3v13c3 0 5.5 1 7 3 1.5-2 4-3 7-3V4c-3 0-5.5 1-7 3z"/></svg>
            <!-- EPUB — doc.text -->
            <svg v-else-if="action.icon === 'epub'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M10 13h4"/><path d="M10 17h4"/><path d="M10 9h1"/></svg>
            <!-- OCR — viewfinder -->
            <svg v-else-if="action.icon === 'ocr'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 7V2h5"/><path d="M22 7V2h-5"/><path d="M2 17v5h5"/><path d="M22 17v5h-5"/><circle cx="12" cy="12" r="3"/><path d="M12 5v2"/><path d="M12 17v2"/><path d="M5 12h2"/><path d="M17 12h2"/></svg>
          </div>
          <span class="quick-label">{{ action.label }}</span>
          <span class="quick-desc">{{ action.desc }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════
   Dashboard — Apple-style Minimalism
   ══════════════════════════════════════ */

.dashboard {
  padding: 28px 36px 48px;
  max-width: 960px;
  animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* ── Hero 欢迎横幅 ── */
.hero {
  position: relative;
  background: linear-gradient(135deg, #007AFF 0%, #409CFF 50%, #7ABAFF 100%); /* fallback */
  transition: background 0.6s ease;
  border-radius: 18px;
  padding: 36px 40px;
  margin-bottom: 28px;
  overflow: hidden;
  min-height: 140px;
  display: flex;
  align-items: center;
}

/* 时段配色 */
.hero--morning  { background: linear-gradient(135deg, #F2994A 0%, #F2C94C 50%, #F7DC6F 100%); }
.hero--afternoon { background: linear-gradient(135deg, #007AFF 0%, #409CFF 50%, #7ABAFF 100%); }
.hero--evening  { background: linear-gradient(135deg, #4A00E0 0%, #7B2FF7 40%, #8E54E9 100%); }
.hero--night    { background: linear-gradient(135deg, #0F0C29 0%, #302B63 50%, #24243E 100%); }

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-title {
  font-size: 30px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

.hero-subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.78);
  font-weight: 500;
}

/* 几何装饰 — 基础 */
.hero-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.decor {
  position: absolute;
}

.decor-circle {
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}

.decor-ring {
  border-radius: 50%;
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.18);
}

.decor-dot {
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
}

/* 装饰元素定位 + 动画 */
.decor-1 {
  width: 160px; height: 160px;
  right: -20px; top: -30px;
  background: rgba(255, 255, 255, 0.12);
  animation: heroFloat 6s ease-in-out infinite;
}

.decor-2 {
  width: 90px; height: 90px;
  right: 140px; bottom: -15px;
  background: rgba(255, 255, 255, 0.1);
  animation: heroDrift 8s ease-in-out infinite;
}

.decor-3 {
  width: 80px; height: 80px;
  right: 260px; top: 10px;
  animation: heroFloat 7s ease-in-out infinite 0.5s;
}

.decor-4 {
  width: 50px; height: 50px;
  right: 60px; top: 50px;
  background: rgba(255, 255, 255, 0.18);
  animation: heroPulse 4s ease-in-out infinite;
}

.decor-5 {
  width: 120px; height: 120px;
  right: 180px; bottom: -30px;
  animation: heroDrift 9s ease-in-out infinite 1s;
}

.decor-6 {
  width: 30px; height: 30px;
  right: 320px; bottom: 25px;
  background: rgba(255, 255, 255, 0.2);
  animation: heroPulse 5s ease-in-out infinite 0.8s;
}

.decor-7 {
  width: 8px; height: 8px;
  right: 100px; top: 25px;
  animation: heroPulse 3s ease-in-out infinite 0.2s;
}

.decor-8 {
  width: 6px; height: 6px;
  right: 300px; top: 35px;
  animation: heroPulse 4s ease-in-out infinite 1.5s;
}

/* 光晕扫动 */
.hero-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.08) 45%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.08) 55%,
    transparent 60%
  );
  background-size: 200% 100%;
  animation: heroShimmer 6s ease-in-out infinite;
}

/* 动画关键帧 */
@keyframes heroFloat {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-18px) scale(1.05); }
}

@keyframes heroDrift {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(10px, -12px) rotate(4deg); }
  66% { transform: translate(-6px, -8px) rotate(-3deg); }
}

@keyframes heroPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.4); opacity: 1; }
}

@keyframes heroShimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── 统计卡片 ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 28px;
}

.stat-card {
  --dot-color: #007AFF;
  position: relative;
  background: linear-gradient(135deg, var(--c-bg-light) 55%, color-mix(in srgb, var(--dot-color) 8%, transparent));
  border: 1px solid var(--c-border);
  border-radius: 14px;
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
}

.stat-card:nth-child(1) { animation-delay: 100ms; }
.stat-card:nth-child(2) { animation-delay: 160ms; }
.stat-card:nth-child(3) { animation-delay: 220ms; }

.stat-card:hover {
  border-color: color-mix(in srgb, var(--dot-color) 30%, transparent);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px -6px color-mix(in srgb, var(--dot-color) 15%, transparent);
}

.stat-dot {
  display: none;
}

.stat-icon {
  width: 40px;
  height: 40px;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: var(--dot-color);
  flex-shrink: 0;
  padding: 8px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--dot-color) 10%, transparent);
}

.stat-body {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--c-text);
  line-height: 1;
  letter-spacing: -0.5px;
  min-height: 28px;
  min-width: 30px;
}

.stat-number.skeleton {
  background: linear-gradient(90deg, var(--c-border-light, #f1f5f9) 25%, var(--c-border) 50%, var(--c-border-light, #f1f5f9) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
  width: 50px;
  height: 28px;
}

.stat-label {
  font-size: 13px;
  color: var(--c-text-lighter);
  font-weight: 500;
  margin-top: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── 快捷操作 ── */
.quick-section {
  animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 280ms both;
}

.section-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--c-text);
  margin-bottom: 16px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.quick-card {
  --accent: #007AFF;
  --accent-soft: #007AFF14;
  position: relative;
  background: linear-gradient(145deg, var(--c-bg-light) 60%, var(--accent-soft));
  border: 1px solid var(--c-border);
  border-radius: 14px;
  padding: 18px 16px 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  font-family: inherit;
  text-align: left;
  animation: fadeSlideUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--delay);
  overflow: hidden;
}

.quick-card::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  transform: translate(25%, -25%);
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.quick-card:hover {
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px -8px color-mix(in srgb, var(--accent) 18%, transparent);
  background: linear-gradient(145deg, var(--c-bg-light) 40%, color-mix(in srgb, var(--accent) 6%, transparent));
}

.quick-card:hover::before {
  width: 140px;
  height: 140px;
  transform: translate(15%, -15%);
}

.quick-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  margin-bottom: 10px;
  position: relative;
  z-index: 1;
}

.quick-card:hover .quick-icon-wrap {
  transform: scale(1.1);
  background: color-mix(in srgb, var(--accent) 16%, transparent);
}

.quick-icon-wrap svg {
  width: 22px;
  height: 22px;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.quick-label {
  font-size: 14px;
  font-weight: 650;
  color: var(--c-text);
  margin-bottom: 3px;
  position: relative;
  z-index: 1;
}

.quick-desc {
  font-size: 12px;
  color: var(--c-text-lighter);
  line-height: 1.4;
  position: relative;
  z-index: 1;
}

/* ── 入场动画 ── */
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── 响应式 ── */
@media (max-width: 860px) {
  .dashboard { padding: 20px 18px 40px; }
  .hero { padding: 28px 24px; min-height: 120px; border-radius: 20px; }
  .hero-title { font-size: 24px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .quick-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 560px) {
  .stats-grid { grid-template-columns: 1fr; }
  .quick-grid { grid-template-columns: 1fr; }
}
</style>
