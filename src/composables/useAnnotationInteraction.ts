import { ref, type Ref } from 'vue'
import type { Router } from 'vue-router'
import type { HighlightType } from './useRouteQuery'
import { useGlobalToast } from './useGlobalToast'

interface TooltipState {
  visible: boolean
  content: string
  type: HighlightType
  position: { top: number; left: number }
}

interface ToastInstance {
  show: (msg: string) => void
}

interface TextSelectionAPI {
  selection: Ref<{ text: string; range: Range | null; type: string | null }>
  clearSelection: () => void
  getContext: () => string
  popoverPosition: Ref<{ visible: boolean; top: number; left: number }>
}

interface AnnotationAPI {
  annotationEnabled: Ref<boolean>
  findWordById: (id: string) => { meaning: string } | undefined
  findSentenceById: (id: string) => { explanation: string } | undefined
  saveWord: (word: string, meaning: string, context: string) => Promise<any>
  saveSentence: (text: string, explanation: string) => Promise<any>
}

/**
 * Annotation interaction composable — 管理阅读器中的标注表单、tooltip、点击和 hover 事件
 */
export function useAnnotationInteraction(
  router: Router,
  toastRef: Ref<ToastInstance | null>,
  textSelectionAPI: TextSelectionAPI,
  annotationAPI: AnnotationAPI,
) {
  const { selection, clearSelection, getContext, popoverPosition } = textSelectionAPI
  const { annotationEnabled, findWordById, findSentenceById, saveWord, saveSentence } = annotationAPI

  // State
  const showAnnotationForm = ref(false)
  const annotationType = ref<HighlightType>('word')
  const cachedSelectedText = ref('')
  const cachedContextText = ref('')
  const tooltipState = ref<TooltipState>({
    visible: false,
    content: '',
    type: 'word' as HighlightType,
    position: { top: 0, left: 0 },
  })
  let tooltipHideTimeout: ReturnType<typeof setTimeout> | null = null

  // Methods
  function handleAddWord() {
    if (!selection.value.text) return
    cachedSelectedText.value = selection.value.text
    cachedContextText.value = getContext()
    annotationType.value = 'word'
    showAnnotationForm.value = true
  }

  function handleAddSentence() {
    if (!selection.value.text) return
    cachedSelectedText.value = selection.value.text
    cachedContextText.value = getContext()
    annotationType.value = 'sentence'
    showAnnotationForm.value = true
  }

  function handleCloseForm() {
    showAnnotationForm.value = false
    clearSelection()
  }

  async function handleSaveAnnotation(content: string) {
    try {
      if (annotationType.value === 'word') {
        await saveWord(cachedSelectedText.value, content, cachedContextText.value)
        toastRef.value?.show('单词已添加到生词本')
      } else {
        await saveSentence(cachedSelectedText.value, content)
        toastRef.value?.show('长难句已保存')
      }
    } catch (error: any) {
      const toast = useGlobalToast()
      toast.error('保存失败: ' + error)
    }
    handleCloseForm()
  }

  function toggleAnnotations() {
    annotationEnabled.value = !annotationEnabled.value
    if (!annotationEnabled.value) {
      clearSelection()
      tooltipState.value.visible = false
    }
  }

  function handleAnnotationClick(e: MouseEvent) {
    if (!annotationEnabled.value) return
    if (e.button !== 0) return

    const target = e.target as HTMLElement

    const wordEl = target.closest('.annotated-word, .annotated-word-subtle') as HTMLElement | null
    if (wordEl) {
      const id = wordEl.getAttribute('data-word-id')
      if (id) {
        e.preventDefault()
        e.stopPropagation()
        void router.push({ path: '/vocabulary', query: { highlight: id, type: 'word' } })
      }
      return
    }

    const sentenceEl = target.closest('.annotated-sentence, .annotated-sentence-subtle') as HTMLElement | null
    if (sentenceEl) {
      const id = sentenceEl.getAttribute('data-sentence-id')
      if (id) {
        e.preventDefault()
        e.stopPropagation()
        void router.push({ path: '/sentences', query: { highlight: id, type: 'sentence' } })
      }
    }
  }

  function showTooltipContent(target: HTMLElement, type: HighlightType) {
    let content = ''
    if (type === 'word') {
      const id = target.getAttribute('data-word-id')
      if (id) {
        const word = findWordById(id)
        if (word) content = word.meaning
      }
    } else {
      const id = target.getAttribute('data-sentence-id')
      if (id) {
        const sentence = findSentenceById(id)
        if (sentence) content = sentence.explanation
      }
    }

    if (content) {
      const rect = target.getBoundingClientRect()
      tooltipState.value = {
        visible: true,
        content,
        type,
        position: {
          top: rect.bottom + 5,
          left: rect.left + rect.width / 2,
        },
      }
    }
  }

  function handleHighlightHover(e: MouseEvent) {
    if (!annotationEnabled.value) return
    const target = e.target as HTMLElement

    const wordEl = target.closest('.annotated-word, .annotated-word-subtle') as HTMLElement | null
    const sentenceEl = target.closest('.annotated-sentence, .annotated-sentence-subtle') as HTMLElement | null

    if (!wordEl && !sentenceEl) return

    if (tooltipHideTimeout) {
      clearTimeout(tooltipHideTimeout)
      tooltipHideTimeout = null
    }

    if (wordEl) {
      showTooltipContent(wordEl, 'word')
      return
    }

    if (sentenceEl) {
      showTooltipContent(sentenceEl, 'sentence')
    }
  }

  function handleHighlightLeave() {
    if (!tooltipState.value.visible) return
    tooltipHideTimeout = setTimeout(() => {
      tooltipState.value.visible = false
    }, 300)
  }

  function handleTooltipClose() {
    tooltipState.value.visible = false
  }

  function handlePageClick(e: MouseEvent) {
    const target = e.target as HTMLElement

    if (!target.closest('.annotation-tooltip') && !target.closest('.annotated-word') && !target.closest('.annotated-sentence') && !target.closest('.annotated-word-subtle') && !target.closest('.annotated-sentence-subtle')) {
      tooltipState.value.visible = false
    }

    if (showAnnotationForm.value) {
      return
    }

    if (!target.closest('.selection-popover')) {
      if (popoverPosition.value.visible) {
        clearSelection()
      }
    }
  }

  return {
    // State
    showAnnotationForm,
    annotationType,
    cachedSelectedText,
    cachedContextText,
    tooltipState,
    // Methods
    handleAddWord,
    handleAddSentence,
    handleCloseForm,
    handleSaveAnnotation,
    toggleAnnotations,
    handleAnnotationClick,
    handleHighlightHover,
    handleHighlightLeave,
    handleTooltipClose,
    handlePageClick,
  }
}
