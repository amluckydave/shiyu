<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue"

interface TocItem {
  id: string
  text: string
  level: number
  element: HTMLElement
}

const props = defineProps<{
  containerSelector?: string
}>()

const emit = defineEmits<{
  itemClick: [id: string]
}>()

const tocItems = ref<TocItem[]>([])
const activeId = ref<string>("")
const isOpen = ref(false)

function generateToc() {
  const container = props.containerSelector
    ? document.querySelector(props.containerSelector)
    : document.querySelector(".article-body")

  if (!container) return

  const headings = container.querySelectorAll("h1, h2, h3, h4")
  const items: TocItem[] = []

  headings.forEach((heading, index) => {
    const element = heading as HTMLElement
    const level = parseInt(element.tagName.substring(1))
    const text = element.textContent || ""
    
    let id = element.id
    if (!id) {
      id = `heading-${index}`
      element.id = id
    }

    items.push({ id, text, level, element })
  })

  tocItems.value = items
}

function scrollToHeading(id: string) {
  const element = document.getElementById(id)
  if (element) {
    const offset = 80
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
    const offsetPosition = elementPosition - offset

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth"
    })

    activeId.value = id
    emit("itemClick", id)
    
    if (window.innerWidth < 1024) {
      isOpen.value = false
    }
  }
}

function handleScroll() {
  const scrollPosition = window.scrollY + 100

  for (let i = tocItems.value.length - 1; i >= 0; i--) {
    const item = tocItems.value[i]
    const element = item.element
    
    if (element.offsetTop <= scrollPosition) {
      activeId.value = item.id
      break
    }
  }
}

function toggleToc() {
  isOpen.value = !isOpen.value
}

function closeToc() {
  isOpen.value = false
}

function getIndentStyle(level: number) {
  return {
    paddingLeft: `${12 + (level - 1) * 16}px`
  }
}

onMounted(() => {
  setTimeout(() => {
    generateToc()
    handleScroll()
  }, 300)

  window.addEventListener("scroll", handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll)
})

watch(() => props.containerSelector, () => {
  setTimeout(generateToc, 300)
})
</script>

<template>
  <div class="article-toc-wrapper">
    <button 
      class="toc-toggle-btn" 
      :class="{ active: isOpen }" 
      @click="toggleToc" 
      title="目录"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        <line x1="10" y1="8" x2="16" y2="8"></line>
        <line x1="10" y1="12" x2="16" y2="12"></line>
        <line x1="10" y1="16" x2="14" y2="16"></line>
      </svg>
    </button>


    <transition name="slide">
      <aside v-if="isOpen" class="toc-sidebar">
        <div class="toc-header">
          <div class="toc-title-wrapper">
            <h3>目录</h3>
            <span v-if="tocItems.length > 0" class="toc-count">{{ tocItems.length }} 项</span>
          </div>
          <button class="close-btn" @click="closeToc">✕</button>
        </div>
        
        <nav class="toc-content">
          <ul v-if="tocItems.length > 0" class="toc-list">
            <li
              v-for="item in tocItems"
              :key="item.id"
              class="toc-item"
              :class="{ active: activeId === item.id, [`level-${item.level}`]: true }"
            >
              <a
                href="javascript:void(0)"
                :style="getIndentStyle(item.level)"
                :title="item.text"
                @click="scrollToHeading(item.id)"
              >
                {{ item.text }}
              </a>
            </li>
          </ul>
          <div v-else class="empty-toc">
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p>暂无目录</p>
            <span>文章中没有找到标题</span>
          </div>
        </nav>
      </aside>
    </transition>

    <transition name="fade">
      <div v-if="isOpen" class="toc-overlay" @click="closeToc"></div>
    </transition>
  </div>
</template>

