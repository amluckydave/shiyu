<div align="center">
  <img src="public/logo.png" alt="拾语" width="120" />
  <h1>拾语 (Shiyu)</h1>
  <p><strong>智能英语学习桌面应用</strong></p>
  <p>在真实语境中高效学习英语 · AI 驱动 · 本地优先</p>

  <br/>

  [![Version](https://img.shields.io/badge/version-0.2.3-brightgreen.svg)](https://github.com/amluckydave/shiyu/releases)
  [![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
  [![Tauri](https://img.shields.io/badge/Tauri-2-24C8D8?logo=tauri&logoColor=white)](https://v2.tauri.app)
  [![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org)
  [![Rust](https://img.shields.io/badge/Rust-stable-DEA584?logo=rust&logoColor=white)](https://www.rust-lang.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![Platform](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows&logoColor=white)](https://github.com/amluckydave/shiyu/releases)

</div>

---

## 📖 项目介绍

拾语是一款开源的英语学习桌面应用，集成 AI 翻译、文章阅读标注、生词/句子管理、SRS 间隔复习、思维导图、OCR 导入、EPUB 提取等功能。

基于 **Tauri 2 + Vue 3 + Rust** 构建，数据全部存储在本地，隐私安全。

<div align="center">
  <img src="public/intro.gif" alt="拾语演示" width="800" />
</div>

## ✨ 核心功能

| 功能 | 说明 |
|---|---|
| 📖 **文章阅读 & 标注** | 沉浸式 Markdown 阅读器，划词添加生词/句子，高亮标注 |
| 🧠 **AI 思维导图** | 一键分析文章结构，中英双语切换，缓存秒开 |
| 🤖 **AI 翻译 & 解析** | 流式翻译，句子成分彩色标注，兼容 DeepSeek/OpenAI |
| 📝 **生词本 & 句子库** | 搜索、批量操作、来源跳转、TTS 朗读 |
| 🔄 **SRS 间隔复习** | FSRS 算法闪卡，4 级评分，键盘快捷键 |
| ✍️ **在线编辑** | md-editor-v3 全功能编辑器，实时预览 |
| 📚 **EPUB 导入** | 解析目录，按章节提取，图片自动保存 |
| 📷 **OCR 导入** | PP-StructureV3 识别 + AI 校正，一键导入 |
| 📦 **数据管理** | JSON 导入/导出，支持合并或覆盖 |

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + Vue Router + Pinia |
| 桌面运行时 | Tauri 2 |
| 后端 | Rust + rusqlite (SQLite) + reqwest + tokio |
| AI | DeepSeek / OpenAI 兼容接口（流式 SSE） |
| 解析渲染 | epub + html2md + scraper + marked + md-editor-v3 |
| 思维导图 | markmap-lib + markmap-view |
| 复习算法 | ts-fsrs (FSRS) |
| 语音 | edge-tts-universal（三级缓存） |

## 🚀 快速开始

### 环境要求

- Node.js 18+ / pnpm
- Rust stable toolchain
- Tauri 2 平台依赖（Windows: VS C++ Build Tools + WebView2）

### 安装 & 运行

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm tauri dev

# 生产构建
pnpm tauri build
```

### 首次配置

打开应用 → 设置页面，配置：
- `API Key` — AI API 密钥
- `API URL` — API 地址（默认 DeepSeek）
- `API Model` — 模型名称

## 📁 项目结构

```
src/
├── views/              # 页面
├── components/         # 组件
├── composables/        # 组合式逻辑
├── stores/             # Pinia 状态管理
├── services/           # API 封装
├── constants/          # 应用常量
└── styles/             # 全局样式

src-tauri/
├── src/commands/       # Tauri 命令
├── src/repositories/   # 数据访问层
├── src/models.rs       # 数据模型
├── src/db.rs           # SQLite 初始化
└── tauri.conf.json     # 应用配置
```

## 💾 数据存储

| 数据 | 路径 |
|---|---|
| 数据库 | `~/.shiyu/shiyu.db` (SQLite) |
| 图片 | `~/.shiyu/images/` |
| TTS 缓存 | `~/.shiyu/tts-cache/` |

## 🔗 友情链接

- [LINUX DO](https://linux.do/) — 感谢 LINUX DO 社区的支持与推广

---

<div align="center">

## 📄 License

[MIT](./LICENSE) © 2026 amluckydave

Made with ❤️ for English learners

</div>
