<template>
    <div class="ebook-reader">
        <div v-if="!bookLoaded && isAutoLoading" class="empty-state">
            <div class="empty-content">
                <div class="boot-loading-spinner"></div>
                <h2 class="title">Opening ebook</h2>
                <p class="subtitle">Please wait, loading reading content...</p>
            </div>
        </div>

        <div v-else-if="!bookLoaded" class="empty-state">
            <div class="empty-content">
                <div class="icon-wrapper">
                    <svg viewBox="0 0 24 24" class="book-icon" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                </div>
                <h2 class="title">Please choose an ebook</h2>
                <p class="subtitle">Go to <a href="/ebooks.html">Ebook List</a> and choose a book to read</p>
            </div>
        </div>

        <div v-else class="reader-container">
            <transition name="fade">
                <div v-if="isRestoringProgress" class="progress-toast">
                    <div class="toast-content">
                        <div class="toast-spinner"></div>
                        <span>Jumping to your last reading position...</span>
                    </div>
                </div>
            </transition>

            <button 
                class="toc-toggle-btn" 
                :class="{ active: showToc }" 
                @click="toggleToc" 
                title="Contents"
            >
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round">
                    <line x1="4" y1="6" x2="20" y2="6"></line>
                    <line x1="4" y1="12" x2="14" y2="12"></line>
                    <line x1="4" y1="18" x2="18" y2="18"></line>
                </svg>
            </button>

            <transition name="slide">
                <aside v-if="showToc" class="toc-sidebar">
                    <div class="toc-header">
                        <div class="toc-title-wrapper">
                            <h3>Contents</h3>
                            <span v-if="toc.length > 0" class="toc-count">{{ toc.length }} items</span>
                        </div>
                        <button class="close-btn" @click="showToc = false">&#x2715;</button>
                    </div>
                    
                    <nav class="toc-content custom-scrollbar">
                        <ul v-if="toc.length > 0" class="toc-list">
                            <li v-for="(item, index) in toc" :key="index" class="toc-item" :class="{ active: activeHref === item.href }">
                                <a href="javascript:void(0)" @click="handleTocClick(item.href)" :title="item.label">{{ item.label }}</a>
                                <ul v-if="item.subitems && item.subitems.length" class="toc-subitems">
                                     <li v-for="(sub, subIndex) in item.subitems" :key="subIndex" class="toc-subitem" :class="{ active: activeHref === sub.href }">
                                        <a href="javascript:void(0)" @click="handleTocClick(sub.href)" :title="sub.label">{{ sub.label }}</a>
                                     </li>
                                </ul>
                            </li>
                        </ul>
                        <div v-else class="empty-toc">
                            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none">
                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <p>No contents</p>
                            <span>No table of contents found in this ebook</span>
                        </div>
                    </nav>
                </aside>
            </transition>
            
            <transition name="fade">
                <div v-if="showToc" class="toc-overlay" @click="showToc = false"></div>
            </transition>

            <div class="reader-toolbar">
                <div class="toolbar-content-wrapper">
                    <div class="toolbar-left">
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
                        <button class="toolbar-btn close-btn" @click="handleCloseAction" title="Back to ebook list">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div class="reader-main">
                <button class="nav-btn prev" @click="goPrev" :disabled="!canGoPrev" title="Previous page">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>
                <div ref="viewerContainer" class="viewer-container card-effect"></div>
                <button class="nav-btn next" @click="goNext" :disabled="!canGoNext" title="Next page">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </button>
            </div>

            <transition name="pop-fade">
                <div v-if="selectionPopover.visible" class="selection-popover"
                    :style="{ top: selectionPopover.top + 'px', left: selectionPopover.left + 'px', transform: 'translateX(-50%)' }">
                    <button v-if="selectionPopover.text.length <= 30" class="popover-btn word-btn" title="Add word" @click="addToVocabulary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                    </button>
                    <button class="popover-btn sentence-btn" title="Add sentence" @click="addToSentenceBank">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                    </button>
                </div>
            </transition>

            <AnnotationForm
                v-if="annotationForm.visible"
                :selected-text="annotationForm.selectedText"
                :context-text="annotationForm.contextText"
                :type="annotationForm.type"
                @save="handleAnnotationSave"
                @cancel="handleAnnotationCancel"
            />
            <transition name="pop-fade">
                <div v-if="annotationTooltip.visible" 
                    class="ebook-annotation-tooltip"
                    :class="{ 'is-sentence': annotationTooltip.type === 'sentence' }"
                    :style="{ 
                        position: 'fixed',
                        top: (annotationTooltip.top - 10) + 'px', 
                        left: annotationTooltip.left + 'px', 
                        transform: 'translate(-50%, -100%)',
                        zIndex: 1500
                    }"
                    @mouseleave="closeAnnotationTooltip"
                >
                    <div class="tooltip-arrow"></div>
                    <div class="tooltip-content">
                        {{ annotationTooltip.content }}
                    </div>
                </div>
            </transition>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { withBase } from 'vuepress/client'
import { useVocabulary } from '../bilingual-pack-client/composables/useVocabulary'
import { useSentenceBank } from '../bilingual-pack-client/composables/useSentenceBank'
import { createNotebookOpener } from '../bilingual-pack-client/utils/notebookNavigation'
import { listenForNavigation, WINDOW_NAMES } from '../bilingual-pack-client/utils/channelMessaging'
import AnnotationForm from '../bilingual-pack-client/components/AnnotationForm.vue'
import { getSentenceMeaning } from '../bilingual-pack-client/utils/sentenceExplanation'

// Composables
const { vocabulary, addWord, updateWord } = useVocabulary()
const { sentences, addSentence, updateSentence } = useSentenceBank()
const router = useRouter()
const openNotebook = createNotebookOpener({
    withBase: (path) => path,
    getOrigin: () => window.location.origin,
    openWindow: (url, name) => window.open(url, name)
})

const bookLoaded = ref(false)
const isAutoLoading = ref(false)
const isRestoringProgress = ref(false)
const bookTitle = ref('')
const progress = ref(0)
const isDragging = ref(false)
const canGoPrev = ref(false)
const canGoNext = ref(true)
const toc = ref<any[]>([])
const showToc = ref(false)
const activeHref = ref('')
const currentBookUrl = ref('') // Track the current ebook URL for annotations

const fileInput = ref<HTMLInputElement | null>(null)
const viewerContainer = ref<HTMLElement | null>(null)

