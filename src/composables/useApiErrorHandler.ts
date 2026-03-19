import { useGlobalToast } from './useGlobalToast'

/**
 * API错误处理包装器
 * 统一处理Tauri命令错误，自动显示Toast通知
 */
export function useApiErrorHandler() {
  const { error, warning } = useGlobalToast()

  /**
   * 执行API调用并自动处理错误
   * @param fn 要执行的异步函数
   * @param errorMessage 错误时显示的消息（可选）
   * @returns 成功时返回结果，失败时返回null
   */
  async function handle<T>(
    fn: () => Promise<T>,
    errorMessage?: string
  ): Promise<T | null> {
    try {
      return await fn()
    } catch (e) {
      const msg = errorMessage || (e instanceof Error ? e.message : '操作失败')
      error(msg)
      console.error('API Error:', e)
      return null
    }
  }

  /**
   * 执行API调用，成功和失败都显示通知
   * @param fn 要执行的异步函数
   * @param successMessage 成功时显示的消息
   * @param errorMessage 错误时显示的消息（可选）
   * @returns 成功时返回结果，失败时返回null
   */
  async function handleWithSuccess<T>(
    fn: () => Promise<T>,
    successMessage: string,
    errorMessage?: string
  ): Promise<T | null> {
    try {
      const result = await fn()
      const { success } = useGlobalToast()
      success(successMessage)
      return result
    } catch (e) {
      const msg = errorMessage || (e instanceof Error ? e.message : '操作失败')
      error(msg)
      console.error('API Error:', e)
      return null
    }
  }

  /**
   * 执行API调用，失败时只记录不显示通知（用于后台操作）
   * @param fn 要执行的异步函数
   * @returns 成功时返回结果，失败时返回null
   */
  async function handleSilent<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn()
    } catch (e) {
      console.error('Silent API Error:', e)
      return null
    }
  }

  /**
   * 验证条件，失败时显示警告
   * @param condition 条件
   * @param message 警告消息
   * @returns 条件是否满足
   */
  function validate(condition: boolean, message: string): boolean {
    if (!condition) {
      warning(message)
      return false
    }
    return true
  }

  return {
    handle,
    handleWithSuccess,
    handleSilent,
    validate,
  }
}
