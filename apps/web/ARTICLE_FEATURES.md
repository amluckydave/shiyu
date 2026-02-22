# 文章阅读页面功能说明

## 功能概览

文章阅读页面提供了完整的阅读体验，包括标题显示、侧边目录、回到顶部等功能。

## 主要功能

### 1. 文章标题区域

**显示内容：**
- 文章标题（大标题）
- 返回列表按钮（带悬停动画）
- 元数据信息：
  - 📅 发布日期
  - 👤 作者
  - ⏱️ 阅读时间（自动计算）
  - 🏷️ 分类标签

**特点：**
- 响应式设计，移动端自适应
- 优雅的图标和排版
- 清晰的视觉层次

### 2. 侧边目录导航

**桌面端（≥1280px）：**
- 固定在右侧边栏
- 使用 `position: sticky` 跟随页面滚动
- `top: 20px` 距离顶部 20px
- 自动调整高度，最大高度 `calc(100vh - 40px)`
- 白色卡片样式，带圆角和边框

**移动端（<1280px）：**
- 右下角浮动按钮
- 点击展开侧边栏
- 带数字徽章显示目录项数量
- 点击目录项后自动关闭

**交互功能：**
- ✅ 自动提取 h1-h4 标题
- ✅ 点击平滑滚动到对应位置
- ✅ 滚动时自动高亮当前章节
- ✅ 多级标题层次显示
- ✅ 悬停效果和动画

**目录跟随滚动的实现：**
```css
.toc-sidebar {
  position: sticky;
  top: 20px;
  align-self: flex-start;
}
```

### 3. 回到顶部按钮

**位置：**
- 移动端：右下角，目录按钮上方（bottom: 96px）
- 桌面端：右下角（bottom: 24px）

**显示逻辑：**
- 页面滚动超过 300px 时显示
- 使用淡入淡出 + 缩放动画

**样式特点：**
- 紫色渐变背景
- 圆形按钮，48x48px
- 向上箭头图标带弹跳动画
- 悬停时放大和上移效果

**点击效果：**
- 平滑滚动到页面顶部
- 使用 `behavior: "smooth"`

### 4. 美化的阅读体验

**内容区域：**
- 白色卡片背景
- 圆角和阴影效果
- 优化的行高和字体大小
- 响应式排版

**元素样式：**
- 标题：清晰的层次结构
- 链接：悬停下划线效果
- 引用块：左侧蓝色边框 + 渐变背景
- 代码块：深色背景 + 语法高亮
- 表格：悬停行高亮
- 图片：圆角 + 阴影

## 技术实现

### 目录跟随滚动

使用 CSS `position: sticky` 实现：

```css
.toc-sidebar {
  position: sticky;
  top: 20px;
  height: fit-content;
  max-height: calc(100vh - 40px);
  align-self: flex-start;
}
```

关键点：
1. `position: sticky` - 粘性定位
2. `top: 20px` - 距离顶部 20px 开始固定
3. `align-self: flex-start` - 在 flex 容器中对齐到顶部
4. `height: fit-content` - 高度自适应内容
5. `max-height` - 限制最大高度，避免超出视口

### 回到顶部按钮

**显示/隐藏逻辑：**
```typescript
function handleScroll() {
  showScrollTop.value = window.scrollY > 300
  // ... 其他逻辑
}
```

**滚动到顶部：**
```typescript
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  })
}
```

**动画效果：**
```css
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(10px);
}
```

### 阅读时间计算

```typescript
const readingTime = computed(() => {
  if (!articleHtml.value) return 0
  const text = articleHtml.value.replace(/<[^>]*>/g, "")
  const charCount = text.length
  const minutes = Math.ceil(charCount / 200) // 每分钟 200 字
  return minutes
})
```

## 响应式设计

### 断点设置

- **移动端**: < 768px
- **平板**: 768px - 1279px
- **桌面端**: ≥ 1280px
- **大屏**: ≥ 1600px

### 适配策略

**移动端：**
- 单列布局
- 浮动按钮（目录 + 回到顶部）
- 较小的字体和间距
- 侧边栏全屏展开

**桌面端：**
- 双列布局（内容 + 目录）
- 目录固定在右侧
- 回到顶部按钮在右下角
- 更大的字体和间距

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- 移动端浏览器

## 性能优化

1. **防抖处理**: 滚动事件使用 passive 监听
2. **延迟生成**: 目录生成延迟 300ms，确保内容已渲染
3. **CSS 动画**: 使用 transform 和 opacity，GPU 加速
4. **条件渲染**: 回到顶部按钮仅在需要时显示

## 使用建议

1. 确保文章内容包含 h1-h4 标题，以生成目录
2. 标题文本应简洁明了，便于目录显示
3. 避免标题嵌套过深（建议最多 4 级）
4. 长文章建议使用更多的二级标题，便于导航

## 未来改进

- [ ] 目录搜索功能
- [ ] 目录折叠/展开
- [ ] 阅读进度条
- [ ] 字体大小调节
- [ ] 夜间模式
- [ ] 打印优化
- [ ] 分享功能