let currentBook: any = null
let view: any = null
let currentIframeDoc: Document | null = null

const selectionPopover = ref({
    visible: false,
    top: 0,
    left: 0,
    text: '',
    range: null as Range | null
})

const annotationForm = ref({
    visible: false,
    type: 'word' as 'word' | 'sentence',
    selectedText: '',
    contextText: '',
    cfi: '' // Store CFI position for navigation
})

const annotationTooltip = ref({
    visible: false,
    top: 0,
    left: 0,
    content: '',
    type: 'word' as 'word' | 'sentence'
})
let hoverTimer: number | null = null

type AnnotationType = 'vocab' | 'sentence'

interface EbookAnnotation {
    cfi?: string
    type: AnnotationType
    text: string
    timestamp: number
    wordId?: string
    sentenceId?: string
}

const currentLocationCfi = ref('')


function getCfiSectionPrefix(cfi: string): string {
    // Extract section identifier from CFI (part before '!')
    // e.g. 'epubcfi(/6/4!/4/2/1:0)' -> 'epubcfi(/6/4!'
    const idx = cfi.indexOf('!')
    return idx !== -1 ? cfi.substring(0, idx + 1) : cfi
}

function normalizeBookUrl(bookUrl: string): string {
    if (!bookUrl) {
        return ''
    }

    try {
        return decodeURIComponent(bookUrl)
    } catch {
        return bookUrl
    }
}

function buildProgressStorageKey(bookUrl: string): string {
    return `ebook-progress-${normalizeBookUrl(bookUrl)}`
}

function buildAnnotationStorageKey(bookUrl: string): string {
    return `ebook-annotations-${normalizeBookUrl(bookUrl)}`
}

function parseReaderPath(path?: string): URL | null {
    if (!path) {
        return null
    }

    try {
        return new URL(path, 'https://bilingual.local')
    } catch {
        return null
    }
}

function isSameBookPath(path?: string): boolean {
    const current = normalizeBookUrl(currentBookUrl.value)
    if (!current) {
        return false
    }

    const parsedPath = parseReaderPath(path)
    if (!parsedPath) {
        return false
    }

    const targetBook = normalizeBookUrl(parsedPath.searchParams.get('book') || '')
    return targetBook === current
}

function findWordIdByText(text: string): string | undefined {
    const normalizedText = text.trim().toLowerCase()
    if (!normalizedText) {
        return undefined
    }

    const matchedInBook = vocabulary.value.find((item) => item.word === normalizedText && isSameBookPath(item.articlePath))
    if (matchedInBook) {
        return matchedInBook.id
    }

    return vocabulary.value.find((item) => item.word === normalizedText)?.id
}

function findSentenceIdByText(text: string): string | undefined {
    const normalizedText = text.trim().toLowerCase()
    if (!normalizedText) {
        return undefined
    }

    const matchedInBook = sentences.value.find(
        (item) => item.sentence.trim().toLowerCase() === normalizedText && isSameBookPath(item.articlePath)
    )
    if (matchedInBook) {
        return matchedInBook.id
    }

    return sentences.value.find((item) => item.sentence.trim().toLowerCase() === normalizedText)?.id
}

function openNotebookWindow(type: 'word' | 'sentence', id: string) {
    void openNotebook(type, id)
}

function triggerFileInput() {
    fileInput.value?.click()
}

async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) {
        currentBookUrl.value = file.name
        await loadBook(file, file.name)
    }
}

async function handleDrop(event: DragEvent) {
    isDragging.value = false
    const file = event.dataTransfer?.files[0]
    if (file) {
        currentBookUrl.value = file.name
        await loadBook(file, file.name)
    }
}

let foliateModule: any = null

