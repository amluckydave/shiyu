import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import type { BilingualDataUpdateRequest } from "../../../../../packages/shared/src/index.js"
import { createEmptyBilingualData, type BilingualData } from "../../../../../packages/shared/src/index.js"

export interface BilingualDataRepository {
  read(): Promise<BilingualData>
  writeMerged(update: BilingualDataUpdateRequest): Promise<BilingualData>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function normalizeBilingualData(raw: unknown): BilingualData {
  const empty = createEmptyBilingualData()
  if (!isRecord(raw)) return empty

  const vocabulary = Array.isArray(raw.vocabulary) ? raw.vocabulary : empty.vocabulary
  const sentences = Array.isArray(raw.sentences) ? raw.sentences : empty.sentences
  const translations = isRecord(raw.translations)
    ? (raw.translations as BilingualData["translations"])
    : empty.translations

  return {
    vocabulary,
    sentences,
    translations
  }
}

export class FileBilingualDataRepository implements BilingualDataRepository {
  constructor(private readonly filePath: string) {}

  async read(): Promise<BilingualData> {
    if (!fs.existsSync(this.filePath)) {
      return createEmptyBilingualData()
    }

    const rawContent = await fsp.readFile(this.filePath, "utf-8")
    if (!rawContent.trim()) {
      return createEmptyBilingualData()
    }

    try {
      const parsed = JSON.parse(rawContent)
      return normalizeBilingualData(parsed)
    } catch {
      return createEmptyBilingualData()
    }
  }

  async writeMerged(update: BilingualDataUpdateRequest): Promise<BilingualData> {
    const currentData = await this.read()
    const nextData: BilingualData = {
      vocabulary: currentData.vocabulary,
      sentences: currentData.sentences,
      translations: currentData.translations
    }

    if (Array.isArray(update.vocabulary)) {
      nextData.vocabulary = update.vocabulary
    }

    if (Array.isArray(update.sentences)) {
      nextData.sentences = update.sentences
    }

    if (update.translations && typeof update.translations === "object") {
      nextData.translations = {
        ...(nextData.translations || {}),
        ...update.translations
      }
    }

    await fsp.mkdir(path.dirname(this.filePath), { recursive: true })
    await fsp.writeFile(this.filePath, JSON.stringify(nextData, null, 2), "utf-8")
    return nextData
  }
}
