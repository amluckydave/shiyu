<div align="center">

# 📚 Shiyu (拾语)

<p align="center">
  <em>An intelligent bilingual English learning platform with AI-powered annotation, vocabulary management, and complex sentence analysis</em>
</p>

[![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.x-000000.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)

[🚀 Quick Start](#-quick-start) · [✨ Features](#-features) · [� Project Structure](#-project-structure)

</div>

---

## 🌟 Overview

Shiyu is a modern bilingual reading platform designed for English learners. Built as a **pnpm monorepo** with a Vue 3 + Vite frontend and an Express + SQLite backend, it features AI-powered text annotation, vocabulary management, complex sentence analysis, and a premium glassmorphism UI.

## ✨ Features

### 🤖 AI-Powered Translation
- **DeepSeek API Integration** — Automatic word definitions and sentence structure analysis
- **Smart Sentence Parsing** — AI breaks down complex sentences (structure overview, breakdown, translation)
- **Configurable API** — Set your own API key in API Settings page

### 🎯 Smart Annotation System
- **First Occurrence Detection** — Green underline (words) / light blue background (sentences)
- **Hover Tooltips** — Instant definitions on hover with 200ms debounce
- **One-click Toggle** — Enable/disable annotations globally from the user menu

### 📖 Vocabulary & Sentence Bank
- **Vocabulary Notebook** — Save, review, search, sort, and export vocabulary with context
- **Sentence Library** — Store difficult sentences with AI-generated structural analysis
- **Context Navigation** — Jump back to word/sentence in the source article

### � Content Management
- **Article Reader** — Bilingual reading with inline annotations
- **Ebook Reader** — EPUB ebook support with reading progress tracking
- **Daily Quote** — Daily inspirational quotes with calendar-based browsing

### 🔐 Auth & User System
- **Separated Login & Register** — Distinct flows for a better user experience
- **Email + Code Login** — Passwordless authentication via email verification codes
- **Smart Email Validation** — Asynchronous email existence check on blur during registration
- **Secure Invitation Codes** — Single-use, atomic validation, mixed-case codes (case-insensitive)
- **JWT Token** — 7-day token stored in localStorage, auto-refresh on expiry
- **Admin Dashboard** — User management with role-based access control
- **Cloudflare Turnstile** — Optional bot protection for login/register (intelligently skipped on code resend)

### 📊 Data Management
- **Import/Export** — Backup and restore vocabulary, sentences, and API settings (JSON)
- **Replace or Merge** — Choose import mode when restoring data
- **Server-side Storage** — User data synced to SQLite database via REST API

### 🎨 UI/UX
- **Premium Glassmorphism** — Frosted glass nav bar and dropdown with backdrop blur
- **Micro-animations** — Hover scale, translateX shifts, gradient transitions
- **Responsive Design** — Adapts from desktop to mobile
- **Gradient Accent** — Animated top accent line (blue → cyan → teal → green)
- **Local Branding** — Beautiful "拾语" Chinese branding on the homepage and navigation bar

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **pnpm** 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/amluckydave/shiyu.git
cd shiyu

# Install dependencies
pnpm install

# Start development (web + api concurrently)
# PowerShell:
.\scripts\start-dev.ps1

# Or start individually:
cd apps/web && pnpm dev     # http://localhost:5173
cd apps/api && pnpm dev     # http://localhost:3100
```

### API Configuration

1. Log in with your email
2. Open the user dropdown → **API 设置**
3. Enter your DeepSeek API key
4. Click **测试连接** to verify
5. Start annotating with AI-powered translations!

## 📁 Project Structure

```
shiyu/
├── apps/
│   ├── web/                       # Vue 3 + Vite frontend
│   │   └── src/
│   │       ├── components/        # Shared components (ArticleToc, Toolbar*)
│   │       ├── views/             # Page views (Article, Ebook, Login, Admin)
│   │       ├── stores/            # Pinia stores (auth)
│   │       ├── services/          # Axios API client
│   │       ├── legacy/            # Migrated bilingual-pack components
│   │       └── router.ts          # Vue Router with auth guards
│   └── api/                       # Express + SQLite backend
│       └── src/
│           ├── middleware/        # JWT auth, admin guard
│           ├── modules/           # auth, admin, userData routes
│           ├── services/          # Turnstile, email
│           └── database.ts        # SQLite (better-sqlite3)
├── packages/
│   └── shared/                    # Shared types, models, API contracts
├── scripts/                       # Dev helper scripts (start, stop, restart)
├── pnpm-workspace.yaml
└── package.json
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vue 3, Vite 5, TypeScript, Vue Router, Pinia |
| **Backend** | Express 4, better-sqlite3, jsonwebtoken |
| **AI** | DeepSeek API (configurable endpoint) |
| **Auth** | JWT (7-day expiry) + email verification codes |
| **Monorepo** | pnpm workspaces |
| **Bot Protection** | Cloudflare Turnstile (optional) |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**[⬆ Back to Top](#-shiyu-识语)**

Made with ❤️ by [amluckydave](https://github.com/amluckydave)

</div>
