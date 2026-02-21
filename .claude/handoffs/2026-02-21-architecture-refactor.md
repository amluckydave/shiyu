# Handoff: Architecture Refactoring Plan for 鎷捐

## Session Metadata
- Created: 2026-02-21
- Project: e:\addVue\shiyu

## Current State Summary
The user requested to refactor the current VuePress 2 + vuepress-theme-hope project into a modern frontend-backend separated architecture. I have completed a comprehensive analysis of the existing codebase and created a task checklist (in `task.md`) for the refactoring process. I was about to write the detailed implementation plan.

## Codebase Understanding

### Architecture Overview
- The current project "鎷捐" is a bilingual English learning platform.
- It heavily couples Vue 3 components within a VuePress 2 documentation site structure.
- All core business logic is housed in a custom VuePress plugin: `docs/.vuepress/plugins/bilingual-pack/`.
- Backend functionality (saving data) is currently implemented via a Vite plugin (`vite-plugin-filesystem-storage.ts`) that intercepts `/api/bilingual-data` requests and reads/writes to a local JSON file (`~/.vuepress-bilingual-data.json`).
- State management uses a singleton reactive object pattern internally inside `useBilingualData.ts` instead of Pinia/Vuex.

### Critical Files
| File | Purpose | Relevance |
|------|---------|-----------|
| `docs/.vuepress/plugins/bilingual-pack/client/composables/useBilingualData.ts` | Global state management and API syncing | Core data hub for all features |
| `docs/.vuepress/vite-plugin-filesystem-storage.ts` | Mock backend using Vite dev server middleware | Needs to be rewritten as an Express/Node.js backend |
| `docs/.vuepress/config.ts` | VuePress config | Contains proxy settings and auto-article detection logic that must move to the backend |
| `docs/.vuepress/styles/index.scss` | Global styles | Contains 350+ lines of `!important` overrides to fight the VuePress theme. Needs complete rewrite in the new frontend. |

### Key Patterns Discovered
- **Composables**: Business logic is neatly isolated in composables (e.g., `useVocabulary`, `useSentenceBank`, `useTextSelection`). These can be copied directly to the new Vue 3 frontend.
- **Cross-Window Communication**: Uses `BroadcastChannel` in `channelMessaging.ts` to sync data across different tabs.
- **Data Persistence**: Uses a debounced `watch` on the global reactive `data` object to auto-save to the backend.

## Work Completed
### Tasks Finished
- [x] Analyzed existing project structure and dependency relationships.
- [x] Created `task.md` (in the agent's brain directory) with the full refactoring roadmap.

## Pending Work
### Immediate Next Steps
1. Write the `implementation_plan.md` artifact detailing the new architecture (Vue 3 + Vite + Vue Router + Pinia for Frontend, Express + TS for Backend).
2. Request user review of the implementation plan via `notify_user` (or normal message since we might not be in a task right now).
3. Set up the new monorepo structure once approved.

## Context for Resuming Agent
### Important Context
The core business logic is actually very clean Vue 3 Composition API code, located entirely within `docs/.vuepress/plugins/bilingual-pack/client/`. The main challenge is extracting these Vue components and composables out of the VuePress environment. 
Currently, markdown files (like `docs/vocabulary.md`) are just wrappers that contain a single Vue component (e.g. `<VocabularyNotebook />`). In the new architecture, these should become proper Vue Router page views.

### Potential Gotchas
- The `isReloading` flag in `useBilingualData.ts` is critical to prevent infinite save loops when multiple windows sync data. Do not refactor this out accidentally.
- The `EbookReader.vue` uses `cfi` parameters in URLs to track highlights in EPUB files. This routing logic must be preserved in Vue Router.
