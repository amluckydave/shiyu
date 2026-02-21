import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { API_ROUTES, type BilingualDataResponse } from "../../../packages/shared/src/index.js"
import { createApp } from "../src/app.js"
import { FileBilingualDataRepository } from "../src/modules/bilingualData/repository.js"

async function createServerWithTempFile() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bilingual-api-test-"))
  const filePath = path.join(tempDir, "bilingual-data.json")
  const repository = new FileBilingualDataRepository(filePath)
  const app = createApp({ repository })

  const server = await new Promise<import("node:http").Server>((resolve) => {
    const started = app.listen(0, () => resolve(started))
  })

  const address = server.address() as AddressInfo
  const baseUrl = `http://127.0.0.1:${address.port}`

  return { server, baseUrl, tempDir, filePath }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<{ status: number; data: T }> {
  const response = await fetch(url, init)
  const data = (await response.json()) as T
  return { status: response.status, data }
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

function buildSentence(id: string, sentence: string) {
  return {
    id,
    sentence,
    explanation: `${sentence}-explanation`,
    createdAt: Date.now(),
    reviewCount: 0
  }
}

const cleanups: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop()
    if (cleanup) {
      await cleanup()
    }
  }
})

describe("bilingual-data api", () => {
  it("GET should return empty data when file does not exist", async () => {
    const { server, baseUrl, tempDir } = await createServerWithTempFile()
    cleanups.push(async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      await fs.rm(tempDir, { recursive: true, force: true })
    })

    const result = await requestJson<BilingualDataResponse>(`${baseUrl}${API_ROUTES.bilingualData}`)
    expect(result.status).toBe(200)
    expect(result.data).toEqual({
      vocabulary: [],
      sentences: [],
      translations: {}
    })
  })

  it("POST should replace vocabulary and sentences arrays", async () => {
    const { server, baseUrl, tempDir } = await createServerWithTempFile()
    cleanups.push(async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      await fs.rm(tempDir, { recursive: true, force: true })
    })

    await requestJson(`${baseUrl}${API_ROUTES.bilingualData}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vocabulary: [buildWord("w1", "alpha")],
        sentences: [buildSentence("s1", "first sentence")]
      })
    })

    await requestJson(`${baseUrl}${API_ROUTES.bilingualData}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vocabulary: [buildWord("w2", "beta")],
        sentences: [buildSentence("s2", "second sentence")]
      })
    })

    const result = await requestJson<BilingualDataResponse>(`${baseUrl}${API_ROUTES.bilingualData}`)
    expect(result.data.vocabulary.map((item) => item.id)).toEqual(["w2"])
    expect(result.data.sentences.map((item) => item.id)).toEqual(["s2"])
  })

  it("POST should shallow-merge translations", async () => {
    const { server, baseUrl, tempDir } = await createServerWithTempFile()
    cleanups.push(async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      await fs.rm(tempDir, { recursive: true, force: true })
    })

    await requestJson(`${baseUrl}${API_ROUTES.bilingualData}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        translations: {
          "path-1": {
            path: "/demo/a",
            paragraphIndex: 1,
            translation: "A",
            updatedAt: Date.now()
          }
        }
      })
    })

    await requestJson(`${baseUrl}${API_ROUTES.bilingualData}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        translations: {
          "path-2": {
            path: "/demo/b",
            paragraphIndex: 2,
            translation: "B",
            updatedAt: Date.now()
          }
        }
      })
    })

    const result = await requestJson<BilingualDataResponse>(`${baseUrl}${API_ROUTES.bilingualData}`)
    expect(Object.keys(result.data.translations).sort()).toEqual(["path-1", "path-2"])
  })

  it("POST should return 400 for invalid payload", async () => {
    const { server, baseUrl, tempDir } = await createServerWithTempFile()
    cleanups.push(async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      await fs.rm(tempDir, { recursive: true, force: true })
    })

    const result = await requestJson<{ error: string }>(`${baseUrl}${API_ROUTES.bilingualData}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vocabulary: [{ id: "invalid" }]
      })
    })

    expect(result.status).toBe(400)
    expect(result.data.error).toContain("Invalid field: vocabulary")
  })

  it("legacy /api/bilingual-data route should stay in sync with /api/v1/bilingual-data", async () => {
    const { server, baseUrl, tempDir } = await createServerWithTempFile()
    cleanups.push(async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      await fs.rm(tempDir, { recursive: true, force: true })
    })

    await requestJson(`${baseUrl}/api/bilingual-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vocabulary: [buildWord("w-legacy", "legacy")]
      })
    })

    const v1Result = await requestJson<BilingualDataResponse>(`${baseUrl}${API_ROUTES.bilingualData}`)
    expect(v1Result.data.vocabulary.map((item) => item.id)).toEqual(["w-legacy"])

    await requestJson(`${baseUrl}${API_ROUTES.bilingualData}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sentences: [buildSentence("s-v1", "sentence from v1")]
      })
    })

    const legacyResult = await requestJson<BilingualDataResponse>(`${baseUrl}/api/bilingual-data`)
    expect(legacyResult.data.vocabulary.map((item) => item.id)).toEqual(["w-legacy"])
    expect(legacyResult.data.sentences.map((item) => item.id)).toEqual(["s-v1"])
  })
})
