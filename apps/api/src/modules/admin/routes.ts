import { Router, type Request, type Response } from "express"
import { API_ROUTES } from "@shiyu/shared"
import type { ApiErrorResponse, AdminUserListResponse, AdminStatsResponse } from "@shiyu/shared"
import { UserRepository } from "../auth/repository.js"
import { requireAuth, requireAdmin } from "../../middleware/auth.js"
import type Database from "better-sqlite3"

export function createAdminRouter(db: Database.Database): Router {
    const router = Router()
    const userRepo = new UserRepository(db)

    // All admin routes require auth + admin role
    router.use(API_ROUTES.adminUsers, requireAuth, requireAdmin)
    router.use(API_ROUTES.adminStats, requireAuth, requireAdmin)

    // ── List Users ───────────────────────────────────────────
    router.get(API_ROUTES.adminUsers, (req: Request, res: Response) => {
        try {
            const page = Math.max(1, parseInt(req.query.page as string) || 1)
            const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20))

            const result = userRepo.listUsers(page, pageSize)
            res.json({
                users: result.users,
                total: result.total,
                page,
                pageSize
            } as AdminUserListResponse)
        } catch (error) {
            console.error("Admin list users error:", error)
            res.status(500).json({ error: "Internal server error." } as ApiErrorResponse)
        }
    })

    // ── Update User ──────────────────────────────────────────
    router.patch(`${API_ROUTES.adminUsers}/:id`, requireAuth, requireAdmin, (req: Request, res: Response) => {
        try {
            const { id } = req.params
            const { nickname, role } = req.body

            // Prevent admin from demoting themselves
            if (req.user && id === req.user.id && role && role !== "admin") {
                res.status(400).json({ error: "Cannot change your own role." } as ApiErrorResponse)
                return
            }

            const user = userRepo.updateUser(id, { nickname, role })
            if (!user) {
                res.status(404).json({ error: "User not found." } as ApiErrorResponse)
                return
            }

            res.json(user)
        } catch (error) {
            console.error("Admin update user error:", error)
            res.status(500).json({ error: "Internal server error." } as ApiErrorResponse)
        }
    })

    // ── Delete User ──────────────────────────────────────────
    router.delete(`${API_ROUTES.adminUsers}/:id`, requireAuth, requireAdmin, (req: Request, res: Response) => {
        try {
            const { id } = req.params

            // Prevent admin from deleting themselves
            if (req.user && id === req.user.id) {
                res.status(400).json({ error: "Cannot delete your own account." } as ApiErrorResponse)
                return
            }

            const deleted = userRepo.deleteUser(id)
            if (!deleted) {
                res.status(404).json({ error: "User not found." } as ApiErrorResponse)
                return
            }

            res.json({ success: true })
        } catch (error) {
            console.error("Admin delete user error:", error)
            res.status(500).json({ error: "Internal server error." } as ApiErrorResponse)
        }
    })

    // ── Stats ────────────────────────────────────────────────
    router.get(API_ROUTES.adminStats, (req: Request, res: Response) => {
        try {
            const stats = userRepo.getStats()
            res.json(stats as AdminStatsResponse)
        } catch (error) {
            console.error("Admin stats error:", error)
            res.status(500).json({ error: "Internal server error." } as ApiErrorResponse)
        }
    })

    return router
}
