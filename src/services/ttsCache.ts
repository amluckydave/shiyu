/**
 * ttsCache.ts — TTS 音频持久缓存服务
 *
 * 使用 Tauri fs 插件将 EdgeTTS 合成的音频保存到本地磁盘（~/.shiyu/tts-cache/），
 * 避免每次复习都重新在线合成，实现秒级播放。
 *
 * 策略：
 * - 首次播放：在线合成 → 写入缓存 → 播放
 * - 后续播放：直接读缓存
 * - 添加单词/句子时：后台静默预缓存
 */
import {
  exists,
  mkdir,
  writeFile,
  readFile,
  BaseDirectory,
} from '@tauri-apps/plugin-fs'
import { EdgeTTSBrowser } from 'edge-tts-universal/browser'

const CACHE_DIR = '.shiyu/tts-cache'

/**
 * 生成缓存文件名（简单 hash）
 */
function makeCacheKey(text: string, rate: string): string {
  const src = `${text.trim()}__${rate}`
  // 简单 FNV-1a 32 位 hash → hex
  let h = 0x811c9dc5
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * 获取缓存文件路径（相对于 HOME 目录）
 */
function getCachePath(key: string): string {
  return `${CACHE_DIR}/${key}.mp3`
}

let dirEnsured = false

/**
 * 确保缓存目录存在
 */
async function ensureCacheDir(): Promise<void> {
  if (dirEnsured) return
  try {
    const dirExists = await exists(CACHE_DIR, { baseDir: BaseDirectory.Home })
    if (!dirExists) {
      await mkdir(CACHE_DIR, { baseDir: BaseDirectory.Home, recursive: true })
    }
    dirEnsured = true
  } catch (e) {
    console.warn('[TTS Cache] 创建缓存目录失败:', e)
  }
}

/**
 * 检查缓存是否存在
 */
async function hasCached(text: string, rate: string): Promise<boolean> {
  try {
    const key = makeCacheKey(text, rate)
    return await exists(getCachePath(key), { baseDir: BaseDirectory.Home })
  } catch {
    return false
  }
}

/**
 * 从缓存读取音频数据，返回 Blob URL
 * 未命中返回 null
 */
async function readCached(text: string, rate: string): Promise<string | null> {
  try {
    const key = makeCacheKey(text, rate)
    const path = getCachePath(key)
    const fileExists = await exists(path, { baseDir: BaseDirectory.Home })
    if (!fileExists) return null

    const data = await readFile(path, { baseDir: BaseDirectory.Home })
    const blob = new Blob([data], { type: 'audio/mpeg' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

/**
 * 合成音频并写入缓存，返回 Blob URL
 */
async function synthesizeAndCache(text: string, rate: string): Promise<string> {
  await ensureCacheDir()

  const tts = new EdgeTTSBrowser(text.trim(), 'en-US-AriaNeural', {
    rate,
    volume: '+0%',
  })
  const result = await tts.synthesize()
  const audioBlob = result.audio

  // 写入缓存
  try {
    const key = makeCacheKey(text, rate)
    const arrayBuffer = await audioBlob.arrayBuffer()
    await writeFile(getCachePath(key), new Uint8Array(arrayBuffer), {
      baseDir: BaseDirectory.Home,
    })
  } catch (e) {
    console.warn('[TTS Cache] 写入缓存失败:', e)
  }

  return URL.createObjectURL(audioBlob)
}

/**
 * 获取音频 URL（优先缓存，未命中则合成并缓存）
 */
export async function getOrSynthesize(text: string, rate: string): Promise<string> {
  const cached = await readCached(text, rate)
  if (cached) return cached
  return synthesizeAndCache(text, rate)
}

/**
 * 后台静默预缓存（fire-and-forget）
 * 用于在用户添加新词/句时提前下载音频
 */
export function preCacheText(text: string, rate: string): void {
  // 先检查是否已缓存，再合成
  hasCached(text, rate).then((cached) => {
    if (!cached) {
      synthesizeAndCache(text, rate)
        .then((url) => {
          // 预缓存不需要 blob URL，释放内存
          URL.revokeObjectURL(url)
        })
        .catch((e) => {
          console.warn('[TTS Cache] 预缓存失败:', e)
        })
    }
  })
}