async function loadFoliateJs(): Promise<any> {
    if (foliateModule) return foliateModule
    
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
        
        let attempts = 0
        const maxAttempts = 50
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

function togglePageHeader(show: boolean) {
    const h1 = document.querySelector('.theme-hope-content > h1') || document.querySelector('h1')
    const pageInfo = document.querySelector('.page-info')
    
    if (h1) (h1 as HTMLElement).style.display = show ? '' : 'none'
    if (pageInfo) (pageInfo as HTMLElement).style.display = show ? '' : 'none'
}

async function loadBook(file: File, bookUrl?: string) {
    try {
        const { makeBook } = await loadFoliateJs()

        currentBook = await makeBook(file)
        
        bookTitle.value = currentBook.metadata?.title || file.name.replace(/\.[^/.]+$/, '')
        document.title = bookTitle.value
        
        togglePageHeader(false)
        
        toc.value = currentBook.toc || []

        bookLoaded.value = true

        await nextTick()

        if (!viewerContainer.value) {
            return
        }

        viewerContainer.value.innerHTML = ''

        view = document.createElement('foliate-view') as any
        viewerContainer.value.appendChild(view)

        view.addEventListener('relocate', handleRelocate)
        view.addEventListener('load', handleSectionLoad)

        await view.open(currentBook)
        
        if (bookUrl) {
            const savedProgress = getReadingProgress(bookUrl)
            if (savedProgress && savedProgress.cfi) {
                console.log('Restoring saved reading progress')
                isRestoringProgress.value = true
                setTimeout(() => {
                    view?.goTo(savedProgress.cfi)
                    setTimeout(() => {
                        isRestoringProgress.value = false
                    }, 800)
                }, 500)
            }
        }

    } catch (error) {
        console.error('Failed to load ebook file:', error)
        bookLoaded.value = false
        togglePageHeader(true)
        alert('Failed to load ebook. Please ensure the file format is valid. Error: ' + (error as Error).message)
    }
}
function handleTocClick(href: string) {
    if (view && href) {
        activeHref.value = href
        view.goTo(href)
        if (window.innerWidth < 1024) {
            showToc.value = false
        }
    }
}

function toggleToc() {
    showToc.value = !showToc.value
}

function handleRelocate(event: CustomEvent) {
    const { fraction, section, cfi, location } = event.detail
    progress.value = fraction || 0

    if (currentBook) {
        const totalSections = currentBook.sections?.length || 1
        canGoPrev.value = section > 0 || fraction > 0
        canGoNext.value = section < totalSections - 1 || fraction < 1
    }
    
    const currentCfi = cfi || location?.cfi
    if (currentCfi && currentBookUrl.value) {
        currentLocationCfi.value = currentCfi
        saveReadingProgress(currentBookUrl.value, currentCfi, fraction)
    }
}

function saveReadingProgress(bookUrl: string, cfi: string, progress: number) {
    try {
        const key = buildProgressStorageKey(bookUrl)
        const data = {
            cfi,
            progress,
            timestamp: Date.now()
        }
        localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
        console.error('Failed to save reading progress to localStorage:', error)
    }
}

function getReadingProgress(bookUrl: string): { cfi: string; progress: number } | null {
    try {
        const normalizedKey = buildProgressStorageKey(bookUrl)
        const legacyKey = `ebook-progress-${bookUrl}`
        const data = localStorage.getItem(normalizedKey) || localStorage.getItem(legacyKey)
        if (data) {
            const parsed = JSON.parse(data)
            if (normalizedKey !== legacyKey) {
                localStorage.setItem(normalizedKey, data)
            }
            return parsed
        }
    } catch (error) {
        console.error('Failed to retrieve reading progress from localStorage:', error)
    }
    return null
}

function saveAnnotation(
    bookUrl: string,
    type: AnnotationType,
    text: string,
    options: { cfi?: string; wordId?: string; sentenceId?: string } = {}
) {
    try {
        const key = buildAnnotationStorageKey(bookUrl)
        const legacyKey = `ebook-annotations-${bookUrl}`
        const existingData = localStorage.getItem(key) || localStorage.getItem(legacyKey)
        const annotations: EbookAnnotation[] = existingData ? JSON.parse(existingData) : []
        const normalizedText = text.trim().toLowerCase()
        
        const exists = annotations.some((item) => {
            if (item.type !== type) return false
            if (item.text.trim().toLowerCase() !== normalizedText) return false
            if (options.wordId) return item.wordId === options.wordId
            if (options.sentenceId) return item.sentenceId === options.sentenceId
            return (item.cfi || '') === (options.cfi || '')
        })
        if (!exists) {
            annotations.push({
                cfi: options.cfi,
                type,
                text: text.trim(),
                timestamp: Date.now(),
                wordId: options.wordId,
                sentenceId: options.sentenceId
            })
            localStorage.setItem(key, JSON.stringify(annotations))
            console.log('Annotation saved to localStorage:', { key, annotation: { type, text, ...options } })
        } else {
            console.log('Annotation already exists, skip saving')
        }
    } catch (error) {
        console.error('Failed to save annotation:', error)
    }
}

function getAnnotations(bookUrl: string): EbookAnnotation[] {
    try {
        const normalizedKey = buildAnnotationStorageKey(bookUrl)
        const legacyKey = `ebook-annotations-${bookUrl}`
        const data = localStorage.getItem(normalizedKey) || localStorage.getItem(legacyKey)
        console.log('Loaded annotations from localStorage:', { key: normalizedKey, data })
        if (data) {
            if (normalizedKey !== legacyKey) {
                localStorage.setItem(normalizedKey, data)
            }

            const parsed: unknown = JSON.parse(data)
            if (!Array.isArray(parsed)) {
                return []
            }

            return parsed
                .filter((item: any) => item && (item.type === 'vocab' || item.type === 'sentence') && typeof item.text === 'string')
                .map((item: any) => ({
                    cfi: typeof item.cfi === 'string' ? item.cfi : undefined,
                    type: item.type as AnnotationType,
                    text: item.text,
                    timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
                    wordId: typeof item.wordId === 'string' ? item.wordId : undefined,
                    sentenceId: typeof item.sentenceId === 'string' ? item.sentenceId : undefined
                }))
        }
    } catch (error) {
        console.error('Failed to get annotations:', error)
    }
    return []
}

function applyAnnotations(doc: Document) {
    if (!currentBookUrl.value) {
        console.log('currentBookUrl is not set, skip restoring annotations')
        return
    }

    const annotations = getAnnotations(currentBookUrl.value)
    console.log('Loaded annotations:', annotations)

    if (annotations.length === 0) {
        console.log('No saved annotations')
        return
    }

    // Filter annotations to only show in the section where they were originally annotated
    const currentCfiPrefix = currentLocationCfi.value ? getCfiSectionPrefix(currentLocationCfi.value) : ''
    const sectionAnnotations = currentCfiPrefix
        ? annotations.filter(a => a.cfi && getCfiSectionPrefix(a.cfi) === currentCfiPrefix)
        : annotations // No current CFI yet, skip filtering (legacy fallback)

    // Filter out stale annotations: skip if word/sentence no longer exists in vocabulary/sentence bank
    const validAnnotations = sectionAnnotations.filter(annotation => {
        if (annotation.type === 'vocab') {
            // Verify wordId still exists in vocabulary (may have been deleted)
            const existsById = annotation.wordId && vocabulary.value.some(w => w.id === annotation.wordId)
            const wordId = existsById ? annotation.wordId : findWordIdByText(annotation.text)
            if (!wordId) {
                console.log(`Skipping stale vocab annotation: "${annotation.text}" (not in vocabulary)`)
                return false
            }
            annotation.wordId = wordId
        }
        if (annotation.type === 'sentence') {
            // Verify sentenceId still exists in sentence bank (may have been deleted)
            const existsById = annotation.sentenceId && sentences.value.some(s => s.id === annotation.sentenceId)
            const sentenceId = existsById ? annotation.sentenceId : findSentenceIdByText(annotation.text)
            if (!sentenceId) {
                console.log(`Skipping stale sentence annotation: "${annotation.text}" (not in sentence bank)`)
                return false
            }
            annotation.sentenceId = sentenceId
        }
        return true
    })

    // Clean up orphaned annotations from localStorage
    if (validAnnotations.length < annotations.length && currentBookUrl.value) {
        const key = buildAnnotationStorageKey(currentBookUrl.value)
        const cleanedAnnotations = annotations.filter(a => {
            if (a.type === 'vocab') {
                const existsById = a.wordId && vocabulary.value.some(w => w.id === a.wordId)
                return existsById || !!findWordIdByText(a.text)
            }
            if (a.type === 'sentence') {
                const existsById = a.sentenceId && sentences.value.some(s => s.id === a.sentenceId)
                return existsById || !!findSentenceIdByText(a.text)
            }
            return true
        })
        localStorage.setItem(key, JSON.stringify(cleanedAnnotations))
        console.log(`Cleaned localStorage: removed ${annotations.length - cleanedAnnotations.length} orphaned annotations`)
    }

    console.log('Applying valid annotations for current section:', validAnnotations.length, 'of', sectionAnnotations.length)

    validAnnotations.forEach((annotation, idx) => {
        try {
            console.log(`Applying annotation ${idx + 1}:`, annotation)
            highlightTextInDocument(doc, annotation)
        } catch (error) {
            console.error('Failed to apply annotation:', error)
        }
    })
}
function highlightTextInDocument(doc: Document, annotation: EbookAnnotation) {
    try {
        const searchText = annotation.text
        const type = annotation.type
        if (!searchText) {
            return
        }

        const walker = doc.createTreeWalker(
            doc.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (node.parentElement?.tagName === 'MARK') {
                        return NodeFilter.FILTER_REJECT
                    }
                    const parent = node.parentElement
                    if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
                        return NodeFilter.FILTER_REJECT
                    }
                    return NodeFilter.FILTER_ACCEPT
                }
            }
        )

        let node: Node | null
        let matchedCount = 0

        while ((node = walker.nextNode())) {
            const text = node.textContent || ''
            const index = text.toLowerCase().indexOf(searchText.toLowerCase())
            if (index === -1) {
                continue
            }

            try {
                const range = doc.createRange()
                range.setStart(node, index)
                range.setEnd(node, index + searchText.length)

                const mark = doc.createElement('mark')
                mark.className = type === 'vocab' ? 'highlight-vocab' : 'highlight-sentence'
                mark.textContent = text.substring(index, index + searchText.length)
                if (annotation.wordId) {
                    mark.dataset.wordId = annotation.wordId
                }
                if (annotation.sentenceId) {
                    mark.dataset.sentenceId = annotation.sentenceId
                }
                if (annotation.cfi) {
                    mark.dataset.cfi = annotation.cfi
                }

                range.deleteContents()
                range.insertNode(mark)
                matchedCount = 1
                break
            } catch (e) {
                console.warn('Failed to highlight text range in document:', e)
            }
        }

        if (matchedCount > 0) {
            console.log(`Successfully highlighted ${matchedCount} occurrence(s) of "${searchText}"`)
        }
    } catch (error) {
        console.error('Failed to apply annotation highlighting:', error)
    }
}

