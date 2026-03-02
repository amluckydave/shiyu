<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import { useRouter, useRoute, RouterLink } from "vue-router"
import { useAuthStore } from "../stores/auth.js"
import api from "../services/api.js"
import { API_ROUTES } from "@shiyu/shared"

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// ── State ──────────────────────────────────────────────
type Step = "email" | "code"
const step = ref<Step>("email")
const email = ref((route.query.email as string) || "")
const code = ref("")
const nickname = ref("")
const invitationCode = ref("")
const submitted = ref(false)
const codeSent = ref(false)
const emailExists = ref(false)
const checkingEmail = ref(false)

// Turnstile (人机验证)
const turnstileToken = ref<string | null>(null)
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || ""
const turnstileWidgetId = ref<string | null>(null)

// Countdown timer
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

// ── Validation ─────────────────────────────────────────
const emailError = computed(() => {
  if (!submitted.value && !emailExists.value) return ""
  if (!email.value) return "请输入邮箱"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return "邮箱格式不正确"
  if (emailExists.value) return "该邮箱已注册，请直接登录"
  return ""
})

async function handleEmailBlur() {
  if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return
  checkingEmail.value = true
  try {
    const res = await api.post<{ exists: boolean }>(API_ROUTES.authCheckEmail, { email: email.value })
    emailExists.value = res.data.exists
  } catch {
    // Silently ignore — will be caught at submit
  } finally {
    checkingEmail.value = false
  }
}

const codeError = computed(() => {
  if (!submitted.value || step.value !== "code") return ""
  if (!code.value) return "请输入验证码"
  if (code.value.length !== 6 || !/^\d{6}$/.test(code.value)) return "验证码为 6 位数字"
  return ""
})

const nicknameError = computed(() => {
  if (!submitted.value || step.value !== "code") return ""
  if (!nickname.value.trim()) return "请输入昵称"
  if (nickname.value.trim().length > 50) return "昵称最多 50 个字符"
  return ""
})

const invitationCodeError = computed(() => {
  if (!submitted.value) return ""
  if (!invitationCode.value.trim()) return "请输入邀请码"
  return ""
})

// ── Actions ────────────────────────────────────────────
async function handleSendCode() {
  submitted.value = true
  if (emailError.value) return
  if (emailExists.value) return
  if (invitationCodeError.value) return
  if (turnstileSiteKey && !turnstileToken.value) {
    auth.error = "请先完成人机验证"
    return
  }

  const result = await auth.sendCode(email.value, turnstileToken.value || undefined)
  if (result.success || result.remainingMs) {
    // Check if user already exists — redirect to login
    if (result.isNewUser === false) {
      auth.error = "该邮箱已注册，请直接登录。"
      resetTurnstile()
      return
    }
    step.value = "code"
    codeSent.value = true
    submitted.value = false

    const seconds = result.remainingMs ? Math.ceil(result.remainingMs / 1000) : 300
    startCountdown(seconds)
  } else {
    resetTurnstile()
  }
}

async function handleResendCode() {
  if (countdown.value > 0) return
  auth.error = null
  const result = await auth.sendCode(email.value, undefined, undefined, true)
  if (result.success || result.remainingMs) {
    const seconds = result.remainingMs ? Math.ceil(result.remainingMs / 1000) : 300
    startCountdown(seconds)
  }
}

async function handleVerifyCode() {
  submitted.value = true
  if (codeError.value) return
  if (nicknameError.value) return
  if (invitationCodeError.value) return

  const success = await auth.verifyCode(
    email.value,
    code.value,
    nickname.value.trim(),
    invitationCode.value.trim()
  )
  if (success) {
    router.push("/")
  }
}

function goBack() {
  step.value = "email"
  code.value = ""
  submitted.value = false
  auth.error = null
}

function startCountdown(seconds: number = 300) {
  countdown.value = seconds
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
    }
  }, 1000)
}

onMounted(() => {
  if (turnstileSiteKey && !document.getElementById('cf-turnstile-script')) {
    const script = document.createElement('script')
    script.id = 'cf-turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad'
    script.async = true
    script.defer = true
    ;(window as any).onTurnstileLoad = () => {
      renderTurnstile()
    }
    document.head.appendChild(script)
  } else if (turnstileSiteKey && (window as any).turnstile) {
    renderTurnstile()
  }
})