<style scoped>
.article-toc-wrapper {
  position: relative;
}
/* Toggle Button - Sleeker with pulse animation */
.toc-toggle-btn {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  width: 52px;
  height: 68px;
  border-radius: 0 16px 16px 0;
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  border: none;
  color: #ffffff;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 2px 0 20px rgba(14, 165, 233, 0.35), 0 0 0 0 rgba(14, 165, 233, 0.4);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 999;
  gap: 0;
  animation: pulse-glow 3s ease-in-out infinite;
  font-family: "Segoe UI", "Microsoft YaHei", "微软雅黑", sans-serif;
}
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 2px 0 20px rgba(14, 165, 233, 0.35), 0 0 0 0 rgba(14, 165, 233, 0.4);
  }
  50% {
    box-shadow: 2px 0 28px rgba(14, 165, 233, 0.5), 0 0 20px 4px rgba(14, 165, 233, 0.3);
  }
}
.toc-toggle-btn:hover {
  width: 60px;
  background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%);
  box-shadow: 2px 0 32px rgba(14, 165, 233, 0.6), 0 0 24px 6px rgba(14, 165, 233, 0.35);
  animation: none;
}
.toc-toggle-btn svg {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toc-toggle-btn:hover svg {
  transform: scale(1.1);
}
.toc-toggle-btn.active {
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
  left: 320px;
  animation: none;
}
/* Sidebar - Glassmorphism */
.toc-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 320px;
  height: 100vh;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 2px 0 48px rgba(14, 165, 233, 0.12), 2px 0 24px rgba(0, 0, 0, 0.08);
  border-right: 1px solid rgba(14, 165, 233, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", "Microsoft YaHei", "微软雅黑", sans-serif;
}
/* Header with decorative gradient line */
.toc-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(14, 165, 233, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.6), rgba(255, 255, 255, 0.3));
  position: relative;
}
.toc-header::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 1.5rem;
  right: 1.5rem;
  height: 2px;
  background: linear-gradient(90deg, #0ea5e9 0%, #06b6d4 50%, transparent 100%);
  border-radius: 2px;
}
.toc-title-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.toc-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}
.toc-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #0ea5e9;
  background: rgba(14, 165, 233, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  border: 1px solid rgba(14, 165, 233, 0.2);
}
.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(14, 165, 233, 0.15);
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(10px);
}
.close-btn:hover {
  background: rgba(14, 165, 233, 0.1);
  color: #0ea5e9;
  border-color: rgba(14, 165, 233, 0.3);
  transform: rotate(90deg);
}
/* Content area */
.toc-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
}
.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
/* TOC Items with stagger animation */
.toc-item {
  margin: 0;
  animation: toc-item-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}
