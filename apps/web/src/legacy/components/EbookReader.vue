<template>
    <div class="ebook-reader">
        <!-- 自动打开电子书时，显示加载态，避免出现中间提示页 -->
        <div v-if="!bookLoaded && isAutoLoading" class="empty-state">
            <div class="empty-content">
                <div class="boot-loading-spinner"></div>
                <h2 class="title">正在打开电子书</h2>
                <p class="subtitle">请稍候，马上进入阅读内容…</p>
            </div>
        </div>

        <!-- 未加载书籍时的提示 -->
        <div v-else-if="!bookLoaded" class="empty-state">
            <div class="empty-content">
                <div class="icon-wrapper">
                    <svg viewBox="0 0 24 24" class="book-icon" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                </div>
                <h2 class="title">请选择一本电子书</h2>
                <p class="subtitle">请前往 <a href="/ebooks.html">电子书列表</a> 选择要阅读的书籍</p>
            </div>
        </div>

        <!-- 阅读器主区域 -->
        <div v-else class="reader-container">
            <!-- 目录侧边栏 -->
            <transition name="slide">
                <div v-if="showToc" class="toc-sidebar">
                    <div class="toc-header">
                        <h3>目录</h3>
                        <button class="close-toc-btn" @click="showToc = false">✕</button>
                    </div>
                    <div class="toc-content custom-scrollbar">
                        <ul v-if="toc.length">
                            <li v-for="(item, index) in toc" :key="index" class="toc-item">
                                <a href="javascript:void(0)" @click="handleTocClick(item.href)" :title="item.label">{{ item.label }}</a>
                                <ul v-if="item.subitems && item.subitems.length" class="toc-subitems">
                                     <li v-for="(sub, subIndex) in item.subitems" :key="subIndex" class="toc-subitem">
                                        <a href="javascript:void(0)" @click="handleTocClick(sub.href)" :title="sub.label">{{ sub.label }}</a>
                                     </li>
                                </ul>
                            </li>
                        </ul>
                        <div v-else class="empty-toc">暂无目录</div>
                    </div>
                </div>
            </transition>
            
            <!-- 遮罩层 -->
            <div v-if="showToc" class="toc-overlay" @click="showToc = false"></div>

            <!-- 顶部工具栏 -->
            <div class="reader-toolbar">
                <div class="toolbar-content-wrapper">
                    <div class="toolbar-left">
                        <button class="toolbar-btn menu-btn" @click="toggleToc" title="目录">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                        <div class="book-info">
                            <span class="book-title" :title="bookTitle">{{ bookTitle }}</span>
                        </div>
                    </div>
                    <div class="toolbar-right">
                        <div class="progress-info">
                            <span class="progress-val">{{ Math.round(progress * 100) }}%</span>
                            <div class="progress-bar-mini">
                                <div class="progress-fill" :style="{ width: (progress * 100) + '%' }"></div>
                            </div>
                        </div>
                        <button class="toolbar-btn close-btn" @click="handleCloseAction" title="返回电子书列表">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 书籍内容区域 -->
            <div class="reader-main">
                <button class="nav-btn prev" @click="goPrev" :disabled="!canGoPrev" title="上一页">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>
                <div ref="viewerContainer" class="viewer-container card-effect"></div>
                <button class="nav-btn next" @click="goNext" :disabled="!canGoNext" title="下一页">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </button>
            </div>

            <!-- 选中文本弹出工具栏 (Ported from SelectionPopover.vue) -->
            <transition name="pop-fade">
                <div v-if="selectionPopover.visible" class="selection-popover"
                    :style="{ top: selectionPopover.top + 'px', left: selectionPopover.left + 'px', transform: 'translateX(-50%)' }">
                    <button v-if="selectionPopover.text.length <= 30" class="popover-btn word-btn" title="添加生词" @click="addToVocabulary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                    </button>
                    <button class="popover-btn sentence-btn" title="添加长难句" @click="addToSentenceBank">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                    </button>
                </div>
            </transition>

            <!-- 标注对话框 (AnnotationForm) -->
            <AnnotationForm
                v-if="annotationForm.visible"
                :selected-text="annotationForm.selectedText"
                :context-text="annotationForm.contextText"
                :type="annotationForm.type"
                @save="handleAnnotationSave"
                @cancel="handleAnnotationCancel"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useVocabulary } from '../bilingual-pack-client/composables/useVocabulary'
