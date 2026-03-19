/**
 * 格式化时间戳为中文日期字符串
 * @param timestamp - Unix 时间戳（毫秒）
 * @returns 格式化后的日期字符串，例如 "2026/3/11"
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN')
}