// Add blink animation to a highlighted mark element
function blinkHighlight(doc: Document, highlightId: string, type: 'word' | 'sentence') {
    try {
        const selector = type === 'word' ? `[data-word-id="${highlightId}"]` : `[data-sentence-id="${highlightId}"]`
        const element = doc.querySelector(selector) as HTMLElement
        
        if (element) {
            // Scroll into view
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            
            // Add flashing animation
            element.classList.add('flashing')
            
            // Remove animation class after animation completes (3.2 seconds = 3 flashes * 1s + buffer)
            setTimeout(() => {
                element.classList.remove('flashing')
            }, 3200)
            
            console.log(`Blinking highlight for ${type}:`, highlightId)
        } else {
            console.warn(`Element not found for ${type}:`, highlightId)
        }
    } catch (error) {
        console.error('Failed to add blink animation:', error)
    }
}

function handleHighlightHover(event: MouseEvent) {
    const target = event.target as HTMLElement | null
    if (!target) return
    
    const mark = target.closest('mark.highlight-vocab, mark.highlight-sentence') as HTMLElement | null
    if (!mark) return
    
    // Clear previous timer
    if (hoverTimer) {
        clearTimeout(hoverTimer)
        hoverTimer = null
    }
    
    // Handle word hover
    if (mark.classList.contains('highlight-vocab')) {
        const wordId = mark.dataset.wordId
        if (!wordId) return
        
        const word = vocabulary.value.find(w => w.id === wordId)
        if (!word || !word.meaning) return
        
        hoverTimer = window.setTimeout(() => {
            const rect = mark.getBoundingClientRect()
            let offsetTop = 0
            let offsetLeft = 0
            const doc = mark.ownerDocument
            const win = doc?.defaultView
            if (win && win.frameElement) {
                const iframeRect = (win.frameElement as HTMLIFrameElement).getBoundingClientRect()
                offsetTop = iframeRect.top
                offsetLeft = iframeRect.left
            }
            annotationTooltip.value = {
                visible: true,
                top: rect.top + offsetTop - 10,
                left: rect.left + offsetLeft + rect.width / 2,
                content: word.meaning,
                type: 'word'
            }
        }, 200)
        return
    }
    
    // Handle sentence hover
    if (mark.classList.contains('highlight-sentence')) {
        const sentenceId = mark.dataset.sentenceId
        if (!sentenceId) return
        
        const sentence = sentences.value.find(s => s.id === sentenceId)
        if (!sentence) return
        
        hoverTimer = window.setTimeout(() => {
            const rect = mark.getBoundingClientRect()
            let offsetTop = 0
            let offsetLeft = 0
            const doc = mark.ownerDocument
            const win = doc?.defaultView
            if (win && win.frameElement) {
                const iframeRect = (win.frameElement as HTMLIFrameElement).getBoundingClientRect()
                offsetTop = iframeRect.top
                offsetLeft = iframeRect.left
            }
            const contentText = getSentenceMeaning(sentence.explanation)
            annotationTooltip.value = {
                visible: true,
                top: rect.top + offsetTop - 10,
                left: rect.left + offsetLeft + rect.width / 2,
                content: contentText,
                type: 'sentence'
            }
        }, 200)
    }
}

function handleHighlightLeave(event: MouseEvent) {
    if (hoverTimer) {
        clearTimeout(hoverTimer)
        hoverTimer = null
    }
    
    const relatedTarget = event.relatedTarget as HTMLElement | null
    if (relatedTarget?.closest('.ebook-annotation-tooltip')) {
        return
    }
    
    annotationTooltip.value.visible = false
}

function closeAnnotationTooltip() {
    annotationTooltip.value.visible = false
}

function handleAnnotationMarkClick(event: Event) {
    const target = event.target as HTMLElement | null
    console.log('Click event triggered on:', target)
    
    if (!target) {
        console.log('No target element')
        return
    }

    const mark = target.closest('mark.highlight-vocab, mark.highlight-sentence') as HTMLElement | null
    console.log('Found mark element:', mark)
    
    if (!mark) {
        console.log('Not a mark element')
        return
    }

    event.preventDefault()
    event.stopPropagation()

    if (mark.classList.contains('highlight-vocab')) {
        const wordId = mark.dataset.wordId
        console.log('Word mark clicked, wordId:', wordId)
        if (wordId) {
            console.log('Opening vocabulary notebook for word:', wordId)
            openNotebookWindow('word', wordId)
        } else {
            console.warn('Word mark has no wordId attribute')
        }
        return
    }

    if (mark.classList.contains('highlight-sentence')) {
        const sentenceId = mark.dataset.sentenceId
        console.log('Sentence mark clicked, sentenceId:', sentenceId)
        if (sentenceId) {
            console.log('Opening sentence notebook for sentence:', sentenceId)
            openNotebookWindow('sentence', sentenceId)
        } else {
            console.warn('Sentence mark has no sentenceId attribute')
        }
    }
}

