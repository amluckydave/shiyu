<template>
  <div class="article-manager">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">📚 内容管理</h1>
      <p class="page-subtitle">管理和浏览你的文章与电子书</p>
    </div>

    <!-- 标签页切换 -->
    <div class="tab-switcher">
      <button 
        class="tab-btn" 
        :class="{ 'tab-btn--active': activeTab === 'articles' }"
        @click="activeTab = 'articles'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        文章 ({{ stats.totalArticles }})
      </button>
      <button 
        class="tab-btn" 
        :class="{ 'tab-btn--active': activeTab === 'ebooks' }"
        @click="activeTab = 'ebooks'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        电子书 ({{ ebookStats.totalEbooks }})
      </button>
    </div>

    <!-- 顶部统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card stat-card--articles">
        <div class="stat-card__glow"></div>
        <div class="stat-card__content">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalArticles }}</div>
            <div class="stat-label">总文章数</div>
          </div>
        </div>
      </div>
      
      <div class="stat-card stat-card--vocabulary">
        <div class="stat-card__glow"></div>
        <div class="stat-card__content">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalVocabulary }}</div>
            <div class="stat-label">生词数</div>
          </div>
        </div>
      </div>
      
      <div class="stat-card stat-card--sentences">
        <div class="stat-card__glow"></div>
        <div class="stat-card__content">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalSentences }}</div>
            <div class="stat-label">长难句数</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-section">
      <div class="search-box">
        <div class="search-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="搜索文章标题..."
          class="search-input"
        />
        <div v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      </div>
      <div class="search-hint">
        共 <strong>{{ activeTab === 'articles' ? filteredArticles.length : filteredEbooks.length }}</strong> {{ activeTab === 'articles' ? '篇文章' : '本电子书' }}
      </div>
    </div>

    <!-- 内容列表 -->
    <div class="articles-container">
      <!-- 文章列表 -->
      <TransitionGroup v-if="activeTab === 'articles'" name="article-list" tag="div" class="articles-list">
        <div 
          v-for="(article, index) in filteredArticles" 
          :key="article.id"
          class="article-card"
          :style="{ '--delay': index * 0.05 + 's' }"
          @click="navigateToArticle(article)"
        >
          <div class="article-card__indicator"></div>
          
          <div class="article-card__main">
            <h3 class="article-card__title">{{ article.title }}</h3>
            <div class="article-card__meta">
              <span class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                {{ article.wordCount }} 词
              </span>
            </div>
          </div>
          
          <div class="article-card__stats">
            <div class="stat-badge stat-badge--vocab">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>{{ article.vocabularyCount }}</span>
            </div>
            <div class="stat-badge stat-badge--sentence">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>{{ article.sentenceCount }}</span>
            </div>
          </div>

          <div class="article-card__action">
            <span class="action-text">阅读</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </div>
      </TransitionGroup>

      <!-- 电子书列表 -->
      <TransitionGroup v-if="activeTab === 'ebooks'" name="article-list" tag="div" class="articles-list">
        <div 
          v-for="(book, index) in filteredEbooks" 
          :key="book.id"
          class="article-card ebook-card"
          :style="{ '--delay': index * 0.05 + 's' }"
          @click="openEbook(book)"
        >
          <div class="article-card__indicator ebook-indicator"></div>
          
          <div class="article-card__main">
            <h3 class="article-card__title">{{ book.title }}</h3>
            <div class="article-card__meta">
              <span v-if="book.author" class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {{ book.author }}
              </span>
              <span class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                {{ book.format.toUpperCase() }}
              </span>
            </div>
          </div>
          
          <div class="article-card__action">
            <span class="action-text">阅读</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </div>
      </TransitionGroup>

      <!-- 空状态 -->
      <Transition name="fade">
        <div v-if="(activeTab === 'articles' && filteredArticles.length === 0) || (activeTab === 'ebooks' && filteredEbooks.length === 0)" class="empty-state">
          <div class="empty-state__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
            </svg>
          </div>
          <h3 class="empty-state__title">没有找到{{ activeTab === 'articles' ? '文章' : '电子书' }}</h3>
          <p class="empty-state__text">尝试使用其他关键词搜索</p>
          <button class="empty-state__btn" @click="searchQuery = ''">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            清除搜索
          </button>
        </div>
      </Transition>
    </div>

    <!-- 电子书加载中悬浮层 -->
    <Transition name="fade">
      <div v-if="isLoadingEbook" class="ebook-loading-overlay">
        <div class="ebook-loading-card">
          <div class="ebook-loading-spinner"></div>
          <p class="ebook-loading-title">正在加载《{{ loadingEbookTitle }}》</p>
          <p class="ebook-loading-hint">请稍候...</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useArticles, type ArticleInfo } from '../composables/useArticles'
