import { ref, type Ref, type ComputedRef } from 'vue'

/**
 * 可复用的批量选择 Composable
 *
 * 管理批量选择模式的开关、选中项集合、全选/反选、
 * 以及与删除确认对话框的集成。
 */
export function useBatchSelection<T extends { id: string }>(
  /** 当前显示的项列表（筛选后的） */
  filteredItems: ComputedRef<T[]>
) {
  const selectionMode = ref(false)
  const selectedItems = ref<Set<string>>(new Set()) as Ref<Set<string>>

  function toggleSelectionMode() {
    selectionMode.value = !selectionMode.value
    if (!selectionMode.value) {
      selectedItems.value.clear()
    }
  }

  function toggleItem(id: string) {
    if (selectedItems.value.has(id)) {
      selectedItems.value.delete(id)
    } else {
      selectedItems.value.add(id)
    }
  }

  function selectAll() {
    if (selectedItems.value.size === filteredItems.value.length) {
      selectedItems.value.clear()
    } else {
      filteredItems.value.forEach(item => {
        selectedItems.value.add(item.id)
      })
    }
  }

  function clearSelection() {
    selectedItems.value.clear()
    selectionMode.value = false
  }

  function isSelected(id: string): boolean {
    return selectedItems.value.has(id)
  }

  return {
    selectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleItem,
    selectAll,
    clearSelection,
    isSelected,
  }
}
