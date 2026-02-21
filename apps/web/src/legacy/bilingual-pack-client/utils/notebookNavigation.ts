import { sendNavigateMessage, WINDOW_NAMES } from './channelMessaging'

export type NotebookType = 'word' | 'sentence'

export interface NotebookOpenerDeps {
  withBase: (path: string) => string
  getOrigin: () => string
  openWindow: (url: string, name: string) => Window | null
}

export interface NotebookOpenOptions {
  forceNew?: boolean
}

export function buildNotebookUrl(
  withBase: (path: string) => string,
  origin: string,
  type: NotebookType,
  id: string
): string {
  const targetPath = type === 'word' ? '/vocabulary.html' : '/sentences.html'
  const url = new URL(withBase(targetPath), origin)
  url.searchParams.set('highlight', id)
  url.searchParams.set('type', type)
  return url.toString()
}

export function createNotebookOpener(deps: NotebookOpenerDeps) {
  return async (type: NotebookType, id: string, options: NotebookOpenOptions = {}): Promise<boolean> => {
    const targetPath = type === 'word' ? '/vocabulary.html' : '/sentences.html'
    const path = deps.withBase(targetPath)
    const target = type === 'word' ? 'vocabulary' : 'sentences'
    const windowName = options.forceNew ? '_blank' : (type === 'word' ? WINDOW_NAMES.VOCABULARY : WINDOW_NAMES.SENTENCES)
    
    if (!options.forceNew) {
      const acked = await sendNavigateMessage(target, path, id, type)
      if (acked) {
        const win = deps.openWindow('', windowName)
        if (win) {
          try { win.focus() } catch (e) {}
        }
        return true
      }
    }

    const url = buildNotebookUrl(deps.withBase, deps.getOrigin(), type, id)
    const opened = deps.openWindow(url, windowName)
    
    if (opened) {
      try { opened.focus() } catch (e) {}
    }
    return !!opened
  }
}
