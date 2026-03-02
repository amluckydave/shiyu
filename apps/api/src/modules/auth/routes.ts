import { Router, type Request, type Response } from "express"
import { API_ROUTES } from "@shiyu/shared"
import type { SendCodeRequest, VerifyCodeRequest, ApiErrorResponse, AuthResponse, SendCodeResponse } from "@shiyu/shared"
import { UserRepository, VerificationCodeRepository } from "./repository.js"
import { InvitationCodeRepository } from "../admin/repository.js"
import { generateToken, requireAuth } from "../../middleware/auth.js"
import { generateVerificationCode, sendVerificationEmail } from "../../services/email.js"
import { verifyTurnstileToken } from "../../services/turnstile.js"
import type Database from "better-sqlite3"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function createAuthRouter(db: Database.Database): Router {
    const router = Router()
    const userRepo = new UserRepository(db)
    const codeRepo = new VerificationCodeRepository(db)
    const invCodeRepo = new InvitationCodeRepository(db)

    // ── Send Verification Code ───────────────────────────────
    router.post(API_ROUTES.authSendCode, async (req: Request, res: Response) => {
        try {
            const { email, turnstileToken, adminOnly, resend } = req.body as SendCodeRequest & { turnstileToken?: string; adminOnly?: boolean; resend?: boolean }

            if (!email) {
                res.status(400).json({ error: "请输入邮箱地址。" } as ApiErrorResponse)
                return
            }

            if (!EMAIL_REGEX.test(email)) {
                res.status(400).json({ error: "邮箱格式不正确。" } as ApiErrorResponse)
                return
            }

            // Verify Cloudflare Turnstile token (人机验证)
            if (process.env.TURNSTILE_SECRET_KEY && !resend) {
                if (!turnstileToken) {
                    res.status(400).json({ error: "请完成人机验证。" } as ApiErrorResponse)
                    return
                }
                const ip = req.ip || req.socket.remoteAddress
                const isHuman = await verifyTurnstileToken(turnstileToken, ip)
                if (!isHuman) {
                    res.status(403).json({ error: "人机验证失败，请重试。" } as ApiErrorResponse)
                    return
                }
            }

            // Check if user exists (need it for rate limit response too)
            const existingUser = userRepo.findByEmail(email)
            const isNewUser = !existingUser

            // Admin-only check: only allow admin emails on admin login page
            if (adminOnly) {
                if (!existingUser || existingUser.role !== "admin") {
                    res.status(403).json({ error: "该邮箱不是管理员账号。" } as ApiErrorResponse)
                    return
                }
            }

            // Rate limiting: 5 minutes cooldown
            const remainingMs = codeRepo.getRemainingCooldown(email)
            if (remainingMs > 0) {
                res.status(429).json({
                    error: "发送过于频繁，请稍后重试。",
                    remainingMs,
                    isNewUser
                })
                return
            }

            // Generate and save code
            const code = generateVerificationCode()
            codeRepo.saveCode(email, code)

            // Send email
            try {
                await sendVerificationEmail(email, code)
            } catch (emailError) {
                console.error("Failed to send verification email:", emailError)
                res.status(500).json({ error: "验证码发送失败，请检查邮箱地址或稍后重试。" } as ApiErrorResponse)
                return
            }

            res.json({
                success: true,
                message: `验证码已发送到 ${email}`,
                isNewUser
            } as SendCodeResponse)
        } catch (error) {
            console.error("Send code error:", error)
            res.status(500).json({ error: "服务器错误，请稍后重试。" } as ApiErrorResponse)
        }
    })

    // ── Check if email is already registered ─────────────────
    router.post(API_ROUTES.authCheckEmail, (req: Request, res: Response) => {
        try {
            const { email } = req.body as { email: string }
            if (!email) {
                res.status(400).json({ error: "请输入邮箱。" } as ApiErrorResponse)
                return
            }
            const user = userRepo.findByEmail(email)
            res.json({ exists: !!user })
        } catch (error) {
            console.error("Check email error:", error)
            res.status(500).json({ error: "服务器错误。" } as ApiErrorResponse)
        }
    })

    // ── Verify Code (Login / Register) ───────────────────────
    router.post(API_ROUTES.authVerifyCode, (req: Request, res: Response) => {
        try {
            const { email, code, nickname, invitationCode } = req.body as VerifyCodeRequest

            if (!email || !code) {
                res.status(400).json({ error: "请输入邮箱和验证码。" } as ApiErrorResponse)
                return
            }

            // Verify the code
            const valid = codeRepo.verifyCode(email, code)
            if (!valid) {
                res.status(401).json({ error: "验证码无效或已过期。" } as ApiErrorResponse)
                return
            }

            // Check if user exists
            let user = userRepo.findByEmail(email)
            let isNewUser = false

            if (!user) {
                // New user — nickname is required
                if (!nickname || !nickname.trim()) {
                    res.status(400).json({ error: "首次登录请设置昵称。" } as ApiErrorResponse)
                    return
                }
                if (nickname.trim().length > 50) {
                    res.status(400).json({ error: "昵称最多 50 个字符。" } as ApiErrorResponse)
                    return
                }

                // New user — invitation code is required
                if (!invitationCode || !invitationCode.trim()) {
                    res.status(400).json({ error: "请输入邀请码。" } as ApiErrorResponse)
                    return
                }
                const invResult = invCodeRepo.validateAndUseCode(invitationCode.trim())
                if (!invResult.valid) {
                    res.status(400).json({ error: invResult.error || "邀请码无效。" } as ApiErrorResponse)
                    return
                }

                user = userRepo.createUser(email, nickname.trim())
                isNewUser = true
            }

            const token = generateToken(user)

            res.json({ user, token, isNewUser } as AuthResponse)
        } catch (error) {
            console.error("Verify code error:", error)
            res.status(500).json({ error: "服务器错误，请稍后重试。" } as ApiErrorResponse)
        }
    })

    // ── Logout ───────────────────────────────────────────────
    router.post(API_ROUTES.authLogout, requireAuth, (_req: Request, res: Response) => {
        res.json({ success: true })
    })

    // ── Get Current User ─────────────────────────────────────
    router.get(API_ROUTES.authMe, requireAuth, (req: Request, res: Response) => {
        if (!req.user) {
            res.status(401).json({ error: "请先登录。" } as ApiErrorResponse)
            return
        }

        const user = userRepo.findById(req.user.id)
        if (!user) {
            res.status(404).json({ error: "用户不存在。" } as ApiErrorResponse)
            return
        }

        res.json(user)
    })

    // Periodic cleanup of expired codes (every 30 minutes)
    setInterval(() => {
        try { codeRepo.cleanup() } catch { /* ignore */ }
    }, 30 * 60 * 1000)

    return router
}
