export const WINDOW_NAMES = {
  VOCABULARY: "bilingual-vocabulary",
  SENTENCES: "bilingual-sentences",
  ARTICLE: "bilingual-article"
} as const

export interface NavigateMessage {
  action: "navigate"
  target: "vocabulary" | "sentences" | "article"
  path: string
  highlightId?: string
  highlightType?: "word" | "sentence"
}

export interface AckMessage {
  action: "ack"
  target: string
}

export interface DataChangedMessage {
  action: "data-changed"
  dataType: "vocabulary" | "sentences"
}

export type ChannelMessage = NavigateMessage | AckMessage | DataChangedMessage

const CHANNEL_NAME = "bilingual-navigation"

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel | null {
  if (!channel && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME)
  }
  return channel
}

export function notifyDataChanged(dataType: "vocabulary" | "sentences"): void {
  const ch = getChannel()
  if (ch) {
    ch.postMessage({ action: "data-changed", dataType } as DataChangedMessage)
  }
}

export function sendNavigateMessage(
  target: NavigateMessage["target"],
  path: string,
  highlightId?: string,
  highlightType?: "word" | "sentence"
): Promise<boolean> {
  return new Promise((resolve) => {
    const ch = getChannel()
    if (!ch) {
      resolve(false)
      return
    }

    const timeout = setTimeout(() => {
      ch.removeEventListener("message", handler)
      resolve(false)
    }, 100)

    const handler = (event: MessageEvent<ChannelMessage>) => {
      if (event.data.action === "ack" && event.data.target === target) {
        clearTimeout(timeout)
        ch.removeEventListener("message", handler)
        resolve(true)
      }
    }

    ch.addEventListener("message", handler)
    ch.postMessage({ action: "navigate", target, path, highlightId, highlightType } as NavigateMessage)
  })
}

export function listenForNavigation(
  myTarget: NavigateMessage["target"],
  onNavigate: (path: string, highlightId?: string, highlightType?: "word" | "sentence") => void
): () => void {
  const ch = getChannel()
  if (!ch) return () => {}

  const handler = (event: MessageEvent<ChannelMessage>) => {
    if (event.data.action === "navigate" && event.data.target === myTarget) {
      ch.postMessage({ action: "ack", target: myTarget } as AckMessage)
      onNavigate(event.data.path, event.data.highlightId, event.data.highlightType)
    }
  }

  ch.addEventListener("message", handler)
  return () => ch.removeEventListener("message", handler)
}

export function listenForDataChanges(
  dataType: "vocabulary" | "sentences",
  onDataChanged: () => void
): () => void {
  const ch = getChannel()
  if (!ch) return () => {}

  const handler = (event: MessageEvent<ChannelMessage>) => {
    if (event.data.action === "data-changed" && event.data.dataType === dataType) {
      onDataChanged()
    }
  }

  ch.addEventListener("message", handler)
  return () => ch.removeEventListener("message", handler)
}

export function resetChannelForTest(): void {
  if (channel) {
    channel.close()
    channel = null
  }
}
