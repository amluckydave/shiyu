<script setup lang="ts">
import { computed, ref } from "vue"
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router"

import ToolbarDailyQuote from "./components/toolbar/ToolbarDailyQuote.vue"
import ToolbarDataManager from "./components/toolbar/ToolbarDataManager.vue"
import { useBilingualToggle } from "./legacy/bilingual-pack-client/composables/useBilingualToggle"
import { useAuthStore } from "./stores/auth.js"

type MenuIcon = "home" | "article" | "ebook" | "vocabulary" | "sentence" | "settings"

interface MenuItem {
  label: string
  to: string
  icon: MenuIcon
}

const route = useRoute()
const router = useRouter()
const { settings, toggleEnabled } = useBilingualToggle()
const auth = useAuthStore()

const menuItems: MenuItem[] = [
  { label: "首页", to: "/", icon: "home" },
  { label: "文章", to: "/articles.html", icon: "article" },
  { label: "电子书", to: "/ebooks.html", icon: "ebook" }
]

const isHome = computed(() => route.path === "/" || route.path === "/index.html")
const isAuthPage = computed(() => route.path === "/login" || route.path === "/register" || route.path === "/admin/login")
const isAdminPage = computed(() => route.path.startsWith("/admin"))
const showMainNav = computed(() => !isAuthPage.value && !isAdminPage.value)
const annotationTitle = computed(() => (settings.value.enabled ? "一键关闭标注" : "一键开启标注"))

const showUserMenu = ref(false)

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
}

function closeUserMenu() {
  showUserMenu.value = false
}

function handleLogout() {
  auth.logout()
  showUserMenu.value = false
  router.push("/")
}

function onClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.user-menu-wrap')) {
    showUserMenu.value = false
  }
}

import { onMounted, onUnmounted } from 'vue'
onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div class="app-shell">
    <header v-if="showMainNav" class="top-nav">
      <nav class="top-nav__inner">
        <RouterLink class="brand" to="/">
          <span class="brand-mark">
            <img class="brand-logo" src="/logo2.png" alt="logo" />
          </span>
          <span class="brand-text">拾语</span>
        </RouterLink>

        <div class="menu-links">
          <RouterLink
            v-for="item in menuItems"
            :key="item.to"
            class="menu-link"
            :to="item.to"
          >
            <svg v-if="item.icon === 'home'" class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 11.5L12 4l9 7.5"></path>
              <path d="M6.5 10.5V20h11V10.5"></path>
            </svg>
            <svg v-else-if="item.icon === 'article'" class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 4h12v16H6z"></path>
              <path d="M9 8h6"></path>
              <path d="M9 12h6"></path>
              <path d="M9 16h4"></path>
            </svg>
            <svg v-else-if="item.icon === 'ebook'" class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <svg v-else-if="item.icon === 'vocabulary'" class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 5h8a3 3 0 013 3v11H7a3 3 0 00-3 3z"></path>
              <path d="M20 5h-8a3 3 0 00-3 3v11h8a3 3 0 013 3z"></path>
            </svg>
            <svg v-else-if="item.icon === 'sentence'" class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 6h16"></path>
              <path d="M4 12h11"></path>
              <path d="M4 18h8"></path>
            </svg>
            <svg v-else class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19 12a7 7 0 00-.09-1l2.02-1.57-1.5-2.6-2.43.69a7 7 0 00-1.72-1l-.4-2.5h-3l-.4 2.5a7 7 0 00-1.72 1l-2.43-.69-1.5 2.6L5.09 11A7 7 0 005 12a7 7 0 00.09 1l-2.02 1.57 1.5 2.6 2.43-.69a7 7 0 001.72 1l.4 2.5h3l.4-2.5a7 7 0 001.72-1l2.43.69 1.5-2.6L18.91 13c.06-.33.09-.66.09-1z"></path>
            </svg>
            <span>{{ item.label }}</span>
          </RouterLink>
        </div>

        <div class="tool-actions">
          <ToolbarDailyQuote />

          <!-- Auth Actions -->
          <template v-if="auth.isAuthenticated">
            <div class="user-menu-wrap">
              <button class="user-trigger" @click.stop="toggleUserMenu">
                <span class="user-avatar">{{ auth.userNickname?.charAt(0) || 'U' }}</span>
                <span class="user-nick">{{ auth.userNickname }}</span>
                <svg class="chevron" :class="{ 'chevron--open': showUserMenu }" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <Transition name="dropdown-fade">
                <div v-if="showUserMenu" class="user-dropdown" @click.stop>
                  <div class="dropdown-header">
                    <span class="dropdown-avatar-lg">{{ auth.userNickname?.charAt(0) || 'U' }}</span>
                    <div class="dropdown-user-info">
                      <span class="dropdown-nickname">{{ auth.userNickname }}</span>
                      <span class="dropdown-email">{{ auth.user?.email }}</span>
                    </div>
                  </div>
                  <div class="dropdown-section">
                    <span class="dropdown-section-label">学习工具</span>
                    <RouterLink to="/vocabulary.html" class="dropdown-item" @click="closeUserMenu">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 5h8a3 3 0 013 3v11H7a3 3 0 00-3 3z"></path><path d="M20 5h-8a3 3 0 00-3 3v11h8a3 3 0 013 3z"></path></svg>
                      <span>生词本</span>
                    </RouterLink>
                    <RouterLink to="/sentences.html" class="dropdown-item" @click="closeUserMenu">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16"></path><path d="M4 12h11"></path><path d="M4 18h8"></path></svg>
                      <span>句库</span>
                    </RouterLink>
                  </div>
                  <div class="dropdown-section">
                    <span class="dropdown-section-label">偏好设置</span>
                    <button class="dropdown-item" @click="toggleEnabled(); closeUserMenu()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                        <path v-if="!settings.enabled" d="M3 3l18 18"></path>
                      </svg>
                      <span>{{ settings.enabled ? '关闭标注' : '开启标注' }}</span>
                      <span class="dropdown-badge" :class="settings.enabled ? 'badge-on' : 'badge-off'">{{ settings.enabled ? 'ON' : 'OFF' }}</span>
                    </button>
                    <ToolbarDataManager variant="dropdown" />
                    <RouterLink to="/api-settings.html" class="dropdown-item" @click="closeUserMenu">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 00-.09-1l2.02-1.57-1.5-2.6-2.43.69a7 7 0 00-1.72-1l-.4-2.5h-3l-.4 2.5a7 7 0 00-1.72 1l-2.43-.69-1.5 2.6L5.09 11A7 7 0 005 12a7 7 0 00.09 1l-2.02 1.57 1.5 2.6 2.43-.69a7 7 0 001.72 1l.4 2.5h3l.4-2.5a7 7 0 001.72-1l2.43.69 1.5-2.6L18.91 13c.06-.33.09-.66.09-1z"></path></svg>
                      <span>API 设置</span>
                    </RouterLink>
                  </div>
                  <div class="dropdown-section">
                    <RouterLink v-if="auth.isAdmin" to="/admin" class="dropdown-item" @click="closeUserMenu">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                      <span>管理后台</span>
                    </RouterLink>
                    <button class="dropdown-item dropdown-item--danger" @click="handleLogout">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      <span>退出登录</span>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
          </template>
          <template v-else>
            <RouterLink to="/login" class="auth-nav-btn register-btn">登录 / 注册</RouterLink>
          </template>
        </div>
      </nav>
    </header>

    <main class="app-main" :class="{ 'app-main--home': isHome, 'app-main--no-nav': !showMainNav }">
      <RouterView />
    </main>
  </div>
