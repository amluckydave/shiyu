import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// HomeView 保持静态导入（首屏加载），其余路由懒加载
import HomeView from './views/HomeView.vue'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        component: HomeView,
    },
    {
        path: '/vocabulary',
        name: 'vocabulary',
        component: () => import('./views/VocabularyView.vue'),
    },
    {
        path: '/sentences',
        name: 'sentences',
        component: () => import('./views/SentencesView.vue'),
    },
    {
        path: '/review',
        name: 'review',
        component: () => import('./views/ReviewView.vue'),
    },
    {
        path: '/articles',
        name: 'articles',
        component: () => import('./views/ArticlesView.vue'),
    },
    {
        path: '/epub-import',
        name: 'epub-import',
        component: () => import('./views/EpubImportView.vue'),
    },
    {
        path: '/translate',
        name: 'translate',
        component: () => import('./views/TranslateView.vue'),
    },
    {
        path: '/ocr-import',
        name: 'ocr-import',
        component: () => import('./views/OcrImportView.vue'),
    },
    {
        path: '/settings',
        name: 'settings',
        component: () => import('./views/SettingsView.vue'),
    },
    {
        path: '/guide',
        name: 'guide',
        component: () => import('./views/GuideView.vue'),
    },
    {
        path: '/data',
        name: 'data',
        component: () => import('./views/DataManagerView.vue'),
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/',
    },
]

export const router = createRouter({
    history: createWebHistory(),
    routes,
})