import { useSentenceBank } from '../bilingual-pack-client/composables/useSentenceBank'
import AnnotationForm from '../bilingual-pack-client/components/AnnotationForm.vue'

// Composables
const { addWord } = useVocabulary()
const { addSentence } = useSentenceBank()
const router = useRouter()

// 状态
const bookLoaded = ref(false)
const isAutoLoading = ref(false)
const bookTitle = ref('')
const progress = ref(0)
const isDragging = ref(false)
const canGoPrev = ref(false)
const canGoNext = ref(true)
const toc = ref<any[]>([])
const showToc = ref(false)
const currentBookUrl = ref('') // Track the current ebook URL for annotations

// DOM 引用
const fileInput = ref<HTMLInputElement | null>(null)
const viewerContainer = ref<HTMLElement | null>(null)

// 阅读器实例
let view: any = null
let currentBook: any = null

// 选中文本弹出框
const selectionPopover = ref({
    visible: false,
    top: 0,
    left: 0,
    text: '',
    range: null as Range | null
})

// 标注对话框状态
const annotationForm = ref({
    visible: false,
    type: 'word' as 'word' | 'sentence',
    selectedText: '',
    contextText: '',
    cfi: '' // Store CFI position for navigation
})

// 触发文件选择
function triggerFileInput() {
    fileInput.value?.click()
}

// 处理文件选择
async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) {
        await loadBook(file)
    }
}

// 处理拖拽
async function handleDrop(event: DragEvent) {
    isDragging.value = false
    const file = event.dataTransfer?.files[0]
    if (file) {
        await loadBook(file)
    }
}

// 动态加载 foliate-js 脚本
let foliateModule: any = null

async function loadFoliateJs(): Promise<any> {
    if (foliateModule) return foliateModule
    
    // 检查是否已经加载过
    if ((window as any).__foliateModule) {
        foliateModule = (window as any).__foliateModule
        return foliateModule
    }
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.type = 'module'
        script.textContent = `
            import * as foliate from '/foliate-js/view.js'
            window.__foliateModule = foliate
        `
        
        document.head.appendChild(script)
        
        // 使用轮询等待模块加载
        let attempts = 0
        const maxAttempts = 50 // 5秒超时
        
        const checkInterval = setInterval(() => {
            attempts++
            
            if ((window as any).__foliateModule) {
                clearInterval(checkInterval)
                foliateModule = (window as any).__foliateModule
                resolve(foliateModule)
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval)
                reject(new Error('Timeout waiting for foliate-js to load'))
            }
        }, 100)
    })
}

// 管理页面标题可见性
function togglePageHeader(show: boolean) {
    const h1 = document.querySelector('.theme-hope-content > h1') || document.querySelector('h1')
    const pageInfo = document.querySelector('.page-info')
    
    if (h1) (h1 as HTMLElement).style.display = show ? '' : 'none'
    if (pageInfo) (pageInfo as HTMLElement).style.display = show ? '' : 'none'
}

// 加载书籍
async function loadBook(file: File) {
    try {
        // 动态加载 foliate-js
        const { makeBook } = await loadFoliateJs()

        // 先解析书籍获取元数据
        currentBook = await makeBook(file)
        
        bookTitle.value = currentBook.metadata?.title || file.name.replace(/\.[^/.]+$/, '')
        document.title = bookTitle.value
        
        // 隐藏页面默认标题和元数据，进入沉浸式阅读
        togglePageHeader(false)
        
        // 获取目录
        toc.value = currentBook.toc || []

        // 设置 bookLoaded 为 true，这样 viewerContainer 会被渲染
        bookLoaded.value = true

        // 等待 DOM 更新
        await nextTick()

        if (!viewerContainer.value) {
            return
        }

        // 清空容器
        viewerContainer.value.innerHTML = ''

        // 创建 foliate-view 元素
        view = document.createElement('foliate-view') as any
        viewerContainer.value.appendChild(view)

        // 监听事件
        view.addEventListener('relocate', handleRelocate)
        view.addEventListener('load', handleSectionLoad)

        // 打开书籍
        await view.open(currentBook)

    } catch (error) {
        console.error('加载书籍失败:', error)
        bookLoaded.value = false
        togglePageHeader(true) // 恢复标题
        alert('加载书籍失败，请确保文件格式正确。错误: ' + (error as Error).message)
    }
}
// 点击目录项
function handleTocClick(href: string) {
    if (view && href) {
        view.goTo(href)
        // 移动端或小屏幕点击后关闭目录
        if (window.innerWidth < 768) {
            showToc.value = false
        }
    }
}

