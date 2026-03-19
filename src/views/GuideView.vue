<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import '../styles/reader-typography.css'

marked.setOptions({ gfm: true, breaks: true })

const router = useRouter()
const showScrollTop = ref(false)
const activeSection = ref('')

const tocItems = [
  { id: 'quick-start', label: '快速开始', level: 1 },
  { id: 'config-ai', label: '配置 AI 服务', level: 2 },
  { id: 'import-articles', label: '导入文章', level: 2 },
  { id: 'core-features', label: '核心功能', level: 1 },
  { id: 'article-reading', label: '文章阅读', level: 2 },
  { id: 'vocabulary', label: '生词本', level: 2 },
  { id: 'sentences', label: '长难句库', level: 2 },
  { id: 'review', label: '间隔复习', level: 2 },
  { id: 'translate', label: 'AI 翻译', level: 2 },
  { id: 'shortcuts', label: '键盘快捷键', level: 1 },
  { id: 'data-mgmt', label: '数据管理', level: 1 },
  { id: 'faq', label: '常见问题', level: 1 },
]

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function handleScroll() {
  const scrollEl = document.querySelector('.app-main')
  if (!scrollEl) return
  showScrollTop.value = scrollEl.scrollTop > 300

  // Determine active section
  for (let i = tocItems.length - 1; i >= 0; i--) {
    const el = document.getElementById(tocItems[i].id)
    if (el && el.getBoundingClientRect().top <= 120) {
      activeSection.value = tocItems[i].id
      break
    }
  }
}

function scrollToTop() {
  const scrollEl = document.querySelector('.app-main')
  if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' })
}

let scrollTarget: Element | null = null

onMounted(() => {
  nextTick(() => {
    scrollTarget = document.querySelector('.app-main')
    scrollTarget?.addEventListener('scroll', handleScroll)
  })
})

onUnmounted(() => {
  scrollTarget?.removeEventListener('scroll', handleScroll)
})

const guideContent = computed(() => marked.parse(guideMd) as string)

const guideMd = `
<h2 id="quick-start">快速开始</h2>

<h3 id="config-ai">1. 配置 AI 服务</h3>

进入 **设置** → 点击 **AI模型** 行 → 填入你的 DeepSeek API Key。

- API Key 从 [DeepSeek 平台](https://platform.deepseek.com) 获取
- 默认模型为 \`deepseek-chat\`，也可自定义 API 地址和模型名称
- 配置完成后点击 **测试连接** 验证是否可用

<h3 id="import-articles">2. 导入文章</h3>

**方式一：手动新建** — 文章库 → + 新建文章 → 粘贴英文内容 → 保存

**方式二：EPUB 导入** — EPUB 提取 → 选择 .epub 文件 → 勾选章节 → 提取保存

**方式三：OCR 图片导入** — OCR 导入 → 上传图片 → AI 识别校正 → 导入

> OCR 功能需要在设置中额外配置 OCR API。

---

<h2 id="core-features">核心功能</h2>

<h3 id="article-reading">文章阅读</h3>

在文章库中点击文章进入阅读模式：

- **选中单词**：弹出悬浮菜单，一键添加到生词本，AI 自动生成释义
- **选中句子**：弹出悬浮菜单，一键添加到长难句库，AI 自动分析成分
- 所有标注会在文中高亮显示，方便回顾

<h3 id="vocabulary">生词本</h3>

- 汇总所有文章中标注的生词
- 每个生词显示音标、释义、来源文章
- 点击展开可查看各来源上下文

<h3 id="sentences">长难句库</h3>

- 收藏阅读中遇到的复杂句子
- AI 自动解析句子成分（主语/谓语/宾语/定语/状语等）
- 支持搜索和按来源筛选

<h3 id="review">间隔复习</h3>

基于 **FSRS** 算法（Free Spaced Repetition Scheduler）智能安排复习。

**复习流程：**
1. 看到正面（单词或句子）→ 尝试回忆
2. 按 **空格键 / Enter** 翻转卡片查看答案
3. 按 **1-4** 评分：1=重来 / 2=困难 / 3=良好 / 4=简单
4. 按 **S** 可查看句子的结构分析

每张卡片显示各评分对应的下次复习间隔。

<h3 id="translate">AI 翻译</h3>

- 支持单词翻译和句子翻译两种模式
- 翻译结果可一键保存到生词本或句库
- 快捷键 **Ctrl + Enter** 快速翻译

---

<h2 id="shortcuts">键盘快捷键</h2>

| 快捷键 | 功能 | 作用范围 |
|--------|------|----------|
| \`Ctrl + 1~9\` | 快速切换页面 | 全局 |
| \`空格 / Enter\` | 翻转复习卡片 | 复习页 |
| \`1 / 2 / 3 / 4\` | 评分 | 复习页（翻转后） |
| \`S\` | 切换句子结构分析 | 复习页（句子卡） |
| \`Ctrl + Enter\` | 执行翻译 | 翻译页 |

---

<h2 id="data-mgmt">数据管理</h2>

进入 **数据管理** 页面：

- **导出**：将所有生词、句子和设置导出为 JSON 备份文件
- **导入**：从 JSON 文件恢复数据（支持合并 / 覆盖模式）

> 建议定期导出备份，防止数据丢失。

---

<h2 id="faq">常见问题</h2>

**Q: AI 功能不可用？**
A: 请在设置中配置正确的 API Key，并点击"测试连接"验证。

**Q: EPUB 导入后内容异常？**
A: 部分 EPUB 排版复杂，可切换"渲染预览"和"原始 Markdown"检查。

**Q: 复习队列太长？**
A: FSRS 算法会根据评分自动调整间隔。评为"简单"的卡片间隔会快速拉长。坚持每天练习，队列会逐渐稳定。
`
</script>

