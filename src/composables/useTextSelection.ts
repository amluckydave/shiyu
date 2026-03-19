import { ref, onMounted, onUnmounted, type Ref } from 'vue'

// 选择状态
export interface SelectionState {
    text: string
    type: 'word' | 'sentence' | null
    range: Range | null
    rect: DOMRect | null
}

// 弹出框位置
export interface PopoverPosition {
    top: number
    left: number
    visible: boolean
}

/**
 * 文本选择 composable
 * 监听用户在容器内的文本选择行为，自动判断选词/选句
 */
export function useTextSelection(containerRef: Ref<HTMLElement | null>) {
    const selection = ref<SelectionState>({
        text: '',
        type: null,
        range: null,
        rect: null
    })

    const popoverPosition = ref<PopoverPosition>({
        top: 0,
        left: 0,
        visible: false
    })

    let isInternalClear = false

    function normalizeWhitespace(text: string): string {
        return text.replace(/\s+/g, ' ').trim()
    }

    function isSentenceBoundaryChar(char: string): boolean {
        return /[.!?。！？]/.test(char) || char === '\n'
    }

    function getSentenceRange(
        paragraphText: string,
        selectionStart: number,
        selectionEnd: number
    ): { start: number; end: number } {
        let start = 0
        for (let i = Math.max(0, selectionStart - 1); i >= 0; i--) {
            if (isSentenceBoundaryChar(paragraphText[i])) {
                start = i + 1
                break
            }
        }

        let end = paragraphText.length
        for (let i = Math.max(selectionEnd, start); i < paragraphText.length; i++) {
            if (isSentenceBoundaryChar(paragraphText[i])) {
                end = i + 1
                break
            }
        }

        return { start, end }
    }

    function getSelectionOffsetsInParagraph(range: Range, paragraph: Element): { start: number; end: number } | null {
        try {
            const startRange = range.cloneRange()
            startRange.selectNodeContents(paragraph)
            startRange.setEnd(range.startContainer, range.startOffset)
            const start = startRange.toString().length

            const endRange = range.cloneRange()
            endRange.selectNodeContents(paragraph)
            endRange.setEnd(range.endContainer, range.endOffset)
            const end = endRange.toString().length

            if (!Number.isFinite(start) || !Number.isFinite(end)) {
                return null
            }
            return { start, end }
        } catch {
            return null
        }
    }

    /**
     * 判断选中文本是单词还是句子
     */
    function detectSelectionType(text: string): 'word' | 'sentence' {
        const trimmed = text.trim()
        const wordCount = trimmed.split(/\s+/).length
        const hasSentenceEnder = /[.!?。！？]/.test(trimmed)

        // 不超过3个词且不含句尾标点 → 单词
        if (wordCount <= 3 && !hasSentenceEnder) {
            return 'word'
        }
        return 'sentence'
    }

    function handleMouseUp(_event: MouseEvent) {
        if (isInternalClear) return

        setTimeout(() => {
            const sel = window.getSelection()
            if (!sel || sel.isCollapsed) {
                clearSelection()
                return
            }

            const text = sel.toString().trim()
            if (!text) {
                clearSelection()
                return
            }

            const range = sel.getRangeAt(0)
            const rect = range.getBoundingClientRect()

            if (rect.width === 0 && rect.height === 0) {
                // 如果发现没有宽度和高度，但我们点击的是 popover，说明可能是浏览器失焦导致临时为空
                // 此时不要清理 selection，直接返回
                if (popoverPosition.value.visible) {
                    return
                }
                clearSelection()
                return
            }

            // 检查选择是否在容器内
            if (containerRef.value) {
                const common = range.commonAncestorContainer
                const commonElement =
                    common.nodeType === Node.ELEMENT_NODE
                        ? (common as Element)
                        : (common.parentElement ?? null)

                if (!commonElement || !containerRef.value.contains(commonElement)) {
                    // 同理，如果我们在容器外发生 mouseup（比如点击了弹窗），但此时有选区，我们需要判断：
                    // 如果弹窗已打开且依然在弹窗上操作，就不清理
                    if (popoverPosition.value.visible) {
                        return
                    }
                    clearSelection()
                    return
                }
            }

            selection.value = {
                text,
                type: detectSelectionType(text),
                range,
                rect
            }

            // 计算弹出框位置（使用视口相对坐标，popover 使用 fixed 定位）
            const minTop = 60
            let topPosition = rect.top - 50
            if (topPosition < minTop) {
                topPosition = rect.bottom + 10
            }

            popoverPosition.value = {
                top: topPosition,
                left: rect.left + rect.width / 2,
                visible: true
            }
        }, 10)
    }

    function handleTouchEnd(event: TouchEvent) {
        handleMouseUp(event as unknown as MouseEvent)
    }

    function clearSelection() {
        isInternalClear = true
        selection.value = {
            text: '',
            type: null,
            range: null,
            rect: null
        }
        popoverPosition.value.visible = false
        setTimeout(() => {
            isInternalClear = false
        }, 100)
    }

    /**
     * 获取选中文本所在段落的上下文
     */
    function getContext(): string {
        const sel = window.getSelection()
        if (!sel || !sel.anchorNode) return ''

        let node: Node | null = sel.anchorNode
        while (node && node.nodeType !== Node.ELEMENT_NODE) {
            node = node.parentNode
        }

        if (node && (node as HTMLElement).closest) {
            const paragraph = (node as HTMLElement).closest('p')
            if (paragraph) {
                const paragraphText = paragraph.textContent || ''
                if (!paragraphText.trim()) return ''

                const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null
                if (!range) {
                    const selected = normalizeWhitespace(sel.toString())
                    return selected || normalizeWhitespace(paragraphText)
                }

                const offsets = getSelectionOffsetsInParagraph(range, paragraph)
                if (!offsets) {
                    const selected = normalizeWhitespace(sel.toString())
                    return selected || normalizeWhitespace(paragraphText)
                }

                const sentenceRange = getSentenceRange(paragraphText, offsets.start, offsets.end)
                const sentence = normalizeWhitespace(
                    paragraphText.slice(sentenceRange.start, sentenceRange.end)
                )
                if (sentence) {
                    return sentence
                }

                const selected = normalizeWhitespace(sel.toString())
                if (selected) return selected
                return normalizeWhitespace(paragraphText)
            }
        }

        return ''
    }

    onMounted(() => {
        document.addEventListener('mouseup', handleMouseUp)
        document.addEventListener('touchend', handleTouchEnd)
    })

    onUnmounted(() => {
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchend', handleTouchEnd)
    })

    return {
        selection,
        popoverPosition,
        clearSelection,
        getContext
    }
}
