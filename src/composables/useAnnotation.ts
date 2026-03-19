import { ref, watch, nextTick, type Ref } from 'vue'
import {
    getVocabulary,
    addVocabulary,
    getSentences,
    addSentence,
    type VocabularyItem,
    type SentenceItem,
} from '../services/api'
import { preCacheText } from '../services/ttsCache'
import { useAppStore } from '../stores/appStore'

/**
 * 文章标注系统
 * 管理生词/长难句数据，提供 DOM 高亮渲染和悬浮提示能力
 */
export function useAnnotation(
    containerRef: Ref<HTMLElement | null>,
    articleId: Ref<string | null>
) {
    const vocabulary = ref<VocabularyItem[]>([])
    const sentences = ref<SentenceItem[]>([])
    const annotationEnabled = ref(true)
    const loading = ref(false)

    // ── 数据加载（从后端获取）──────────────────────────────

    async function loadData() {
        loading.value = true
        try {
            const [words, sents] = await Promise.all([
                getVocabulary(),
                getSentences(),
            ])
            vocabulary.value = words
            sentences.value = sents
        } catch (e) {
            console.error('加载标注数据失败:', e)
        } finally {
            loading.value = false
        }
    }

    // ── 添加操作（写入后端）──────────────────────────────

    async function saveWord(word: string, meaning: string, context: string) {
        const currentId = articleId.value ?? undefined
        const item = await addVocabulary({
            word,
            meaning,
            context: context || undefined,
            article_path: currentId,
        })
        vocabulary.value.unshift(item)
        // 同步到全局 appStore，让生词本页面能看到
        useAppStore().addVocabularyItem(item)
        await nextTick()
        await nextTick()
        // 使用 setTimeout 确保 DOM 完全更新
        setTimeout(() => {
            highlightAnnotatedContent()
        }, 100)
        // 后台预缓存 TTS 音频（单词用 -10% 语速）
        preCacheText(word, '-10%')
        return item
    }

    async function saveSentence(sentence: string, explanation: string) {
        const currentId = articleId.value ?? undefined
        const item = await addSentence({
            sentence,
            explanation,
            article_path: currentId,
        })
        sentences.value.unshift(item)
        // 同步到全局 appStore，让句库页面能看到
        useAppStore().addSentenceItem(item)
        await nextTick()
        await nextTick()
        // 使用 setTimeout 确保 DOM 完全更新
        setTimeout(() => {
            highlightAnnotatedContent()
        }, 100)
        // 后台预缓存 TTS 音频（句子用默认语速）
        preCacheText(sentence, '+0%')
        return item
    }

    // ── DOM 高亮渲染 ──────────────────────────────────────

    function escapeRegex(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    /**
     * 清除容器内的现有标注，恢复原始文本
     */
    function clearExistingAnnotations() {
        if (!containerRef.value) return

        const annotationClasses = [
            'annotated-word',
            'annotated-word-subtle',
            'annotated-sentence',
            'annotated-sentence-subtle',
        ]

        for (const className of annotationClasses) {
            const elements = containerRef.value.querySelectorAll(`.${className}`)
            elements.forEach((el) => {
                const parent = el.parentNode
                if (parent) {
                    const textNode = document.createTextNode(el.textContent || '')
                    parent.replaceChild(textNode, el)
                    parent.normalize()
                }
            })
        }
    }

    /**
     * 高亮已标注的内容（单词和句子）
     *
     * ⚠️ 关键功能 - 请勿随意修改！
     *
     * 核心要点：
     * 1. 必须先标注句子，再标注单词（顺序不能颠倒）
     * 2. 使用 TreeWalker 遍历文本节点进行替换
     * 3. 需要在 DOM 完全渲染后调用（配合 nextTick 和 setTimeout）
     */
    function highlightAnnotatedContent() {
        if (!containerRef.value || !annotationEnabled.value) return

        clearExistingAnnotations()

        const currentId = articleId.value
        if (!currentId) return

        const relevantWords = vocabulary.value.filter(
            (w) => w.article_path != null && w.article_path === currentId
        )
        const relevantSentences = sentences.value.filter(
            (s) => s.article_path != null && s.article_path === currentId
        )

        if (relevantWords.length === 0 && relevantSentences.length === 0) return

        const firstOccurrenceWords = new Set<string>()
        const firstOccurrenceSentences = new Set<string>()

        // ========== 第一遍：标注句子 ==========
        // ⚠️ 必须先标注句子，否则会破坏句子的完整性
        if (relevantSentences.length > 0) {
            const sentenceWalker = document.createTreeWalker(
                containerRef.value,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        if (
                            node.parentNode?.nodeName === 'SCRIPT' ||
                            node.parentNode?.nodeName === 'STYLE'
                        ) {
                            return NodeFilter.FILTER_REJECT
                        }
                        const parent = node.parentElement
                        if (
                            parent?.classList.contains('annotated-sentence') ||
                            parent?.classList.contains('annotated-sentence-subtle')
                        ) {
                            return NodeFilter.FILTER_REJECT
                        }
                        if (node.textContent?.trim() === '') {
                            return NodeFilter.FILTER_REJECT
                        }
                        return NodeFilter.FILTER_ACCEPT
                    },
                }
            )

            const sentenceReplacements: {
                node: Text
                newHtml: string
                parent: Node
            }[] = []

            let node: Node | null
            while ((node = sentenceWalker.nextNode())) {
                const textNode = node as Text
                const textContent = textNode.textContent || ''
                let newHtml = textContent
                let modified = false

                for (const sentence of relevantSentences) {
                    const isFirstOccurrence = !firstOccurrenceSentences.has(sentence.id)
                    const className = isFirstOccurrence
                        ? 'annotated-sentence'
                        : 'annotated-sentence-subtle'

                    const escapedSentence = escapeRegex(sentence.sentence)
                    const regex = new RegExp(`(${escapedSentence})`, 'i')
                    if (regex.test(newHtml)) {
                        newHtml = newHtml.replace(
                            regex,
                            `<mark class="${className}" data-sentence-id="${sentence.id}">$1</mark>`
                        )
                        modified = true
                        if (isFirstOccurrence) {
                            firstOccurrenceSentences.add(sentence.id)
                        }
                    }
                }

                if (modified && textNode.parentNode) {
                    sentenceReplacements.push({
                        node: textNode,
                        newHtml,
                        parent: textNode.parentNode,
                    })
                }
            }

            for (const { node, newHtml, parent } of sentenceReplacements) {
                if (parent.contains(node)) {
                    const range = document.createRange()
                    range.setStartBefore(node)
                    range.setEndAfter(node)
                    range.deleteContents()
                    const fragment = range.createContextualFragment(newHtml)
                    range.insertNode(fragment)
                }
            }
        }

        // ========== 第二遍：标注单词（包括句子内的单词）==========
        if (relevantWords.length > 0) {
            const wordWalker = document.createTreeWalker(
                containerRef.value,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        if (
                            node.parentNode?.nodeName === 'SCRIPT' ||
                            node.parentNode?.nodeName === 'STYLE'
                        ) {
                            return NodeFilter.FILTER_REJECT
                        }
                        const parent = node.parentElement
                        if (
                            parent?.classList.contains('annotated-word') ||
                            parent?.classList.contains('annotated-word-subtle')
                        ) {
                            return NodeFilter.FILTER_REJECT
                        }
                        if (node.textContent?.trim() === '') {
                            return NodeFilter.FILTER_REJECT
                        }
                        return NodeFilter.FILTER_ACCEPT
                    },
                }
            )

            const wordReplacements: {
                node: Text
                newHtml: string
                parent: Node
            }[] = []

            let node: Node | null
            while ((node = wordWalker.nextNode())) {
                const textNode = node as Text
                const textContent = textNode.textContent || ''
                let newHtml = textContent
                let modified = false

                for (const word of relevantWords) {
                    const regex = new RegExp(`\\b(${escapeRegex(word.word)})\\b`, 'gi')
                    if (regex.test(newHtml)) {
                        const isFirstOccurrence = !firstOccurrenceWords.has(word.id)
                        if (isFirstOccurrence) {
                            newHtml = newHtml.replace(
                                regex,
                                `<mark class="annotated-word" data-word-id="${word.id}">$1</mark>`
                            )
                            firstOccurrenceWords.add(word.id)
                        } else {
                            newHtml = newHtml.replace(
                                regex,
                                `<mark class="annotated-word-subtle" data-word-id="${word.id}">$1</mark>`
                            )
                        }
                        modified = true
                    }
                }

                if (modified && textNode.parentNode) {
                    wordReplacements.push({
                        node: textNode,
                        newHtml,
                        parent: textNode.parentNode,
                    })
                }
            }

            for (const { node, newHtml, parent } of wordReplacements) {
                if (parent.contains(node)) {
                    const range = document.createRange()
                    range.setStartBefore(node)
                    range.setEndAfter(node)
                    range.deleteContents()
                    const fragment = range.createContextualFragment(newHtml)
                    range.insertNode(fragment)
                }
            }
        }
    }

    // ── 悬浮事件处理 ──────────────────────────────────────

    /**
     * 根据标注元素的 data-*-id 查找对应数据
     */
    function findWordById(id: string): VocabularyItem | undefined {
        return vocabulary.value.find((w) => w.id === id)
    }

    function findSentenceById(id: string): SentenceItem | undefined {
        return sentences.value.find((s) => s.id === id)
    }

    // ── 监听数据变化自动刷新高亮 ──────────────────────────

    watch(
        [vocabulary, sentences, annotationEnabled, articleId],
        () => {
            nextTick(() => {
                highlightAnnotatedContent()
            })
        },
        { deep: true }
    )

    return {
        vocabulary,
        sentences,
        annotationEnabled,
        loading,
        loadData,
        saveWord,
        saveSentence,
        highlightAnnotatedContent,
        clearExistingAnnotations,
        findWordById,
        findSentenceById,
    }
}
