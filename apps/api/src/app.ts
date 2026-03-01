import express, { type Request, type Response, type NextFunction } from "express"
import type { ApiErrorResponse } from "../../../packages/shared/src/index.js"
import { createBilingualDataRouter } from "./modules/bilingualData/routes.js"
import { createAuthRouter } from "./modules/auth/routes.js"
import { createAdminRouter } from "./modules/admin/routes.js"
import { createUserDataRouter } from "./modules/userData/routes.js"
import { resolveDataFilePath } from "./config.js"
import { getDatabase } from "./database.js"
import { FileBilingualDataRepository, type BilingualDataRepository } from "./modules/bilingualData/repository.js"
import { requireAuth } from "./middleware/auth.js"
import type Database from "better-sqlite3"

export interface CreateAppOptions {
  repository?: BilingualDataRepository
  database?: Database.Database
}

export function createApp(options: CreateAppOptions = {}): express.Express {
  const app = express()
  const repository = options.repository ?? new FileBilingualDataRepository(resolveDataFilePath())
  const db = options.database ?? getDatabase()

  // CORS
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("Access-Control-Allow-Origin", "*")
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
    response.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization")
    if (_request.method === "OPTIONS") {
      response.status(204).end()
      return
    }
    next()
  })

  app.use(express.json())

  // ── Public routes ────────────────────────────────────────
  app.use(createAuthRouter(db))

  // ── Protected routes ─────────────────────────────────────
  app.use(createBilingualDataRouter(repository))
  app.use(createUserDataRouter(db))

  // ── Admin routes ─────────────────────────────────────────
  app.use(createAdminRouter(db))

  // ── Error handling ───────────────────────────────────────
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
