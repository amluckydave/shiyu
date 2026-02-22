<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue"

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
const showScrollTop = ref(false)

// 生成目录
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
    
    // 为标题添加 ID（如果没有）
    let id = element.id
    if (!id) {
      id = `heading-${index}`
      element.id = id
    }

    items.push({ id, text, level, element })
  })

  tocItems.value = items
}

// 滚动到指定标题
function scrollToHeading(id: string) {
  const element = document.getElementById(id)
  if (element) {
    const offset = 80 // 顶部偏移量
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
    const offsetPosition = elementPosition - offset

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth"
    })

    activeId.value = id
    emit("itemClick", id)
    
    // 移动端点击后关闭目录
    if (window.innerWidth < 1024) {
      isOpen.value = false
    }
  }
}

// 监听滚动，高亮当前标题
function handleScroll() {
  const scrollPosition = window.scrollY + 100

  // 显示/隐藏回到顶部按钮
  showScrollTop.value = window.scrollY > 300

  for (let i = tocItems.value.length - 1; i >= 0; i--) {
    const item = tocItems.value[i]
    const element = item.element
    
    if (element.offsetTop <= scrollPosition) {
      activeId.value = item.id
      break
    }
  }
}

// 滚动到顶部
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  })
}

// 切换目录显示
function toggleToc() {
  isOpen.value = !isOpen.value
}

// 关闭目录
function closeToc() {
  isOpen.value = false
}

// 计算缩进样式
function getIndentStyle(level: number) {
  return {
    paddingLeft: `${(level - 1) * 16}px`
  }
}

onMounted(() => {
  // 延迟生成目录，确保内容已渲染
  setTimeout(() => {
    generateToc()
    handleScroll()
  }, 300)

  window.addEventListener("scroll", handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll)
})

// 监听内容变化，重新生成目录
watch(() => props.containerSelector, () => {
  setTimeout(generateToc, 300)
})
</script>

<template>
  <div class="article-toc-wrapper">
    <!-- 移动端目录按钮 -->
    <button class="toc-toggle-btn" :class="{ active: isOpen }" @click="toggleToc" title="目录">
      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
      <span v-if="tocItems.length > 0" class="toc-badge">{{ tocItems.length }}</span>
    </button>

    <!-- 回到顶部按钮 -->
    <transition name="fade-scale">
      <button v-if="showScrollTop" class="scroll-top-btn" @click="scrollToTop" title="回到顶部">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
          <line x1="12" y1="19" x2="12" y2="5"></line>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
      </button>
    </transition>

    <!-- 目录侧边栏 -->
    <transition name="slide">
      <aside v-if="isOpen || tocItems.length > 0" class="toc-sidebar" :class="{ open: isOpen }">
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

    <!-- 遮罩层 -->
    <transition name="fade">
      <div v-if="isOpen" class="toc-overlay" @click="closeToc"></div>
    </transition>
  </div>
</template>

<style scoped>
.article-toc-wrapper {
  position: relative;
}

/* 移动端目录按钮 */
.toc-toggle-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  border: none;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.4);
  transition: all 0.3s ease;
  z-index: 999;
}

.toc-toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(14, 165, 233, 0.5);
}

.toc-toggle-btn.active {
  background: linear-gradient(135deg, #0284c7, #0369a1);
}

.toc-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #ef4444;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

/* 回到顶部按钮 */
.scroll-top-btn {
  position: fixed;
  bottom: 96px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border: none;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 998;
}

.scroll-top-btn:hover {
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
}

.scroll-top-btn:active {
  transform: scale(0.95);
}

.scroll-top-btn svg {
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-4px);
  }
  60% {
    transform: translateY(-2px);
  }
}

/* 目录侧边栏 */
.toc-sidebar {
  position: fixed;
  top: 0;
  right: -320px;
  width: 320px;
  height: 100vh;
  background: #ffffff;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toc-sidebar.open {
  right: 0;
}

.toc-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
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
  font-weight: 600;
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
  padding: 0.5rem 1.5rem;
  color: #64748b;
  text-decoration: none;
  font-size: 0.9rem;
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
  color: #475569;
}

.toc-item.level-2 a {
  font-weight: 500;
}

.toc-item.level-3 a,
.toc-item.level-4 a {
  font-size: 0.85rem;
  color: #94a3b8;
}

.toc-item a:hover {
  color: #0ea5e9;
  background: linear-gradient(90deg, #f0f9ff, transparent);
  padding-left: 1.75rem;
}

.toc-item a:hover::before {
  transform: scaleY(1);
}

.toc-item.active a {
  color: #0ea5e9;
  background: linear-gradient(90deg, #f0f9ff, transparent);
  border-left-color: transparent;
  font-weight: 600;
  padding-left: 1.75rem;
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

/* 遮罩层 */
.toc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
  backdrop-filter: blur(2px);
}

/* 动画 */
.slide-enter-active,
.slide-leave-active {
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from,
.slide-leave-to {
  right: -320px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(10px);
}

/* 桌面端样式 */
@media (min-width: 1280px) {
  .toc-toggle-btn {
    display: none;
  }

  .scroll-top-btn {
    bottom: 24px;
    right: 24px;
  }

  .article-toc-wrapper {
    position: relative;
    height: auto;
  }

  .toc-sidebar {
    position: static;
    right: auto;
    width: 280px;
    height: auto;
    box-shadow: none;
    border-left: 1px solid #e2e8f0;
    background: #ffffff;
    border-radius: 12px;
    overflow: visible;
  }

  .toc-sidebar.open {
    right: auto;
  }

  .toc-header {
    background: linear-gradient(180deg, #f8fafc, #ffffff);
    border-bottom: 1px solid #e2e8f0;
    padding: 1rem 1.25rem;
  }

  .close-btn {
    display: none;
  }

  .toc-content {
    padding: 0.5rem 0;
    max-height: none;
    overflow-y: visible;
  }

  .toc-item a {
    padding: 0.4rem 1.25rem;
  }

  .toc-overlay {
    display: none;
  }
}

@media (min-width: 1600px) {
  .article-toc-wrapper {
    width: 320px;
  }

  .toc-sidebar {
    width: 320px;
  }
}

/* 滚动条样式 */
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
</style>
