import fs from "node:fs"
import path from "node:path"
import type { IncomingMessage, ServerResponse } from "node:http"
import { defineConfig, type Plugin } from "vite"
import vue from "@vitejs/plugin-vue"

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\s*[\r\n]+([\s\S]*?)\r?\n---\s*[\r\n]*/)
  if (!match) return {}

  const block = match[1]
  const result: Record<string, string> = {}
  for (const line of block.split(/\r?\n/)) {
    const idx = line.indexOf(":")
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "")
    result[key] = value
  }
  return result
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\s*[\r\n]+[\s\S]*?\r?\n---\s*[\r\n]*/, "")
}

function extractReaderBody(content: string): string {
  const match = content.match(/<BilingualReader>\s*([\s\S]*?)\s*<\/BilingualReader>/i)
  if (match) return match[1].trim()
  return content.trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function markdownToBasicHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  const html: string[] = []
  const paragraphBuffer: string[] = []

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return
    const text = paragraphBuffer.join(" ").trim()
    if (text) {
      html.push(`<p>${escapeHtml(text)}</p>`)
    }
    paragraphBuffer.length = 0
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushParagraph()
      continue
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph()
      html.push(`<h3>${escapeHtml(trimmed.slice(4).trim())}</h3>`)
      continue
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph()
      html.push(`<h2>${escapeHtml(trimmed.slice(3).trim())}</h2>`)
      continue
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph()
      html.push(`<h1>${escapeHtml(trimmed.slice(2).trim())}</h1>`)
      continue
    }

    paragraphBuffer.push(trimmed)
  }

  flushParagraph()
  return html.join("\n")
}

