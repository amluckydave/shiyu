# VuePress Bilingual Learning Platform - 项目概述

## 项目简介
这是一个基于 **VuePress Hope** 主题的双语学习平台，核心功能是通过自定义插件 `bilingual-pack` 为英文文章提供智能标注、生词管理和长难句解析功能。

**项目位置**：`E:\addVue\shiyu`

## 核心功能

### 1. 智能文本标注系统
用户在阅读文章时可以：
- **选中单词**：标注并保存到生词本，添加释义和语境
- **选中句子**：保存为长难句，添加语法解析
- **首次标注突出显示**：
  - 单词首次出现：绿色下划线 `border-bottom: 2px solid #3eaf7c`
  - 句子首次出现：浅蓝色背景 `background: rgba(74, 144, 226, 0.15)`
  - 后续出现：无视觉标记，但鼠标悬停仍可查看释义

### 2. 悬停显示释义
- 鼠标悬停在标注内容上，**200ms延迟后**显示半透明tooltip
- tooltip自适应内容宽度，只显示核心释义
- 移开鼠标自动隐藏，无需手动关闭

### 3. 双向标签页导航 ⭐ NEW
- **文章→生词库/长难句库**：点击标注词句打开对应页面，复用同一标签页
- **生词库/长难句库→文章**：点击"跳转原文"，复用文章标签页
- **只保留一个标签页**：每种页面类型只维护一个标签页，避免混乱
- **自动定位高亮**：跳转后自动滚动并闪烁提示

### 4. 生词本管理 (`/vocabulary.html`)
- 查看所有收藏的单词
- 显示单词、释义、语境、来源文章
- **"跳转原文"功能**：点击后跳转到文章并自动滚动到单词位置，显示闪烁动画

### 5. 长难句库 (`/sentences.html`)
- 管理所有保存的长难句
- 显示句子内容、结构分析（结构总述、结构分解、释义）
- **"跳转原文"功能**：自动滚动到句子位置并闪烁提示

### 6. 文章管理 (`/articles.html`) ⭐ NEW
- 统一管理所有文章（demo目录下的markdown文件）
- 支持添加、删除文章
- 自动检测文章变化（Hot reload）

### 7. 段落翻译系统
- **极简交互**：鼠标悬停在段落末尾自动浮现翻译按钮
- **无干扰UI**：方形圆角、磨砂质感按钮，不点击时不占用视线
- **沉浸式输入**：点击展开透明输入框，无边框、无背景，宛如在书页上直接批注
- **自动保存**：输入内容实时保存，刷新页面自动展开已有笔记
- **紧凑排版**：输入框紧贴段落，视觉关联感强

### 8. 电子书阅读器 (`/ebook-reader.html`) ⭐ NEW
- **EPUB 格式支持**：基于 foliate-js 的电子书阅读器
- **标注系统**：与文章页完全一致的标注体验
  - 选中单词/句子 → 弹出标注按钮 → 保存到生词本/句库
  - 标注内容自动高亮显示（绿色下划线/蓝色背景）
  - 鼠标悬停显示释义 tooltip
  - 点击标注跳转到生词本/句库
- **章节导航**：侧边栏目录，快速跳转章节
- **阅读进度**：自动保存阅读位置，下次打开自动恢复
- **分节标注**：标注只在当前章节显示，不会全书重复
- **闪烁动画**：从生词本/句库跳转回电子书时，自动定位并闪烁高亮

### 9. 数据自动同步
- **本地文件存储**：所有数据保存在 `C:\Users\<用户名>\.vuepress-bilingual-data.json`
- **跨浏览器共享**：Chrome, Edge, Firefox 共享同一份数据
- **永久持久化**：不依赖浏览器的 LocalStorage，清除缓存不丢失数据

## 技术架构

### 技术栈
- **框架**：VuePress 2 + Vue 3
- **主题**：vuepress-theme-hope
- **构建工具**：Vite + pnpm
- **语言**：TypeScript + Vue SFC
- **电子书渲染**：foliate-js (EPUB reader)

### 插件架构
自定义插件位于 `docs/.vuepress/plugins/bilingual-pack/`

```
bilingual-pack/
├── client/
│   ├── components/
│   │   ├── BilingualReader.vue       # 文章阅读器（标注核心）
│   │   ├── VocabularyNotebook.vue    # 生词本
│   │   ├── SentenceBank.vue          # 长难句库
│   │   ├── ArticleManager.vue        # 文章管理
│   │   ├── AnnotationForm.vue        # 标注表单
│   │   ├── AnnotationTooltip.vue     # 悬停提示
│   │   └── SelectionPopover.vue      # 选择弹窗
│   ├── composables/
│   │   ├── useVocabulary.ts          # 生词管理
│   │   ├── useSentenceBank.ts        # 句库管理
│   │   ├── useBilingualData.ts       # 数据持久化
│   │   └── useTextSelection.ts       # 文本选择
│   └── utils/
│       ├── articleNavigation.ts      # 文章导航
│       ├── notebookNavigation.ts     # 生词本导航
│       ├── channelMessaging.ts       # 跨窗口通信
│       └── sentenceExplanation.ts    # 句子解析
└── node/
    └── index.ts                       # 插件注册
```

