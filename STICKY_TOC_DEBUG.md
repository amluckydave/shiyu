# 目录 Sticky 定位调试指南

## 问题诊断

如果目录不跟随页面滚动，请检查以下几点：

### 1. 检查 HTML 结构

正确的结构应该是：
```html
<div class="article-sidebar">
  <div class="article-toc-wrapper">  <!-- sticky 应用在这里 -->
    <aside class="toc-sidebar">
      <!-- 目录内容 -->
    </aside>
  </div>
</div>
```

### 2. 检查 CSS 样式

**关键样式（桌面端）：**

```css
/* 父容器 */
.article-sidebar {
  display: block;
  width: 280px;
  flex-shrink: 0;
  position: relative; /* 重要！ */
}

/* Sticky 容器 */
.article-toc-wrapper {
  position: sticky;
  top: 20px;
  align-self: flex-start;
  height: fit-content;
  max-height: calc(100vh - 40px);
}

/* 目录侧边栏 */
.toc-sidebar {
  position: static; /* 不是 sticky！ */
  width: 280px;
  height: auto;
  max-height: calc(100vh - 40px);
  overflow: hidden;
}
```

### 3. Sticky 定位的要求

`position: sticky` 需要满足以下条件：

1. **父容器不能有 `overflow: hidden`**
   - 检查所有父元素
   - 包括 `overflow-x` 和 `overflow-y`

2. **必须指定至少一个方向的位置**
   - `top`, `bottom`, `left`, 或 `right`
   - 我们使用 `top: 20px`

3. **元素必须在正常文档流中**
   - 不能是 `position: absolute` 或 `fixed`

4. **父容器必须有足够的高度**
   - 父容器高度要大于 sticky 元素
   - 我们的文章内容通常足够长

5. **不能在 flex 容器中使用 `align-items: stretch`**
   - 我们使用 `align-items: flex-start`

### 4. 浏览器开发者工具检查

打开浏览器开发者工具（F12）：

1. **检查元素**
   - 选中 `.article-toc-wrapper`
   - 查看 Computed 样式
   - 确认 `position: sticky` 已应用

2. **检查父容器**
   - 选中 `.article-sidebar`
   - 确认没有 `overflow: hidden`
   - 确认 `position: relative`

3. **滚动测试**
   - 滚动页面
   - 观察元素的 `position` 是否变化
   - Sticky 元素应该在滚动时保持在视口内

### 5. 常见问题

**问题 1: 目录不固定**
- 检查是否在桌面端（宽度 ≥ 1280px）
- 检查 `.article-toc-wrapper` 是否有 `position: sticky`

**问题 2: 目录固定但不滚动**
- 检查 `.toc-content` 是否有 `overflow-y: auto`
- 检查 `max-height` 是否设置正确

**问题 3: 目录位置不对**
- 检查 `top` 值（应该是 20px）
- 检查父容器的 `align-items`（应该是 flex-start）

**问题 4: 移动端显示异常**
- 检查媒体查询是否正确
- 移动端应该使用 `position: fixed`

### 6. 验证步骤

1. 打开文章页面
2. 确保窗口宽度 ≥ 1280px
3. 滚动页面
4. 观察右侧目录是否保持在视口内
5. 目录应该在距离顶部 20px 的位置固定

### 7. 调试代码

在浏览器控制台运行：

```javascript
// 检查 sticky 元素
const wrapper = document.querySelector('.article-toc-wrapper');
console.log('Wrapper position:', getComputedStyle(wrapper).position);
console.log('Wrapper top:', getComputedStyle(wrapper).top);

// 检查父容器
const sidebar = document.querySelector('.article-sidebar');
console.log('Sidebar position:', getComputedStyle(sidebar).position);
console.log('Sidebar overflow:', getComputedStyle(sidebar).overflow);

// 检查祖先元素的 overflow
let parent = wrapper.parentElement;
while (parent) {
  const overflow = getComputedStyle(parent).overflow;
  if (overflow !== 'visible') {
    console.log('Found overflow:', parent.className, overflow);
  }
  parent = parent.parentElement;
}
```

### 8. 解决方案

如果仍然不工作，尝试以下方案：

**方案 A: 使用 JavaScript**
```typescript
const toc = ref<HTMLElement | null>(null)
const tocTop = ref(20)

function handleScroll() {
  if (!toc.value) return
  const scrollY = window.scrollY
  if (scrollY > 100) {
    tocTop.value = 20
  }
}
```

**方案 B: 使用 position: fixed**
```css
.article-toc-wrapper {
  position: fixed;
  top: 20px;
  right: calc((100vw - 1440px) / 2 + 20px);
  width: 280px;
}
```

**方案 C: 使用 IntersectionObserver**
```typescript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // 目录进入视口
    }
  })
})
```

## 当前实现

我们使用的是方案 A 的简化版本：

- `.article-toc-wrapper` 使用 `position: sticky`
- `top: 20px` 距离顶部 20px
- `align-self: flex-start` 在 flex 容器中对齐
- `height: fit-content` 高度自适应
- `max-height: calc(100vh - 40px)` 限制最大高度

这是最简单且性能最好的方案。
