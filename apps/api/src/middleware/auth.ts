import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import type { User } from "@shiyu/shared"

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: User
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || "shiyu-dev-secret-change-in-production"
const JWT_EXPIRES_IN = "7d"

export function getJwtSecret(): string {
    return JWT_SECRET
}

export function generateToken(user: User): string {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    )
}

export function verifyToken(token: string): { id: string; email: string; role: string } | null {
    try {
        return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string }
    } catch {
        return null
    }
}

/**
 * Middleware: require valid JWT token.
 * Populates req.user on success.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentication required." })
        return
    }

    const token = authHeader.slice(7)
    const payload = verifyToken(token)
    if (!payload) {
        res.status(401).json({ error: "Invalid or expired token." })
        return
    }

    // Attach minimal user info from token — routes can fetch full user if needed
    req.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role as "user" | "admin",
        nickname: "",
        emailVerified: false,
        createdAt: 0
    }

    next()
}

/**
 * Middleware: require admin role (must be used after requireAuth).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user || req.user.role !== "admin") {
        res.status(403).json({ error: "Admin access required." })
        return
    }
    next()
}