// 切换目录显示
function toggleToc() {
    showToc.value = !showToc.value
}

// 处理位置变化
function handleRelocate(event: CustomEvent) {
    const { fraction, section } = event.detail
    progress.value = fraction || 0

    // 更新翻页按钮状态
    if (currentBook) {
        const totalSections = currentBook.sections?.length || 1
        canGoPrev.value = section > 0 || fraction > 0
        canGoNext.value = section < totalSections - 1 || fraction < 1
    }
}

// 处理章节加载 - 添加选中事件监听和注入样式
function handleSectionLoad(event: CustomEvent) {
    const { doc } = event.detail
    if (doc) {
        doc.addEventListener('mouseup', handleTextSelection)
        doc.addEventListener('touchend', handleTextSelection)
        
        // 注入高亮样式
        const style = doc.createElement('style')
        style.textContent = `
            .highlight-vocab { 
                background-color: rgba(76, 175, 80, 0.3) !important; 
                border-bottom: 2px solid #4CAF50 !important;
                color: inherit !important;
                cursor: pointer;
            }
            .highlight-sentence { 
                background-color: rgba(33, 150, 243, 0.3) !important; 
                border-bottom: 2px solid #2196F3 !important;
                color: inherit !important;
                cursor: pointer;
            }
        `
        doc.head.appendChild(style)
    }
}

