<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from "vue-router"
import { useAuthStore } from "../../stores/auth.js"

const route = useRoute()
const auth = useAuthStore()

const navItems = [
  { label: "概览", to: "/admin", icon: "dashboard" },
  { label: "用户管理", to: "/admin/users", icon: "users" }
]
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <img src="/logo2.png" alt="logo" class="sidebar-logo-img" />
        </div>
        <div class="sidebar-title">
          <span class="sidebar-name">管理后台</span>
          <span class="sidebar-badge">Admin</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="sidebar-link"
          :class="{ active: route.path === item.to }"
        >
          <svg v-if="item.icon === 'dashboard'" class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            <rect x="14" y="14" width="7" height="7" rx="1"></rect>
          </svg>
          <svg v-else-if="item.icon === 'users'" class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">{{ auth.userNickname?.charAt(0) || 'A' }}</div>
          <div class="user-info">
            <span class="user-name">{{ auth.userNickname }}</span>
            <span class="user-role">管理员</span>
          </div>
        </div>
        <RouterLink to="/" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>
          <span>返回前台</span>
        </RouterLink>
      </div>
    </aside>

    <main class="admin-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #0f172a;
}

.admin-sidebar {
  width: 240px;
  background: linear-gradient(180deg, #1e293b, #0f172a);
  border-right: 1px solid rgba(148, 163, 184, 0.1);
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 50;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  margin-bottom: 16px;
}

.sidebar-logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(145deg, #0ea5e9, #14b8a6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-logo-img {
  width: 20px;
  height: 20px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.sidebar-title {
  display: flex;
  flex-direction: column;
}

.sidebar-name {
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
}

.sidebar-badge {
  font-size: 10px;
  font-weight: 700;
  color: #0ea5e9;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s;
}

.sidebar-link:hover {
  background: rgba(148, 163, 184, 0.08);
  color: #e2e8f0;
}

.sidebar-link.active {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(20, 184, 166, 0.1));
  color: #38bdf8;
  box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.2);
}

.sidebar-icon {
  width: 20px;
  height: 20px;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.sidebar-footer {
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}

.user-role {
  font-size: 11px;
  color: #64748b;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  color: #64748b;
  font-size: 13px;
  text-decoration: none;
  transition: all 0.15s;
}

.back-link:hover {
  background: rgba(148, 163, 184, 0.08);
  color: #94a3b8;
}

.back-link svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.admin-main {
  flex: 1;
  margin-left: 240px;
  padding: 32px;
  min-height: 100vh;
}
</style>
