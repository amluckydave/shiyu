export type DailyQuoteEntry = {
  date: string | null
  fileName: string
  text: string | null
  imageUrl: string
  year: number | null
  month: number | null
  dayOfMonth: number | null
}

const LIST_KEYS = ['list', 'data', 'items', 'records', 'rows']
const FILE_KEYS = ['fileName', 'filename', 'file_name', 'file', 'name', 'image', 'img']
const DATE_KEYS = ['date', 'day', 'dateStr', 'dateText', 'publishDate', 'createdAt', 'time']
const TEXT_KEYS = ['content', 'text', 'word', 'quote', 'title', 'sentence']

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null
  return null
}

function pickFirstString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = toStringValue(obj[key])
    if (value) return value
  }
  return null
}

function pickFirstNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = obj[key]
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw
    if (typeof raw === 'string' && raw.trim()) {
      const num = Number(raw)
      if (Number.isFinite(num)) return num
    }
  }
  return null
}

function pickFirstValue(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key]
  }
  return null
}

function extractList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []

  for (const key of LIST_KEYS) {
    const value = payload[key]
    if (Array.isArray(value)) return value
  }

  const nested = payload.data
  if (Array.isArray(nested)) return nested
  if (isRecord(nested)) {
    for (const key of LIST_KEYS) {
      const value = nested[key]
      if (Array.isArray(value)) return value
    }
    const nestedBlock = nested.word_every_day ?? nested.wordEveryDay ?? nested.wordEveryday
    if (isRecord(nestedBlock) && Array.isArray(nestedBlock.list)) {
      return nestedBlock.list
    }
  }

  const topBlock = payload.word_every_day ?? payload.wordEveryDay ?? payload.wordEveryday
  if (isRecord(topBlock) && Array.isArray(topBlock.list)) {
    return topBlock.list
  }

  return []
}

function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) return ''
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

function parseDateParts(value: string | null): { year: number | null; month: number | null; day: number | null } {
  if (!value) return { year: null, month: null, day: null }
  const normalized = value.replace(/[.]/g, '-').trim()

  const fullMatch = normalized.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (fullMatch) {
    const year = Number(fullMatch[1])
    const month = Number(fullMatch[2])
    const day = Number(fullMatch[3])
    return {
      year: Number.isFinite(year) ? year : null,
      month: Number.isFinite(month) ? month : null,
      day: Number.isFinite(day) ? day : null
    }
  }

  const shortMatch = normalized.match(/(\d{1,2})[/-](\d{1,2})/)
  if (shortMatch) {
    let first = Number(shortMatch[1])
    let second = Number(shortMatch[2])
    if (Number.isFinite(first) && Number.isFinite(second)) {
      // 日期格式不确定时，优先保证月份在 1-12 范围内
      if (first > 12 && second <= 12) {
        ;[first, second] = [second, first]
      }
      return { year: null, month: first || null, day: second || null }
    }
  }

  return { year: null, month: null, day: null }
}

export function buildDailyQuoteImageUrl(baseUrl: string, fileName: string): string {
  if (/^https?:\/\//i.test(fileName)) return fileName
  const safeName = fileName.replace(/^\/+/, '')
  return `${normalizeBaseUrl(baseUrl)}${safeName}`
}

function formatDateText(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateValue(value: unknown): {
  dateText: string | null
  year: number | null
  month: number | null
  day: number | null
} {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { dateText: formatDateText(value), year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() }
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e11 ? value : value * 1000
    const date = new Date(ms)
    if (!Number.isNaN(date.getTime())) {
      return {
        dateText: formatDateText(date),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate()
      }
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return { dateText: null, year: null, month: null, day: null }
    const numeric = Number(trimmed)
    if (Number.isFinite(numeric) && trimmed.length >= 10) {
      return parseDateValue(numeric)
    }
    const parts = parseDateParts(trimmed)
    const dateText = parts.year && parts.month && parts.day ? `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}` : trimmed
    return { dateText, year: parts.year, month: parts.month, day: parts.day }
  }
  return { dateText: null, year: null, month: null, day: null }
}

function pickNestedText(obj: Record<string, unknown>): string | null {
  const intern = obj.contentInternation
  if (isRecord(intern)) {
    return (
      toStringValue(intern.zh) ??
      toStringValue(intern.zht) ??
      toStringValue(intern.en) ??
      toStringValue(intern.jp) ??
      toStringValue(intern.ko) ??
      null
    )
  }
  return null
}

export function mapDailyQuoteEntries(payload: unknown, baseUrl: string): DailyQuoteEntry[] {
  const list = extractList(payload)
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

  return list
    .map((item) => {
      if (!isRecord(item)) return null
      const fileName = pickFirstString(item, FILE_KEYS)
      if (!fileName) return null

      const dateRaw = pickFirstValue(item, DATE_KEYS)
      const dateInfo = parseDateValue(dateRaw)
      const dateValue = dateInfo.dateText ?? toStringValue(dateRaw)
      const textValue = pickFirstString(item, TEXT_KEYS) ?? pickNestedText(item)
      const dayNumber = pickFirstNumber(item, ['day', 'dayOfMonth', 'date'])
      const dayOfMonth = dateInfo.day ?? dayNumber ?? null

      return {
        date: dateValue,
        fileName,
        text: textValue,
        imageUrl: buildDailyQuoteImageUrl(normalizedBaseUrl, fileName),
        year: dateInfo.year,
        month: dateInfo.month,
        dayOfMonth
      }
    })
    .filter((entry): entry is DailyQuoteEntry => !!entry)
}

export function pickEntryForDate(entries: DailyQuoteEntry[], targetDate: Date): DailyQuoteEntry | null {
  if (!entries.length) return null
  const targetYear = targetDate.getFullYear()
  const targetMonth = targetDate.getMonth() + 1
  const targetDay = targetDate.getDate()

  const exactMatch = entries.find(
    (entry) =>
      entry.year === targetYear && entry.month === targetMonth && entry.dayOfMonth === targetDay
  )
  if (exactMatch) return exactMatch

  const monthDayMatch = entries.find(
    (entry) => entry.month === targetMonth && entry.dayOfMonth === targetDay
  )
  if (monthDayMatch) return monthDayMatch

  const dayOnlyMatch = entries.find((entry) => entry.dayOfMonth === targetDay)
  return dayOnlyMatch || null
}

export function formatMonth(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function formatDisplayDate(value: string | null, fallback: Date): string {
  const parts = parseDateParts(value)
  const day = parts.day ?? fallback.getDate()
  const month = parts.month ?? fallback.getMonth() + 1
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
}
