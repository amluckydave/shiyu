import { sendNavigateMessage, WINDOW_NAMES } from "./channelMessaging.js"

export type HighlightType = "word" | "sentence"

export interface ArticleOpenerDeps {
  getOrigin: () => string
  openWindow: (url: string, name: string) => Window | null
}

export function buildArticleUrl(
  origin: string,
  articlePath: string,
  id: string,
  type: HighlightType
): string {
  const url = new URL(articlePath, origin)
  url.searchParams.set("highlight", id)
  url.searchParams.set("type", type)
  return url.toString()
}

export function createArticleOpener(deps: ArticleOpenerDeps) {
  return async (articlePath: string, id: string, type: HighlightType): Promise<boolean> => {
    let normalizedPath = articlePath
    if (articlePath.startsWith("/reader")) {
      const pathUrl = new URL(articlePath, deps.getOrigin())
      normalizedPath = pathUrl.searchParams.has("book") ? articlePath : "/ebooks.html"
    }

    const acked = await sendNavigateMessage("article", normalizedPath, id, type)
    if (acked) {
      const win = deps.openWindow("", WINDOW_NAMES.ARTICLE)
      if (win) {
        try {
          win.focus()
        } catch {}
      }
      return true
    }

    const url = buildArticleUrl(deps.getOrigin(), normalizedPath, id, type)
    const opened = deps.openWindow(url, WINDOW_NAMES.ARTICLE)
    if (opened) {
      try {
        opened.focus()
      } catch {}
    }
    return !!opened
  }
}
