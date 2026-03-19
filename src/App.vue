<script setup lang="ts">
import { computed, onMounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import GlobalToast from './components/GlobalToast.vue'
import VersionAnnouncement from './components/VersionAnnouncement.vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useRoute } from 'vue-router'

const appWindow = getCurrentWindow()
function minimize() { appWindow.minimize() }
function toggleMaximize() { appWindow.toggleMaximize() }
function close() { appWindow.close() }

const route = useRoute()
const mascotRoutes = ['/', '/translate', '/epub-import', '/ocr-import', '/data', '/settings']
const showMascot = computed(() => mascotRoutes.includes(route.path))

onMounted(() => {
  document.addEventListener('contextmenu', (e) => e.preventDefault())
})
</script>

<template>
  <div class="app-shell">
    <Sidebar />
    <div class="app-right">
      <div class="custom-titlebar" data-tauri-drag-region>
        <div class="titlebar-spacer" data-tauri-drag-region></div>
        <div class="titlebar-controls">
          <button class="tb-btn" @click="minimize" title="最小化">
            <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button class="tb-btn" @click="toggleMaximize" title="最大化">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="9" height="9"/></svg>
          </button>
          <button class="tb-btn tb-btn--close" @click="close" title="关闭">
            <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" stroke-width="1.2"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>
          </button>
        </div>
      </div>
      <main class="app-main">
        <RouterView v-slot="{ Component, route }">
          <KeepAlive>
            <component :is="Component" :key="route.path" />
          </KeepAlive>
        </RouterView>
      </main>
    </div>
    <GlobalToast />
    <VersionAnnouncement />
    <img v-if="showMascot" class="app-mascot" src="/mascot.png" alt="mascot" />
  </div>
</template>

<style>
/* ── 右下角吉祥物 ── */
.app-mascot {
  position: fixed;
  right: 0;
  bottom: 0;
  width: 100px;
  opacity: 0.45;
  pointer-events: none;
  z-index: 1;
  user-select: none;
  -webkit-user-drag: none;
}
:root {
  --c-text: #1D1D1F;
  --c-text-lighter: #86868B;
  --c-bg: #FBFBFD;
  --c-bg-light: #FFFFFF;
  --c-bg-lighter: #F5F5F7;
  --c-border: #E8E8ED;
  --c-border-light: #F1F1F5;
  --c-primary: #007AFF;
  --c-primary-dark: #0066D6;
  --c-primary-light: rgba(0, 122, 255, 0.08);
  --c-accent: #007AFF;
  --c-danger: #FF3B30;
  --sidebar-width: 56px;
  --radius: 12px;
  --fs-xs: 11px;
  --fs-sm: 12px;
  --fs-base: 13px;
  --fs-md: 15px;
  --fs-lg: 18px;
  --font-sans: 'Inter', 'PingFang SC', 'HarmonyOS Sans SC', 'Microsoft YaHei', sans-serif;
  --font-serif: 'Georgia', 'Times New Roman', serif;
  --font-mono: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  user-select: none;
  -webkit-user-select: none;
}

input, textarea, [contenteditable],
.reader-typography, .reader-typography *,
.reader-body, .reader-body *,
.reader-view, .reader-view *,
.article-body, .article-body *,
.sentence-original,
.result-content, .result-content *,
.rendered-preview, .rendered-preview *,
.markdown-preview, .markdown-preview *,
.text-display,
pre, code {
  user-select: text;
  -webkit-user-select: text;
}

html, body, #app {
  margin: 0;
  height: 100vh;
  overflow: hidden;
}

body {
  font-family: var(--font-sans);
  font-size: var(--fs-base);
  font-weight: 400;
  color: var(--c-text);
  background: var(--c-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a { color: inherit; text-decoration: none; }

.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.app-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.custom-titlebar {
  height: 36px;
  display: flex;
  align-items: center;
  background: #e6e6e6;
  border-bottom: none;
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.titlebar-spacer { flex: 1; }

.titlebar-controls {
  display: flex;
  align-items: center;
  gap: 0;
  -webkit-app-region: no-drag;
}

.tb-btn {
  width: 46px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #aaa;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.tb-btn:hover {
  background: var(--c-bg-lighter);
  color: #666;
}

.tb-btn--close:hover {
  background: #ef4444;
  color: #fff;
}

/* ── 主内容区 ── */
.app-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--c-bg);
}
.app-main::-webkit-scrollbar { width: 5px; }
.app-main::-webkit-scrollbar-track { background: transparent; }
.app-main::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 3px;
}
.app-main::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.16);
}

.page-container {
  max-width: 100%;
  padding: 28px 36px;
}
.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text);
  margin-bottom: 24px;
  letter-spacing: -0.01em;
}
.title-icon,
.page-title > svg {
  width: 28px;
  height: 28px;
  color: var(--c-primary);
  flex-shrink: 0;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.card {
  background: var(--c-bg-light);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 22px 24px;
  margin-bottom: 14px;
  transition: border-color 0.2s ease;
}
.card:hover { border-color: #D1D1D6; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: var(--fs-base);
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  white-space: nowrap;
  letter-spacing: -0.01em;
}
.btn-primary {
  color: #ffffff;
  background: var(--c-primary);
  box-shadow: 0 1px 2px rgba(0, 122, 255, 0.2);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
}
.btn-primary:hover {
  background: var(--c-primary-dark);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}
.btn-primary:active { transform: scale(0.97); box-shadow: none; }
.btn-outline {
  color: var(--c-text);
  background: var(--c-bg-light);
  border: 1.5px solid var(--c-border);
}
.btn-outline:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
  background: rgba(0, 122, 255, 0.04);
}
.btn-outline:active { transform: scale(0.97); }
.btn-secondary {
  color: #5856D6;
  background: rgba(88, 86, 214, 0.1);
}
.btn-secondary:hover { background: rgba(88, 86, 214, 0.16); }
.btn-secondary:active { transform: scale(0.97); }
.btn-danger {
  color: var(--c-danger);
  background: rgba(255, 59, 48, 0.1);
}
.btn-danger:hover {
  color: #fff;
  background: var(--c-danger);
  box-shadow: 0 2px 8px rgba(255, 59, 48, 0.25);
}
.btn-danger:active { transform: scale(0.97); }
.btn-danger-outline {
  color: var(--c-danger);
  background: var(--c-bg-light);
  border: 1px solid rgba(255, 59, 48, 0.25);
  border-radius: 8px;
  font-size: var(--fs-base);
  font-weight: 500;
  height: 36px;
  padding: 0 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  letter-spacing: -0.01em;
}
.btn-danger-outline:hover {
  background: rgba(255, 59, 48, 0.06);
  border-color: var(--c-danger);
}
.btn-danger-outline:active { transform: scale(0.97); }
.btn:disabled, .btn-danger-outline:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.input {
  width: 100%;
  height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  font-size: var(--fs-base);
  font-family: inherit;
  color: var(--c-text);
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  outline: none;
}
.input:focus {
  background: rgba(255, 255, 255, 0.5);
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.08);
}
.textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px 14px;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  font-size: var(--fs-base);
  font-family: inherit;
  color: var(--c-text);
  background: var(--c-bg-light);
  resize: vertical;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.textarea:focus {
  background: var(--c-bg-light);
  border-color: #bbb;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.04);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--c-text-lighter);
}
.empty-state svg {
  width: 56px; height: 56px;
  stroke-width: 1;
  margin-bottom: 14px;
  opacity: 0.35;
}
.empty-state p { font-size: var(--fs-base); margin-top: 8px; }

@keyframes fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fade-in 0.35s ease; }
</style>