// 处理文本选中
function handleTextSelection(event: Event) {
    const doc = (event.target as Node).ownerDocument || document
    const selection = doc.getSelection()

    if (!selection || selection.isCollapsed || !selection.rangeCount) {
        selectionPopover.value.visible = false
        return
    }

    const text = selection.toString().trim()
    if (!text) {
        selectionPopover.value.visible = false
        return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    // 获取 iframe 的位置偏移 - 使用 frameElement 从 iframe 内部文档获取
    let offsetTop = 0
    let offsetLeft = 0
    
    // 如果当前文档在 iframe 中，获取 iframe 在主窗口中的位置
    const win = doc.defaultView
    if (win && win.frameElement) {
        const iframeRect = (win.frameElement as HTMLIFrameElement).getBoundingClientRect()
        offsetTop = iframeRect.top
        offsetLeft = iframeRect.left
    }

    // 计算弹出框位置 - 居中显示在选中文本上方
    const popoverTop = rect.top + offsetTop - 55 // 55px above selection
    const popoverLeft = rect.left + offsetLeft + rect.width / 2 // Centered (translateX(-50%) in CSS)

    selectionPopover.value = {
        visible: true,
        top: popoverTop,
        left: popoverLeft,
        text,
        range
    }
}

// 高亮选中内容
function highlightSelection(type: 'vocab' | 'sentence') {
    const range = selectionPopover.value.range
    if (!range) return

    try {
        const doc = range.commonAncestorContainer.ownerDocument
        if (!doc) return

        const mark = doc.createElement('mark')
        mark.className = type === 'vocab' ? 'highlight-vocab' : 'highlight-sentence'
        
        // 简单的 surroundContents 可能在跨节点时失败，这里做一个简单的容错
        // 实际生产环境可能需要更复杂的 DOM 操作库
        try {
            range.surroundContents(mark)
        } catch (e) {
            console.warn('Cannot surround range directly, trying fallback', e)
            // 如果选中了复杂结构，回退到 execCommand
            if (doc.designMode !== 'on') {
                doc.designMode = 'on' // 确保 execCommand 可用
            }
            doc.execCommand('styleWithCSS', false, 'true')
            doc.execCommand('backColor', false, type === 'vocab' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(33, 150, 243, 0.3)')
            doc.designMode = 'off'
        }
        
        // 清除选中
        const sel = doc.getSelection()
        sel?.removeAllRanges()
    } catch (e) {
        console.error('Highlight error:', e)
    }
}

// 打开标注对话框 - 生词
function addToVocabulary() {
    const text = selectionPopover.value.text
    if (text) {
        // Get CFI from current view position for navigation
        const cfi = view?.lastLocation?.cfi || ''
        annotationForm.value = {
            visible: true,
            type: 'word',
            selectedText: text.split(/\s+/)[0] || text, // 取第一个单词
            contextText: text,
            cfi
        }
    }
    selectionPopover.value.visible = false
}

// 打开标注对话框 - 长难句
function addToSentenceBank() {
    const text = selectionPopover.value.text
    if (text) {
        // Get CFI from current view position for navigation
        const cfi = view?.lastLocation?.cfi || ''
        annotationForm.value = {
            visible: true,
            type: 'sentence',
            selectedText: text,
            contextText: '',
            cfi
        }
    }
    selectionPopover.value.visible = false
}

// 处理标注保存
function handleAnnotationSave(meaning: string) {
    const { type, selectedText, contextText, cfi } = annotationForm.value
    
    // Build articlePath with book URL and CFI for ebook navigation
    // Format: /reader.html?book=<encoded_book_url>&cfi=<encoded_cfi>
    let articlePath = '/reader'
    if (currentBookUrl.value) {
        const params = new URLSearchParams()
        params.set('book', currentBookUrl.value)
        if (cfi) {
            params.set('cfi', cfi)
        }
        articlePath = `/reader.html?${params.toString()}`
    }
    
    if (type === 'word') {
        addWord(selectedText, meaning, contextText, articlePath)
        highlightSelection('vocab')
    } else {
        addSentence(selectedText, meaning, articlePath)
        highlightSelection('sentence')
    }
    
    annotationForm.value.visible = false
}

// 处理标注取消
function handleAnnotationCancel() {
    annotationForm.value.visible = false
}

// 上一页
function goPrev() {
    view?.prev()
}

// 下一页
function goNext() {
    view?.next()
}

// 关闭书籍
function closeBook() {
    if (view) {
        view.close?.()
        view.remove()
        view = null
    }
    currentBook = null
    bookLoaded.value = false
    bookTitle.value = ''
    progress.value = 0
    toc.value = []
    showToc.value = false
    
    // 恢复页面标题和元数据
    togglePageHeader(true)
    document.title = '电子书阅读器'
}

async function handleCloseAction() {
    closeBook()

    if (typeof window === 'undefined') {
        return
    }

    try {
        await router.replace({ path: '/ebooks.html' })
    } catch {
        window.location.href = '/ebooks.html'
    }
}



// 点击其他地方隐藏弹出框
function handleClickOutside(event: MouseEvent) {
    if (selectionPopover.value.visible) {
        const target = event.target as HTMLElement
        if (!target.closest('.selection-popover')) {
            selectionPopover.value.visible = false
        }
    }
}

// 从 URL 加载电子书
async function loadBookFromUrl(url: string, navigateToCfi?: string) {
    try {
        // 优先使用 Cache API 中预加载的数据（从 ArticleManager 传过来）
        let blob: Blob
        let fileName = url.split('/').pop() || 'ebook'

        try {
            const cache = await caches.open('ebook-preload')
            const cached = await cache.match(url)
            if (cached) {
                blob = await cached.blob()
                // 用完即删
                await cache.delete(url)
            } else {
                throw new Error('no cache')
            }
        } catch {
            // 回退到普通 fetch
            const response = await fetch(url)
            if (!response.ok) throw new Error('Failed to fetch ebook')
            blob = await response.blob()
        }

        currentBookUrl.value = url
        const file = new File([blob], fileName, { type: blob.type })
        
        await loadBook(file)
        
        // Navigate to CFI position if provided
        if (navigateToCfi && view) {
            setTimeout(() => {
                view?.goTo(navigateToCfi)
            }, 500)
        }
    } catch (error) {
        console.error('从 URL 加载电子书失败:', error)
        alert('加载电子书失败，请检查文件路径')
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
    
    // 检查 URL 参数中是否有电子书路径
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const bookUrl = params.get('book')
        const cfi = params.get('cfi')
        
        if (bookUrl) {
            isAutoLoading.value = true
            loadBookFromUrl(decodeURIComponent(bookUrl), cfi ? decodeURIComponent(cfi) : undefined)
                .finally(() => {
                    isAutoLoading.value = false
                })
        }
    }
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    closeBook()
})
</script>

<style scoped lang="scss">
.ebook-reader {
    /* Normal flow - navbar stays visible */
    position: relative;
    width: 100%;
    min-height: calc(100vh - 64px); /* Account for navbar height */
    
    background: #fff; /* Match typical book background */
    color: #2c3e50;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
    
    @media (prefers-color-scheme: dark) {
        background: #121212;
        color: #e0e0e0;
    }
}

.empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
}