</template>

<style>
:root {
  --c-text: #1f2937;
  --c-text-lighter: #6b7280;
  --c-text-quote: #4b5563;
  --c-bg: #ffffff;
  --c-bg-light: #f8fafc;
  --c-bg-lighter: #f3f4f6;
  --c-border: #dbe2ea;
  --vp-c-text-1: #1f2937;
  --vp-c-text-2: #4b5563;
  --vp-c-text-3: #6b7280;
  --vp-c-border: #dbe2ea;
  --vp-c-bg: #ffffff;
  --vp-c-bg-soft: #f8fafc;
  --vp-c-bg-mute: #f3f4f6;
  --vp-c-brand: #3eaf7c;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  margin: 0;
  min-height: 100%;
}

body {
  font-family: "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: var(--c-text);
  background: var(--c-bg-light);
}

a {
  color: inherit;
}

.app-shell {
  min-height: 100vh;
}

.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  border-bottom: 1px solid rgba(203, 213, 225, 0.35);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.88));
  box-shadow: 0 4px 40px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03);
  backdrop-filter: blur(28px) saturate(200%);
  -webkit-backdrop-filter: blur(28px) saturate(200%);
}

.top-nav::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2.5px;
  background: linear-gradient(90deg, transparent 2%, #0ea5e9 20%, #06b6d4 40%, #14b8a6 60%, #10b981 80%, transparent 98%);
  opacity: 0.75;
}

.top-nav__inner {
  margin: 0 auto;
  max-width: 1320px;
  height: 56px;
  padding: 0 20px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  text-decoration: none;
  min-width: fit-content;
  transition: transform 0.3s ease;
}

.brand:hover {
  transform: translateY(-1px);
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #0ea5e9, #0d9488);
  box-shadow: 0 3px 12px rgba(14, 165, 233, 0.25), 0 1px 4px rgba(14, 165, 233, 0.1);
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
}

.brand:hover .brand-mark {
  transform: scale(1.05) rotate(-2deg);
  box-shadow: 0 5px 18px rgba(14, 165, 233, 0.32);
}

.brand-logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.brand-text {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 2px;
  white-space: nowrap;
  background: linear-gradient(135deg, #0c4a6e 0%, #0d9488 50%, #0f766e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.menu-links {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  overflow-x: auto;
  padding: 4px 5px;
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.85), rgba(241, 245, 249, 0.6));
  backdrop-filter: blur(8px);
  scrollbar-width: thin;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 0 rgba(255, 255, 255, 0.7);
}

