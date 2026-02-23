<script setup lang="ts">
import { computed, watchEffect } from "vue"
import { useRoute } from "vue-router"

import BilingualReader from "../legacy/bilingual-pack-client/components/BilingualReader.vue"
import ArticleToc from "../components/ArticleToc.vue"

import { articleContentMap, articleMetaMap } from "virtual:article-content"

const route = useRoute()

function ensureHtmlPath(pathname: string): string {
  const withoutTrailingSlash = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
  if (!withoutTrailingSlash) return "/"
  return withoutTrailingSlash.endsWith(".html") ? withoutTrailingSlash : `${withoutTrailingSlash}.html`
}

function resolveArticlePath(pathname: string): string | null {
  const normalizedPath = ensureHtmlPath(pathname)
  const decodedPath = decodeURI(normalizedPath)
  const encodedPath = encodeURI(decodedPath)
  const strictEncodedPath = decodedPath.replace(/ /g, "%20")

  const candidates = [normalizedPath, decodedPath, encodedPath, strictEncodedPath]
  for (const candidate of candidates) {
    if (candidate in articleContentMap) {
      return candidate
    }
  }
  return null
}

const articlePath = computed(() => {
  const pathname = typeof window !== "undefined" ? window.location.pathname : route.path
  return resolveArticlePath(pathname)
})

const articleHtml = computed(() => (articlePath.value ? articleContentMap[articlePath.value] : ""))
const articleTitle = computed(() => {
  if (!articlePath.value) return "Article Not Found"
  return articleMetaMap[articlePath.value]?.title || "Article"
})

const articleMeta = computed(() => {
  if (!articlePath.value) return null
  return articleMetaMap[articlePath.value] || null
})

const readingTime = computed(() => {
  if (!articleHtml.value) return 0
  const text = articleHtml.value.replace(/<[^>]*>/g, "")
  const charCount = text.length
  const minutes = Math.ceil(charCount / 200)
  return minutes
})

function formatDate(dateString: string) {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })
}

watchEffect(() => {
  if (typeof document !== "undefined") {
    document.title = articleTitle.value
  }
})
</script>

<template>
  <main class="article-content-view">
    <!-- 目录组件 -->
    <ArticleToc container-selector=".article-body" />

    <div v-if="articleHtml" class="article-container">
      <!-- 文章标题区域 -->
      <header class="article-header">
        <div class="header-top">
          <RouterLink to="/articles.html" class="back-link">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            返回列表
          </RouterLink>
        </div>
        
        <h1 class="article-title">{{ articleTitle }}</h1>
        
        <div v-if="articleMeta || readingTime" class="article-meta">
          <span v-if="articleMeta?.date" class="meta-item">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {{ formatDate(articleMeta.date) }}
          </span>
          <span v-if="articleMeta?.author" class="meta-item">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            {{ articleMeta.author }}
          </span>
          <span v-if="readingTime > 0" class="meta-item">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            约 {{ readingTime }} 分钟
          </span>
          <span v-if="articleMeta?.category" class="meta-item category">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            {{ articleMeta.category }}
          </span>
        </div>
      </header>

      <BilingualReader>
        <article class="article-body" v-html="articleHtml"></article>
      </BilingualReader>
    </div>

    <section v-else class="article-missing">
      <h1>Article Not Found</h1>
      <p>Requested article content is not available.</p>
      <RouterLink to="/articles.html">Go Back To Articles</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.article-content-view {
  margin: 0 auto;
  max-width: 1200px;
  padding: 2rem 1.5rem 3rem;
  min-height: calc(100vh - 64px);
}

.article-container {
  max-width: 960px;
  margin: 0 auto;
}

/* 文章标题区域 */
.article-header {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #e2e8f0;
}