function handleSectionLoad(event: CustomEvent) {
    const { doc } = event.detail
    console.log('Section loaded, doc:', doc)
    
    if (doc) {
        currentIframeDoc = doc
        console.log('Adding event listeners to document')
        doc.addEventListener('mouseup', handleTextSelection)
        doc.addEventListener('touchend', handleTextSelection)
        doc.addEventListener('click', handleAnnotationMarkClick, true) // Use capture phase

        doc.addEventListener('mouseenter', handleHighlightHover, true)
        doc.addEventListener('mouseleave', handleHighlightLeave, true)
        
        const style = doc.createElement('style')
        style.textContent = `
            .highlight-vocab { 
                background-color: transparent; 
                border-bottom: 2px solid #3eaf7c;
                color: inherit;
                cursor: pointer;
                padding: 0;
                display: inline;
                line-height: inherit;
                box-decoration-break: clone;
                -webkit-box-decoration-break: clone;
                transition: background-color 0.3s ease, border-bottom-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
            }
            .highlight-sentence { 
                background-color: rgba(74, 144, 226, 0.15); 
                border-bottom: none;
                color: inherit;
                cursor: pointer;
                padding: 0;
                display: inline;
                line-height: inherit;
                box-decoration-break: clone;
                -webkit-box-decoration-break: clone;
                transition: background-color 0.3s ease, border-bottom-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
            }

            .highlight-vocab:hover {
                background-color: rgba(62, 175, 124, 0.12);
                border-bottom-color: #2d9e6a;
            }
            .highlight-sentence:hover {
                background-color: rgba(74, 144, 226, 0.25);
            }
            .highlight-vocab.flashing {
                animation: flash-word 1s ease-in-out 3;
            }
            @keyframes flash-word {
                0%, 100% {
                    background-color: transparent;
                    box-shadow: 0 0 0 0 transparent;
                }
                50% {
                    background-color: rgba(62, 175, 124, 0.4);
                    box-shadow: 0 0 20px 8px rgba(100, 200, 150, 0.5), 0 0 40px 16px rgba(62, 175, 124, 0.25);
                }
            }
            .highlight-sentence.flashing {
                animation: flash-sentence 1s ease-in-out 3;
                background-color: transparent !important;
                background-image: none !important;
                box-shadow: 0 0 0 0 transparent;
            }
            @keyframes flash-sentence {
                0%, 100% {
                    background-color: transparent;
                    box-shadow: 0 0 0 0 transparent;
                }
                50% {
                    background-color: rgba(74, 144, 226, 0.32);
                    box-shadow: 0 0 12px 6px rgba(100, 160, 240, 0.4), 0 0 24px 12px rgba(74, 144, 226, 0.18), inset 0 0 10px 2px rgba(74, 144, 226, 0.45);
                }
            }
        `
        doc.head.appendChild(style)
        
        setTimeout(() => {
            console.log('Applying annotations...')
            applyAnnotations(doc)
            
            // Check if we need to blink a specific word (from URL parameter)
            if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search)
                const highlightId = params.get('highlight')
                const type = params.get('type') as 'word' | 'sentence' | null
                
                if (highlightId && type) {
                    console.log('Found highlight parameters:', { highlightId, type })
                    // Clear URL parameters
                    const url = new URL(window.location.href)
                    url.searchParams.delete('highlight')
                    url.searchParams.delete('type')
                    window.history.replaceState({}, '', url.toString())
                    
                    setTimeout(() => {
                        console.log('Triggering blink for:', highlightId, type)
                        blinkHighlight(doc, highlightId, type)
                    }, 500)
                }
            }
        }, 100)
    }
}

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

    let offsetTop = 0
    let offsetLeft = 0
    
    const win = doc.defaultView
    if (win && win.frameElement) {
        const iframeRect = (win.frameElement as HTMLIFrameElement).getBoundingClientRect()
        offsetTop = iframeRect.top
        offsetLeft = iframeRect.left
    }

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

