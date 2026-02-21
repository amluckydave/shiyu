import { Router, type Request, type Response } from "express"
import type { ApiErrorResponse, ApiSuccessResponse, BilingualDataResponse } from "../../../../../packages/shared/src/index.js"
import { API_ROUTES, parseBilingualDataUpdateRequest } from "../../../../../packages/shared/src/index.js"
import type { BilingualDataRepository } from "./repository.js"

function sendError(response: Response<ApiErrorResponse>, status: number, error: string): void {
  response.status(status).json({ error })
}

export function createBilingualDataRouter(repository: BilingualDataRepository): Router {
  const router = Router()
  const dataRoutes = [API_ROUTES.bilingualData, "/api/bilingual-data"] as const

  for (const routePath of dataRoutes) {
    router.get(routePath, async (_request: Request, response: Response<BilingualDataResponse | ApiErrorResponse>) => {
      try {
        const data = await repository.read()
        response.json(data)
      } catch {
        sendError(response, 500, "Failed to read data.")
      }
    })

    router.post(routePath, async (request: Request, response: Response<ApiSuccessResponse | ApiErrorResponse>) => {
      const parsed = parseBilingualDataUpdateRequest(request.body)
      if (!parsed.ok) {
        sendError(response, 400, parsed.error)
        return
      }

      try {
        await repository.writeMerged(parsed.value)
        response.json({ success: true })
      } catch {
        sendError(response, 500, "Failed to write data.")
      }
    })
  }

  return router
}
