import os from "node:os"
import path from "node:path"

export function resolveDataFilePath(): string {
  const fromEnv = process.env.BILINGUAL_DATA_FILE_PATH
  if (fromEnv && fromEnv.trim()) {
    return fromEnv
  }
  return path.join(os.homedir(), ".vuepress-bilingual-data.json")
}

export function resolvePort(): number {
  const raw = process.env.PORT
  if (!raw) return 3100
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return 3100
  return parsed
}
