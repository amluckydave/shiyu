import { sendNavigateMessage, WINDOW_NAMES } from './channelMessaging'

export type HighlightType = 'word' | 'sentence'

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
  url.searchParams.set('highlight', id)
  url.searchParams.set('type', type)
  return url.toString()
}

function normalizeArticlePath(articlePath: string): string {
  if (articlePath.startsWith('/reader')) {
    const pathUrl = new URL(articlePath, 'https://bilingual.local')
    if (pathUrl.searchParams.has('book')) {
      return articlePath
    }
    return '/articles.html'
  }
  return articlePath
}

export function createArticleOpener(deps: ArticleOpenerDeps) {
  return async (articlePath: string, id: string, type: HighlightType): Promise<boolean> => {
    const normalizedPath = normalizeArticlePath(articlePath)

    const acked = await sendNavigateMessage('article', normalizedPath, id, type)
    if (acked) {
      const win = deps.openWindow('', WINDOW_NAMES.ARTICLE)
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
      if (typeof window !== 'undefined') {
        window.blur()
      }
    }

    return !!opened
  }
}
