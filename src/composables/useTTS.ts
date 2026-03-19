/**
 * TTS 语音
 * Edge TTS 神经网络语音 + 持久化音频缓存
 *
 * 改进：优先从磁盘缓存（~/.shiyu/tts-cache/）读取音频，
 * 内存缓存作为第二层。音频首次合成后持久化到磁盘，后续秒级播放。
 */
import { onUnmounted, ref } from 'vue'
import { getOrSynthesize } from '../services/ttsCache'

export function useTTS() {
  const isSpeaking = ref(false)
  const isLoading = ref(false)
  const speakingKey = ref('')
  const loadingKey = ref('')

  const memoryCache = new Map<string, string>()
  let currentAudio: HTMLAudioElement | null = null

  function getSpeechKey(text: string, rate: string) {
    return `${text.trim()}__${rate}`
  }

  async function speak(text: string, rate = '+0%') {
    const normalizedText = text.trim()
    if (!normalizedText) return

    const cacheKey = getSpeechKey(normalizedText, rate)

    if (isSpeaking.value && speakingKey.value === cacheKey) {
      stop()
      return
    }

    stop()

    // 1. 检查内存缓存
    let audioUrl = memoryCache.get(cacheKey)

    if (!audioUrl) {
      isLoading.value = true
      loadingKey.value = cacheKey

      try {
        // 2. 通过 ttsCache 获取（磁盘缓存 → 合成 → 写入磁盘）
        audioUrl = await getOrSynthesize(normalizedText, rate)
        memoryCache.set(cacheKey, audioUrl)
      } catch (err) {
        console.error('TTS synthesize failed:', err)
        return
      } finally {
        isLoading.value = false
        loadingKey.value = ''
      }
    }

    try {
      const audio = new Audio(audioUrl)
      currentAudio = audio
      isSpeaking.value = true
      speakingKey.value = cacheKey

      audio.onended = () => {
        currentAudio = null
        isSpeaking.value = false
        speakingKey.value = ''
      }

      audio.onerror = () => {
        memoryCache.delete(cacheKey)
        currentAudio = null
        isSpeaking.value = false
        speakingKey.value = ''
      }

      await audio.play()
    } catch (err) {
      console.error('TTS playback failed:', err)
      isSpeaking.value = false
      speakingKey.value = ''
    }
  }

  function stop() {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      currentAudio = null
    }
    isSpeaking.value = false
    speakingKey.value = ''
  }

  onUnmounted(() => {
    stop()
    for (const url of memoryCache.values()) {
      URL.revokeObjectURL(url)
    }
    memoryCache.clear()
  })

  return {
    isSpeaking,
    isLoading,
    speakingKey,
    loadingKey,
    speak,
    stop,
  }
}
