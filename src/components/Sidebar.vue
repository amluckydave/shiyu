<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { APP_VERSION } from '../constants/app'

interface NavItem {
  label: string
  to: string
  icon: string
  shortcut: string
  group: 'main' | 'tool'
}

const route = useRoute()
const router = useRouter()
const recentStorageKey = 'shiyu:recent-routes'
const recentLimit = 6

interface RecentRouteEntry {
  to: string
  at: number
}



const navItems: NavItem[] = [
  { label: '首页', to: '/', icon: 'home', shortcut: '', group: 'main' },
  { label: '文章', to: '/articles', icon: 'article', shortcut: '', group: 'main' },
  { label: '生词', to: '/vocabulary', icon: 'book', shortcut: '', group: 'main' },
  { label: '句库', to: '/sentences', icon: 'text', shortcut: '', group: 'main' },
  { label: '复习', to: '/review', icon: 'review', shortcut: '', group: 'main' },
  { label: '翻译', to: '/translate', icon: 'ai', shortcut: '', group: 'main' },
  { label: 'EPUB 提取', to: '/epub-import', icon: 'epub', shortcut: '', group: 'tool' },
  { label: 'OCR 导入', to: '/ocr-import', icon: 'ocr', shortcut: '', group: 'tool' },
  { label: '数据管理', to: '/data', icon: 'data', shortcut: '', group: 'tool' },
  { label: '设置', to: '/settings', icon: 'settings', shortcut: '', group: 'tool' },
]

const mainItems = computed(() => navItems.filter(i => i.group === 'main'))
const toolItems = computed(() => navItems.filter(i => i.group === 'tool'))
const allItems = computed(() => [...mainItems.value, ...toolItems.value])


const sidebarExpanded = ref(false)
const recentEntries = ref<RecentRouteEntry[]>(loadRecentEntries())



function loadRecentEntries(): RecentRouteEntry[] {
  try {
    const raw = localStorage.getItem(recentStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item.to === 'string' && typeof item.at === 'number')
      .slice(0, recentLimit)
  } catch {
    return []
  }
}

function persistRecentEntries() {
  try {
    localStorage.setItem(recentStorageKey, JSON.stringify(recentEntries.value))
  } catch (error) {
    console.warn('保存最近访问记录失败:', error)
  }
}

function rememberRoute(path: string) {
  const current = navItems.find((item) => (item.to === '/' ? path === '/' : path.startsWith(item.to)))
  if (!current) return

  recentEntries.value = [
    { to: current.to, at: Date.now() },
    ...recentEntries.value.filter((entry) => entry.to !== current.to),
  ].slice(0, recentLimit)

  persistRecentEntries()
}

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}



let expandTimer: ReturnType<typeof setTimeout> | null = null
let collapseTimer: ReturnType<typeof setTimeout> | null = null

function expandSidebar() {
  if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null }
  expandTimer = setTimeout(() => { sidebarExpanded.value = true }, 180)
}

function collapseSidebar() {
  if (expandTimer) { clearTimeout(expandTimer); expandTimer = null }
  collapseTimer = setTimeout(() => {
    sidebarExpanded.value = false
  }, 250)
}



function navigateTo(to: string) {
  void router.push(to)
}

function handleNavClick(to: string) {
  navigateTo(to)
}



function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return el.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'
}

function handleGlobalKeydown(event: KeyboardEvent) {
  const withMeta = event.ctrlKey || event.metaKey

  if (withMeta && /^[1-9]$/.test(event.key)) {
    if (isEditableTarget(event.target)) return
    const index = Number(event.key) - 1
    const item = allItems.value[index]
    if (!item) return
    event.preventDefault()
    navigateTo(item.to)
  }
}

watch(
  () => route.path,
  (path) => {
    rememberRoute(path)
  },
  { immediate: true }
)



onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <aside
    ref="sidebarRef"
    class="sidebar"
    :class="{ expanded: sidebarExpanded }"
    @mouseenter="expandSidebar"
    @mouseleave="collapseSidebar"
  >
    <!-- 品牌 Logo -->
    <RouterLink class="sidebar-brand" to="/" @click.prevent="handleNavClick('/')">
      <img class="sidebar-logo-img" src="/logo.png" alt="拾语" />
      <span class="sidebar-brand__title">拾 语 <small class="sidebar-brand__ver">v{{ APP_VERSION }}</small></span>
    </RouterLink>

    <!-- 主导航 -->
    <nav class="sidebar-nav sidebar-nav--main">


      <RouterLink
        v-for="item in mainItems"
        :key="item.to"
        :to="item.to"
        @click.prevent="handleNavClick(item.to)"
        class="sidebar-btn"
        :class="{ active: isActive(item.to) }"
        :title="`${item.label} (${item.shortcut})`"
      >
        <!-- 首页 — house.fill style -->
        <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h5v-5.5a2 2 0 012-2h0a2 2 0 012 2V21h5V9.5"/></svg>
        <!-- 生词本 — character.book.closed style -->
        <svg v-else-if="item.icon === 'book'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M9 7h6"/><path d="M9 11h4"/></svg>
        <!-- 句库 — text.quote style -->
        <svg v-else-if="item.icon === 'text'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 6H3"/><path d="M21 12H8"/><path d="M17 18H3"/><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/></svg>
        <!-- 文章 — book.open style -->
        <svg v-else-if="item.icon === 'article'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 7c-1.5-2-4-3-7-3v13c3 0 5.5 1 7 3 1.5-2 4-3 7-3V4c-3 0-5.5 1-7 3z"/></svg>
        <!-- AI 翻译 — globe style -->
        <svg v-else-if="item.icon === 'ai'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
        <!-- 复习 — arrow.triangle.2.circlepath style -->
        <svg v-else-if="item.icon === 'review'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2.7 8.5a10 10 0 0117.8-1l1 1"/><path d="M21.3 15.5a10 10 0 01-17.8 1l-1-1"/></svg>
        <span class="sidebar-btn__label">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- 分割线 -->
    <div class="sidebar-divider"></div>

    <!-- 工具导航 -->
    <nav class="sidebar-nav sidebar-nav--tool">
      <RouterLink
        v-for="item in toolItems"
        :key="item.to"
        :to="item.to"
        @click.prevent="handleNavClick(item.to)"
        class="sidebar-btn"
        :class="{ active: isActive(item.to) }"
        :title="`${item.label} (${item.shortcut})`"
      >
        <!-- EPUB 提取 — doc.text style -->
        <svg v-if="item.icon === 'epub'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M10 13h4"/><path d="M10 17h4"/><path d="M10 9h1"/></svg>
        <!-- OCR 导入 — viewfinder style -->
        <svg v-else-if="item.icon === 'ocr'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 7V2h5"/><path d="M22 7V2h-5"/><path d="M2 17v5h5"/><path d="M22 17v5h-5"/><circle cx="12" cy="12" r="3"/><path d="M12 5v2"/><path d="M12 17v2"/><path d="M5 12h2"/><path d="M17 12h2"/></svg>
        <!-- 数据管理 — externaldrive style -->
        <svg v-else-if="item.icon === 'data'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>
        <!-- 设置 — gearshape style -->
        <svg v-else-if="item.icon === 'settings'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        <span class="sidebar-btn__label">{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>


</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 12px 6px 16px;
  background: #e6e6e6;
  border-right: none;
  position: relative;
  z-index: 50;
  overflow: hidden;
  /* 收回：平滑减速，无回弹 */
  transition:
    width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    min-width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar.expanded {
  width: 200px;
  min-width: 200px;
  /* 展开：弹簧式回弹 */
  transition:
    width 0.42s cubic-bezier(0.32, 1.18, 0.64, 1),
    min-width 0.42s cubic-bezier(0.32, 1.18, 0.64, 1);
}

