import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastMessage {
  id: number
  message: string
  type: ToastType
  duration: number
}

const toasts = ref<ToastMessage[]>([])
let idCounter = 0

export function useGlobalToast() {
  function show(message: string, type: ToastType = 'success', duration = 3000) {
    const id = ++idCounter
    toasts.value.push({ id, message, type, duration })

    setTimeout(() => {
      remove(id)
    }, duration)

    return id
  }

  function remove(id: number) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  // 快捷方法
  function success(message: string, duration?: number) {
    return show(message, 'success', duration)
  }

  function error(message: string, duration?: number) {
    return show(message, 'error', duration ?? 5000)
  }

  function warning(message: string, duration?: number) {
    return show(message, 'warning', duration)
  }

  function info(message: string, duration?: number) {
    return show(message, 'info', duration)
  }

  return {
    toasts,
    show,
    remove,
    success,
    error,
    warning,
    info,
  }
}