### 电子书阅读器架构
位于 `apps/web/src/legacy/components/EbookReader.vue`

```
EbookReader.vue (2409 lines)
├── Template (lines 1-168)
│   ├── Empty state (no book loaded)
│   ├── TOC sidebar (table of contents)
│   ├── Toolbar (title, progress, close button)
│   ├── Viewer container (foliate-js iframe)
│   ├── Selection popover (word/sentence buttons)
│   ├── Annotation form (save word/sentence)
│   └── Annotation tooltip (hover display) ⭐ NEW
├── Script (lines 170-1187)
│   ├── Composables (vocabulary, sentences)
│   ├── State management (book, progress, annotations, tooltip)
│   ├── Book loading & navigation
│   ├── Annotation system
│   │   ├── applyAnnotations() - 加载并显示标注
│   │   ├── highlightTextInDocument() - 创建高亮标记
│   │   ├── handleAnnotationSave() - 保存标注
│   │   ├── handleAnnotationMarkClick() - 点击跳转
│   │   ├── handleHighlightHover() - 悬停显示 ⭐ NEW
│   │   ├── handleHighlightLeave() - 悬停离开 ⭐ NEW
│   │   └── blinkHighlight() - 闪烁动画
│   ├── Section loading (handleSectionLoad)
│   │   ├── Inject CSS styles (lines 914-980)
│   │   ├── Register event listeners
│   │   └── Apply annotations
│   └── Cross-window navigation (BroadcastChannel)
└── Style (lines 1189-2409)
    ├── Layout styles (reader, toolbar, TOC)
    ├── Popover & form styles
    └── Tooltip styles (lines 2365-2408) ⭐ NEW
```

### 关键技术点

#### 1. 标注系统的实现
**文章页 (BilingualReader.vue)**：
- 直接在 DOM 上操作，使用 `document.createElement('mark')` 包裹选中文本
- 标注数据存储在 `vocabulary` 和 `sentences` 响应式状态中
- 通过 `data-word-id` 和 `data-sentence-id` 关联标注元素和数据

**电子书页 (EbookReader.vue)**：
- 内容在 iframe 中渲染（foliate-js 管理）
- 标注数据额外存储在 localStorage (`ebook-annotations-{bookUrl}`)
- 每次章节加载时重新应用标注（`applyAnnotations(doc)`）
- 使用 CFI (Canonical Fragment Identifier) 定位文本位置
- **分节过滤**：只显示当前章节的标注（通过 CFI 前缀匹配）

#### 2. 悬停提示的实现 ⭐ NEW
**文章页**：
- 使用 `AnnotationTooltip.vue` 组件
- 事件监听在父容器上（`containerRef`）
- 使用事件委托捕获 `.annotated-word` 和 `.annotated-sentence` 的 hover

**电子书页**：
- 不能使用 Vue 组件（内容在 iframe 中）
- 事件监听在 iframe document 上（`doc.addEventListener('mouseenter', ...)`）
- 坐标转换：`getBoundingClientRect()` + iframe offset
- Tooltip 渲染在父窗口（Vue template）

#### 3. 闪烁动画的实现
**CSS 动画**：
```css
@keyframes flash-word {
    0%, 100% { background-color: transparent; }
    50% { background-color: rgba(62, 175, 124, 0.4); }
}
@keyframes flash-sentence {
    0%, 100% { background-color: transparent; }
    50% { background-color: rgba(74, 144, 226, 0.32); }
}
```

**触发流程**：
1. 生词本/句库点击"跳转原文"
2. 通过 BroadcastChannel 发送消息 `{ type: 'navigate', path, highlightId, highlightType }`
3. 文章页/电子书页接收消息，调用 `blinkHighlight(doc, highlightId, type)`
4. 添加 `.flashing` class，触发 3 次闪烁动画（3s）
5. 动画结束后移除 class

#### 4. 跨窗口通信
使用 **BroadcastChannel API**：
```typescript
const channel = new BroadcastChannel('bilingual-navigation')
channel.postMessage({ type: 'navigate', path: '/demo/article.html', highlightId: 'word-123', highlightType: 'word' })
```

