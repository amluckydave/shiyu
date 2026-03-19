import { useRoute, useRouter } from 'vue-router'

export type HighlightType = 'word' | 'sentence'

/**
 * 路由查询参数工具组合式函数
 * 封装跨页面重复的路由查询处理逻辑
 */
export function useRouteQuery() {
  const route = useRoute()
  const router = useRouter()

  /**
   * 获取查询参数值（处理字符串或数组类型）
   */
  function getQueryValue(value: unknown): string | null {
    if (typeof value === 'string') return value
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    return null
  }

  /**
   * 标准化高亮类型
   */
  function normalizeHighlightType(value: string | null): HighlightType | null {
    if (value === 'word' || value === 'sentence') return value
    return null
  }

  /**
   * 清除导航相关查询参数
   */
  function clearNavigationQuery() {
    const query = { ...route.query }
    delete query.articleId
    delete query.highlight
    delete query.type
    void router.replace({ path: route.path, query })
  }

  /**
   * 清除高亮相关查询参数
   */
  function clearHighlightQuery() {
    const query = { ...route.query }
    delete query.highlight
    delete query.type
    void router.replace({ path: route.path, query })
  }

  return {
    getQueryValue,
    normalizeHighlightType,
    clearNavigationQuery,
    clearHighlightQuery,
  }
}
