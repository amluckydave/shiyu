import type Database from "better-sqlite3"
import type { User, UserRole } from "@shiyu/shared"
import crypto from "node:crypto"

interface UserRow {
    id: string
    email: string
    nickname: string
    role: UserRole
    email_verified: number
    created_at: number
    updated_at: number
}

function rowToUser(row: UserRow): User {
    return {
        id: row.id,
        email: row.email,
        nickname: row.nickname,
        role: row.role,
        emailVerified: row.email_verified === 1,
        createdAt: row.created_at
    }
}

export class UserRepository {
    constructor(private db: Database.Database) { }

    createUser(email: string, nickname: string): User {
        const id = crypto.randomUUID()
        const now = Date.now()

        const stmt = this.db.prepare(`
      INSERT INTO users (id, email, nickname, role, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'user', 1, ?, ?)
    `)
        stmt.run(id, email.toLowerCase(), nickname, now, now)

        return {
            id,
            email: email.toLowerCase(),
            nickname,
            role: "user",
            emailVerified: true,
            createdAt: now
        }
    }

    findByEmail(email: string): User | null {
        const stmt = this.db.prepare("SELECT * FROM users WHERE email = ?")
        const row = stmt.get(email.toLowerCase()) as UserRow | undefined
        if (!row) return null
        return rowToUser(row)
    }

    findById(id: string): User | null {
        const stmt = this.db.prepare("SELECT * FROM users WHERE id = ?")
        const row = stmt.get(id) as UserRow | undefined
        if (!row) return null
        return rowToUser(row)
    }

    updateUser(id: string, fields: Partial<Pick<User, "nickname" | "role" | "emailVerified">>): User | null {
        const updates: string[] = []
        const values: unknown[] = []

        if (fields.nickname !== undefined) {
            updates.push("nickname = ?")
            values.push(fields.nickname)
        }
        if (fields.role !== undefined) {
            updates.push("role = ?")
            values.push(fields.role)
        }
        if (fields.emailVerified !== undefined) {
            updates.push("email_verified = ?")
            values.push(fields.emailVerified ? 1 : 0)
        }

        if (updates.length === 0) return this.findById(id)

        updates.push("updated_at = ?")
        values.push(Date.now())
        values.push(id)

        const stmt = this.db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
        stmt.run(...values)

        return this.findById(id)
    }

    deleteUser(id: string): boolean {
        const stmt = this.db.prepare("DELETE FROM users WHERE id = ?")
        const result = stmt.run(id)
        return result.changes > 0
    }

    listUsers(page: number = 1, pageSize: number = 20): { users: User[]; total: number } {
        const offset = (page - 1) * pageSize

        const countStmt = this.db.prepare("SELECT COUNT(*) as count FROM users")
        const { count } = countStmt.get() as { count: number }

        const stmt = this.db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?")
        const rows = stmt.all(pageSize, offset) as UserRow[]

        return {
            users: rows.map(rowToUser),
            total: count
        }
    }

    getStats(): { totalUsers: number; activeUsers: number; newUsersToday: number } {
        const countStmt = this.db.prepare("SELECT COUNT(*) as count FROM users")
        const { count: totalUsers } = countStmt.get() as { count: number }

        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayStmt = this.db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= ?")
        const { count: newUsersToday } = todayStmt.get(todayStart.getTime()) as { count: number }

        return {
            totalUsers,
            activeUsers: totalUsers,
            newUsersToday
        }
    }

    /** Ensure a default admin exists (for initial setup) */
    ensureDefaultAdmin(email: string): void {
        const existing = this.findByEmail(email)
        if (existing) return

        const id = crypto.randomUUID()
        const now = Date.now()
        const stmt = this.db.prepare(`
      INSERT INTO users (id, email, nickname, role, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', 1, ?, ?)
    `)
        stmt.run(id, email.toLowerCase(), "Admin", now, now)
    }
}

// ── Verification Code Repository ─────────────────────────

const CODE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const CODE_RATE_LIMIT_MS = 5 * 60 * 1000 // 5 minutes between sends

export class VerificationCodeRepository {
    constructor(private db: Database.Database) { }

    /** Store a new verification code */
    saveCode(email: string, code: string): void {
        const now = Date.now()
        const expiresAt = now + CODE_TTL_MS

        // Invalidate previous unused codes for this email
        this.db.prepare("UPDATE verification_codes SET used = 1 WHERE email = ? AND used = 0")
            .run(email.toLowerCase())

        this.db.prepare(`
      INSERT INTO verification_codes (email, code, expires_at, created_at, used)
      VALUES (?, ?, ?, ?, 0)
    `).run(email.toLowerCase(), code, expiresAt, now)
    }

    /** Verify a code. Returns true if valid and marks it as used. */
    verifyCode(email: string, code: string): boolean {
        const now = Date.now()
        const row = this.db.prepare(`
      SELECT id FROM verification_codes
      WHERE email = ? AND code = ? AND used = 0 AND expires_at > ?
      ORDER BY created_at DESC LIMIT 1
    `).get(email.toLowerCase(), code, now) as { id: number } | undefined

        if (!row) return false

        // Mark as used
        this.db.prepare("UPDATE verification_codes SET used = 1 WHERE id = ?").run(row.id)
        return true
    }

    /** Check if a code was sent recently (rate limiting). Returns remaining ms (0 if we can send) */
    getRemainingCooldown(email: string): number {
        const cutoff = Date.now() - CODE_RATE_LIMIT_MS
        const row = this.db.prepare(`
      SELECT created_at FROM verification_codes
      WHERE email = ? AND created_at > ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(email.toLowerCase(), cutoff) as { created_at: number } | undefined

        if (!row) return 0
        const timePassed = Date.now() - row.created_at
        return Math.max(0, CODE_RATE_LIMIT_MS - timePassed)
    }

    /** Clean up expired codes */
    cleanup(): void {
        const now = Date.now()
        this.db.prepare("DELETE FROM verification_codes WHERE expires_at < ? OR used = 1").run(now)
    }
}