function highlightSelection(type: 'vocab' | 'sentence'): HTMLElement | null {
    const range = selectionPopover.value.range
    if (!range) return null
    try {
        const doc = range.commonAncestorContainer.ownerDocument
        if (!doc) return null
        // Trim whitespace from range
        const text = range.toString()
        const trimmedText = text.trim()
        if (!trimmedText) return null
        
        // Calculate how many characters to trim from start and end
        const startTrim = text.length - text.trimStart().length
        const endTrim = text.length - text.trimEnd().length
        
        // Adjust range to exclude leading/trailing whitespace
        if (startTrim > 0) {
            range.setStart(range.startContainer, range.startOffset + startTrim)
        }
        if (endTrim > 0) {
            range.setEnd(range.endContainer, range.endOffset - endTrim)
        }
        const mark = doc.createElement('mark')
        mark.className = type === 'vocab' ? 'highlight-vocab' : 'highlight-sentence'
        try {
            range.surroundContents(mark)
        } catch (e) {
            console.warn('Cannot surround range directly, trying fallback', e)
            if (doc.designMode !== 'on') {
                doc.designMode = 'on'
            }
            doc.execCommand('styleWithCSS', false, 'true')
            doc.execCommand('backColor', false, type === 'vocab' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(33, 150, 243, 0.3)')
            doc.designMode = 'off'
            const sel = doc.getSelection()
            sel?.removeAllRanges()
            return null
        }
        const sel = doc.getSelection()
        sel?.removeAllRanges()
        return mark
    } catch (e) {
        console.error('Highlight error:', e)
        return null
    }
}
function addToVocabulary() {
    const text = selectionPopover.value.text
    if (text) {
        // Get CFI from current view position for navigation
        let cfi = ''
        try {
            if (view?.renderer?.getCFI) {
                cfi = view.renderer.getCFI()
            } else if (view?.getCFI) {
                cfi = view.getCFI()
            } else if (view?.location?.cfi) {
                cfi = view.location.cfi
            }
        } catch (e) {
            console.warn('Failed to get CFI position from view:', e)
        }
        
        if (!cfi) {
            cfi = currentLocationCfi.value
        }
        console.log('Adding word to vocabulary')
        annotationForm.value = {
            visible: true,
            type: 'word',
            selectedText: text,
            contextText: text,
            cfi
        }
    }
    selectionPopover.value.visible = false
}

function addToSentenceBank() {
    const text = selectionPopover.value.text
    if (text) {
        // Get CFI from current view position for navigation
        let cfi = ''
        try {
            if (view?.renderer?.getCFI) {
                cfi = view.renderer.getCFI()
            } else if (view?.getCFI) {
                cfi = view.getCFI()
            } else if (view?.location?.cfi) {
                cfi = view.location.cfi
            }
        } catch (e) {
            console.warn('Failed to get CFI position from view:', e)
        }
        
        if (!cfi) {
            cfi = currentLocationCfi.value
        }
        console.log('Adding sentence to sentence bank')
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

function handleAnnotationSave(meaning: string) {
    const { type, selectedText, contextText, cfi } = annotationForm.value
    console.log('Saving annotation payload')
    // Build articlePath with book URL and CFI for ebook navigation
    // Format: /reader.html?book=<encoded_book_url>&cfi=<encoded_cfi>&highlight=<id>&type=<word|sentence>
    let articlePath = '/reader'
    if (type === 'word') {
        // First save with temporary path to get the ID
        const savedWord = addWord(selectedText, meaning, contextText, articlePath)
        const wordId = savedWord.id
        const vocabMark = highlightSelection('vocab')
        if (vocabMark) { vocabMark.dataset.wordId = wordId }
        // Build full articlePath with book URL and highlight params, then update
        if (currentBookUrl.value) {
            const params = new URLSearchParams()
            params.set('book', currentBookUrl.value)
            if (cfi) {
                params.set('cfi', cfi)
            }
            params.set('highlight', wordId)
            params.set('type', 'word')
            articlePath = `/reader.html?${params.toString()}`
            updateWord(wordId, { articlePath })
            saveAnnotation(currentBookUrl.value, 'vocab', selectedText, { cfi, wordId })
        }
    } else {
        // First save with temporary path to get the ID
        const savedSentence = addSentence(selectedText, meaning, articlePath)
        const sentenceId = savedSentence.id
        const sentenceMark = highlightSelection('sentence')
        if (sentenceMark) { sentenceMark.dataset.sentenceId = sentenceId }
        // Build full articlePath with book URL and highlight params, then update
        if (currentBookUrl.value) {
            const params = new URLSearchParams()
            params.set('book', currentBookUrl.value)
            if (cfi) {
                params.set('cfi', cfi)
            }
            params.set('highlight', sentenceId)
            params.set('type', 'sentence')
            articlePath = `/reader.html?${params.toString()}`
            
            // Update the sentence's articlePath with the full ebook navigation URL
            updateSentence(sentenceId, { articlePath })
            saveAnnotation(currentBookUrl.value, 'sentence', selectedText, { cfi, sentenceId })
        }
    }
    annotationForm.value.visible = false
}

function handleAnnotationCancel() {
    annotationForm.value.visible = false
}

function goPrev() {
    view?.prev()
}

function goNext() {
    view?.next()
}

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
    activeHref.value = ''
    
    togglePageHeader(true)
    document.title = 'Ebook Reader'
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



function handleClickOutside(event: MouseEvent) {
    if (selectionPopover.value.visible) {
        const target = event.target as HTMLElement
        if (!target.closest('.selection-popover')) {
            selectionPopover.value.visible = false
        }
    }
}

async function loadBookFromUrl(url: string, navigateToCfi?: string) {
    try {
        let blob: Blob
        const normalizedUrl = normalizeBookUrl(url)
        let fileName = normalizedUrl.split('/').pop() || 'ebook'

        try {
            const cache = await caches.open('ebook-preload')
            const cached = await cache.match(normalizedUrl)
            if (cached) {
                blob = await cached.blob()
                await cache.delete(normalizedUrl)
            } else {
                throw new Error('no cache')
            }
        } catch {
            const response = await fetch(normalizedUrl)
            if (!response.ok) throw new Error('Failed to fetch ebook')
            blob = await response.blob()
        }

        currentBookUrl.value = normalizedUrl
        const file = new File([blob], fileName, { type: blob.type })
        
        await loadBook(file, normalizedUrl)
        
        if (navigateToCfi && view) {
            console.log('Navigating to requested CFI')
            isRestoringProgress.value = true
            setTimeout(() => {
                view?.goTo(navigateToCfi)
                setTimeout(() => {
                    isRestoringProgress.value = false
                }, 800)
            }, 500)
        }
    } catch (error) {
        console.error('Failed to load ebook from URL')
        alert('Failed to load ebook from URL. Please check the file path.')
    }
}

function handleChannelNavigate(path: string, highlightId?: string, highlightType?: 'word' | 'sentence') {
    if (typeof window === 'undefined') {
        return
    }

    const targetUrl = new URL(path, window.location.origin)
    const targetPath = targetUrl.pathname.replace(/\.html$/, '')

    if (targetPath !== '/reader') {
        if (highlightId) targetUrl.searchParams.set('highlight', highlightId)
        if (highlightType) targetUrl.searchParams.set('type', highlightType)
        void router.push(targetUrl.pathname + targetUrl.search)
        return
    }

    const targetBook = targetUrl.searchParams.get('book')
    const targetCfi = targetUrl.searchParams.get('cfi') || undefined

    if (!targetBook) {
        if (highlightId) targetUrl.searchParams.set('highlight', highlightId)
        if (highlightType) targetUrl.searchParams.set('type', highlightType)
        void router.push(targetUrl.pathname + targetUrl.search)
        return
    }

    const normalizedTargetBook = normalizeBookUrl(targetBook)
    const normalizedCurrentBook = normalizeBookUrl(currentBookUrl.value)
    const sameBook = !!normalizedCurrentBook && normalizedCurrentBook === normalizedTargetBook && bookLoaded.value

    if (sameBook) {
        if (targetCfi && view) {
            isRestoringProgress.value = true
            setTimeout(() => {
                view?.goTo(targetCfi)
                setTimeout(() => {
                    isRestoringProgress.value = false
                    if (highlightId && highlightType) {
                        if (currentIframeDoc) blinkHighlight(currentIframeDoc, highlightId, highlightType)
                    }
                }, 800)
            }, 150)
        } else if (highlightId && highlightType) {
            // Already on the same page and no CFI, just blink it
            if (currentIframeDoc) blinkHighlight(currentIframeDoc, highlightId, highlightType)
        }
        return
    }

    isAutoLoading.value = true
    
    // When loading a new book from URL, append highlight params so they are caught by handleSectionLoad
    if (highlightId) targetUrl.searchParams.set('highlight', highlightId)
    if (highlightType) targetUrl.searchParams.set('type', highlightType)
    window.history.replaceState({}, '', targetUrl.toString())
    
    void loadBookFromUrl(normalizedTargetBook, targetCfi).finally(() => {
        isAutoLoading.value = false
    })
}

let cleanupNavigationListener: (() => void) | null = null

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
    
    if (typeof window !== 'undefined') {
        window.name = WINDOW_NAMES.ARTICLE
        cleanupNavigationListener = listenForNavigation('article', handleChannelNavigate)
        const params = new URLSearchParams(window.location.search)
        const bookUrl = params.get('book')
        const cfi = params.get('cfi')
        
        if (bookUrl) {
            isAutoLoading.value = true
            loadBookFromUrl(bookUrl, cfi || undefined)
                .finally(() => {
                    isAutoLoading.value = false
                })
        }
    }
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    cleanupNavigationListener?.()
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
    
    &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
    
    &.prev { 
        left: calc((100% - 800px) / 2 - 60px);
        
        @media (max-width: 900px) {
            left: 1rem;
        }
    }
    
    &.next { 
        right: calc((100% - 800px) / 2 - 60px);
        
        @media (max-width: 900px) {
            right: 1rem;
        }
    }
    
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

/* TOC Toggle Button - Left Edge */
.toc-toggle-btn {
    position: fixed;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    width: 52px;
    height: 72px;
    border-radius: 0 16px 16px 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 
        2px 0 24px rgba(102, 126, 234, 0.35),
        0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 999;
    gap: 4px;
    font-family: "Segoe UI", "Microsoft YaHei", "微软雅黑", sans-serif;
    animation: pulseGlow 3s ease-in-out infinite;
}

@keyframes pulseGlow {
    0%, 100% {
        box-shadow: 
            2px 0 24px rgba(102, 126, 234, 0.35),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    }
    50% {
        box-shadow: 
            2px 0 32px rgba(102, 126, 234, 0.5),
            0 0 20px rgba(118, 75, 162, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.15) inset;
    }
}

.toc-toggle-btn:hover {
    width: 60px;
    background: linear-gradient(135deg, #7c8ef5 0%, #8b5bb8 100%);
    box-shadow: 
        2px 0 36px rgba(102, 126, 234, 0.6),
        0 0 24px rgba(118, 75, 162, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.2) inset;
    animation: none;
}

.toc-toggle-btn.active {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    left: 320px;
    animation: none;
}

.toc-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 
        0 2px 8px rgba(239, 68, 68, 0.5),
        0 0 0 2px rgba(255, 255, 255, 0.2);
}

/* Sidebar */
.toc-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 320px;
    height: 100vh;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    box-shadow: 
        2px 0 48px rgba(102, 126, 234, 0.12),
        0 0 0 1px rgba(102, 126, 234, 0.08);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    font-family: "Segoe UI", "Microsoft YaHei", "微软雅黑", sans-serif;
}

@media (prefers-color-scheme: dark) {
    .toc-sidebar {
        background: rgba(30, 30, 45, 0.9);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        box-shadow: 
            2px 0 48px rgba(102, 126, 234, 0.2),
            0 0 0 1px rgba(167, 139, 250, 0.15);
    }
}

.toc-header {
    padding: 1.75rem 1.5rem 1.5rem;
    border-bottom: 1px solid rgba(102, 126, 234, 0.12);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.6), rgba(255, 255, 255, 0.3));
    position: relative;
}

