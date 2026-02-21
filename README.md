<div align="center">

# 📚 Shiyu

<p align="center">
  <em>An intelligent English learning platform with AI-powered annotation, vocabulary management, and complex sentence analysis</em>
</p>

[![VuePress](https://img.shields.io/badge/VuePress-2.x-green.svg)](https://v2.vuepress.vuejs.org/)
[![Theme Hope](https://img.shields.io/badge/Theme-Hope-blue.svg)](https://theme-hope.vuejs.press/)
[![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/release/amluckydave/shiyu.svg)](https://github.com/amluckydave/shiyu/releases/latest)

[📖 Documentation](https://amluckydave.github.io/shiyu) · [🚀 Quick Start](#-quick-start) · [✨ Features](#-features) · [📝 Changelog](CHANGELOG.md)

</div>

---

## 🌟 Overview

A VuePress-based bilingual learning platform designed for English learners. Features AI-powered text annotation, vocabulary management, complex sentence analysis, and a modern, intuitive interface with smooth animations.

## ✨ Features

### 🤖 AI-Powered Translation
- **DeepSeek API Integration**: Automatic word definitions and sentence structure analysis
- **Smart Sentence Parsing**: AI breaks down complex sentences into:
  - 结构总述 (Structure Overview)
  - 结构分解 (Structure Breakdown)
  - 中文释义 (Chinese Translation)
- **Configurable API**: Set your own API key in API Settings page

### 🎯 Smart Annotation System
- **First Occurrence Detection**: Visual markers only on first appearance
  - Words: Green underline
  - Sentences: Light blue background
- **Subsequent Occurrences**: Clean appearance with hover tooltips
- **Smooth Delete Animation**: Items fade out while remaining items move up instantly

### 💡 Hover Tooltips
- **Instant Display**: Hover to see definitions—no clicking needed
- **Auto-width**: Adapts to content length
- **200ms Debounce**: Smooth interaction without flickering
- **Modern Design**: Semi-transparent with backdrop blur

### 📖 Vocabulary Notebook (生词本)
- **Word Bank**: Save and review vocabulary with context
- **Review Tracking**: Track review count and progress
- **Search & Sort**: Filter by keyword, sort by date/alphabet/review count
- **CSV Export**: Export vocabulary for external study tools
- **Jump to Context**: Click to navigate to word in original article

### 📝 Sentence Bank (长难句库)
- **Complex Sentence Storage**: Save difficult sentences with AI analysis
- **Structure Display**: View summary, breakdown, and translation separately
- **Review System**: Track sentence review progress
- **Context Navigation**: Jump back to sentence in source article

### 📄 Article Manager (文章管理)
- **Article Library**: Manage all your reading articles
- **Reading Progress**: Track which articles you've completed
- **Quick Navigation**: Fast access to any article

### 🌅 Daily Quote (每日一句)
- **ONE · 一个**: Daily inspirational quotes from ONE API
- **Floating Button**: Quick access from any page
- **Auto-refresh**: New quote every day

### 📊 Data Management
- **Cross-Browser Sync**: Data stored in local file system
- **Import/Export**: Backup and restore all learning data
- **Persistent Storage**: Data survives browser cache clearing

### ⚙️ API Settings (API 设置)
- **DeepSeek Configuration**: Set API key and endpoint
- **Connection Test**: Verify API connectivity
- **Custom Models**: Choose different AI models

### 🎨 UI/UX Enhancements
- **Smooth Animations**: Polished enter/leave transitions
- **Responsive Design**: Works on desktop and mobile
- **Dark Mode Support**: Automatic theme switching
- **Modern Glassmorphism**: Beautiful transparent effects

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/amluckydave/shiyu.git
cd shiyu

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

Visit `http://localhost:8080` to see the site in action.

### API Configuration

1. Navigate to **API 设置** page
2. Enter your DeepSeek API key
3. Click **测试连接** to verify
4. Start annotating with AI-powered translations!

## 📁 Project Structure

```
shiyu/
├── docs/
│   ├── .vuepress/
│   │   ├── plugins/
│   │   │   └── bilingual-pack/     # Core plugin
│   │   │       ├── client/
│   │   │       │   ├── components/ # Vue components
│   │   │       │   │   ├── ApiSettings.vue        # API configuration
│   │   │       │   │   ├── ArticleManager.vue     # Article management
│   │   │       │   │   ├── BilingualReader.vue    # Main reader
│   │   │       │   │   ├── NavbarDailyQuote.vue   # Daily quote widget
│   │   │       │   │   ├── NavbarDataManager.vue  # Data import/export
│   │   │       │   │   ├── SentenceBank.vue       # Sentence library
│   │   │       │   │   └── VocabularyNotebook.vue # Vocabulary manager
│   │   │       │   └── composables/# State management
│   │   │       └── node/          # Plugin registration
│   │   ├── theme.ts               # Theme config
│   │   └── config.ts              # Site config
│   ├── demo/                      # Sample articles
│   ├── vocabulary.md              # Vocabulary page
│   ├── sentences.md               # Sentence bank page
│   ├── articles.md                # Article manager page
│   └── api-settings.md            # API settings page
├── .agent/
│   ├── PROJECT_OVERVIEW.md        # Project documentation
│   └── TROUBLESHOOTING.md         # Debug guide
└── package.json
```

## 🎨 How It Works

### 1. Text Selection & Annotation
Select any word or sentence in an article to annotate it. AI automatically provides:
- Word definitions with pronunciation
- Sentence structure analysis
- Chinese translations

### 2. Smart First-Occurrence Tracking
The system tracks which words/sentences have appeared:
- **First time**: Shows prominent visual marker
- **Later times**: Clean text with tooltip on hover

### 3. Persistent Storage
All data is stored in the **Local File System**:
- **Location**: `~/.vuepress-bilingual-data.json` (User home directory)
- **Cross-browser Sync**: Access your notes from any browser
- **Permanent**: Data persists even if you clear browser cache

### 4. Review & Export
- Review vocabulary and sentences with spaced repetition
- Export to CSV for use with Anki or other flashcard apps
- Track your learning progress over time

## 🛠️ Tech Stack

- **Framework**: [VuePress 2](https://v2.vuepress.vuejs.org/)
- **Theme**: [VuePress Theme Hope](https://theme-hope.vuejs.press/)
- **UI**: Vue 3 + TypeScript
- **AI**: DeepSeek API for translations
- **Build Tool**: Vite
- **Package Manager**: pnpm

## 📚 Documentation

- [Project Overview](.agent/PROJECT_OVERVIEW.md) - Architecture and features
- [Troubleshooting Guide](.agent/TROUBLESHOOTING.md) - Common issues and solutions

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 💬 Contact

- GitHub: [@amluckydave](https://github.com/amluckydave)
- Issues: [GitHub Issues](https://github.com/amluckydave/shiyu/issues)

---

<div align="center">

**[⬆ Back to Top](#-shiyu)**

Made with ❤️ by [amluckydave](https://github.com/amluckydave)

</div>
