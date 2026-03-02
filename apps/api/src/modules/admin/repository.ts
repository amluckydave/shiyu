import type Database from "better-sqlite3"
import type { InvitationCode } from "@shiyu/shared"
import crypto from "node:crypto"

interface InvitationCodeRow {
    id: string
    code: string
    max_uses: number
    used_count: number
    created_by: string
    created_at: number
    expires_at: number | null
}

function rowToInvitationCode(row: InvitationCodeRow): InvitationCode {
    return {
        id: row.id,
        code: row.code,
        maxUses: row.max_uses,
        usedCount: row.used_count,
        createdBy: row.created_by,
        createdAt: row.created_at,
        expiresAt: row.expires_at ?? undefined,
    }
}

function generateRandomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789" // no I/O/0/1/l to avoid confusion
    let code = ""
    const bytes = crypto.randomBytes(20)
    for (let i = 0; i < 20; i++) {
        code += chars[bytes[i] % chars.length]
    }
    return code
}

export class InvitationCodeRepository {
    constructor(private db: Database.Database) { }

    /** Generate one or more invitation codes */
    generateCodes(count: number, maxUses: number, createdBy: string): InvitationCode[] {
        const now = Date.now()
        const codes: InvitationCode[] = []

        const stmt = this.db.prepare(`
      INSERT INTO invitation_codes (id, code, max_uses, used_count, created_by, created_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `)

        const insertMany = this.db.transaction(() => {
            for (let i = 0; i < count; i++) {
                const id = crypto.randomUUID()
                let code: string
                // Ensure uniqueness
                let attempts = 0
                do {
                    code = generateRandomCode()
                    attempts++
                } while (
                    attempts < 100 &&
                    (this.db.prepare("SELECT 1 FROM invitation_codes WHERE code = ?").get(code) as any)
                )

                stmt.run(id, code, maxUses, createdBy, now)
                codes.push({
                    id,
                    code,
                    maxUses,
                    usedCount: 0,
                    createdBy,
                    createdAt: now,
                })
            }
        })

        insertMany()
        return codes
    }

    /** List invitation codes with pagination */
    listCodes(page: number = 1, pageSize: number = 20): { codes: InvitationCode[]; total: number } {
        const offset = (page - 1) * pageSize

        const countStmt = this.db.prepare("SELECT COUNT(*) as count FROM invitation_codes")
        const { count } = countStmt.get() as { count: number }

        const stmt = this.db.prepare("SELECT * FROM invitation_codes ORDER BY created_at DESC LIMIT ? OFFSET ?")
        const rows = stmt.all(pageSize, offset) as InvitationCodeRow[]

        return {
            codes: rows.map(rowToInvitationCode),
            total: count,
        }
    }

    /** Delete an invitation code */
    deleteCode(id: string): boolean {
        const stmt = this.db.prepare("DELETE FROM invitation_codes WHERE id = ?")
        const result = stmt.run(id)
        return result.changes > 0
    }

    /** Validate an invitation code and increment its used_count atomically. Returns true if valid. */
    validateAndUseCode(code: string): { valid: boolean; error?: string } {
        const now = Date.now()
        const trimmedCode = code.trim()

        // First check the code exists to provide specific error messages
        const row = this.db.prepare(`
      SELECT * FROM invitation_codes WHERE code = ?
    `).get(trimmedCode) as InvitationCodeRow | undefined

        if (!row) {
            return { valid: false, error: "邀请码不存在。" }
        }

        if (row.expires_at && row.expires_at < now) {
            return { valid: false, error: "邀请码已过期。" }
        }

        if (row.used_count >= row.max_uses) {
            return { valid: false, error: "邀请码已被使用。" }
        }

        // Atomic increment — only succeeds if used_count is still < max_uses
        const result = this.db.prepare(`
      UPDATE invitation_codes
      SET used_count = used_count + 1
      WHERE code = ? AND used_count < max_uses
        AND (expires_at IS NULL OR expires_at >= ?)
    `).run(trimmedCode, now)

        if (result.changes === 0) {
            return { valid: false, error: "邀请码已被使用。" }
        }

        return { valid: true }
    }

    /** Get stats about invitation codes */
    getStats(): { total: number; active: number; fullyUsed: number } {
        const totalStmt = this.db.prepare("SELECT COUNT(*) as count FROM invitation_codes")
        const { count: total } = totalStmt.get() as { count: number }

        const activeStmt = this.db.prepare("SELECT COUNT(*) as count FROM invitation_codes WHERE used_count < max_uses")
        const { count: active } = activeStmt.get() as { count: number }

        return {
            total,
            active,
            fullyUsed: total - active,
        }
    }
}