.empty-content {
    width: min(92vw, 520px);
    text-align: center;
}

.book-icon {
    width: 38px;
    height: 38px;
}

.boot-loading-spinner {
    width: 44px;
    height: 44px;
    margin: 0 auto 1rem;
    border: 3px solid #e5e7eb;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: ebook-spin 0.75s linear infinite;
}

@keyframes ebook-spin {
    to { transform: rotate(360deg); }
}

/* File Selector - Enhanced */
.file-selector {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    position: relative;
    overflow: hidden;
    
    &::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle at center, rgba(102, 126, 234, 0.05) 0%, transparent 60%);
        animation: rotate 60s linear infinite;
        pointer-events: none;
    }

    @media (prefers-color-scheme: dark) {
        background: radial-gradient(circle at center, #1e2a4a 0%, #0f1219 100%);
    }
}

@keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.selector-content {
    text-align: center;
    padding: 3.5rem;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 24px;
    backdrop-filter: blur(20px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.6);
    max-width: 480px;
    width: 90%;
    z-index: 10;
    transition: transform 0.3s ease;
    
    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 30px 70px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.8);
    }

    @media (prefers-color-scheme: dark) {
        background: rgba(30, 35, 55, 0.7);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08);
    }
}

.icon-wrapper {
    width: 80px;
    height: 80px;
    margin: 0 auto 1.5rem;
    background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 10px 20px rgba(142, 197, 252, 0.3);
    
    .upload-icon {
        width: 40px;
        height: 40px;
    }
}