.toc-header::before {
    content: "";
    position: absolute;
    left: 1.5rem;
    bottom: -1px;
    width: 48px;
    height: 3px;
    background: linear-gradient(90deg, #667eea, #764ba2);
    border-radius: 3px 3px 0 0;
}

@media (prefers-color-scheme: dark) {
    .toc-header {
        background: linear-gradient(180deg, rgba(42, 45, 58, 0.6), rgba(30, 30, 45, 0.3));
        border-bottom-color: rgba(167, 139, 250, 0.2);
    }
    
    .toc-header::before {
        background: linear-gradient(90deg, #a78bfa, #818cf8);
    }
}

.toc-title-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.toc-header h3 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
}

@media (prefers-color-scheme: dark) {
    .toc-header h3 {
        background: linear-gradient(135deg, #a78bfa, #818cf8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
}

.toc-count {
    font-size: 0.75rem;
    font-weight: 600;
    color: #667eea;
    background: rgba(102, 126, 234, 0.1);
    padding: 0.3rem 0.6rem;
    border-radius: 8px;
    border: 1px solid rgba(102, 126, 234, 0.2);
}

@media (prefers-color-scheme: dark) {
    .toc-count {
        background: rgba(167, 139, 250, 0.15);
        color: #a78bfa;
        border-color: rgba(167, 139, 250, 0.25);
    }
}

.close-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(102, 126, 234, 0.08);
    border: 1px solid rgba(102, 126, 234, 0.15);
    color: #667eea;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.close-btn:hover {
    background: rgba(102, 126, 234, 0.15);
    color: #764ba2;
    border-color: rgba(102, 126, 234, 0.3);
    transform: rotate(90deg);
}

@media (prefers-color-scheme: dark) {
    .close-btn:hover {
        background: rgba(167, 139, 250, 0.2);
        color: #a78bfa;
        border-color: rgba(167, 139, 250, 0.35);
    }
}

.toc-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 0;
}

/* Custom scrollbar */
.toc-content::-webkit-scrollbar {
    width: 6px;
}

.toc-content::-webkit-scrollbar-track {
    background: transparent;
    margin: 8px 0;
}

.toc-content::-webkit-scrollbar-thumb {
    background: rgba(102, 126, 234, 0.2);
    border-radius: 3px;
    transition: background 0.2s ease;
}

.toc-content::-webkit-scrollbar-thumb:hover {
    background: rgba(102, 126, 234, 0.35);
}

@media (prefers-color-scheme: dark) {
    .toc-content::-webkit-scrollbar-thumb {
        background: rgba(167, 139, 250, 0.25);
    }
    
    .toc-content::-webkit-scrollbar-thumb:hover {
        background: rgba(167, 139, 250, 0.4);
    }
}

.toc-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.toc-item {
    list-style: none;
    margin: 0;
    padding: 0;
    animation: slideInItem 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

.toc-item:nth-child(1) { animation-delay: 0.03s; }
.toc-item:nth-child(2) { animation-delay: 0.06s; }
.toc-item:nth-child(3) { animation-delay: 0.09s; }
.toc-item:nth-child(4) { animation-delay: 0.12s; }
.toc-item:nth-child(5) { animation-delay: 0.15s; }
.toc-item:nth-child(6) { animation-delay: 0.18s; }
.toc-item:nth-child(7) { animation-delay: 0.21s; }
.toc-item:nth-child(8) { animation-delay: 0.24s; }
.toc-item:nth-child(9) { animation-delay: 0.27s; }
.toc-item:nth-child(10) { animation-delay: 0.30s; }

@keyframes slideInItem {
    0% {
        opacity: 0;
        transform: translateX(-20px);
    }
    100% {
        opacity: 1;
        transform: translateX(0);
    }
}

.toc-item a {
    display: block;
    padding: 14px 24px;
    color: #475569;
    text-decoration: none;
    font-size: 0.95rem;
    line-height: 1.5;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    border-left: 3px solid transparent;
    position: relative;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
}

.toc-item a::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #667eea, #764ba2);
    transform: scaleY(0);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toc-item a::after {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(90deg, rgba(102, 126, 234, 0.08), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.toc-item a:hover {
    color: #667eea;
    transform: translateX(6px);
    padding-left: 28px;
}

.toc-item a:hover::after {
    opacity: 1;
}

.toc-item a:hover::before {
    transform: scaleY(1);
}

.toc-item.active > a {
    background: linear-gradient(90deg, rgba(102, 126, 234, 0.12), rgba(118, 75, 162, 0.06));
    color: #667eea;
    border-left-color: transparent;
    font-weight: 700;
    padding-left: 28px;
}

.toc-item.active > a::before {
    transform: scaleY(1);
    width: 5px;
}

.toc-item.active > a::after {
    opacity: 0;
}

@media (prefers-color-scheme: dark) {
    .toc-item a {
        color: #cbd5e1;
    }
    
    .toc-item a::after {
        background: linear-gradient(90deg, rgba(167, 139, 250, 0.12), transparent);
    }
    
    .toc-item a:hover {
        color: #a78bfa;
    }
    
    .toc-item.active > a {
        background: linear-gradient(90deg, rgba(167, 139, 250, 0.18), rgba(129, 140, 248, 0.08));
        color: #a78bfa;
    }
    
    .toc-item.active > a::before {
        background: linear-gradient(180deg, #a78bfa, #818cf8);
    }
}

.toc-subitems {
    padding-left: 0;
    list-style: none;
    margin: 0;
}

.toc-subitem {
    list-style: none;
    margin: 0;
    padding: 0;
    animation: slideInItem 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

.toc-subitem:nth-child(1) { animation-delay: 0.06s; }
.toc-subitem:nth-child(2) { animation-delay: 0.09s; }
.toc-subitem:nth-child(3) { animation-delay: 0.12s; }
.toc-subitem:nth-child(4) { animation-delay: 0.15s; }
.toc-subitem:nth-child(5) { animation-delay: 0.18s; }

.toc-subitem a {
    padding-left: 48px;
    font-size: 0.88rem;
    color: #64748b;
    font-weight: 400;
}

.toc-subitem a:hover {
    padding-left: 52px;
}

.toc-subitem.active > a {
    padding-left: 52px;
}

@media (prefers-color-scheme: dark) {
    .toc-subitem a {
        color: #94a3b8;
    }
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
    opacity: 0.6;
}

@media (prefers-color-scheme: dark) {
    .empty-toc svg {
        color: #475569;
    }
}

.empty-toc p {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #64748b;
}

@media (prefers-color-scheme: dark) {
    .empty-toc p {
        color: #94a3b8;
    }
}

.empty-toc span {
    font-size: 0.85rem;
    color: #94a3b8;
}

@media (prefers-color-scheme: dark) {
    .empty-toc span {
        color: #64748b;
    }
}

.toc-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 999;
}

/* Transitions */
.slide-enter-active, .slide-leave-active {
    transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.slide-enter-from, .slide-leave-to {
    transform: translateX(-100%);
}

.fade-enter-active, .fade-leave-active {
    transition: opacity 0.4s ease;
}
.fade-enter-from, .fade-leave-to {
    opacity: 0;
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
    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
    }
}

/* Mobile Responsive */
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

/* Override AnnotationForm z-index to appear above ebook reader */
:deep(.annotation-form-overlay) {
    z-index: 15000 !important;
}

.progress-toast {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10000;
    pointer-events: none;
}

.toast-content {
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    color: #ffffff;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.95rem;
    font-weight: 500;
    
    @media (prefers-color-scheme: dark) {
        background: rgba(30, 30, 40, 0.95);
    }
}

.toast-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: toast-spin 0.8s linear infinite;
}

@keyframes toast-spin {
    to { transform: rotate(360deg); }
}

.ebook-annotation-tooltip {
    filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.12));
    animation: tooltipIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: auto;
}
.ebook-annotation-tooltip.is-sentence .tooltip-content {
    background: rgba(102, 126, 234, 0.85);
}
@keyframes tooltipIn {
    from { opacity: 0; transform: translate(-50%, -100%) translateY(6px); }
    to { opacity: 1; transform: translate(-50%, -100%) translateY(0); }
}
.ebook-annotation-tooltip .tooltip-arrow {
    position: absolute;
    bottom: -5px;
    left: 50%;
    width: 10px;
    height: 10px;
    background: inherit;
    transform: translateX(-50%) rotate(45deg);
    border-radius: 0 0 2px 0;
}
.ebook-annotation-tooltip .tooltip-content {
    position: relative;
    background: rgba(62, 175, 124, 0.88);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 10px;
    padding: 12px 16px;
    max-width: 320px;
    font-size: 14px;
    line-height: 1.6;
    color: #ffffff;
    font-weight: 500;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    white-space: normal;
    word-wrap: break-word;
}
html.dark .ebook-annotation-tooltip .tooltip-content {
    background: rgba(44, 140, 99, 0.9);
}
html.dark .ebook-annotation-tooltip.is-sentence .tooltip-content {
    background: rgba(90, 103, 216, 0.9);
}
</style>
