// 长难句解释的结构化工具函数

export interface SentenceExplanationParts {
    parsedHtml: string
    structureNote: string
    translation: string
    raw: string
}

const PARSED_HTML_LABELS = ['成分划分']
const STRUCTURE_NOTE_LABELS = ['成分分析', '结构概述']
const TRANSLATION_LABELS = ['释义', '翻译', '译文']
// 兼容旧格式
const LEGACY_SUMMARY_LABELS = ['结构总述', '结构概述', '结构一句话', '结构总结']
const LEGACY_ANALYSIS_LABEL = '结构'

/**
 * 拆分长难句解释为结构化部分
 */
export function splitSentenceExplanation(explanation: string): SentenceExplanationParts {
    const raw = (explanation || '').replace(/\r\n/g, '\n').trim()
    if (!raw) {
        return { parsedHtml: '', structureNote: '', translation: '', raw: '' }
    }

    let parsedHtml = ''
    let structureNote = ''
    let translation = ''

    // 匹配成分划分
    const parsedMatch = raw.match(new RegExp(`(${PARSED_HTML_LABELS.join('|')})[：:]\\s*([\\s\\S]*?)(?=(?:\\n(?:${[...STRUCTURE_NOTE_LABELS, ...TRANSLATION_LABELS].join('|')})[：:])|$)`))
    if (parsedMatch) {
        parsedHtml = parsedMatch[2].trim()
    }

    // 匹配成分分析
    const noteMatch = raw.match(new RegExp(`(?:^|\\n)(${STRUCTURE_NOTE_LABELS.join('|')})[：:]\\s*([\\s\\S]*?)(?=(?:\\n(?:${TRANSLATION_LABELS.join('|')})[：:])|$)`))
    if (noteMatch) {
        structureNote = noteMatch[2].trim()
    }

    // 匹配释义
    const translationMatch = raw.match(new RegExp(`(?:^|\\n)(${TRANSLATION_LABELS.join('|')})[：:]\\s*([\\s\\S]*)$`))
    if (translationMatch) {
        translation = translationMatch[2].trim()
    }

    // 兼容旧格式
    if (!parsedHtml) {
        let legacySummary = ''
        let legacyAnalysis = ''
        const summaryMatch = raw.match(new RegExp(`(${LEGACY_SUMMARY_LABELS.join('|')})[：:]\\s*([^\\n]+)`))
        if (summaryMatch) legacySummary = summaryMatch[2].trim()

        const analysisMatch = raw.match(new RegExp(`(?:^|\\n)${LEGACY_ANALYSIS_LABEL}[：:]\\s*([\\s\\S]*?)(?=(?:\\n(?:${TRANSLATION_LABELS.join('|')})[：:])|$)`))
        if (analysisMatch) legacyAnalysis = analysisMatch[1].trim()

        if (legacySummary || legacyAnalysis) {
            parsedHtml = [legacySummary, legacyAnalysis].filter(Boolean).join('\n')
        }
    }

    if (!parsedHtml && !structureNote && !translation) {
        return { parsedHtml: '', structureNote: '', translation: '', raw }
    }

    return { parsedHtml, structureNote, translation, raw }
}

/**
 * 从解释中提取释义文本（用于 Tooltip 显示）
 */
export function getSentenceMeaning(explanation: string): string {
    const { translation, raw } = splitSentenceExplanation(explanation)
    if (translation) return translation
    return raw
}

/**
 * 将结构化部分组合为完整的解释文本
 */
export function buildSentenceExplanation(parsedHtml: string, structureNote: string, translation: string): string {
    const lines: string[] = []
    if (parsedHtml.trim()) lines.push(`成分划分：${parsedHtml.trim()}`)
    if (structureNote.trim()) lines.push(`成分分析：${structureNote.trim()}`)
    if (translation.trim()) lines.push(`释义：${translation.trim()}`)
    return lines.join('\n')
}