function renderTurnstile() {
  const container = document.getElementById('turnstile-container-reg')
  if (!container || !(window as any).turnstile) return
  turnstileWidgetId.value = (window as any).turnstile.render(container, {
    sitekey: turnstileSiteKey,
    theme: 'dark',
    callback: (token: string) => { turnstileToken.value = token },
    'expired-callback': () => { turnstileToken.value = null },
    'error-callback': () => { turnstileToken.value = null }
  })
}

function resetTurnstile() {
  if (turnstileWidgetId.value !== null && (window as any).turnstile) {
    (window as any).turnstile.reset(turnstileWidgetId.value)
    turnstileToken.value = null
  }
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">
          <img src="/logo2.png" alt="logo" class="auth-logo-img" />
        </div>
        <h1 class="auth-title">{{ step === 'email' ? '注册账号' : '完成注册' }}</h1>
        <p class="auth-subtitle">{{ step === 'email' ? '输入邮箱获取验证码' : `验证码已发送到 ${email}` }}</p>
      </div>

      <!-- Step 1: Email -->
      <form v-if="step === 'email'" class="auth-form" @submit.prevent="handleSendCode">
        <div class="form-group" :class="{ 'has-error': emailError }">
          <label class="form-label" for="reg-email">邮箱地址</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <input
              id="reg-email"
              v-model="email"
              type="email"
              class="form-input"
              placeholder="your@email.com"
              autocomplete="email"
              autofocus
              @blur="handleEmailBlur"
              @input="emailExists = false"
            />
          </div>
          <p v-if="emailError" class="form-error">{{ emailError }}</p>
        </div>

        <div class="form-group" :class="{ 'has-error': invitationCodeError }">
          <label class="form-label" for="reg-invitation-code">邀请码</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
            </svg>
            <input
              id="reg-invitation-code"
              v-model="invitationCode"
              type="text"
              class="form-input"
              placeholder="请输入邀请码"
              autocomplete="off"
              style="letter-spacing: 2px; font-weight: 700;"
            />
          </div>
          <p v-if="invitationCodeError" class="form-error">{{ invitationCodeError }}</p>
        </div>

        <div v-if="auth.error" class="form-alert">{{ auth.error }}</div>

        <!-- Cloudflare Turnstile 人机验证 -->
        <div v-if="turnstileSiteKey" id="turnstile-container-reg" class="turnstile-wrap"></div>

        <button type="submit" class="auth-btn" :disabled="auth.loading || (turnstileSiteKey && !turnstileToken)">
          <span v-if="auth.loading" class="spinner"></span>
          <span>{{ auth.loading ? "发送中，请耐心等待..." : "获取验证码" }}</span>
        </button>
      </form>

      <!-- Step 2: Code + Nickname + Invitation Code -->
      <form v-else class="auth-form" @submit.prevent="handleVerifyCode">
        <div class="form-group" :class="{ 'has-error': codeError }">
          <label class="form-label" for="reg-code">验证码</label>
          <div class="code-input-wrap">
            <input
              id="reg-code"
              v-model="code"
              type="text"
              class="code-input"
              placeholder="000000"
              maxlength="6"
              inputmode="numeric"
              autocomplete="one-time-code"
              autofocus
            />
          </div>
          <p v-if="codeError" class="form-error">{{ codeError }}</p>
          <button
            type="button"
            class="resend-btn"
            :disabled="countdown > 0 || auth.loading"
            @click="handleResendCode"
          >
            {{ countdown > 0 ? `${countdown}s 后重新发送` : '重新发送验证码' }}
          </button>
        </div>

        <div class="form-group" :class="{ 'has-error': nicknameError }">
          <label class="form-label" for="reg-nickname">设置昵称</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <input
              id="reg-nickname"
              v-model="nickname"
              type="text"
              class="form-input"
              placeholder="你的昵称"
              autocomplete="nickname"
            />
          </div>
          <p v-if="nicknameError" class="form-error">{{ nicknameError }}</p>
        </div>


        <div v-if="auth.error" class="form-alert">{{ auth.error }}</div>

        <button type="submit" class="auth-btn" :disabled="auth.loading">
          <span v-if="auth.loading" class="spinner"></span>
          <span>{{ auth.loading ? "注册中..." : "注册并登录" }}</span>
        </button>

        <button type="button" class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>
          <span>返回修改邮箱</span>
        </button>
      </form>

      <div class="auth-footer">
        <span>已有账号？</span>
        <RouterLink to="/login" class="auth-link">立即登录</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  position: relative;
  overflow: hidden;
}

