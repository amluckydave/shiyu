import { useRoute as useVueRoute, useRouter as useVueRouter } from "vue-router"

export const useRoute = useVueRoute
export const useRouter = useVueRouter

export function withBase(pathname: string): string {
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(pathname)) {
    return pathname
  }

  const baseUrl = import.meta.env.BASE_URL || "/"
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  const normalizedPath = pathname.replace(/^\/+/, "")

  if (!normalizedPath) {
    return normalizedBase
  }

  return `${normalizedBase}${normalizedPath}`
}

export function defineClientConfig<T>(config: T): T {
  return config
}
