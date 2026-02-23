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
      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
      <span v-if="tocItems.length > 0" class="toc-badge">{{ tocItems.length }}</span>
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

.toc-toggle-btn {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  width: 48px;
  height: 64px;
  border-radius: 0 12px 12px 0;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  border: none;
  border-left: none;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 2px 0 16px rgba(14, 165, 233, 0.4);
  transition: all 0.3s ease;
  z-index: 999;
  gap: 4px;
}

.toc-toggle-btn:hover {
  width: 56px;
  box-shadow: 2px 0 20px rgba(14, 165, 233, 0.5);
}

.toc-toggle-btn.active {
  background: linear-gradient(135deg, #0284c7, #0369a1);
  left: 320px;
}

.toc-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
}

.toc-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 320px;
  height: 100vh;
  background: #ffffff;
  box-shadow: 2px 0 40px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.toc-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, #f8fafc, #ffffff);
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
}

.toc-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

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

.toc-item {
  margin: 0;
}

.toc-item a {
  display: block;
  padding: 12px 24px;
  color: #4a5568;
  text-decoration: none;
  font-size: 0.95rem;
  line-height: 1.5;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toc-item a::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, #0ea5e9, #0284c7);
  transform: scaleY(0);
  transition: transform 0.2s ease;
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

.toc-item a:hover {
  background: rgba(14, 165, 233, 0.05);
  color: #0ea5e9;
}

.toc-item a:hover::before {
  transform: scaleY(1);
}

.toc-item.active a {
  background: rgba(14, 165, 233, 0.08);
  color: #0ea5e9;
  border-left-color: transparent;
  font-weight: 600;
}

.toc-item.active a::before {
  transform: scaleY(1);
}

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

.toc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  z-index: 999;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.toc-content::-webkit-scrollbar {
  width: 6px;
}

.toc-content::-webkit-scrollbar-track {
  background: transparent;
}

.toc-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.toc-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

@media (max-width: 768px) {
  .toc-toggle-btn {
    width: 40px;
    height: 56px;
  }

  .toc-toggle-btn.active {
    left: 280px;
  }

  .toc-sidebar {
    width: 280px;
  }
}
</style>
