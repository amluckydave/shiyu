import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"

import LandingPage from "./legacy/components/LandingPage.vue"
import EbookReader from "./legacy/components/EbookReader.vue"
import ApiSettings from "./legacy/bilingual-pack-client/components/ApiSettings.vue"
import SentenceBank from "./legacy/bilingual-pack-client/components/SentenceBank.vue"
import VocabularyNotebook from "./legacy/bilingual-pack-client/components/VocabularyNotebook.vue"

import ArticleListView from "./views/ArticleListView.vue"
import ArticleContentView from "./views/ArticleContentView.vue"
import EbookListView from "./views/EbookListView.vue"

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: LandingPage
  },
  {
    path: "/index.html",
    redirect: "/"
  },
  {
    path: "/vocabulary",
    alias: ["/vocabulary.html"],
    name: "vocabulary",
    component: VocabularyNotebook
  },
  {
    path: "/sentences",
    alias: ["/sentences.html"],
    name: "sentences",
    component: SentenceBank
  },
  {
    path: "/articles",
    alias: ["/articles.html"],
    name: "articles",
    component: ArticleListView
  },
  {
    path: "/ebooks",
    alias: ["/ebooks.html"],
    name: "ebooks",
    component: EbookListView
  },
  {
    path: "/api-settings",
    alias: ["/api-settings.html"],
    name: "apiSettings",
    component: ApiSettings
  },
  {
    path: "/reader",
    alias: ["/reader.html"],
    name: "reader",
    component: EbookReader
  },
  {
    path: "/content/articles",
    alias: ["/content/articles/"],
    redirect: "/articles.html"
  },
  {
    path: "/content",
    alias: ["/content/"],
    redirect: "/articles.html"
  },
  {
    path: "/content/articles/:articlePath(.*)",
    name: "contentArticle",
    component: ArticleContentView
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/"
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