**窗口管理策略**：
- 每种页面类型只保留一个标签页（通过 `window.name` 识别）
- 如果目标窗口已存在，复用并聚焦
- 如果不存在，创建新窗口并设置 `window.name`

#### 5. 数据持久化
**文章标注数据**：
- 存储在本地文件 `~/.vuepress-bilingual-data.json`
- 通过 Node.js 文件系统 API 读写
- 跨浏览器共享

**电子书标注数据**：
- 存储在 localStorage (`ebook-annotations-{bookUrl}`)
- 每本书独立存储
- 包含 CFI 位置信息

**阅读进度**：
- 存储在 localStorage (`ebook-progress-{bookUrl}`)
- 包含 CFI 和百分比进度
- 打开书籍时自动恢复

## 最近更新

### 2024-02-23 - 电子书悬停提示功能 ⭐ NEW
- ✅ 添加鼠标悬停显示释义功能
- ✅ 200ms 防抖，避免快速划过时闪烁
- ✅ 绿色 tooltip（单词）/ 蓝紫色 tooltip（句子）
- ✅ iframe 坐标转换，tooltip 渲染在父窗口
- ✅ 完全匹配文章页的视觉效果和交互逻辑

### 2024-02-23 - 电子书标注系统完善
- ✅ 修复导航回退问题（从生词本跳转到电子书）
- ✅ 实现分节标注（只显示当前章节的标注）
- ✅ 添加点击标注跳转到生词本功能
- ✅ 修复闪烁动画（使用 iframe document）
- ✅ 统一闪烁动画样式（与文章页一致）
- ✅ 实现标注清理（删除生词本中不存在的标注）
- ✅ 创建 `.agent/PROTECTED_FILES.md` 保护核心代码

### 2024-02-22 - 电子书阅读器上线
- ✅ 集成 foliate-js EPUB 阅读器
- ✅ 实现标注系统（选中单词/句子 → 保存）
- ✅ 章节导航和阅读进度保存
- ✅ 标注数据持久化（localStorage）

### 2024-02-20 - 双向导航系统
- ✅ 实现文章 ↔ 生词本/句库的双向跳转
- ✅ 标签页复用策略（每种页面只保留一个标签页）
- ✅ 自动定位高亮和闪烁动画

### 2024-02-18 - 悬停提示系统
- ✅ 实现鼠标悬停显示释义
- ✅ 200ms 防抖优化
- ✅ 半透明 tooltip 设计

## 开发指南

### 本地开发
```bash
cd E:\addVue\shiyu
pnpm install
pnpm dev
```

### 构建部署
```bash
pnpm build
```

### 目录结构
```
shiyu/
├── docs/                           # VuePress 文档目录
│   ├── .vuepress/
│   │   ├── config.ts              # VuePress 配置
│   │   ├── theme.ts               # 主题配置
│   │   └── plugins/
│   │       └── bilingual-pack/    # 自定义插件
│   ├── demo/                      # 示例文章
│   ├── vocabulary.md              # 生词本页面
│   ├── sentences.md               # 长难句库页面
│   ├── articles.md                # 文章管理页面
│   └── ebook-reader.md            # 电子书阅读器页面
├── apps/
│   └── web/
│       └── src/
│           └── legacy/
│               ├── components/
│               │   └── EbookReader.vue  # 电子书阅读器
│               └── bilingual-pack-client/
│                   ├── components/      # 文章阅读器组件
│                   ├── composables/     # 状态管理
│                   └── utils/           # 工具函数
└── .agent/
    ├── PROJECT_OVERVIEW.md        # 本文件
    └── PROTECTED_FILES.md         # 受保护文件清单
```

## 注意事项

### 代码保护规则
参见 `.agent/PROTECTED_FILES.md`，核心文件修改前必须：
1. 🔴 **CRITICAL** 级别：必须获得用户明确确认
2. 🟡 **IMPORTANT** 级别：说明原因和影响范围，等待确认
3. 禁止使用 `as any`、`@ts-ignore` 等类型逃逸
4. 禁止删除测试来"通过"测试

### 电子书标注系统特殊性
- 内容在 iframe 中，无法直接使用 Vue 组件
- 需要在 iframe document 上注册事件监听
- 坐标计算需要加上 iframe 偏移量
- CSS 需要注入到 iframe document 中
- 每次章节切换都需要重新应用标注

### 调试技巧
- 电子书标注问题：检查 `handleSectionLoad` 中的 CSS 注入和事件监听
- 闪烁动画问题：确认使用 `currentIframeDoc` 而非 `document`
- 悬停提示问题：检查 iframe 坐标转换逻辑
- 跨窗口通信问题：查看 BroadcastChannel 消息是否正确发送/接收
