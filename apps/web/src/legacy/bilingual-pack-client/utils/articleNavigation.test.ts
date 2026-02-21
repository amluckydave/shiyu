import { describe, it, expect, vi } from 'vitest'
import { buildArticleUrl, createArticleOpener } from './articleNavigation'

vi.mock('./channelMessaging', () => ({
  sendNavigateMessage: vi.fn().mockResolvedValue(false),
  WINDOW_NAMES: {
    VOCABULARY: 'bilingual-vocabulary',
    SENTENCES: 'bilingual-sentences',
    ARTICLE: 'bilingual-article'
  }
}))

describe('articleNavigation', () => {
    it('buildArticleUrl should generate correct URL with highlight params', () => {
        const url = buildArticleUrl('https://example.com', '/articles/test.html', 'abc123', 'word')
        expect(url).toBe('https://example.com/articles/test.html?highlight=abc123&type=word')
    })

    it('buildArticleUrl should work with sentence type', () => {
        const url = buildArticleUrl('https://example.com', '/articles/test.html', 'sent001', 'sentence')
        expect(url).toBe('https://example.com/articles/test.html?highlight=sent001&type=sentence')
    })

    it('createArticleOpener should call openWindow with correct URL and name', async () => {
        const openWindow = vi.fn().mockReturnValue({ focus: vi.fn() })
        const opener = createArticleOpener({
            getOrigin: () => 'https://example.com',
            openWindow
        })

        const result = await opener('/article1.html', 'word1', 'word')

        expect(result).toBe(true)
        expect(openWindow).toHaveBeenCalledTimes(1)
        expect(openWindow).toHaveBeenCalledWith(
            expect.stringContaining('article1.html'),
            'bilingual-article'
        )
    })

    it('createArticleOpener should use same window name for all calls', async () => {
        const openWindow = vi.fn().mockReturnValue({ focus: vi.fn() })
        const opener = createArticleOpener({
            getOrigin: () => 'https://example.com',
            openWindow
        })

        await opener('/article1.html', 'w1', 'word')
        await opener('/article2.html', 'w2', 'sentence')

        expect(openWindow.mock.calls[0][1]).toBe('bilingual-article')
        expect(openWindow.mock.calls[1][1]).toBe('bilingual-article')
    })

    it('createArticleOpener should keep legacy reader path when book param exists', async () => {
        const openWindow = vi.fn().mockReturnValue({ focus: vi.fn() })
        const opener = createArticleOpener({
            getOrigin: () => 'https://example.com',
            openWindow
        })

        await opener('/reader.html?book=demo.epub', 'word1', 'word')

        expect(openWindow).toHaveBeenCalledTimes(1)
        const openedUrl = openWindow.mock.calls[0][0] as string
        const parsedUrl = new URL(openedUrl)
        expect(parsedUrl.pathname).toBe('/reader.html')
        expect(parsedUrl.searchParams.get('book')).toBe('demo.epub')
        expect(parsedUrl.searchParams.get('highlight')).toBe('word1')
        expect(parsedUrl.searchParams.get('type')).toBe('word')
    })

    it('createArticleOpener should fallback to articles page for plain reader path', async () => {
        const openWindow = vi.fn().mockReturnValue({ focus: vi.fn() })
        const opener = createArticleOpener({
            getOrigin: () => 'https://example.com',
            openWindow
        })

        await opener('/reader', 'word1', 'word')

        expect(openWindow).toHaveBeenCalledTimes(1)
        const openedUrl = openWindow.mock.calls[0][0] as string
        const parsedUrl = new URL(openedUrl)
        expect(parsedUrl.pathname).toBe('/articles.html')
        expect(parsedUrl.searchParams.get('highlight')).toBe('word1')
        expect(parsedUrl.searchParams.get('type')).toBe('word')
    })
})
