<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter, RouterLink } from "vue-router"
import { useAuthStore } from "../stores/auth.js"

const router = useRouter()
const auth = useAuthStore()

const email = ref("")
const password = ref("")
const confirmPassword = ref("")
const nickname = ref("")
const showPassword = ref(false)
const submitted = ref(false)

const emailError = computed(() => {
  if (!submitted.value) return ""
  if (!email.value) return "请输入邮箱"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return "邮箱格式不正确"
  return ""
})

const nicknameError = computed(() => {
  if (!submitted.value) return ""
  if (!nickname.value.trim()) return "请输入昵称"
  if (nickname.value.trim().length > 50) return "昵称最多50个字符"
  return ""
})

const passwordError = computed(() => {
  if (!submitted.value) return ""
  if (!password.value) return "请输入密码"
  if (password.value.length < 6) return "密码至少6位"
  return ""
})

const confirmError = computed(() => {
  if (!submitted.value) return ""
  if (!confirmPassword.value) return "请确认密码"
  if (confirmPassword.value !== password.value) return "两次输入的密码不一致"
  return ""
})

const passwordStrength = computed(() => {
  const p = password.value
  if (!p) return { level: 0, text: "", color: "" }
  let score = 0
  if (p.length >= 6) score++
  if (p.length >= 10) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  if (score <= 1) return { level: 1, text: "弱", color: "#ef4444" }
  if (score <= 3) return { level: 2, text: "中", color: "#f59e0b" }
  return { level: 3, text: "强", color: "#22c55e" }
})

const isValid = computed(() =>
  !emailError.value && !passwordError.value && !confirmError.value && !nicknameError.value &&
  email.value && password.value && confirmPassword.value && nickname.value
)

async function handleSubmit() {
  submitted.value = true
  if (!isValid.value) return

  const success = await auth.register({
    email: email.value,
    password: password.value,
    nickname: nickname.value.trim()
  })
  if (success) {
    router.push("/")
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">
          <img src="/logo2.png" alt="logo" class="auth-logo-img" />
        </div>
        <h1 class="auth-title">注册账号</h1>
        <p class="auth-subtitle">创建你的 Bilingual Reader 账号</p>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="form-group" :class="{ 'has-error': nicknameError }">
          <label class="form-label" for="reg-nickname">昵称</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <input id="reg-nickname" v-model="nickname" type="text" class="form-input" placeholder="你的昵称" autocomplete="nickname" />
          </div>
          <p v-if="nicknameError" class="form-error">{{ nicknameError }}</p>
        </div>

        <div class="form-group" :class="{ 'has-error': emailError }">
          <label class="form-label" for="reg-email">邮箱</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <input id="reg-email" v-model="email" type="email" class="form-input" placeholder="your@email.com" autocomplete="email" />
          </div>
          <p v-if="emailError" class="form-error">{{ emailError }}</p>
        </div>

        <div class="form-group" :class="{ 'has-error': passwordError }">
          <label class="form-label" for="reg-password">密码</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <input
              id="reg-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              placeholder="至少6位密码"
              autocomplete="new-password"
            />
            <button type="button" class="toggle-pw" @click="showPassword = !showPassword" tabindex="-1">
              <svg v-if="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
          <div v-if="password && !passwordError" class="pw-strength">
            <div class="pw-bar">
              <div class="pw-fill" :style="{ width: (passwordStrength.level / 3 * 100) + '%', background: passwordStrength.color }"></div>
            </div>
            <span class="pw-text" :style="{ color: passwordStrength.color }">{{ passwordStrength.text }}</span>
          </div>
        </div>

        <div class="form-group" :class="{ 'has-error': confirmError }">
          <label class="form-label" for="reg-confirm">确认密码</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <input id="reg-confirm" v-model="confirmPassword" type="password" class="form-input" placeholder="再次输入密码" autocomplete="new-password" />
          </div>
          <p v-if="confirmError" class="form-error">{{ confirmError }}</p>
        </div>

        <div v-if="auth.error" class="form-alert">{{ auth.error }}</div>

        <button type="submit" class="auth-btn" :disabled="auth.loading">
          <span v-if="auth.loading" class="spinner"></span>
          <span>{{ auth.loading ? "注册中..." : "注 册" }}</span>
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
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.15), transparent 70%);
  top: -200px;
  right: -100px;
  pointer-events: none;
}

.auth-page::after {
  content: "";
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(20, 184, 166, 0.12), transparent 70%);
  bottom: -150px;
  left: -100px;
  pointer-events: none;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: rgba(30, 41, 59, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 20px;
  padding: 36px;
  backdrop-filter: blur(24px);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  position: relative;
  z-index: 1;
}

.auth-header {
  text-align: center;
  margin-bottom: 28px;
}

.auth-logo {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 16px;
  background: linear-gradient(145deg, #0ea5e9, #14b8a6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 32px rgba(14, 165, 233, 0.35);
}

.auth-logo-img {
  width: 28px;
  height: 28px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.auth-title {
  font-size: 24px;
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 6px;
}

.auth-subtitle {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: #64748b;
  pointer-events: none;
  transition: color 0.2s;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0 44px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.6);
  color: #f1f5f9;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input::placeholder { color: #475569; }
.form-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }
.has-error .form-input { border-color: #ef4444; }

.toggle-pw {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #64748b;
  transition: color 0.2s;
}
.toggle-pw:hover { color: #94a3b8; }
.toggle-pw svg { width: 18px; height: 18px; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

.form-error { font-size: 12px; color: #ef4444; margin: 0; }

.pw-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.pw-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(148, 163, 184, 0.15);
  overflow: hidden;
}
.pw-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s, background 0.3s;
}
.pw-text {
  font-size: 11px;
  font-weight: 700;
  min-width: 20px;
}

.form-alert {
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fca5a5;
  font-size: 13px;
}

.auth-btn {
  height: 48px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #0ea5e9, #14b8a6);
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.3);
  margin-top: 4px;
}
.auth-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(14, 165, 233, 0.4); }
.auth-btn:active:not(:disabled) { transform: translateY(0); }
.auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

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
</style>
