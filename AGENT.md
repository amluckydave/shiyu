# 拾语项目 Agent 规则

> **每次开始任何代码修改任务之前，必须先阅读本文件和技术文档！**

---

## 🚨 强制前置步骤

在对项目代码进行任何修改之前，**必须**完成以下步骤：

1. **阅读技术架构文档**
   ```
   docs/.vuepress/ARCHITECTURE.md
   ```
   这份文档包含了项目的核心架构、数据流、关键设计约束和常见陷阱。

2. **了解项目结构**
   ```
   .agent/PROJECT_OVERVIEW.md
   ```

3. **查看常见问题**
   ```
   .agent/TROUBLESHOOTING.md
   ```

---

## 📝 Commit 后更新文档

当用户完成代码修改并执行 `git commit` 后，**必须主动更新技术文档**：

1. **更新 `ARCHITECTURE.md`**
   - 如果修改了核心逻辑、数据流或 API，更新相应章节
   - 如果添加了新组件或模块，添加到项目结构和组件详解
   - 如果修复了 bug，添加到版本历史表格
   - 如果发现了新的陷阱，添加到常见陷阱表格

2. **更新格式**
   ```markdown
   ## 版本历史
   
   | 日期 | 修改 | 原因 |
   |------|------|------|
   | YYYY-MM-DD | 简述修改内容 | 修改原因 |
   ```

3. **更新时机**
   - 用户说 "commit"、"提交" 或执行 git commit 命令后
   - 主动询问用户是否需要更新文档
   - 不要等用户要求，**主动执行**

---

## ⚠️ 关键设计约束（必读摘要）

以下是**绝对不能违反**的设计约束：

| 约束 | 说明 | 文件位置 |
|------|------|----------|
| `isReloading` 标志 | 防止数据同步无限循环，**绝不能删除** | `useBilingualData.ts` |
| 全量替换策略 | vocabulary/sentences POST 时必须发送**完整数组** | `vite-plugin-filesystem-storage.ts` |
| 阅读器路径格式 | 必须包含 `book` 和 `cfi` 参数 | `EbookReader.vue` |
| 跨窗口通知 | 数据变更后必须调用 `notifyDataChanged()` | `channelMessaging.ts` |
| 单例数据 | 所有 composables 共享同一个 `data` 对象 | `useBilingualData.ts` |

---

## 📁 核心文件路径

```
docs/.vuepress/
├── ARCHITECTURE.md                    # 🌟 技术架构文档（必读！）
├── vite-plugin-filesystem-storage.ts  # 服务端 API
├── components/
│   └── EbookReader.vue                # 电子书阅读器
│
└── plugins/bilingual-pack/client/
    ├── composables/
    │   ├── useBilingualData.ts        # 🌟 数据管理核心
    │   ├── useVocabulary.ts           # 生词本操作
    │   ├── useSentenceBank.ts         # 长难句操作
    │   └── useParagraphTranslation.ts # 段落翻译
    │
    ├── components/
    │   ├── VocabularyNotebook.vue     # 生词本页面
    │   ├── SentenceBank.vue           # 长难句页面
    │   ├── BilingualReader.vue        # 双语阅读器
    │   └── AnnotationForm.vue         # 标注对话框
    │
    └── utils/
        ├── articleNavigation.ts       # 文章导航
        └── channelMessaging.ts        # 跨窗口通信
```

---

## 🔧 开发命令

```bash
# 启动开发服务器
pnpm dev --port 8081

# 构建生产版本
pnpm build

# 数据存储位置
~/.vuepress-bilingual-data.json
```

---

## 📌 修改前检查清单

- [ ] 已阅读 `ARCHITECTURE.md`
- [ ] 理解相关模块的数据流
- [ ] 确认修改不会破坏 `isReloading` 逻辑
- [ ] 如果涉及数据保存，确保发送完整数组
- [ ] 如果涉及跨窗口，调用 `notifyDataChanged()`
- [ ] 如果涉及阅读器标注，保存完整的 `book` + `cfi` 参数

---

*最后更新: 2026-02-06*
