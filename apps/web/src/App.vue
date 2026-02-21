<script setup lang="ts">
import { computed } from "vue"
import { RouterLink, RouterView, useRoute } from "vue-router"

import ToolbarDailyQuote from "./components/toolbar/ToolbarDailyQuote.vue"
import ToolbarDataManager from "./components/toolbar/ToolbarDataManager.vue"
import { useBilingualToggle } from "./legacy/bilingual-pack-client/composables/useBilingualToggle"

type MenuIcon = "home" | "article" | "ebook" | "vocabulary" | "sentence" | "settings"

interface MenuItem {
  label: string
  to: string
  icon: MenuIcon
}

const route = useRoute()
const { settings, toggleEnabled } = useBilingualToggle()

const menuItems: MenuItem[] = [
  { label: "首页", to: "/", icon: "home" },
  { label: "文章", to: "/articles.html", icon: "article" },
  { label: "电子书", to: "/ebooks.html", icon: "ebook" },
  { label: "生词本", to: "/vocabulary.html", icon: "vocabulary" },
  { label: "句库", to: "/sentences.html", icon: "sentence" },
  { label: "API 设置", to: "/api-settings.html", icon: "settings" }
]

const isHome = computed(() => route.path === "/" || route.path === "/index.html")
const annotationTitle = computed(() => (settings.value.enabled ? "一键关闭标注" : "一键开启标注"))
</script>

<template>
  <div class="app-shell">
    <header class="top-nav">
      <nav class="top-nav__inner">
        <RouterLink class="brand" to="/">
          <span class="brand-mark">
            <img class="brand-logo" src="/logo2.png" alt="logo" />
          </span>
          <span class="brand-text">Bilingual Reader</span>
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
          <ToolbarDataManager />
          <button
            class="annot-toggle"
            :class="{ 'annot-toggle--active': settings.enabled }"
            :title="annotationTitle"
            @click="toggleEnabled"
          >
            <svg class="annot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"></path>
              <path v-if="!settings.enabled" d="M3 3l18 18"></path>
            </svg>
            <span class="annot-text">{{ settings.enabled ? "标注开启" : "标注关闭" }}</span>
          </button>
        </div>
      </nav>
    </header>

    <main class="app-main" :class="{ 'app-main--home': isHome }">
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
  border-bottom: 1px solid rgba(203, 213, 225, 0.85);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.9));
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(16px);
}

.top-nav::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(14, 165, 233, 0), rgba(14, 165, 233, 0.65), rgba(16, 185, 129, 0.7), rgba(16, 185, 129, 0));
}

.top-nav__inner {
  margin: 0 auto;
  max-width: 1320px;
  height: 64px;
  padding: 0 16px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  min-width: fit-content;
}

.brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #0ea5e9, #14b8a6);
  box-shadow: 0 8px 18px rgba(14, 165, 233, 0.3);
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.45);
}

.brand-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
}

.brand-text {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.15px;
  color: #0b172a;
  white-space: nowrap;
}

.menu-links {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow-x: auto;
  padding: 3px;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95), rgba(241, 245, 249, 0.85));
  scrollbar-width: thin;
}

.menu-link {
  text-decoration: none;
  border-radius: 9px;
  padding: 7px 11px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0);
  transition: all 0.18s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.menu-icon {
  width: 15px;
  height: 15px;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.menu-link:hover {
  background: #ffffff;
  border-color: #dbeafe;
  color: #0f3f62;
  transform: translateY(-1px);
}

.menu-link.router-link-active {
  color: #ffffff;
  background: linear-gradient(135deg, #0284c7, #0f766e);
  border-color: transparent;
  box-shadow: 0 6px 16px rgba(14, 116, 144, 0.32);
}

.tool-actions {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.annot-toggle {
  height: 36px;
  border: 1px solid #dbe2ea;
  border-radius: 999px;
  padding: 0 12px 0 10px;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  color: #334155;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.annot-toggle:hover {
  border-color: #93c5fd;
  background: #f0f9ff;
  color: #0f3f62;
  transform: translateY(-1px);
}

.annot-toggle--active {
  border-color: #5eead4;
  background: linear-gradient(135deg, #14b8a6, #0ea5e9);
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(20, 184, 166, 0.28);
}

.annot-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.annot-text {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.app-main {
  padding-top: 64px;
}

.app-main--home {
  padding-top: 0;
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

  .annot-text {
    display: none;
  }

  .annot-toggle {
    width: 34px;
    padding: 0;
    justify-content: center;
    border-radius: 10px;
  }
}
</style>