.auth-page::before {
  content: "";
  position: absolute;
  width: 600px; height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.15), transparent 70%);
  top: -200px; right: -100px;
  pointer-events: none;
}

.auth-page::after {
  content: "";
  position: absolute;
  width: 500px; height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(20, 184, 166, 0.12), transparent 70%);
  bottom: -150px; left: -100px;
  pointer-events: none;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: rgba(30, 41, 59, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 20px;
  padding: 40px 36px;
  backdrop-filter: blur(24px);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  position: relative;
  z-index: 1;
}

.auth-header { text-align: center; margin-bottom: 32px; }

.auth-logo {
  width: 56px; height: 56px;
  margin: 0 auto 16px;
  border-radius: 16px;
  background: linear-gradient(145deg, #0ea5e9, #14b8a6);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 12px 32px rgba(14, 165, 233, 0.35);
}

.auth-logo-img { width: 28px; height: 28px; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)); }

.auth-title { font-size: 24px; font-weight: 800; color: #f1f5f9; margin: 0 0 6px; }
.auth-subtitle { font-size: 14px; color: #94a3b8; margin: 0; }

.auth-form { display: flex; flex-direction: column; gap: 20px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 13px; font-weight: 600; color: #cbd5e1; }

.input-wrapper { position: relative; display: flex; align-items: center; }

.input-icon {
  position: absolute; left: 14px;
  width: 18px; height: 18px;
  stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
  color: #64748b; pointer-events: none; transition: color 0.2s;
}

.form-input {
  width: 100%; height: 48px;
  padding: 0 16px 0 44px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.6);
  color: #f1f5f9; font-size: 15px;
  outline: none; transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input::placeholder { color: #475569; }
.form-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }
.has-error .form-input { border-color: #ef4444; }

.form-error { font-size: 12px; color: #ef4444; margin: 0; }

/* ── Code Input ── */
.code-input-wrap { display: flex; justify-content: center; }

.code-input {
  width: 100%; height: 56px;
  text-align: center; font-size: 28px;
  font-weight: 800; letter-spacing: 10px;
  padding: 0 16px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.6);
  color: #38bdf8; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.code-input::placeholder { color: #334155; letter-spacing: 10px; }
.code-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }
.has-error .code-input { border-color: #ef4444; }

.resend-btn {
  align-self: flex-end;
  background: none; border: none;
  color: #64748b; font-size: 12px; font-weight: 600;
  cursor: pointer; padding: 4px 0;
  transition: color 0.2s;
}
.resend-btn:hover:not(:disabled) { color: #38bdf8; }
.resend-btn:disabled { cursor: not-allowed; opacity: 0.5; }

.form-alert {
  padding: 12px 16px; border-radius: 10px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fca5a5; font-size: 13px;
}

.auth-btn {
  height: 48px; border: none; border-radius: 12px;
  background: linear-gradient(135deg, #0ea5e9, #14b8a6);
  color: #ffffff; font-size: 16px; font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.3);
  margin-top: 4px;
}

.auth-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(14, 165, 233, 0.4); }
.auth-btn:active:not(:disabled) { transform: translateY(0); }
.auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff; border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.back-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  background: none; border: none;
  color: #64748b; font-size: 13px; font-weight: 600;
  cursor: pointer; padding: 8px 0;
  transition: color 0.2s;
}
.back-btn:hover { color: #94a3b8; }
.back-btn svg { width: 16px; height: 16px; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: #94a3b8;
}

.auth-link {
  color: #38bdf8;
  font-weight: 600;
  text-decoration: none;
  margin-left: 4px;
  transition: color 0.2s;
}
.auth-link:hover { color: #7dd3fc; }

.turnstile-wrap {
  display: flex;
  justify-content: center;
  padding: 12px 0;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  backdrop-filter: blur(8px);
  transition: border-color 0.3s;
}
.turnstile-wrap:hover {
  border-color: rgba(14, 165, 233, 0.25);
}
</style>
