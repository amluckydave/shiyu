import { defineStore } from "pinia"
import { ref, computed } from "vue"
import type { User, SendCodeResponse, AuthResponse } from "@shiyu/shared"
import api, { API_ROUTES } from "../services/api.js"

export const useAuthStore = defineStore("auth", () => {
    // ── State ────────────────────────────────────────────────
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    // ── Getters ──────────────────────────────────────────────
    const isAuthenticated = computed(() => !!token.value && !!user.value)
    const isAdmin = computed(() => user.value?.role === "admin")
    const userNickname = computed(() => user.value?.nickname || "")

    // ── Initialize from localStorage ────────────────────────
    function init() {
        const savedToken = localStorage.getItem("shiyu_token")
        const savedUser = localStorage.getItem("shiyu_user")
        if (savedToken && savedUser) {
            token.value = savedToken
            try {
                user.value = JSON.parse(savedUser) as User
            } catch {
                user.value = null
            }
        }
    }

    // ── Actions ──────────────────────────────────────────────

    /** Step 1: Send verification code to email */
    async function sendCode(email: string, turnstileToken?: string, adminOnly?: boolean): Promise<{ success: boolean; isNewUser?: boolean; remainingMs?: number }> {
        loading.value = true
        error.value = null
        try {
            // Gmail SMTP can be very slow (10-30s), give it plenty of time
            const response = await api.post<SendCodeResponse>(API_ROUTES.authSendCode, { email, turnstileToken, adminOnly }, { timeout: 60000 })
            return { success: true, isNewUser: response.data.isNewUser }
        } catch (err: any) {
            if (err.response?.status === 429 && err.response?.data?.remainingMs) {
                // Rate limited, but we have server cooldown time and user state
                return {
                    success: false,
                    isNewUser: err.response.data.isNewUser,
                    remainingMs: err.response.data.remainingMs
                }
            }

            if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                error.value = "邮件发送超时，请稍后重试。邮件服务器响应较慢，验证码可能仍会送达，请检查邮箱。"
            } else if (!err.response) {
                error.value = "网络连接失败，请检查网络后重试"
            } else {
                error.value = err.response.data?.error || "验证码发送失败，请稍后重试"
            }
            return { success: false }
        } finally {
            loading.value = false
        }
    }

    /** Step 2: Verify code (login or register) */
    async function verifyCode(email: string, code: string, nickname?: string): Promise<boolean> {
        loading.value = true
        error.value = null
        try {
            const response = await api.post<AuthResponse>(API_ROUTES.authVerifyCode, { email, code, nickname })
            user.value = response.data.user
            token.value = response.data.token
            localStorage.setItem("shiyu_token", response.data.token)
            localStorage.setItem("shiyu_user", JSON.stringify(response.data.user))
            return true
        } catch (err: any) {
            error.value = err.response?.data?.error || "验证失败，请重试"
            return false
        } finally {
            loading.value = false
        }
    }

    async function fetchMe(): Promise<void> {
        if (!token.value) return
        try {
            const response = await api.get<User>(API_ROUTES.authMe)
            user.value = response.data
            localStorage.setItem("shiyu_user", JSON.stringify(response.data))
        } catch {
            logout()
        }
    }

    function logout() {
        user.value = null
        token.value = null
        localStorage.removeItem("shiyu_token")
        localStorage.removeItem("shiyu_user")
    }

    // Initialize on store creation
    init()

    return {
        user,
        token,
        loading,
        error,
        isAuthenticated,
        isAdmin,
        userNickname,
        sendCode,
        verifyCode,
        logout,
        fetchMe,
        init
    }
})