import { useEbooks, type EbookInfo } from '../composables/useEbooks'

const activeTab = ref<'articles' | 'ebooks'>('articles')
const isLoadingEbook = ref(false)
const loadingEbookTitle = ref('')

const {
  filteredArticles,
  searchQuery,
  stats
} = useArticles()

const {
  filteredEbooks,
  stats: ebookStats,
  getEbookUrl
} = useEbooks()

const navigateToArticle = (article: ArticleInfo) => {
  if (typeof window !== 'undefined') {
    window.location.href = article.path
  }
}

const openEbook = async (book: EbookInfo) => {
  if (typeof window !== 'undefined') {
    isLoadingEbook.value = true
    loadingEbookTitle.value = book.title
    const ebookUrl = getEbookUrl(book)
    
    try {
      // 用 Cache API 预加载，跨页面导航持久化
      const cache = await caches.open('ebook-preload')
      const response = await fetch(ebookUrl)
      if (response.ok) {
        await cache.put(ebookUrl, response)
      }
    } catch (e) {
      // pre-fetch 失败时仍然跳转，让 reader 自己 fetch
    }
    
    window.location.href = `/reader.html?book=${encodeURIComponent(ebookUrl)}`
  }
}
</script>

<style scoped>
.article-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 1.5rem 3rem;
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-top: 4rem;
}

/* 标签页切换 */
.tab-switcher {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 2px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-bg);
  color: var(--c-text-lighter);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.tab-btn svg {
  width: 18px;
  height: 18px;
}

.tab-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.tab-btn--active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
  color: white;
}

.tab-btn--active:hover {
  border-color: transparent;
  color: white;
}

/* 电子书卡片特殊样式 */
.ebook-card .ebook-indicator {
  background: linear-gradient(180deg, #f093fb 0%, #f5576c 100%);
}

.ebook-card:hover .article-card__title {
  color: #f5576c;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--c-text);
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 1rem;
  color: var(--c-text-lighter);
  margin: 0;
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* 统计卡片 */
.stat-card {
  position: relative;
  border-radius: 16px;
  padding: 1.5rem;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-card__glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover .stat-card__glow {
  opacity: 1;
}

.stat-card__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* 文章卡片 - 蓝紫渐变 */
.stat-card--articles {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.35);
}

.stat-card--articles:hover {
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.5);
}

.stat-card--articles .stat-card__glow {
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 60%);
}

/* 生词卡片 - 翠绿渐变 */
.stat-card--vocabulary {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  box-shadow: 0 4px 20px rgba(17, 153, 142, 0.35);
}

.stat-card--vocabulary:hover {
  box-shadow: 0 8px 30px rgba(17, 153, 142, 0.5);
}

.stat-card--vocabulary .stat-card__glow {
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 60%);
}

/* 句子卡片 - 橙红渐变 */
.stat-card--sentences {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 4px 20px rgba(245, 87, 108, 0.35);
}

.stat-card--sentences:hover {
  box-shadow: 0 8px 30px rgba(245, 87, 108, 0.5);
}

.stat-card--sentences .stat-card__glow {
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 60%);
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: 800;
  color: white;
  line-height: 1.1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

/* 搜索区域 */
.search-section {
  margin-bottom: 1.5rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 1rem;
  width: 20px;
  height: 20px;
  color: var(--c-text-lighter);
  pointer-events: none;
}

.search-icon svg {
  width: 100%;
  height: 100%;
}

.search-input {
  width: 100%;
  padding: 0.875rem 2.75rem 0.875rem 3rem;
  border: 2px solid var(--c-border);
  border-radius: 12px;
  font-size: 0.95rem;
  background: var(--c-bg);
  color: var(--c-text);
  transition: all 0.2s ease;
}