.header-top {
  margin-bottom: 1.5rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.back-link:hover {
  background: #ffffff;
  border-color: #0ea5e9;
  color: #0ea5e9;
  transform: translateX(-2px);
}

.back-link svg {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.back-link:hover svg {
  transform: translateX(-2px);
}

.article-title {
  margin: 0 0 1rem;
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  align-items: center;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #64748b;
  padding: 0.4rem 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.meta-item svg {
  flex-shrink: 0;
  color: #94a3b8;
}

.meta-item.category {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border-color: #bae6fd;
  color: #0369a1;
  font-weight: 600;
}

.meta-item.category svg {
  color: #0ea5e9;
}

.article-body {
  color: #1e293b;
  line-height: 1.85;
  font-size: 1.05rem;
  background: #ffffff;
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 10px 30px rgba(0, 0, 0, 0.03);
  border: 1px solid #e2e8f0;
}

.article-body :deep(h1) {
  font-size: 1.85rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 2.5rem 0 1.25rem;
  color: #0f172a;
  letter-spacing: -0.02em;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e2e8f0;
}

.article-body :deep(h1:first-child) {
  margin-top: 0;
}

.article-body :deep(h2) {
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.3;
  margin: 2.5rem 0 1rem;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.article-body :deep(h3) {
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 2rem 0 0.85rem;
  color: #1e293b;
}

.article-body :deep(h4) {
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.45;
  margin: 1.75rem 0 0.75rem;
  color: #334155;
}

.article-body :deep(p) {
  margin: 1.25rem 0;
  color: #334155;
}

.article-body :deep(a) {
  color: #0ea5e9;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.2s ease;
}

.article-body :deep(a:hover) {
  color: #0284c7;
  border-bottom-color: #0284c7;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: 1.25rem 0;
  padding-left: 1.75rem;
}

.article-body :deep(li) {
  margin: 0.5rem 0;
  color: #334155;
}

.article-body :deep(blockquote) {
  margin: 1.5rem 0;
  padding: 1rem 1.5rem;
  border-left: 4px solid #0ea5e9;
  background: linear-gradient(90deg, #f0f9ff, #ffffff);
  border-radius: 0 8px 8px 0;
  color: #475569;
  font-style: italic;
}

.article-body :deep(code) {
  background: #f1f5f9;
  color: #e11d48;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

.article-body :deep(pre) {
  margin: 1.5rem 0;
  padding: 1.25rem;
  background: #1e293b;
  border-radius: 10px;
  overflow-x: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.article-body :deep(pre code) {
  background: transparent;
  color: #e2e8f0;
  padding: 0;
  font-size: 0.9rem;
}

.article-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  margin: 1.5rem 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.article-body :deep(hr) {
  margin: 2.5rem 0;
  border: none;
  border-top: 2px solid #e2e8f0;
}

.article-body :deep(table) {
  width: 100%;
  margin: 1.5rem 0;
  border-collapse: collapse;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.article-body :deep(th) {
  background: #f1f5f9;
  color: #0f172a;
  font-weight: 600;
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 2px solid #cbd5e1;
}

.article-body :deep(td) {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  color: #334155;
}

.article-body :deep(tr:last-child td) {
  border-bottom: none;
}

.article-body :deep(tr:hover) {
  background: #f8fafc;
}

.article-missing {
  margin: 6rem auto;
  max-width: 640px;
  text-align: center;
  padding: 3rem 2rem;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
}

.article-missing h1 {
  margin: 0 0 1rem;
  font-size: 2rem;
  color: #0f172a;
}

.article-missing p {
  margin: 0 0 1.5rem;
  color: #64748b;
  font-size: 1.05rem;
}

.article-missing a {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: #ffffff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

.article-missing a:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4);
}

@media (max-width: 768px) {
  .article-content-view {
    padding: 1.5rem 1rem 2rem;
  }

  .article-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
  }

  .header-top {
    margin-bottom: 1rem;
  }

  .back-link {
    font-size: 0.85rem;
    padding: 0.4rem 0.75rem;
  }

  .article-title {
    font-size: 1.75rem;
  }

  .article-meta {
    gap: 0.75rem;
  }

  .meta-item {
    font-size: 0.85rem;
    padding: 0.35rem 0.6rem;
  }

  .article-body {
    padding: 1.5rem 1.25rem;
    font-size: 1rem;
  }

  .article-body :deep(h1) {
    font-size: 1.5rem;
  }

  .article-body :deep(h2) {
    font-size: 1.35rem;
  }

  .article-body :deep(h3) {
    font-size: 1.2rem;
  }

  .article-missing {
    margin: 3rem auto;
    padding: 2rem 1.5rem;
  }
}
</style>