/* ── 品牌 Logo ── */
.sidebar-brand {
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  padding: 0;
  text-decoration: none;
  -webkit-app-region: none;
  overflow: hidden;
  transition: width 0.26s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              margin 0.26s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.sidebar-logo-img {
  width: 32px;
  height: 32px;
  border-radius: 0;
  object-fit: contain;
  padding: 2px;
  transition: width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              height 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  flex-shrink: 0;
}

.sidebar.expanded .sidebar-logo-img {
  width: 48px;
  height: 48px;
}

.sidebar-brand:hover .sidebar-logo-img {
  transform: scale(1.06);
}

.sidebar-brand__title {
  max-width: 0;
  opacity: 0;
  margin-left: 0;
  overflow: hidden;
  white-space: nowrap;
  color: var(--c-text);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.2px;
  transition: max-width 0.3s ease, opacity 0.25s ease, margin-left 0.3s ease;
}

.sidebar.expanded .sidebar-brand {
  width: 100%;
  justify-content: flex-start;
  margin: 0 0 12px;
  padding: 0 10px;
}

.sidebar.expanded .sidebar-brand__title {
  max-width: 120px;
  opacity: 1;
  margin-left: 10px;
}

.sidebar-brand__ver {
  font-size: 10px;
  font-weight: 400;
  color: var(--c-text-lighter);
  margin-left: 2px;
}

.sidebar-brand__bubble {
  font-size: 9px;
  font-weight: 500;
  color: #fff;
  background: #e65100;
  padding: 1px 5px;
  border-radius: 3px;
  margin-left: 3px;
  vertical-align: middle;
}


/* ── 导航区域 ── */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  padding: 0;
  gap: 2px;
}

.sidebar-nav--main {
  flex: 1;
}

.sidebar-nav--tool {
  margin-bottom: 4px;
}

/* ── 导航按钮 ── */
.sidebar-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 10px;
  border-radius: 10px;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid transparent;
  transition: width 0.26s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              margin 0.26s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              background-color 0.2s ease,
              border-color 0.2s ease;
  position: relative;
  z-index: 10;
  overflow: hidden;
  margin: 0 auto;
}

.sidebar-btn svg {
  width: 20px;
  height: 20px;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: #aaa;
  transition: color 0.2s ease;
  flex-shrink: 0;
}

.sidebar-btn__label {
  max-width: 0;
  opacity: 0;
  margin-left: 0;
  transform: translateX(-4px);
  overflow: hidden;
  white-space: nowrap;
  color: #555;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1px;
  transition: max-width 0.3s ease, opacity 0.25s ease, margin-left 0.3s ease, transform 0.3s ease;
}

.sidebar-btn:hover {
  background: var(--c-bg-lighter);
}

.sidebar-btn:hover svg {
  color: #666;
}

.sidebar-btn.active {
  background: transparent;
  border-color: transparent;
}

.sidebar-btn.active svg {
  color: var(--c-primary);
}

.sidebar.expanded .sidebar-btn {
  width: 100%;
  border-radius: 8px;
  margin: 0;
}

.sidebar.expanded .sidebar-btn.active {
  background: transparent;
}

.sidebar.expanded .sidebar-btn__label {
  max-width: 110px;
  opacity: 1;
  margin-left: 10px;
  transform: translateX(0);
}

.sidebar.expanded .sidebar-btn.active .sidebar-btn__label {
  color: var(--c-primary);
  font-weight: 700;
}

/* ── 分割线 ── */
.sidebar-divider {
  width: 28px;
  height: 1px;
  background: var(--c-border);
  margin: 6px auto;
}

.sidebar.expanded .sidebar-divider {
  width: 100%;
}

/* ── Tooltip ── */
.sidebar-btn::after {
  content: attr(title);
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) scale(0.92);
  padding: 5px 12px;
  border-radius: 6px;
  background: #333;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.18s ease, transform 0.18s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.sidebar-btn:hover::after {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

.sidebar-btn.active::after,
.sidebar.expanded .sidebar-btn::after {
  opacity: 0;
  transform: translateY(-50%) scale(0.92);
}
</style>
