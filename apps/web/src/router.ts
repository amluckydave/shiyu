import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"

import LandingPage from "./legacy/components/LandingPage.vue"
import EbookReader from "./legacy/components/EbookReader.vue"
import ApiSettings from "./legacy/bilingual-pack-client/components/ApiSettings.vue"
import SentenceBank from "./legacy/bilingual-pack-client/components/SentenceBank.vue"
import VocabularyNotebook from "./legacy/bilingual-pack-client/components/VocabularyNotebook.vue"

import ArticleListView from "./views/ArticleListView.vue"
import ArticleContentView from "./views/ArticleContentView.vue"
import EbookListView from "./views/EbookListView.vue"
import LoginView from "./views/LoginView.vue"
import AdminLayout from "./views/admin/AdminLayout.vue"
import AdminDashboard from "./views/admin/AdminDashboard.vue"
import AdminUsers from "./views/admin/AdminUsers.vue"
import AdminLoginView from "./views/admin/AdminLoginView.vue"

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

  // ── Auth Pages (public) ────────────────────────────────
  {
    path: "/login",
    alias: ["/register"],
    name: "login",
    component: LoginView,
    meta: { guest: true }
  },

  // ── Protected Pages ────────────────────────────────────
  {
    path: "/vocabulary",
    alias: ["/vocabulary.html"],
    name: "vocabulary",
    component: VocabularyNotebook,
    meta: { requiresAuth: true }
  },
  {
    path: "/sentences",
    alias: ["/sentences.html"],
    name: "sentences",
    component: SentenceBank,
    meta: { requiresAuth: true }
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
    component: ApiSettings,
    meta: { requiresAuth: true }
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

  // ── Admin Pages ────────────────────────────────────────
  {
    path: "/admin/login",
    name: "adminLogin",
    component: AdminLoginView,
    meta: { guest: true, adminLogin: true }
  },
  {
    path: "/admin",
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: "",
        name: "adminDashboard",
        component: AdminDashboard
      },
      {
        path: "users",
        name: "adminUsers",
        component: AdminUsers
      }
    ]
  },

  // ── Catch-all ──────────────────────────────────────────
  {
    path: "/:pathMatch(.*)*",
    redirect: "/"
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

// ── Navigation Guards ────────────────────────────────────
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem("shiyu_token")
  const userRaw = localStorage.getItem("shiyu_user")
  let userRole = "user"
  if (userRaw) {
    try {
      userRole = JSON.parse(userRaw).role || "user"
    } catch { /* ignore */ }
  }

  // Redirect logged-in users away from guest-only pages
  if (to.meta.guest && token) {
    // Admin login page: redirect admins to /admin, non-admins to /
    if (to.meta.adminLogin) {
      next(userRole === "admin" ? "/admin" : "/")
      return
    }
    next("/")
    return
  }

  // Require authentication
  if (to.meta.requiresAuth && !token) {
    next({ path: "/login", query: { redirect: to.fullPath } })
    return
  }

  // Require admin role
  if (to.meta.requiresAdmin && userRole !== "admin") {
    next("/")
    return
  }

  next()
})
