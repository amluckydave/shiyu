# 技术问题解决记录

记录项目开发中遇到的关键技术问题和解决方案，供未来参考。

---

## 2026-02-21：电子书阅读器无法加载 (foliate-js缺失)

### 问题1：点击电子书后一直提示"请选择一本电子书"

**现象**：
- 用户在"内容管理"的"电子书"标签页中，点击某本电子书
- 页面正确跳转到 `/reader.html?book=...`，包含阅读器界面
- 但中间的内容区域为空，几秒后显示"请选择一本电子书"的 fallback，无法正常渲染书籍
- 浏览器控制台抛出 `MIME type error: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"`

**根本原因**：
- `EbookReader.vue` 中使用的阅读器引擎 [foliate-js](https://github.com/johnfactotum/foliate-js) 没有在项目中打包
- 系统依赖于 `docs/.vuepress/public/foliate-js/` 目录通过静态 URL `/foliate-js/view.js` 进行动态导入
- 该 public 目录存在但为**空目录**。由于缺少真实的 JavaScript 后备文件，VuePress dev 服务器对该路径返回了 404 HTML 页面，导致严格的 ES Module 请求失败报错和加载超时

**解决方案**：
1. 将 [foliate-js 仓库](https://github.com/johnfactotum/foliate-js) 完整克隆到项目的对应 public 目录中：
   ```bash
   git clone https://github.com/johnfactotum/foliate-js.git docs/.vuepress/public/foliate-js
   ```
2. 删除克隆下来的内部 `.git` 文件夹以避免 git 将其识别为 submodule：
   ```bash
   rm -rf docs/.vuepress/public/foliate-js/.git
   ```
3. 确保 `.gitignore` 允许跟踪它，并一并提交到当前代码库

---

## 2026-01-27：双向标签页导航

### 问题1：点击"跳转原文"无法聚焦文章标签页

**现象**：
- 从生词库/长难句库点击"跳转原文"后，文章确实跳转了
- 但浏览器没有自动切换到文章标签页，用户需要手动切换

**根本原因**：
- 浏览器安全限制：一个标签页无法强制聚焦另一个标签页
- `window.focus()` 在大多数现代浏览器中被限制

**解决方案**：
1. 使用 `window.open(url, 'bilingual-article')` 配合命名目标
2. 添加 `window.blur()` 鼓励浏览器切换焦点
3. **注意**：这是浏览器限制，无法100%保证聚焦

```typescript
// articleNavigation.ts
const opened = deps.openWindow(url, ARTICLE_WINDOW_NAME)
if (opened) {
    opened.focus()
    window.blur()  // 鼓励浏览器切换
}
```

### 问题2：只保留一个标签页的实现

**需求**：
- 文章页只有一个标签页
- 生词库只有一个标签页
- 长难句库只有一个标签页

**解决方案**：
使用 `window.open` 的命名目标特性：
```typescript
// 文章使用固定名称
window.open(url, 'bilingual-article')

// 生词库使用固定名称
window.open(url, 'bilingual-notebook-word')

// 长难句库使用固定名称
window.open(url, 'bilingual-notebook-sentence')
```

当使用相同的窗口名称时，浏览器会复用已存在的窗口而不是新开。

---

## 2026-01-26：标注点击跳转与标题空隙

### 问题1：点击标注打开笔记本时重复新开/不聚焦

**现象**：
- 点击标注单词/句子会打开生词本/长难句库
- 可能出现重复新开或不自动聚焦

**根本原因**：
- 浏览器拦截 `window.open`（弹窗被阻止）
- 或没有复用同一标签页的窗口句柄

**解决方案**：
1. 使用 `notebookNavigation` 复用标签页（已内置）
2. 若仍被阻止，检查浏览器弹窗拦截设置
3. 设计约束：**Ctrl/⌘ 点击不触发跳转**，只接受普通左键点击

### 问题2：标题最前面"空一格"

**现象**：
- 页面标题前方出现明显空隙/占位

**根本原因**：
- 文章 frontmatter 设置了 `icon`，主题会在标题前插入图标占位

**解决方案**：
1. 删除页面 frontmatter 的 `icon` 字段
2. 或在样式中隐藏标题锚点/图标占位（按需）

---

## 2026-01-22：标注系统核心Bug修复

### 问题1：反复强制滚动Bug

**现象**：
- 用户从生词本跳转到文章后，页面会自动滚动到标注位置（正常）
- 但当用户想滚动到其他位置阅读时，页面会**反复强制拉回**到标注位置
- 用户无法自由浏览文章

**根本原因**：
`watch` 监听器监听了 `route.query`，每次query参数变化都会触发跳转逻辑：
```typescript
// ❌ 错误的监听
watch(() => route.query, () => {
  handleQueryHighlight()  // 反复触发
})
```

**解决方案**：
1. 添加 `hasProcessedHighlight` 标志位，防止重复触发
2. 只监听 `route.path`（页面路径），不监听query参数
3. 路径改变时重置标志位

```typescript
const hasProcessedHighlight = ref(false)

watch(() => route.path, () => {
  hasProcessedHighlight.value = false // 新页面重置
  setTimeout(() => handleQueryHighlight(), 500)
})

function handleQueryHighlight() {
  if (hasProcessedHighlight.value) return // 已处理则跳过
  // ...
  hasProcessedHighlight.value = true
}
```

**关键教训**：
- 导航高亮应该是**一次性**操作，不应该反复触发
- 监听粒度要合适：监听 `path` 而不是 `query`

---

### 问题2：首次出现检测失败 - 所有标注都显示为subtle

**现象**：
- 长难句和单词的首次出现没有显示应有的样式
- 所有句子都是 `annotated-sentence-subtle` 类（透明背景）
- 所有单词都是 `annotated-word-subtle` 类（无下划线）
- 测试发现：6个句子全是subtle，0个regular

**根本原因**：
代码在检查匹配**之前**就把ID添加到 `firstOccurrence*` Set了：

```typescript
// ❌ 错误逻辑
const isFirstOccurrence = !firstOccurrenceSentences.has(sentence.id)
if (isFirstOccurrence) {
  firstOccurrenceSentences.add(sentence.id)  // 过早添加！
}

if (regex.test(newHtml)) {
  // 实际替换...
}
```

**解决方案**：
只在**成功匹配并替换后**才将ID添加到Set：

```typescript
// ✅ 正确逻辑
if (regex.test(newHtml)) {
  newHtml = newHtml.replace(regex, ...)
  // 成功替换后才标记
  if (isFirstOccurrence) {
    firstOccurrenceSentences.add(sentence.id)
  }
}
```

**关键教训**：
- **时序很重要**：状态更新必须在操作成功之后
- 不要假设检测=执行，要确保操作真正完成后再更新状态

---

### 问题3：跳转不工作 - 页面不滚动

**现象**：
- 点击"跳转原文"后URL正确（有highlight参数）
- 但页面停留在顶部（`scrollY = 0`）
- 没有滚动到目标位置

**根本原因**：
标注是异步的，`handleQueryHighlight` 执行太早：
- `onMounted` 立即调用（300ms延迟）
- 但DOM标注需要更多时间才能完成
- 查询时元素还没有 `data-sentence-id` 属性

**解决方案**：
1. 增加延迟时间：300ms → 500ms
2. 添加重试机制：如果没找到元素，500ms后重试

```typescript
onMounted(() => {
  setTimeout(() => handleQueryHighlight(), 500) // 增加延迟
})

function handleQueryHighlight() {
  // ...
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } else {
    // 重试机制
    hasProcessedHighlight.value = false
    setTimeout(() => handleQueryHighlight(), 500)
  }
}
```

---

### 问题4：Set未重置导致跨页面污染

**现象**：
- 在页面A标注了单词X
- 导航到页面B后，单词X仍被认为是"已出现"
- 导致页面B中单词X的首次出现显示为subtle

**根本原因**：
`firstOccurrence*` Set 在函数外部声明，永不重置。

**解决方案**：
将Set移到函数内部，每次调用都重新创建：

```typescript
function highlightAnnotatedContent() {
  // ✅ 在函数内部 - 每次重置
  const firstOccurrenceWords = new Set<string>()
  const firstOccurrenceSentences = new Set<string>()
  
  // 标注逻辑...
}
```

---

## 2026-01-25：存储迁移与段落翻译

### 问题1：数据突然"丢失"
**现象**：更新代码后，之前保存的生词和长难句都不见了。
**原因**：存储机制从浏览器的 `localStorage` 迁移到了本地文件系统。
**解决方案**：这是预期行为。如需旧数据，需手动从 localStorage 导出并合并到 JSON 文件。

### 问题2：笔记无法保存 (API Error)
**现象**：控制台报错 `POST /api/bilingual-data 404` 或 `500`。
**原因**：
1. **404 Not Found**：Vite 插件未生效，通常因为没有重启开发服务器。
2. **500 Server Error**：文件写入权限问题，或 JSON 格式错误。

**解决方案**：
- **必做**：停止并重启 `pnpm dev`。
- 检查 `C:\Users\<User>\.vuepress-bilingual-data.json` 是否被占用。

### 问题3：翻译框位置偏移
**现象**：翻译框与段落之间有很大空隙。
**原因**：段落 `<p>` 标签默认有 `margin-bottom`。
**解决方案**：使用负边距抵消：
```css
.translation-box-container {
  margin: -16px 0 24px 0;
}
```

---

## 通用调试技巧

### VuePress热更新问题
**现象**：代码修改后不生效

**解决方法**：
1. 完全重启开发服务器（Ctrl+C → pnpm dev）
2. 硬刷新浏览器（Ctrl+Shift+R）
3. 必要时清除浏览器缓存

### 浏览器测试
使用 `browser_subagent` 进行自动化测试：
- 执行JavaScript检查DOM状态
- 截图记录实际显示效果
- 模拟用户操作流程

### CSS优先级问题
如果样式不生效，使用 `!important` 强制应用：
```css
.annotated-sentence {
  background: rgba(74, 144, 226, 0.15) !important;
}
```

---

## 代码审查检查清单

开发类似功能时的检查点：

- [ ] 状态更新时机是否正确（操作成功后才更新）
- [ ] 作用域是否合适（函数内 vs 函数外）
- [ ] 是否有重复触发的风险（添加标志位）
- [ ] 异步操作是否有足够延迟
- [ ] 是否需要重试机制
- [ ] 跨页面状态是否正确清理
- [ ] CSS优先级是否足够
- [ ] 事件监听是否正确解绑
- [ ] 浏览器安全限制是否考虑（window.open, focus等）

---

## 性能优化要点

1. **防抖/节流**：用户交互（悬停、滚动）添加延迟
2. **避免频繁DOM查询**：缓存选择器结果
3. **减少重复标注**：使用 `.annotated-*` 类名跳过已标注元素
4. **懒加载tooltip**：悬停后才渲染，移开立即销毁
5. **标签页复用**：避免打开过多标签页
