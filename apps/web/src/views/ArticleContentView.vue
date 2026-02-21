<script setup lang="ts">
import { computed, watchEffect } from "vue"
import { useRoute } from "vue-router"

import BilingualReader from "../legacy/bilingual-pack-client/components/BilingualReader.vue"

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

watchEffect(() => {
  if (typeof document !== "undefined") {
    document.title = articleTitle.value
  }
})
</script>

<template>
  <main class="article-content-view">
    <BilingualReader v-if="articleHtml">
      <article class="article-body" v-html="articleHtml"></article>
    </BilingualReader>

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
  max-width: 960px;
  padding: 1.5rem;
}

.article-body {
  color: var(--c-text);
  line-height: 1.8;
}

.article-body :deep(h1),
.article-body :deep(h2),
.article-body :deep(h3) {
  line-height: 1.35;
  margin-top: 1.8rem;
  margin-bottom: 0.75rem;
}

.article-body :deep(p) {
  margin: 0.9rem 0;
}

.article-missing {
  margin: 4rem auto;
  max-width: 640px;
  text-align: center;
}

.article-missing a {
  color: #2563eb;
}
</style>
