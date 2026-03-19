import { normalizeWhitespace, escapeRegExp, stripMarkdown } from '../utils/text'
import type { VocabularyItem } from '../services/api'

interface MeaningDisplay {
  definition: string
  phonetic: string
  pos: string
}

const meaningDisplayCache = new Map<string, { source: string; value: MeaningDisplay }>()

function splitToSentences(text: string): string[] {
  const source = (text || '').replace(/\r\n/g, '\n')
  if (!source.trim()) return []
  const segments = source.match(/[^.!?。！？\n]+[.!?。！？]?/g) || [source]
  return segments.map((segment) => normalizeWhitespace(segment)).filter(Boolean)
}

function normalizeForCompare(text: string): string {
  return normalizeWhitespace(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s]/gi, ' ')
  )
}

function splitMeaningSegments(text: string): string[] {
  const raw = normalizeWhitespace((text || '').replace(/\r\n/g, ' '))
  if (!raw) return []

  const normalized = raw.replace(/(?:^|\s)(\d+[.)、．])\s*/g, '\n$1 ')
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean)
  if (lines.length <= 1) return [raw]

  return lines
    .map((line) => line.replace(/^\d+[.)、．]\s*/, '').trim())
    .filter(Boolean)
}

export function getContextSentence(word: VocabularyItem): string {
  const context = word.context || ''
  const sentences = splitToSentences(context)
  if (sentences.length === 0) return ''

  const keyword = normalizeWhitespace(word.word).toLowerCase()
  if (!keyword) return sentences[0]

  const keywordRegex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i')
  const exact = sentences.find((sentence) => keywordRegex.test(sentence))
  if (exact) return exact

  const contains = sentences.find((sentence) =>
    sentence.toLowerCase().includes(keyword)
  )
  if (contains) return contains

  return sentences[0]
}

function getDisplayMeaning(word: VocabularyItem): string {
  const contextSentence = getContextSentence(word)
  const meaningSegments = splitMeaningSegments(stripMarkdown(word.meaning || ''))
  if (meaningSegments.length === 0) return ''

  const contextComparable = normalizeForCompare(contextSentence)
  const filteredSegments = meaningSegments.filter((segment) => {
    if (!contextComparable) return true
    const segmentComparable = normalizeForCompare(segment)
    if (!segmentComparable) return false
    return !(
      segmentComparable.includes(contextComparable) ||
      contextComparable.includes(segmentComparable)
    )
  })

  const visibleSegments = (filteredSegments.length > 0 ? filteredSegments : meaningSegments)
    .slice(0, 3)
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean)

  return visibleSegments.join(' · ') || normalizeWhitespace(word.meaning)
}

function getMeaningDisplay(word: VocabularyItem): MeaningDisplay {
  const source = normalizeWhitespace(stripMarkdown(word.meaning || ''))
  const cached = meaningDisplayCache.get(word.id)
  if (cached && cached.source === source) {
    return cached.value
  }

  const compact = getDisplayMeaning(word)
  if (!source) {
    const empty = { definition: compact, phonetic: '', pos: '' }
    meaningDisplayCache.set(word.id, { source, value: empty })
    return empty
  }

  const content = source.replace(/例句[:：].*$/i, '').trim()
  const tokens = content
    .split(/\s+(?:[-—]|[·•|])\s+/)
    .map((token) => normalizeWhitespace(token))
    .filter(Boolean)

  let phonetic = ''
  let pos = ''
  let definition = ''
  const extras: string[] = []
  const wordLower = normalizeWhitespace(word.word).toLowerCase()

  for (const token of tokens) {
    if (!token) continue
    const lower = token.toLowerCase()
    if (lower === wordLower) continue

    const phoneticMatch = token.match(/^音标[:：]\s*(.+)$/i)
    if (phoneticMatch) {
      phonetic = normalizeWhitespace(phoneticMatch[1])
      continue
    }

    const posMatch = token.match(/^词性[:：]\s*(.+)$/i)
    if (posMatch) {
      pos = normalizeWhitespace(posMatch[1])
      continue
    }

    const definitionMatch = token.match(/^(?:中文释义|释义|含义)[:：]\s*(.+)$/i)
    if (definitionMatch) {
      definition = normalizeWhitespace(definitionMatch[1])
      continue
    }

    extras.push(token)
  }

  if (!phonetic) {
    const inlinePhonetic = content.match(/(?:音标[:：]\s*)?([/\[][^/\]]{1,64}[/\]])/i)
    if (inlinePhonetic) {
      phonetic = normalizeWhitespace(inlinePhonetic[1])
    }
  }

  if (!definition) {
    const filtered = extras.filter((token) => !/^(音标|词性|例句)[:：]/i.test(token))
    definition = filtered.length > 0 ? filtered[0] : compact
  }

  const value = {
    definition: normalizeWhitespace(definition || compact),
    phonetic: normalizeWhitespace(pos ? phonetic.replace(/^[·•]\s*/, '') : phonetic),
    pos: normalizeWhitespace(pos),
  }

  meaningDisplayCache.set(word.id, { source, value })
  return value
}

export function getMeaningDefinition(word: VocabularyItem): string {
  return getMeaningDisplay(word).definition
}

export function getMeaningPhonetic(word: VocabularyItem): string {
  return getMeaningDisplay(word).phonetic
}

export function getMeaningPos(word: VocabularyItem): string {
  return getMeaningDisplay(word).pos
}
