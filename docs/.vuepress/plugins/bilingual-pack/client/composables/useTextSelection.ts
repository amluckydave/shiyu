import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import type { SelectionState, PopoverPosition } from '../types'

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

    function getCurrentPagePath(): string {
        if (typeof window !== 'undefined') {
            return window.location.pathname || ''
        }
        return ''
    }

    function detectSelectionType(text: string): 'word' | 'sentence' {
        const trimmed = text.trim()
        const wordCount = trimmed.split(/\s+/).length
        const hasSentenceEnder = /[.!?。！？]/.test(trimmed)

        // 判断为单词的条件：不超过3个词且不含句尾标点
        if (wordCount <= 3 && !hasSentenceEnder) {
            return 'word'
        }
        return 'sentence'
    }

    function handleMouseUp(event: MouseEvent) {
        if (isInternalClear) {
            return
        }

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

            // 计算弹出框位置（使用视口相对坐标，因为 popover 使用 fixed 定位）
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
                return paragraph.textContent || ''
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
        getContext,
        getCurrentPagePath
    }
}
