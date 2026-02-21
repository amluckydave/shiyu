declare module "*.vue" {
  import type { DefineComponent } from "vue"
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

declare module "@temp/internal/article-data" {
  export interface ArticleListItem {
    id: string
    title: string
    path: string
    icon: string
    description: string
    wordCount: number
    vocabularyCount: number
    sentenceCount: number
    category: string
    isCustom: boolean
  }

  export const articles: ArticleListItem[]
}

declare module "virtual:article-content" {
  export const articleContentMap: Record<string, string>
  export const articleMetaMap: Record<string, { title: string }>
}
