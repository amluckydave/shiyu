<script setup lang="ts">
import { computed, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

import EbookReader from "../legacy/components/EbookReader.vue"
import { useEbooks, type EbookInfo } from "../legacy/bilingual-pack-client/composables/useEbooks"

const route = useRoute()
const router = useRouter()
const { ebooks, getEbookUrl } = useEbooks()

const searchQuery = ref("")
const openingBookId = ref<string | null>(null)

const activeBookUrl = computed(() => {
  const value = route.query.book
  if (typeof value !== "string") return null
  return value.trim() ? value : null
})

const isReaderMode = computed(() => !!activeBookUrl.value)

const visibleEbooks = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return ebooks.value

  return ebooks.value.filter((book) => {
    const title = book.title.toLowerCase()
    const author = (book.author || "").toLowerCase()
    const description = (book.description || "").toLowerCase()
    return title.includes(keyword) || author.includes(keyword) || description.includes(keyword)
  })
})

const withAuthorCount = computed(() => visibleEbooks.value.filter((book) => !!book.author).length)

const formatCount = computed(() => {
  const uniqueFormats = new Set(visibleEbooks.value.map((book) => book.format))
  return uniqueFormats.size
})

const loadedProgressCount = computed(() =>
  visibleEbooks.value.filter((book) => typeof book.progress === "number" && book.progress > 0).length
)

async function openEbook(book: EbookInfo) {
  if (typeof window === "undefined") return

  openingBookId.value = book.id
  const ebookUrl = getEbookUrl(book)

  try {
    const cache = await caches.open("ebook-preload")
    const response = await fetch(ebookUrl)
    if (response.ok) {
      await cache.put(ebookUrl, response)
    }
  } catch {
    // 预加载失败时，阅读器会自行请求
  }

  await router.push({
    path: "/ebooks.html",
    query: { book: ebookUrl }
  })
  openingBookId.value = null
}

function clearSearch() {
  searchQuery.value = ""
}

function formatDate(timestamp?: number) {
  if (!timestamp) return "未知时间"
  return new Date(timestamp).toLocaleDateString("zh-CN")
}
</script>

<template>
  <section v-if="!isReaderMode" class="page-shell ebook-list-view">
    <header class="page-header">
      <h1 class="page-title">
        <span class="title-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </span>
        电子书列表
      </h1>
      <p class="page-subtitle">点击后在当前页面进入阅读器，不再额外跳转中间界面。</p>
    </header>

    <div class="stats-row">
      <article class="mini-stat">
        <span class="mini-stat__label">书籍总数</span>
        <strong class="mini-stat__value">{{ visibleEbooks.length }}</strong>
      </article>
      <article class="mini-stat">
        <span class="mini-stat__label">格式数量</span>
        <strong class="mini-stat__value">{{ formatCount }}</strong>
      </article>
      <article class="mini-stat">
        <span class="mini-stat__label">含作者信息</span>
        <strong class="mini-stat__value">{{ withAuthorCount }}</strong>
      </article>
      <article class="mini-stat mini-stat--muted">
        <span class="mini-stat__label">有阅读进度</span>
        <strong class="mini-stat__value">{{ loadedProgressCount }}</strong>
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
        <input v-model="searchQuery" type="search" placeholder="搜索书名、作者或描述" />
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
      <span class="result-pill">匹配 {{ visibleEbooks.length }} 本</span>
    </div>

    <TransitionGroup name="list-fade" tag="ul" class="entry-list">
      <li v-for="book in visibleEbooks" :key="book.id" class="entry-item">
        <button class="entry-link" :disabled="openingBookId === book.id" @click="openEbook(book)">
          <div class="entry-main">
            <h2>{{ book.title }}</h2>
            <p>{{ book.description || "暂无简介" }}</p>
            <div class="meta-row">
              <span v-if="book.author">作者 {{ book.author }}</span>
              <span>格式 {{ book.format.toUpperCase() }}</span>
              <span>收录 {{ formatDate(book.addedAt) }}</span>
            </div>
          </div>
          <span class="entry-action">
            {{ openingBookId === book.id ? "打开中..." : "阅读" }}
          </span>
        </button>
      </li>
    </TransitionGroup>

    <div v-if="visibleEbooks.length === 0" class="empty-state">
      <p>没有匹配的电子书。</p>
      <button v-if="searchQuery" type="button" class="empty-btn" @click="clearSearch">清空搜索</button>
    </div>
  </section>

  <section v-else class="ebook-reader-view">
    <EbookReader :key="route.fullPath" />
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
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  box-shadow: 0 8px 16px rgba(139, 92, 246, 0.35);
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
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.entry-item:hover {
  border-color: #c4b5fd;
  box-shadow: 0 12px 28px rgba(139, 92, 246, 0.15), 0 4px 12px rgba(139, 92, 246, 0.08);
  transform: translateY(-2px);
}

.entry-item:hover::before {
  opacity: 1;
}

.entry-link {
  width: 100%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.entry-link:disabled {
  opacity: 0.72;
  cursor: default;
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
  border: 1px solid #c4b5fd;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  padding: 7px 14px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.25);
}

.entry-item:hover .entry-action {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);
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

.ebook-reader-view {
  min-height: calc(100vh - 64px);
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
