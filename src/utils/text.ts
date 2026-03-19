/**
 * 文本处理工具函数
 */

/** 将连续空白字符归一化为单个空格并去除首尾空白 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** 转义正则表达式中的特殊字符 */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 去除 Markdown 加粗和斜体语法，保留纯文本 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
}