.title {
    margin: 0 0 0.5rem;
    font-size: 2rem;
    font-weight: 700;
    color: #2d3436;
    letter-spacing: -0.5px;
    
    @media (prefers-color-scheme: dark) { color: #fff; }
}

.subtitle {
    margin: 0 0 2rem;
    color: #636e72;
    font-size: 1rem;
    @media (prefers-color-scheme: dark) { color: #a0a0a0; }
}

.upload-area {
    padding: 2rem;
    border: 2px dashed #dbe2ef;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: #f8faff;
    position: relative;
    overflow: hidden;

    &:hover, &.dragging {
        background: #f0f7ff;
        border-color: #667eea;
        transform: translateY(-2px);
    }
    
    &.dragging {
        border-style: solid;
        box-shadow: inset 0 0 20px rgba(102, 126, 234, 0.1);
    }

    @media (prefers-color-scheme: dark) {
        background: rgba(255, 255, 255, 0.03);
        border-color: rgba(255, 255, 255, 0.1);
        
        &:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: #667eea;
        }
    }
}

.upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.upload-icon-small {
    padding: 12px;
    background: #eef2f7;
    border-radius: 50%;
    color: #667eea;
    transition: transform 0.3s ease;
    
    @media (prefers-color-scheme: dark) {
        background: rgba(102, 126, 234, 0.2);
    }
}

.upload-area:hover .upload-icon-small {
    transform: scale(1.1);
    background: #e1e9ff;
}

.upload-text {
    font-weight: 500;
    color: #666;
}

.supported-formats {
    margin-top: 1.5rem;
    display: flex;
    justify-content: center;
    gap: 10px;
    
    .format-badge {
        font-size: 0.75rem;
        padding: 4px 10px;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 20px;
        color: #888;
        font-weight: 600;
        
        @media (prefers-color-scheme: dark) {
            background: rgba(255, 255, 255, 0.1);
            color: #aaa;
        }
    }
}

/* Reader Toolbar - Integrated Style */
.reader-toolbar {
    height: 56px;
    width: 100%;
    background: #fff;
    /* Remove border for cleaner look, or keep very subtle */
    border-bottom: 1px solid rgba(0, 0, 0, 0.05); 
    z-index: 50; /* Inside the high-z-index container */
    position: relative;
    display: flex;
    justify-content: center;
    box-shadow: none; /* Flat look */
    flex-shrink: 0; /* Prevent shrinking */
    
    @media (prefers-color-scheme: dark) {
        background: #1e1e2d;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
}

.toolbar-content-wrapper {
    width: 100%;
    max-width: 800px; /* SYNC with viewer-container */
    padding: 0 20px; /* Match viewer padding if any */
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
}

.toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.8rem;
}

.book-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.book-title {
    font-weight: 700;
    font-size: 1.1rem; /* Slightly larger */
    color: #1a1a1a;
    letter-spacing: -0.3px;
    max-width: 400px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    
    @media (prefers-color-scheme: dark) { color: #fff; }
    
    @media (max-width: 768px) {
        max-width: 180px;
        font-size: 1rem;
    }
}

.toolbar-btn {
    width: 40px;
    height: 40px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    border: none;
    background: transparent;
    color: #555;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover {
        background: rgba(0, 0, 0, 0.06);
        color: #000;
        transform: scale(1.05);
    }
    
    @media (prefers-color-scheme: dark) {
        color: #ccc;
        &:hover {
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
        }
    }
}

/* Close button specific style for emphasis (optional) */
.close-btn:hover {
    background: rgba(255, 59, 48, 0.1);
    color: #ff3b30;
}

.progress-info {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-right: 4px;
    background: rgba(0,0,0,0.03);
    padding: 6px 12px;
    border-radius: 20px;
    
    @media (prefers-color-scheme: dark) {
        background: rgba(255,255,255,0.05);
    }
}

.progress-val {
    font-size: 0.85rem;
    font-weight: 700;
    color: #666;
    min-width: 32px;
    text-align: right;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
    
    @media (prefers-color-scheme: dark) { color: #aaa; }
}

.progress-bar-mini {
    width: 80px;
    height: 6px;
    background: rgba(0, 0, 0, 0.08);
    border-radius: 3px;
    overflow: hidden;
    
    @media (prefers-color-scheme: dark) { background: rgba(255, 255, 255, 0.1); }
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea, #764ba2);
    border-radius: 3px;
    transition: width 0.3s ease;
    box-shadow: 0 0 8px rgba(118, 75, 162, 0.3);
}

/* Reader Container */
.reader-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    height: calc(100vh - 56px);
    overflow: hidden;
}

.reader-main {
    flex: 1;
    display: flex;
    align-items: stretch; /* Allow children to stretch to full height */
    justify-content: center; /* Horizontally center */
    position: relative;
    padding: 0; /* Removing padding to allow full flush reading if desired, or keep minimal */
    background: #fff; /* Seamless background */
    min-height: 0; /* Important for flex children to shrink properly */
    
    @media (prefers-color-scheme: dark) {
        background: #121212;
    }
}

.viewer-container {
    width: 100%;
    max-width: 800px; /* SYNC with toolbar-content-wrapper */
    flex: 1; /* Use flex instead of height: 100% to properly fill parent */
    min-height: 0; /* Allow shrinking in flex context */
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    
    /* Remove card effect for seamless look */
    background: transparent;
    box-shadow: none;
    border-radius: 0;
    
    /* Ensure foliate-view element fills container */
    :deep(foliate-view) {
        flex: 1;
        width: 100%;
        min-height: 0;
        display: block;
    }
    
    /* Make iframe fill container */
    :deep(iframe) {
        width: 100%;
        height: 100%;
        border: none;
        display: block; /* Remove inline spacing */
    }
    
    @media (max-width: 768px) {
        max-width: 100%;
    }
}

/* Navigation Buttons */
.nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #666;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 10;
    opacity: 0; /* Hidden by default for clean look, show on hover */
    
    .reader-main:hover & {
        opacity: 1;
    }
    
    @media (max-width: 768px) {
        display: none; /* Hide on mobile, use swipe/tap */
    }
    
    &:hover:not(:disabled) {
        background: #fff;
        transform: translateY(-50%) scale(1.1);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
        color: #667eea;
    }
    
    &:active:not(:disabled) {
        transform: translateY(-50%) scale(0.95);
    }
    
    &.prev { left: 2rem; }
    &.next { right: 2rem; }
    
    @media (prefers-color-scheme: dark) {
        background: rgba(40, 40, 50, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.05);
        color: #aaa;
        
        &:hover:not(:disabled) {
            background: rgba(50, 50, 70, 0.9);
            color: #fff;
        }
    }
}

