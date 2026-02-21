import { describe, it, expect, vi } from 'vitest'
import { buildNotebookUrl, createNotebookOpener } from './notebookNavigation'

vi.mock('./channelMessaging', () => ({
  sendNavigateMessage: vi.fn().mockResolvedValue(false),
  WINDOW_NAMES: {
    VOCABULARY: 'bilingual-vocabulary',
    SENTENCES: 'bilingual-sentences',
    ARTICLE: 'bilingual-article'
  }
}))

describe('notebookNavigation', () => {
  it('buildNotebookUrl should include base and query params', () => {
    const withBase = (path: string) => `/base${path}`
    const url = buildNotebookUrl(withBase, 'https://example.com', 'word', 'abc123')
    expect(url).toBe('https://example.com/base/vocabulary.html?highlight=abc123&type=word')
  })

  it('createNotebookOpener should use named window for vocabulary', async () => {
    const openWindow = vi.fn().mockReturnValue({ focus: vi.fn() })
    const opener = createNotebookOpener({
      withBase: (path) => path,
      getOrigin: () => 'https://example.com',
      openWindow
    })

    await opener('word', 'first')
    expect(openWindow).toHaveBeenCalledWith(
      expect.stringContaining('vocabulary.html'),
      'bilingual-vocabulary'
    )
  })

  it('createNotebookOpener should use named window for sentences', async () => {
    const openWindow = vi.fn().mockReturnValue({ focus: vi.fn() })
    const opener = createNotebookOpener({
      withBase: (path) => path,
      getOrigin: () => 'https://example.com',
      openWindow
    })

    await opener('sentence', 's1')
    expect(openWindow).toHaveBeenCalledWith(
      expect.stringContaining('sentences.html'),
      'bilingual-sentences'
    )
  })

  it('createNotebookOpener should use _blank when forceNew is true', async () => {
    const openWindow = vi.fn().mockReturnValue({ focus: vi.fn() })
    const opener = createNotebookOpener({
      withBase: (path) => path,
      getOrigin: () => 'https://example.com',
      openWindow
    })

    await opener('word', 'test', { forceNew: true })
    expect(openWindow).toHaveBeenCalledWith(
      expect.stringContaining('vocabulary.html'),
      '_blank'
    )
  })
})