.toc-item:nth-child(1) { animation-delay: 0.05s; }
.toc-item:nth-child(2) { animation-delay: 0.08s; }
.toc-item:nth-child(3) { animation-delay: 0.11s; }
.toc-item:nth-child(4) { animation-delay: 0.14s; }
.toc-item:nth-child(5) { animation-delay: 0.17s; }
.toc-item:nth-child(6) { animation-delay: 0.20s; }
.toc-item:nth-child(7) { animation-delay: 0.23s; }
.toc-item:nth-child(8) { animation-delay: 0.26s; }
.toc-item:nth-child(9) { animation-delay: 0.29s; }
.toc-item:nth-child(10) { animation-delay: 0.32s; }
.toc-item:nth-child(n+11) { animation-delay: 0.35s; }
@keyframes toc-item-enter {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
/* TOC Item links with hover micro-interactions */
.toc-item a {
  display: block;
  padding: 12px 24px;
  color: #4a5568;
  text-decoration: none;
  font-size: 0.95rem;
  line-height: 1.5;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border-left: 3px solid transparent;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Gradient accent bar */
.toc-item a::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, #0ea5e9 0%, #06b6d4 50%, #0284c7 100%);
  transform: scaleY(0);
  transform-origin: bottom;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 2px 0 8px rgba(14, 165, 233, 0.4);
}
/* Background reveal on hover */
.toc-item a::after {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.08) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
}
.toc-item.level-1 a {
  font-weight: 600;
  font-size: 0.95rem;
  color: #334155;
}
.toc-item.level-2 a {
  font-weight: 500;
}
.toc-item.level-3 a,
.toc-item.level-4 a {
  font-size: 0.9rem;
  color: #64748b;
}
/* Hover state with translateX and background reveal */
.toc-item a:hover {
  color: #0ea5e9;
  transform: translateX(4px);
  padding-left: 20px;
}
.toc-item a:hover::before {
  transform: scaleY(1);
  transform-origin: top;
}
.toc-item a:hover::after {
  opacity: 1;
}
/* Active state with prominent gradient bar */
.toc-item.active a {
  color: #0ea5e9;
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.12) 0%, rgba(14, 165, 233, 0.04) 100%);
  border-left-color: transparent;
  font-weight: 600;
}
.toc-item.active a::before {
  transform: scaleY(1);
  transform-origin: center;
}
/* Empty state */
.empty-toc {
  padding: 3rem 1.5rem;
  text-align: center;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.empty-toc svg {
  color: #cbd5e1;
  margin-bottom: 0.5rem;
  opacity: 0.6;
}
.empty-toc p {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #64748b;
}
.empty-toc span {
  font-size: 0.85rem;
  color: #94a3b8;
}
/* Overlay */
.toc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  z-index: 999;
}
/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
/* Elegant scrollbar */
.toc-content::-webkit-scrollbar {
  width: 4px;
}
.toc-content::-webkit-scrollbar-track {
  background: transparent;
}
.toc-content::-webkit-scrollbar-thumb {
  background: rgba(14, 165, 233, 0.2);
  border-radius: 2px;
  transition: background 0.2s ease;
}
.toc-content::-webkit-scrollbar-thumb:hover {
  background: rgba(14, 165, 233, 0.4);
}
/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .toc-sidebar {
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    box-shadow: 2px 0 48px rgba(14, 165, 233, 0.2), 2px 0 24px rgba(0, 0, 0, 0.4);
    border-right: 1px solid rgba(14, 165, 233, 0.15);
  }
  .toc-header {
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.3));
    border-bottom: 1px solid rgba(14, 165, 233, 0.12);
  }
  .toc-header h3 {
    color: #f1f5f9;
  }
  .toc-count {
    color: #06b6d4;
    background: rgba(6, 182, 212, 0.15);
    border: 1px solid rgba(6, 182, 212, 0.25);
  }
  .close-btn {
    background: rgba(30, 41, 59, 0.6);
    border: 1px solid rgba(14, 165, 233, 0.2);
    color: #94a3b8;
  }
  .close-btn:hover {
    background: rgba(14, 165, 233, 0.2);
    color: #06b6d4;
    border-color: rgba(14, 165, 233, 0.4);
  }
  .toc-item a {
    color: #cbd5e1;
  }
  .toc-item.level-1 a {
    color: #e2e8f0;
  }
  .toc-item.level-3 a,
  .toc-item.level-4 a {
    color: #94a3b8;
  }
  .toc-item a:hover {
    color: #06b6d4;
  }
  .toc-item.active a {
    color: #06b6d4;
    background: linear-gradient(90deg, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.05) 100%);
  }
  .toc-item a::after {
    background: linear-gradient(90deg, rgba(6, 182, 212, 0.12) 0%, transparent 100%);
  }
  .empty-toc svg {
    color: #475569;
  }
  .empty-toc p {
    color: #94a3b8;
  }
  .empty-toc span {
    color: #64748b;
  }
  .toc-overlay {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
  }
  .toc-content::-webkit-scrollbar-thumb {
    background: rgba(6, 182, 212, 0.25);
  }
  .toc-content::-webkit-scrollbar-thumb:hover {
    background: rgba(6, 182, 212, 0.45);
  }
}
/* Responsive */
@media (max-width: 768px) {
  .toc-toggle-btn {
    width: 40px;
    height: 56px;
    border-radius: 0 12px 12px 0;
  }
  .toc-toggle-btn:hover {
    width: 48px;
  }
  .toc-toggle-btn.active {
    left: 280px;
  }
  .toc-sidebar {
    width: 280px;
  }
  .toc-header {
    padding: 1.25rem;
  }
  .toc-header::after {
    left: 1.25rem;
    right: 1.25rem;
  }
}
</style>
