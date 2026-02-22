<script setup lang="ts">
import { computed, ref } from "vue"

import { useArticles } from "../legacy/bilingual-pack-client/composables/useArticles"

const { filteredArticles, stats } = useArticles()
const searchQuery = ref("")

const visibleArticles = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return filteredArticles.value

  return filteredArticles.value.filter((article) => {
    const title = article.title.toLowerCase()
    const description = (article.description || "").toLowerCase()
    return title.includes(keyword) || description.includes(keyword)
  })
})

const visibleWordTotal = computed(() =>
  visibleArticles.value.reduce((sum, article) => sum + article.wordCount, 0)
)

const visibleAnnotationTotal = computed(() =>
  visibleArticles.value.reduce((sum, article) => sum + article.vocabularyCount + article.sentenceCount, 0)
)

function clearSearch() {
  searchQuery.value = ""
}
</script>

<template>
  <section class="page-shell article-list-view">
    <header class="page-header">
      <h1 class="page-title">
        <span class="title-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 4h12v16H6z"></path>
            <path d="M9 8h6"></path>
            <path d="M9 12h6"></path>
            <path d="M9 16h4"></path>
          </svg>
        </span>
        文章列表
      </h1>
      <p class="page-subtitle">点击文章后直接进入内容页，阅读与标注流程保持不变。</p>
    </header>

    <div class="stats-row">
      <article class="mini-stat">
        <span class="mini-stat__label">文章总数</span>
        <strong class="mini-stat__value">{{ visibleArticles.length }}</strong>
      </article>
      <article class="mini-stat">
        <span class="mini-stat__label">词数统计</span>
        <strong class="mini-stat__value">{{ visibleWordTotal }}</strong>
      </article>
      <article class="mini-stat">
        <span class="mini-stat__label">标注总数</span>
        <strong class="mini-stat__value">{{ visibleAnnotationTotal }}</strong>
      </article>
      <article class="mini-stat mini-stat--muted">
        <span class="mini-stat__label">全局生词/句子</span>
        <strong class="mini-stat__value">{{ stats.totalVocabulary }}/{{ stats.totalSentences }}</strong>
      </article>
    </div>

    <div class="toolbar">
      <label class="search-box">
        <span class="search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </span>
        <input v-model="searchQuery" type="search" placeholder="搜索文章标题或描述" />
        <button
          v-if="searchQuery"
          class="search-clear"
          type="button"
          aria-label="清空搜索"
          @click="clearSearch"
        >
          ×
        </button>
      </label>
      <span class="result-pill">匹配 {{ visibleArticles.length }} 篇</span>
    </div>

    <TransitionGroup name="list-fade" tag="ul" class="entry-list">
      <li v-for="article in visibleArticles" :key="article.id" class="entry-item">
        <a class="entry-link" :href="article.path">
          <div class="entry-main">
            <h2>{{ article.title }}</h2>
            <p>{{ article.description || "暂无简介" }}</p>
            <div class="meta-row">
              <span>词数 {{ article.wordCount }}</span>
              <span>生词 {{ article.vocabularyCount }}</span>
              <span>句子 {{ article.sentenceCount }}</span>
            </div>
          </div>
          <span class="entry-action">阅读</span>
        </a>
      </li>
    </TransitionGroup>

    <div v-if="visibleArticles.length === 0" class="empty-state">
      <p>没有匹配的文章。</p>
      <button v-if="searchQuery" type="button" class="empty-btn" @click="clearSearch">清空搜索</button>
    </div>
  </section>
</template>

<style scoped>
.page-shell {
  max-width: 980px;
  margin: 0 auto;
  padding: 1.4rem 1rem 2rem;
}

.page-header {
  margin-bottom: 1rem;
}

.page-title {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 1.85rem;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.title-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #ffffff;
  background: linear-gradient(135deg, #0284c7, #0f766e);
  box-shadow: 0 8px 16px rgba(2, 132, 199, 0.3);
}

.title-icon svg {
  width: 18px;
  height: 18px;
}

.page-subtitle {
  margin: 0.45rem 0 0;
  font-size: 0.95rem;
  color: #64748b;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 0.95rem;
}

.mini-stat {
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  border: 1px solid #dbe2ea;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
}

.mini-stat--muted {
  background: linear-gradient(180deg, #f8fafc, #f1f5f9);
}

.mini-stat__label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.mini-stat__value {
  display: block;
  margin-top: 2px;
  font-size: 1.05rem;
  color: #0f172a;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 0.9rem;
}

.search-box {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 11px;
  width: 16px;
  height: 16px;
  color: #64748b;
  pointer-events: none;
}

.search-icon svg {
  width: 100%;
  height: 100%;
}

.search-box input {
  width: 100%;
  height: 40px;
  border: 1px solid #dbe2ea;
  border-radius: 11px;
  background: #ffffff;
  color: #0f172a;
  font-size: 14px;
  padding: 0 34px 0 34px;
  transition: all 0.18s ease;
}

.search-box input:focus {
  outline: none;
  border-color: #7dd3fc;
  box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.22);
}

.search-clear {
  position: absolute;
  right: 8px;
  width: 22px;
  height: 22px;
  border: 1px solid #dbe2ea;
  border-radius: 999px;
  background: #ffffff;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
}

.result-pill {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
  border: 1px solid #bae6fd;
  background: #f0f9ff;
  color: #0c4a6e;
  padding: 6px 10px;
}

.entry-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.entry-item {
  border-radius: 14px;
  border: 1px solid #dbe2ea;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.entry-item::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #0ea5e9, #14b8a6);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.entry-item:hover {
  border-color: #7dd3fc;
  box-shadow: 0 12px 28px rgba(14, 165, 233, 0.15), 0 4px 12px rgba(14, 165, 233, 0.08);
  transform: translateY(-2px);
}

.entry-item:hover::before {
  opacity: 1;
}

.entry-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  text-decoration: none;
}

.entry-main {
  min-width: 0;
}

.entry-main h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #0f172a;
}

.entry-main p {
  margin: 0.45rem 0 0.6rem;
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.55;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-row span {
  display: inline-flex;
  align-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  color: #475569;
  background: #ffffff;
}

.entry-action {
  flex-shrink: 0;
  border-radius: 999px;
  border: 1px solid #5eead4;
  background: linear-gradient(135deg, #14b8a6, #0ea5e9);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  padding: 7px 14px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.25);
}

.entry-item:hover .entry-action {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35);
}

.empty-state {
  margin-top: 0.9rem;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  text-align: center;
  padding: 18px 14px;
  color: #64748b;
}

.empty-state p {
  margin: 0;
}

.empty-btn {
  margin-top: 10px;
  border: 1px solid #dbe2ea;
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  height: 30px;
  padding: 0 10px;
  cursor: pointer;
}

.list-fade-enter-active,
.list-fade-leave-active {
  transition: all 0.2s ease;
}

.list-fade-enter-from,
.list-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 980px) {
  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .page-shell {
    padding: 1rem 0.8rem 1.5rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .result-pill {
    align-self: flex-start;
  }

  .entry-link {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