<template>
  <div class="guide-page fade-in">
    <!-- 左边栏目录 -->
    <aside class="guide-toc">
      <button class="toc-back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        返回
      </button>
      <div class="toc-title">目录</div>
      <nav class="toc-nav">
        <a
          v-for="item in tocItems"
          :key="item.id"
          :class="['toc-link', { active: activeSection === item.id, sub: item.level === 2 }]"
          @click.prevent="scrollToSection(item.id)"
        >{{ item.label }}</a>
      </nav>
    </aside>

    <!-- 右边内容 -->
    <div class="guide-main">
      <div class="guide-header">
        <h1>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          拾语 · 使用指南
        </h1>
        <p>了解拾语的全部功能和操作方法</p>
      </div>

      <div class="guide-body" v-html="guideContent"></div>
    </div>

    <!-- 回到顶部 -->
    <Transition name="fade-btn">
      <button v-show="showScrollTop" class="scroll-top-btn" @click="scrollToTop">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.guide-page {
  display: flex;
  gap: 0;
  min-height: 100%;
  position: relative;
}

/* ── TOC 侧边栏 ── */
.guide-toc {
  width: 180px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: fit-content;
  max-height: 100vh;
  padding: 20px 12px 20px 16px;
  border-right: 1px solid var(--c-border);
  overflow-y: auto;
}

.toc-back {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  color: var(--c-primary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  margin-bottom: 12px;
  transition: background 0.15s;
}
.toc-back:hover { background: var(--c-primary-light); }

.toc-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--c-text-lighter);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0 8px;
  margin-bottom: 8px;
}

.toc-nav { display: flex; flex-direction: column; gap: 1px; }

.toc-link {
  display: block;
  padding: 6px 10px;
  font-size: 0.82rem;
  color: var(--c-text-lighter);
  text-decoration: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 2px solid transparent;
}
.toc-link.sub { padding-left: 20px; font-size: 0.8rem; }
.toc-link:hover { background: var(--c-bg-lighter); color: var(--c-text); }
.toc-link.active {
  color: var(--c-primary);
  font-weight: 600;
  background: var(--c-primary-light);
  border-left-color: var(--c-primary);
}

/* ── 主内容 ── */
.guide-main {
  flex: 1;
  min-width: 0;
  padding: 28px 36px 60px;
  max-width: 720px;
}

.guide-header {
  text-align: center;
  margin-bottom: 2rem;
}
.guide-header h1 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--c-text);
  margin: 0 0 6px;
}
.guide-header p {
  font-size: 0.95rem;
  color: var(--c-text-lighter);
  margin: 0;
}

.guide-body :deep(h2) {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 2rem 0 0.8rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--c-border);
  color: var(--c-text);
}
.guide-body :deep(h3) {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 1.2rem 0 0.5rem;
  color: var(--c-text);
}
.guide-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--c-border);
  margin: 1.5rem 0;
}
.guide-body :deep(blockquote) {
  border-left: 3px solid var(--c-primary);
  background: var(--c-primary-light);
  padding: 0.6rem 1rem;
  border-radius: 0 8px 8px 0;
  margin: 0.8rem 0;
}
.guide-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  margin: 1rem 0;
}
.guide-body :deep(th),
.guide-body :deep(td) {
  padding: 8px 12px;
  border: 1px solid var(--c-border);
  text-align: left;
}
.guide-body :deep(th) {
  background: var(--c-bg-lighter);
  font-weight: 600;
}
.guide-body :deep(code) {
  background: var(--c-bg-lighter);
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.88em;
  font-family: var(--font-mono);
  color: var(--c-primary);
}

/* ── 回到顶部 ── */
.scroll-top-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--c-border);
  background: var(--c-bg-light);
  color: var(--c-text-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.2s;
  z-index: 100;
}
.scroll-top-btn:hover {
  color: var(--c-primary);
  border-color: var(--c-primary);
  transform: translateY(-2px);
}

.fade-btn-enter-active,
.fade-btn-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-btn-enter-from,
.fade-btn-leave-to { opacity: 0; transform: translateY(8px); }
</style>
