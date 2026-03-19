/**
 * reviewScheduler.ts — FSRS 间隔重复调度器
 *
 * 封装 ts-fsrs 库，提供：
 * 1. 从 DB 行 → FSRS Card 的双向转换
 * 2. 复习评分 → 新 Card 状态 + 持久化请求
 * 3. 混合队列（单词 + 句子）排序
 */

import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type FSRS,
  type RecordLogItem,
} from 'ts-fsrs'

import type { VocabularyItem, SentenceItem, UpdateSrsRequest } from './api'
import {
  getDueVocabulary,
  getDueSentences,
  updateVocabularySrs,
  updateSentenceSrs,
} from './api'

// ── FSRS 引擎配置 ────────────────────────────────────────

const params = generatorParameters({
  request_retention: 0.9, // 期望记忆保留率 90%
  maximum_interval: 365,  // 最大间隔 1 年
  enable_fuzz: true,      // 启用模糊（避免大量卡片同时到期）
  enable_short_term: true, // 启用短期学习步骤
})

const scheduler: FSRS = fsrs(params)

// ── 类型定义 ──────────────────────────────────────────────

export type ReviewItemType = 'vocabulary' | 'sentence'

export interface ReviewItem {
  type: ReviewItemType
  id: string
  /** 正面：需记忆的内容 */
  front: string
  /** 背面：释义/解释 */
  back: string
  /** 原文上下文（可选） */
  context?: string
  /** 来源文章 */
  articlePath?: string
  /** 当前 FSRS Card 状态 */
  card: Card
  /** 原始数据引用 */
  raw: VocabularyItem | SentenceItem
}

// FSRS Rating 映射到中文标签
export const RATING_LABELS = {
  [Rating.Again]: '忘了',
  [Rating.Hard]: '困难',
  [Rating.Good]: '记住了',
  [Rating.Easy]: '简单',
} as Record<number, string>

// 暴露 Rating 枚举供 UI 使用
export { Rating, State }

// ── DB ↔ FSRS Card 转换 ──────────────────────────────────

/** 从数据库 SRS 字段还原 FSRS Card */
function dbToCard(item: VocabularyItem | SentenceItem): Card {
  if (item.srs_state === 0 && !item.srs_due) {
    // 全新卡片
    return createEmptyCard(new Date())
  }

  return {
    due: item.srs_due ? new Date(item.srs_due) : new Date(),
    stability: item.srs_stability ?? 0,
    difficulty: item.srs_difficulty ?? 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: item.srs_reps ?? 0,
    lapses: item.srs_lapses ?? 0,
    state: (item.srs_state ?? 0) as State,
    last_review: item.srs_last_review ? new Date(item.srs_last_review) : undefined,
  } as Card
}

/** 将 FSRS Card 转为持久化请求 */
function cardToSrsRequest(id: string, card: Card): UpdateSrsRequest {
  return {
    id,
    srs_due: card.due.getTime(),
    srs_stability: card.stability,
    srs_difficulty: card.difficulty,
    srs_state: card.state as number,
    srs_lapses: card.lapses,
    srs_reps: card.reps,
    srs_last_review: card.last_review ? new Date(card.last_review).getTime() : undefined,
  }
}

// ── 转换辅助函数 ─────────────────────────────────────────

function vocabToReviewItem(item: VocabularyItem): ReviewItem {
  return {
    type: 'vocabulary',
    id: item.id,
    front: item.word,
    back: item.meaning,
    context: item.context ?? undefined,
    articlePath: item.article_path ?? undefined,
    card: dbToCard(item),
    raw: item,
  }
}

function sentenceToReviewItem(item: SentenceItem): ReviewItem {
  return {
    type: 'sentence',
    id: item.id,
    front: item.sentence,
    back: item.explanation,
    articlePath: item.article_path ?? undefined,
    card: dbToCard(item),
    raw: item,
  }
}

// ── 公开 API ─────────────────────────────────────────────

/**
 * 获取混合复习队列（单词 + 句子），按到期时间排序
 */
export async function getReviewQueue(): Promise<ReviewItem[]> {
  const now = Date.now()

  const [vocabItems, sentenceItems] = await Promise.all([
    getDueVocabulary(now),
    getDueSentences(now),
  ])

  const queue: ReviewItem[] = [
    ...vocabItems.map(vocabToReviewItem),
    ...sentenceItems.map(sentenceToReviewItem),
  ]

  // 按 due 时间排序（早到期优先），新卡片排最后
  queue.sort((a, b) => {
    const aDue = a.card.due.getTime()
    const bDue = b.card.due.getTime()
    return aDue - bDue
  })

  return queue
}

/**
 * 对复习项评分并持久化结果
 *
 * @returns 更新后的 RecordLogItem（含新 Card 状态）
 */
export async function gradeReviewItem(
  item: ReviewItem,
  rating: Rating,
): Promise<RecordLogItem> {
  const now = new Date()
  const result = scheduler.repeat(item.card, now)
  const chosen = (result as any)[rating] as RecordLogItem

  // 构造持久化请求
  const req = cardToSrsRequest(item.id, chosen.card)

  // 根据类型调用对应后端
  if (item.type === 'vocabulary') {
    await updateVocabularySrs(req)
  } else {
    await updateSentenceSrs(req)
  }

  return chosen
}

/**
 * 预览所有评级选项（不持久化），用于在 UI 上显示各按钮的间隔天数
 */
export function previewRatings(item: ReviewItem): Record<Rating, { card: Card; intervalDays: number }> {
  const now = new Date()
  const result = scheduler.repeat(item.card, now)

  const ratings = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const

  const preview = {} as Record<Rating, { card: Card; intervalDays: number }>

  for (const r of ratings) {
    const chosen = (result as any)[r] as RecordLogItem
    preview[r] = {
      card: chosen.card,
      intervalDays: chosen.card.scheduled_days,
    }
  }

  return preview
}

/**
 * 格式化间隔天数为人类可读文本
 */
export function formatInterval(days: number): string {
  if (days === 0) return '< 1天'
  if (days === 1) return '1天'
  if (days < 30) return `${days}天`
  if (days < 365) {
    const months = Math.round(days / 30)
    return `${months}个月`
  }
  const years = (days / 365).toFixed(1)
  return `${years}年`
}