.search-input::placeholder {
  color: var(--c-text-lighter);
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.12);
}

.search-clear {
  position: absolute;
  right: 0.875rem;
  width: 20px;
  height: 20px;
  color: var(--c-text-lighter);
  cursor: pointer;
  transition: color 0.2s ease;
}

.search-clear:hover {
  color: var(--c-text);
}

.search-clear svg {
  width: 100%;
  height: 100%;
}

.search-hint {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--c-text-lighter);
  padding-left: 0.25rem;
}

.search-hint strong {
  color: var(--c-text);
  font-weight: 600;
}

/* 文章列表容器 */
.articles-container {
  min-height: 200px;
}

.articles-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 文章卡片 */
.article-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.article-card:hover {
  border-color: transparent;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transform: translateX(4px);
}

.article-card__indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.article-card:hover .article-card__indicator {
  opacity: 1;
}

.article-card__main {
  flex: 1;
  min-width: 0;
}

.article-card__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--c-text);
  margin: 0 0 0.375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.article-card:hover .article-card__title {
  color: #667eea;
}

.article-card__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--c-text-lighter);
}

.meta-item svg {
  width: 14px;
  height: 14px;
}

/* 统计徽章 */
.article-card__stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.375rem 0.625rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  transition: transform 0.2s ease;
}

.stat-badge svg {
  width: 14px;
  height: 14px;
}

.stat-badge--vocab {
  background: rgba(17, 153, 142, 0.1);
  color: #11998e;
}

.stat-badge--sentence {
  background: rgba(245, 87, 108, 0.1);
  color: #f5576c;
}

.article-card:hover .stat-badge {
  transform: scale(1.05);
}

/* 操作按钮 */
.article-card__action {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: #667eea;
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.25s ease;
  flex-shrink: 0;
}

.article-card__action svg {
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
}

.article-card:hover .article-card__action {
  opacity: 1;
  transform: translateX(0);
}

.article-card:hover .article-card__action svg {
  transform: translateX(2px);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-state__icon {
  width: 80px;
  height: 80px;
  margin-bottom: 1.5rem;
  color: var(--c-text-lighter);
  opacity: 0.5;
}

.empty-state__icon svg {
  width: 100%;
  height: 100%;
}

.empty-state__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--c-text);
  margin: 0 0 0.5rem;
}

.empty-state__text {
  font-size: 0.95rem;
  color: var(--c-text-lighter);
  margin: 0 0 1.5rem;
}

.empty-state__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.empty-state__btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.empty-state__btn svg {
  width: 16px;
  height: 16px;
}

/* 列表动画 */
.article-list-enter-active {
  transition: all 0.3s ease;
  transition-delay: var(--delay, 0s);
}

.article-list-leave-active {
  transition: all 0.2s ease;
}

.article-list-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.article-list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.article-list-move {
  transition: transform 0.3s ease;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式调整 */
@media (max-width: 640px) {
  .article-manager {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .stat-card {
    padding: 1.25rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .article-card {
    flex-wrap: wrap;
    padding: 1rem;
  }

  .article-card__main {
    width: 100%;
  }

  .article-card__stats {
    order: 3;
    width: 100%;
    justify-content: flex-start;
    margin-top: 0.5rem;
  }

  .article-card__action {
    position: absolute;
    right: 1rem;
    top: 1rem;
    opacity: 1;
    transform: none;
  }
}

/* 电子书加载悬浮层 */
.ebook-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
}

.ebook-loading-card {
  text-align: center;
  padding: 2.5rem 3rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.ebook-loading-spinner {
  width: 44px;
  height: 44px;
  margin: 0 auto 1.2rem;
  border: 3px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: ebook-spin 0.7s linear infinite;
}

@keyframes ebook-spin {
  to { transform: rotate(360deg); }
}

.ebook-loading-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.3rem;
}

.ebook-loading-hint {
  font-size: 0.85rem;
  color: #9ca3af;
  margin: 0;
}

@media (prefers-color-scheme: dark) {
  .ebook-loading-card {
    background: rgba(30, 35, 55, 0.95);
  }
  .ebook-loading-title {
    color: #e5e7eb;
  }
  .ebook-loading-spinner {
    border-color: #374151;
    border-top-color: #818cf8;
  }
}
</style>