function countWords(content: string): number {
  const words = content.match(/[a-zA-Z]+(?:'[a-zA-Z]+)?/g)
  return words ? words.length : 0
}

function buildArticleArtifacts(articlesDir: string): {
  articles: Array<{
    id: string
    title: string
    path: string
    icon: string
    description: string
    wordCount: number
    vocabularyCount: number
    sentenceCount: number
    category: string
    isCustom: boolean
  }>
  contentMap: Record<string, string>
  metaMap: Record<string, { title: string }>
} {
  if (!fs.existsSync(articlesDir)) {
    return { articles: [], contentMap: {}, metaMap: {} }
  }

  const files = fs
    .readdirSync(articlesDir)
    .filter((file) => file.endsWith(".md") && file !== "README.md")

  const articles: Array<{
    id: string
    title: string
    path: string
    icon: string
    description: string
    wordCount: number
    vocabularyCount: number
    sentenceCount: number
    category: string
    isCustom: boolean
  }> = []
  const contentMap: Record<string, string> = {}
  const metaMap: Record<string, { title: string }> = {}

  for (const file of files) {
    const filePath = path.join(articlesDir, file)
    const raw = fs.readFileSync(filePath, "utf-8")
    const frontmatter = parseFrontmatter(raw)
    const noFrontmatter = stripFrontmatter(raw)
    const readerBody = extractReaderBody(noFrontmatter)
    const html = markdownToBasicHtml(readerBody)
    const fileName = file.replace(/\.md$/, "")
    const htmlPath = `/content/articles/${encodeURIComponent(fileName)}.html`
    const title = frontmatter.title || fileName
    const plainContent = readerBody.replace(/<[^>]+>/g, " ")
    const fallbackDescription = plainContent.trim().slice(0, 100)

    articles.push({
      id: `auto-${file}`,
      title,
      path: htmlPath,
      icon: frontmatter.icon || "file-alt",
      description: frontmatter.description || (fallbackDescription ? `${fallbackDescription}${fallbackDescription.length === 100 ? "..." : ""}` : title),
      wordCount: countWords(plainContent),
      vocabularyCount: 0,
      sentenceCount: 0,
      category: frontmatter.category || "article",
      isCustom: false
    })

    contentMap[htmlPath] = html
    metaMap[htmlPath] = { title }
  }

  return { articles, contentMap, metaMap }
}

function getContentType(filePath: string): string {
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8"
  if (filePath.endsWith(".epub")) return "application/epub+zip"
  if (filePath.endsWith(".mobi")) return "application/x-mobipocket-ebook"
  if (filePath.endsWith(".azw3")) return "application/vnd.amazon.ebook"
  if (filePath.endsWith(".md")) return "text/markdown; charset=utf-8"
  return "application/octet-stream"
}

function sendFile(filePath: string, response: ServerResponse): void {
  try {
    const buffer = fs.readFileSync(filePath)
    response.statusCode = 200
    response.setHeader("Content-Type", getContentType(filePath))
    response.end(buffer)
  } catch {
    response.statusCode = 500
    response.end("Failed to read file.")
  }
}

function createContentStaticPlugin(contentRoot: string): Plugin {
  return {
    name: "content-static-plugin",
    configureServer(server) {
      server.middlewares.use("/content", (request: IncomingMessage, response: ServerResponse, next: () => void) => {
        if (!request.url || (request.method !== "GET" && request.method !== "HEAD")) {
          next()
          return
        }

        const url = new URL(request.url, "http://localhost")
        const relativePath = decodeURIComponent(url.pathname.replace(/^\/+/, ""))
        const safePath = path.normalize(relativePath)
        const targetPath = path.join(contentRoot, safePath)

        if (!targetPath.startsWith(contentRoot)) {
          response.statusCode = 403
          response.end("Forbidden.")
          return
        }

        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
          sendFile(targetPath, response)
          return
        }

        next()
      })
    }
  }
}

function createArticleVirtualModulePlugin(articlesDir: string): Plugin {
  const articleDataVirtualId = "\0article-data-virtual"
  const articleContentVirtualId = "\0article-content-virtual"

  return {
    name: "article-virtual-module-plugin",
    resolveId(id) {
      if (id === "@temp/internal/article-data") {
        return articleDataVirtualId
      }
      if (id === "virtual:article-content") {
        return articleContentVirtualId
      }
      return null
    },
    load(id) {
      const artifacts = buildArticleArtifacts(articlesDir)
      if (id === articleDataVirtualId) {
        return `export const articles = ${JSON.stringify(artifacts.articles)};`
      }
      if (id === articleContentVirtualId) {
        return [
          `export const articleContentMap = ${JSON.stringify(artifacts.contentMap)};`,
          `export const articleMetaMap = ${JSON.stringify(artifacts.metaMap)};`
        ].join("\n")
      }
      return null
    }
  }
}

function createLegacyHtmlRouteFallbackPlugin(): Plugin {
  const staticLegacyRoutes = new Set([
    "/",
    "/index.html",
    "/articles.html",
    "/vocabulary.html",
    "/sentences.html",
    "/api-settings.html",
    "/reader.html"
  ])
  const legacyDynamicArticleRoute = /^\/content\/articles\/.+\.html$/i

  return {
    name: "legacy-html-route-fallback-plugin",
    configureServer(server) {
      server.middlewares.use((request: IncomingMessage, _response: ServerResponse, next: () => void) => {
        if (!request.url || (request.method !== "GET" && request.method !== "HEAD")) {
          next()
          return
        }

        const currentUrl = new URL(request.url, "http://localhost")
        const pathname = decodeURI(currentUrl.pathname)

        if (staticLegacyRoutes.has(pathname) || legacyDynamicArticleRoute.test(pathname)) {
          request.url = "/"
        }

        next()
      })
    }
  }
}

export default defineConfig({
  publicDir: path.resolve(__dirname, "../../docs/.vuepress/public"),
  resolve: {
    alias: {
      "vuepress/client": path.resolve(__dirname, "./src/shims/vuepress-client.ts")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3100",
        changeOrigin: true
      },
      "/one-api": {
        target: "http://v3.wufazhuce.com:8000",
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/one-api/, "/api")
      }
    },
    fs: {
      allow: [
        path.resolve(__dirname, ".."),
        path.resolve(__dirname, "../../docs")
      ]
    }
  },
  plugins: [
    vue(),
    createContentStaticPlugin(path.resolve(__dirname, "../../docs/content")),
    createArticleVirtualModulePlugin(path.resolve(__dirname, "../../docs/content/articles")),
    createLegacyHtmlRouteFallbackPlugin()
  ]
})
