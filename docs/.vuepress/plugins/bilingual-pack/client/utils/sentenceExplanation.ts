export interface SentenceExplanationParts {
  summary: string
  analysis: string
  translation: string
  raw: string
}

const SUMMARY_LABELS = [
  '结构总述',
  '结构概述',
  '结构一句话',
  '结构总结'
]
const ANALYSIS_LABEL = '结构'
const TRANSLATION_LABELS = ['释义', '翻译', '译文']


export function splitSentenceExplanation(explanation: string): SentenceExplanationParts {
  const raw = (explanation || '').replace(/\r\n/g, '\n').trim()
  if (!raw) {
    return { summary: '', analysis: '', translation: '', raw: '' }
  }

  let summary = ''
  let analysis = ''
  let translation = ''

  // 匹配结构总述
  const summaryMatch = raw.match(new RegExp(`(${SUMMARY_LABELS.join('|')})[：:]\\s*([^\\n]+)`))
  if (summaryMatch) {
    summary = summaryMatch[2].trim()
  }

  // 匹配结构（但不匹配结构总述等复合词）
  const analysisMatch = raw.match(new RegExp(`(?:^|\\n)${ANALYSIS_LABEL}[：:]\\s*([\\s\\S]*?)(?=(?:\\n(?:${TRANSLATION_LABELS.join('|')})[：:])|$)`))
  if (analysisMatch) {
    analysis = analysisMatch[1].trim()
  }

  // 匹配释义
  const translationMatch = raw.match(new RegExp(`(?:^|\\n)(${TRANSLATION_LABELS.join('|')})[：:]\\s*([\\s\\S]*)$`))
  if (translationMatch) {
    translation = translationMatch[2].trim()
  }

  if (!summary && !analysis && !translation) {
    return { summary: '', analysis: '', translation: '', raw }
  }

  return { summary, analysis, translation, raw }
}

export function getSentenceMeaning(explanation: string): string {
  const { translation, analysis, summary, raw } = splitSentenceExplanation(explanation)
  if (translation) return translation
  if (!analysis && !summary) return raw
  return ''
}

export function buildSentenceExplanation(analysis: string, translation: string, summary = ''): string {
  const trimmedSummary = summary.trim()
  const trimmedAnalysis = analysis.trim()
  const trimmedTranslation = translation.trim()
  const lines: string[] = []
  if (trimmedSummary) {
    lines.push(`结构总述：${trimmedSummary}`)
  }
  if (trimmedAnalysis) {
    lines.push(`结构：${trimmedAnalysis}`)
  }
  if (trimmedTranslation) {
    lines.push(`释义：${trimmedTranslation}`)
  }
  return lines.join('\n')
}
