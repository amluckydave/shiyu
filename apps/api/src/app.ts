import express, { type Request, type Response, type NextFunction } from "express"
import type { ApiErrorResponse } from "../../../packages/shared/src/index.js"
import { createBilingualDataRouter } from "./modules/bilingualData/routes.js"
import { resolveDataFilePath } from "./config.js"
import { FileBilingualDataRepository, type BilingualDataRepository } from "./modules/bilingualData/repository.js"

export interface CreateAppOptions {
  repository?: BilingualDataRepository
}

export function createApp(options: CreateAppOptions = {}): express.Express {
  const app = express()
  const repository = options.repository ?? new FileBilingualDataRepository(resolveDataFilePath())

  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("Access-Control-Allow-Origin", "*")
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    response.setHeader("Access-Control-Allow-Headers", "Content-Type")
    if (_request.method === "OPTIONS") {
      response.status(204).end()
      return
    }
    next()
  })

  app.use(express.json())
  app.use(createBilingualDataRouter(repository))

  app.use((error: unknown, _request: Request, response: Response<ApiErrorResponse>, next: NextFunction) => {
    if (error instanceof SyntaxError) {
      response.status(400).json({ error: "Invalid JSON body." })
      return
    }
    next(error)
  })

  app.use((_request: Request, response: Response<ApiErrorResponse>) => {
    response.status(404).json({ error: "Not Found." })
  })

  return app
}