.menu-link {
  text-decoration: none;
  border-radius: 10px;
  padding: 7px 14px;
  color: #475569;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid transparent;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  position: relative;
}

.menu-icon {
  width: 16px;
  height: 16px;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.menu-link:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(186, 230, 253, 0.5);
  color: #0c4a6e;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(14, 165, 233, 0.1);
}

.menu-link:hover .menu-icon {
  transform: scale(1.1);
}

.menu-link.router-link-active {
  color: #ffffff;
  background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
  border-color: transparent;
  box-shadow: 0 3px 12px rgba(14, 116, 144, 0.28), 0 1px 3px rgba(14, 116, 144, 0.12);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

.menu-link.router-link-active .menu-icon {
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.15));
}

.tool-actions {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}



.app-main {
  padding-top: 56px;
}

.app-main--home {
  padding-top: 0;
}

.app-main--no-nav {
  padding-top: 0;
}

/* ── Auth Nav Buttons ── */
.auth-nav-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: all 0.18s;
  white-space: nowrap;
}

.login-btn {
  color: #334155;
  border: 1px solid #dbe2ea;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
}
.login-btn:hover { border-color: #93c5fd; background: #f0f9ff; color: #0f3f62; transform: translateY(-1px); }

.register-btn {
  color: #ffffff;
  background: linear-gradient(135deg, #0ea5e9, #14b8a6);
  border: none;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
}
.register-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(14, 165, 233, 0.35); }

/* ── User Menu ── */
.user-menu-wrap {
  position: relative;
}

.user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px 0 4px;
  border: 1px solid rgba(203, 213, 225, 0.6);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-trigger:hover {
  border-color: rgba(147, 197, 253, 0.7);
  background: linear-gradient(180deg, rgba(240, 249, 255, 0.95), rgba(224, 242, 254, 0.6));
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.12);
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.user-trigger:hover .user-avatar {
  transform: scale(1.08);
}

.user-nick {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  letter-spacing: 0.1px;
}

.chevron {
  width: 14px;
  height: 14px;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: #94a3b8;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease;
}

.user-trigger:hover .chevron {
  color: #64748b;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(226, 232, 240, 0.7);
  border-radius: 16px;
  box-shadow:
    0 20px 60px rgba(15, 23, 42, 0.12),
    0 8px 24px rgba(15, 23, 42, 0.06),
    0 0 0 1px rgba(255, 255, 255, 0.6) inset;
  padding: 6px;
  z-index: 999;
}

.chevron--open {
  transform: rotate(180deg);
  color: #0ea5e9;
}

.dropdown-fade-enter-active { animation: dropdown-in 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.dropdown-fade-leave-active { animation: dropdown-in 0.15s cubic-bezier(0.4, 0, 1, 1) reverse; }

@keyframes dropdown-in {
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.dropdown-header {
  padding: 14px;
  border-bottom: 1px solid rgba(241, 245, 249, 0.8);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.5), transparent);
  border-radius: 10px 10px 0 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.dropdown-avatar-lg {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
}

.dropdown-user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dropdown-nickname {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.dropdown-email {
  font-size: 11px;
  color: #94a3b8;
  letter-spacing: 0.1px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-section-label {
  display: block;
  padding: 6px 12px 4px;
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.dropdown-section {
  padding: 4px 0;
  border-bottom: 1px solid rgba(241, 245, 249, 0.6);
}

.dropdown-section:last-child {
  border-bottom: none;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 10px;
  background: none;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.dropdown-item svg {
  width: 16px;
  height: 16px;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
  transition: transform 0.2s ease, color 0.2s ease;
}

.dropdown-item:hover {
  background: linear-gradient(135deg, rgba(241, 245, 249, 0.9), rgba(224, 242, 254, 0.4));
  color: #0c4a6e;
  transform: translateX(2px);
}

.dropdown-item:hover svg {
  transform: scale(1.1);
  color: #0ea5e9;
}

.dropdown-item--danger { color: #ef4444; }
.dropdown-item--danger:hover {
  background: linear-gradient(135deg, rgba(254, 242, 242, 0.9), rgba(254, 226, 226, 0.4));
  color: #dc2626;
  transform: translateX(2px);
}

.dropdown-item--danger:hover svg {
  color: #ef4444;
}

/* Dropdown badge (ON/OFF indicator) */
.dropdown-badge {
  margin-left: auto;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 3px 8px;
  border-radius: 6px;
  transition: all 0.25s ease;
}
.badge-on {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #16a34a;
  box-shadow: 0 1px 4px rgba(22, 163, 106, 0.15);
}
.badge-off {
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  color: #94a3b8;
}


@media (max-width: 980px) {
  .brand-text {
    display: none;
  }

  .top-nav__inner {
    padding: 0 8px;
    gap: 8px;
  }

  .menu-link {
    padding: 7px 9px;
    font-size: 12px;
  }

  .menu-links {
    padding: 2px;
    border-radius: 10px;
  }

  .user-nick {
    display: none;
  }
}
</style>
