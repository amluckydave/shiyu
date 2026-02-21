import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { useBilingualDataStore } from "./bilingualData"
import { resetChannelForTest } from "../services/channelMessaging"
import type { BilingualDataResponse } from "../../../../packages/shared/src/index.js"

function createResponse(data: BilingualDataResponse): Response {
  return {
    ok: true,
    json: async () => data
  } as unknown as Response
}

function buildWord(id: string, word: string) {
  return {
    id,
    word,
    meaning: `${word}-meaning`,
    createdAt: Date.now(),
    reviewCount: 0
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal("window", {} as Window & typeof globalThis)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  resetChannelForTest()
})

describe("useBilingualDataStore", () => {
  it("initializes data from API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse({
        vocabulary: [buildWord("w1", "alpha")],
        sentences: [],
        translations: {}
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const store = useBilingualDataStore()
    await store.initData()
    await vi.advanceTimersByTimeAsync(110)

    expect(store.isInitialized).toBe(true)
    expect(store.data.vocabulary).toHaveLength(1)
    expect(store.data.vocabulary[0].id).toBe("w1")
  })

  it("debounces vocabulary save after init", async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      createResponse({
        vocabulary: [],
        sentences: [],
        translations: {}
      })
    )
    fetchMock.mockResolvedValueOnce(createResponse({ vocabulary: [], sentences: [], translations: {} }))
    vi.stubGlobal("fetch", fetchMock)

    const store = useBilingualDataStore()
    await store.initData()
    await vi.advanceTimersByTimeAsync(110)
    fetchMock.mockClear()

    store.data.vocabulary = [buildWord("w2", "beta")]
    await vi.advanceTimersByTimeAsync(550)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0]
    expect(call[0]).toBe("/api/v1/bilingual-data")
    expect((call[1] as RequestInit).method).toBe("POST")
  })

  it("does not save while reloading flag is active", async () => {
    const deferred = createDeferred<Response>()
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      createResponse({
        vocabulary: [],
        sentences: [],
        translations: {}
      })
    )
    fetchMock.mockReturnValueOnce(deferred.promise)
    vi.stubGlobal("fetch", fetchMock)

    const store = useBilingualDataStore()
    await store.initData()
    await vi.advanceTimersByTimeAsync(110)
    fetchMock.mockClear()

    const reloadPromise = store.reloadData()
    store.data.vocabulary = [buildWord("w3", "gamma")]
    await vi.advanceTimersByTimeAsync(550)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/bilingual-data")

    deferred.resolve(
      createResponse({
        vocabulary: [],
        sentences: [],
        translations: {}
      })
    )

    await reloadPromise
    await vi.advanceTimersByTimeAsync(110)
  })
})
