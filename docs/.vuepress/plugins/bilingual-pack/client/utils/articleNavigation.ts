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

export function createArticleOpener(deps: ArticleOpenerDeps) {
    return async (articlePath: string, id: string, type: HighlightType): Promise<boolean> => {
        // 检查是否为阅读器路径（以 /reader 开头）
        // 阅读器路径格式: /reader.html?book=xxx&cfi=xxx
        const isReaderPath = articlePath.startsWith('/reader')

        if (isReaderPath) {
            // 阅读器路径直接打开，不走消息通信
            // 阅读器 URL 已经包含 book 和 cfi 参数，直接使用
            const url = new URL(articlePath, deps.getOrigin())
            const opened = deps.openWindow(url.toString(), 'bilingual-reader')
            if (opened) {
                try { opened.focus() } catch (e) { }
            }
            return !!opened
        }

        // 普通文章路径走消息通信
        const acked = await sendNavigateMessage('article', articlePath, id, type)
        if (acked) {
            const win = deps.openWindow('', WINDOW_NAMES.ARTICLE)
            if (win) {
                try { win.focus() } catch (e) { }
            }
            return true
        }

        const url = buildArticleUrl(deps.getOrigin(), articlePath, id, type)
        const opened = deps.openWindow(url, WINDOW_NAMES.ARTICLE)

        if (opened) {
            try { opened.focus() } catch (e) { }
            if (typeof window !== 'undefined') {
                window.blur()
            }
        }
        return !!opened
    }
}