/* Sidebar */
.toc-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 320px;
    height: 100vh;
    background: #fff;
    z-index: 100;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    
    @media (prefers-color-scheme: dark) {
        background: #1e1e2d;
    }
}

.toc-header {
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    
    h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
    }
}

.close-toc-btn {
    background: transparent;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: #999;
    transition: color 0.2s;
    
    &:hover { color: #333; }
    @media (prefers-color-scheme: dark) { &:hover { color: #fff; } }
}

.toc-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 0;
}

.toc-item {
    list-style: none;
    margin: 0;
    padding: 0;
    
    a {
        display: block;
        padding: 12px 24px;
        color: #4a5568;
        text-decoration: none;
        font-size: 0.95rem;
        border-left: 3px solid transparent;
        transition: all 0.2s;
        
        &:hover {
            background: rgba(102, 126, 234, 0.05);
            color: #667eea;
            border-left-color: #667eea;
        }
    }
}

.toc-subitems {
    padding-left: 0;
    .toc-subitem a {
        padding-left: 40px;
        font-size: 0.9rem;
        color: #718096;
    }
}

.empty-toc {
    padding: 3rem;
    text-align: center;
    color: #a0aec0;
    font-style: italic;
}

.toc-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    z-index: 90;
    animation: fadeIn 0.3s ease;
}

/* Transitions */
.slide-enter-active, .slide-leave-active {
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-enter-from, .slide-leave-to {
    transform: translateX(-100%);
}

.pop-fade-enter-active, .pop-fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}
.pop-fade-enter-from, .pop-fade-leave-to {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
}

/* Selection Popover - Exactly matching article reader style */
.selection-popover {
    position: fixed;
    display: flex;
    gap: 6px;
    padding: 6px 8px;
    background: linear-gradient(135deg, rgba(248, 250, 252, 0.92), rgba(241, 245, 249, 0.88));
    backdrop-filter: blur(12px) saturate(120%);
    -webkit-backdrop-filter: blur(12px) saturate(120%);
    border: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 10px;
    box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.08),
        0 1px 3px rgba(0, 0, 0, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
    z-index: 10000;
    animation: popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
    0% {
        opacity: 0;
        transform: translateX(-50%) scale(0.85) translateY(8px);
    }
    100% {
        opacity: 1;
        transform: translateX(-50%) scale(1) translateY(0);
    }
}

@media (prefers-color-scheme: dark) {
    .selection-popover {
        background: linear-gradient(135deg, rgba(45, 50, 56, 0.92), rgba(38, 42, 48, 0.88));
        border: 1px solid rgba(75, 85, 99, 0.6);
        box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.3),
            0 1px 3px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
}

.selection-popover .popover-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
}

.selection-popover .popover-btn:hover {
    transform: scale(1.15);
}

.selection-popover .popover-btn:active {
    transform: scale(0.95);
}

.selection-popover .word-btn {
    background: linear-gradient(145deg, #e8f5e9, #c8e6c9);
    color: #2e7d32;
}

.selection-popover .word-btn:hover {
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.35);
}

@media (prefers-color-scheme: dark) {
    .selection-popover .word-btn {
        background: linear-gradient(145deg, #2e7d32, #388e3c);
        color: #a5d6a7;
    }
    .selection-popover .word-btn:hover {
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.5);
    }
}

.selection-popover .sentence-btn {
    background: linear-gradient(145deg, #e3f2fd, #bbdefb);
    color: #1565c0;
}

.selection-popover .sentence-btn:hover {
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.35);
}

@media (prefers-color-scheme: dark) {
    .selection-popover .sentence-btn {
        background: linear-gradient(145deg, #1565c0, #1976d2);
        color: #90caf9;
    }
    .selection-popover .sentence-btn:hover {
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.5);
    }
}

/* Custom Scrollbar */
.custom-scrollbar {
    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 10px;
    }
}

/* Override AnnotationForm z-index to appear above ebook reader */
:deep(.annotation-form-overlay) {
    z-index: 15000 !important;
}
</style>
