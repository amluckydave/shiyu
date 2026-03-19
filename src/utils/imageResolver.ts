import { convertFileSrc } from '@tauri-apps/api/core'

/**
 * Convert local image file paths in rendered HTML to webview-loadable asset URLs.
 * Paths use forward slashes (e.g., C:/Users/xxx/.shiyu/images/abc123.jpg)
 */
export function resolveLocalImages(html: string): string {
  if (!html) return html

  // Match img src containing .shiyu/images/ paths (forward slashes from Rust backend)
  return html.replace(
    /(<img\s[^>]*src=["'])([^"']*\.shiyu\/images\/[^"']+)(["'])/gi,
    (_match, prefix, filePath, suffix) => {
      try {
        const assetUrl = convertFileSrc(filePath)
        return `${prefix}${assetUrl}${suffix}`
      } catch {
        return _match
      }
    }
  )
}

/**
 * Convert local file paths in raw Markdown to asset URLs before rendering.
 * Handles: ![alt](C:/Users/xxx/.shiyu/images/abc123.jpg)
 */
export function resolveLocalImagesInMarkdown(markdown: string): string {
  if (!markdown) return markdown

  return markdown.replace(
    /!\[([^\]]*)\]\(([^)]*\.shiyu\/images\/[^)]+)\)/gi,
    (_match, alt, filePath) => {
      try {
        const assetUrl = convertFileSrc(filePath)
        return `![${alt}](${assetUrl})`
      } catch {
        return _match
      }
    }
  )
}
