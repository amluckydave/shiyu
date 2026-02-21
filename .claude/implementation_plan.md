# Implementation Plan: VuePress Plugin Monolith -> Frontend/Backend Split

Date: 2026-02-21
Executor: Codex
Source handoff: `.claude/handoffs/2026-02-21-architecture-refactor.md`

## 1. Current-State Facts (Verified from Code)

1. Core product logic is in `docs/.vuepress/plugins/bilingual-pack/client/` (components, composables, utils, types).
2. Data persistence is a Vite dev middleware at `docs/.vuepress/vite-plugin-filesystem-storage.ts`, serving `GET/POST /api/bilingual-data` and writing `~/.vuepress-bilingual-data.json`.
3. Global data state is a singleton reactive object in `docs/.vuepress/plugins/bilingual-pack/client/composables/useBilingualData.ts`.
4. `isReloading` in `useBilingualData.ts` is the loop guard that prevents `reload -> watch -> save -> reload` recursion.
5. Reader deep-link behavior depends on `/reader...` paths containing `book` and `cfi` params (`docs/.vuepress/plugins/bilingual-pack/client/utils/articleNavigation.ts` and `docs/.vuepress/components/EbookReader.vue`).
6. Cross-tab sync depends on `BroadcastChannel` message schema in `docs/.vuepress/plugins/bilingual-pack/client/utils/channelMessaging.ts`.
7. Article list currently comes from VuePress temp module import `@temp/internal/article-data` (`docs/.vuepress/plugins/bilingual-pack/client/composables/useArticles.ts`) generated in `docs/.vuepress/config.ts`.
8. Existing tests are mostly utility-level Vitest tests under `docs/.vuepress/plugins/bilingual-pack/client/utils/*.test.ts`.

## 2. Target Architecture

Adopt a workspace-monorepo split:

```text
shiyu/
  apps/
    web/                # Vue 3 + Vite + Vue Router + Pinia
    api/                # Express + TypeScript
  packages/
    shared/             # shared DTO types + schema validation
  docs/                 # keep legacy VuePress app during migration
```

Runtime boundaries:

1. `apps/web` owns UI rendering, routing, state, and browser integrations.
2. `apps/api` owns persistence, article metadata indexing, ebook metadata serving, and third-party proxy endpoints.
3. `packages/shared` owns request/response contracts and data models used by both apps.

## 3. Scope and Non-Goals

In scope:

1. Migrate business app features from VuePress plugin to standalone web app + api service.
2. Preserve behavioral compatibility for existing users and stored data.
3. Add missing automated tests around data loop guard and reader navigation contracts.

Out of scope (for this migration pass):

1. Rewriting business rules that already work.
2. Changing persisted data shape in a breaking way.
3. Replacing foliate-js integration strategy during initial cutover.

## 4. Compatibility Invariants (Must Hold)

1. `isReloading` loop guard behavior stays intact in the new store/service.
2. Reader jump links keep `book` and `cfi` query params end-to-end.
3. Broadcast channel protocol and window naming semantics remain compatible:
   - channel name: `bilingual-navigation`
   - targets: `vocabulary`, `sentences`, `article`
   - data-change messages for `vocabulary` and `sentences`
4. `/api/bilingual-data` merge semantics remain equivalent:
   - `vocabulary` array: replace wholesale when provided
   - `sentences` array: replace wholesale when provided
   - `translations` object: shallow merge

## 5. API Contract Baseline (v1)

Primary endpoints:

1. `GET /api/v1/bilingual-data`
2. `POST /api/v1/bilingual-data`
3. `GET /api/v1/articles` (replaces runtime dependency on `@temp/internal/article-data`)
4. `GET /api/v1/ebooks/books` (serves normalized `books.json` metadata)
5. `GET /api/v1/daily-quote` and/or `GET /api/v1/one` proxy route(s) to replace dev-only Vite proxy behavior from `docs/.vuepress/config.ts`.

Contract ownership:

1. Request/response types live in `packages/shared`.
2. API handler validation uses shared schema at runtime in `apps/api`.
3. `apps/web` imports shared types, no local duplicate DTO definitions.

## 6. Migration Mapping (Old -> New)

1. `docs/.vuepress/plugins/bilingual-pack/client/composables/useBilingualData.ts`
   -> `apps/web/src/stores/bilingualData.ts` (Pinia store, same save/reload contract).
2. `docs/.vuepress/vite-plugin-filesystem-storage.ts`
   -> `apps/api/src/modules/bilingualData/*` (Express routes + file repository).
3. `docs/.vuepress/plugins/bilingual-pack/client/composables/useVocabulary.ts`
   -> `apps/web/src/modules/vocabulary/*`.
4. `docs/.vuepress/plugins/bilingual-pack/client/composables/useSentenceBank.ts`
   -> `apps/web/src/modules/sentences/*`.
5. `docs/.vuepress/plugins/bilingual-pack/client/composables/useParagraphTranslation.ts`
   -> `apps/web/src/modules/translations/*`.
6. `docs/.vuepress/plugins/bilingual-pack/client/utils/channelMessaging.ts`
   -> `apps/web/src/services/channelMessaging.ts`.
7. `docs/.vuepress/plugins/bilingual-pack/client/utils/articleNavigation.ts`
   -> `apps/web/src/services/articleNavigation.ts`.
8. `docs/*.md` wrapper pages (vocabulary/sentences/articles/api-settings/reader)
   -> `apps/web/src/views/*` + Vue Router routes.

## 7. Execution Plan by Phase

### Phase 0 - Workspace Bootstrapping

Deliverables:

1. Add workspace config and app/package skeleton (`apps/web`, `apps/api`, `packages/shared`).
2. Keep current VuePress app runnable during transition.

Exit criteria:

1. `pnpm -r test` runs without breaking legacy tests.
2. No runtime changes to current `docs` app yet.

### Phase 1 - Shared Contracts

Deliverables:

1. Extract `VocabularyWord`, `SavedSentence`, `SavedTranslation` into `packages/shared`.
2. Define request/response DTOs for `bilingual-data` and article/ebook endpoints.

Exit criteria:

1. Both `apps/web` and `apps/api` compile against shared types.
2. No duplicated contract definitions in both apps.

### Phase 2 - API Parity Layer (Express)

Deliverables:

1. Implement `GET/POST /api/v1/bilingual-data` with parity semantics.
2. Implement local file repository abstraction targeting `~/.vuepress-bilingual-data.json`.
3. Add endpoint tests for replace/merge behavior and malformed payloads.

Exit criteria:

1. Contract tests prove parity with old plugin behavior.
2. File persistence works with real local path on Windows.

### Phase 3 - State Layer Migration (Pinia)

Deliverables:

1. Implement `bilingualData` store preserving:
   - init load
   - reload
   - debounced save
   - `isReloading` loop prevention
2. Migrate dependent composable logic to call store actions/selectors.

Exit criteria:

1. Unit tests cover no-loop guarantee and save timing behavior.
2. Vocabulary/sentence updates persist through new API.

### Phase 4 - Route + View Migration

Deliverables:

1. Build Vue Router routes equivalent to legacy pages:
   - `/`
   - `/vocabulary`
   - `/sentences`
   - `/articles`
   - `/reader`
   - `/api-settings`
2. Port component containers and replace VuePress-only assumptions.

Exit criteria:

1. Core navigation paths are functional in `apps/web`.
2. Legacy reader jump (`book` + `cfi`) works from notebook/sentence pages.

### Phase 5 - Channel + Navigation Parity

Deliverables:

1. Port `channelMessaging` and `articleNavigation` services.
2. Keep message/ack timeout behavior and window naming contract.

Exit criteria:

1. Cross-window jump works for article and reader paths.
2. Cross-tab data change sync updates list screens.

### Phase 6 - Article/Ebook Data Decoupling

Deliverables:

1. Replace `@temp/internal/article-data` dependency with API-backed article index.
2. Serve ebook metadata/files through API/static strategy.

Exit criteria:

1. Article manager renders with API data in dev and production.
2. Ebook list and reader open flow remain stable.

### Phase 7 - Cutover, Verification, and Cleanup

Deliverables:

1. Run local automated verification matrix (unit, smoke, functional).
2. Switch default dev flow to `apps/web + apps/api`.
3. Remove or isolate legacy VuePress business plugin path after acceptance.

Exit criteria:

1. Feature parity checklist passes.
2. Legacy critical constraints pass regression tests.

## 8. Test and Verification Strategy

Unit tests:

1. Store behavior (`isReloading`, debounce save, merge update path).
2. Navigation helpers (`buildArticleUrl`, reader detection, channel ack flow).
3. DTO validation and repository write/read edge cases.

API tests:

1. `GET /bilingual-data` empty-file behavior.
2. `POST` array replacement for `vocabulary` and `sentences`.
3. `POST` shallow-merge for `translations`.
4. Corrupt JSON file recovery behavior.

Smoke tests:

1. Open app, annotate word, refresh, data persists.
2. Open sentence bank and jump back to source location.
3. Reader note jump lands with correct `book` + `cfi`.

Functional tests:

1. Multi-window sync for vocabulary/sentences.
2. Import/export flow round-trip with valid and invalid payload.
3. Daily quote panel still fetches data via backend proxy route.

## 9. Risk Register and Mitigation

1. Risk: hidden coupling with VuePress internals (`@temp`, theme classes).
   Mitigation: isolate UI shell migration first; remove one coupling at a time with snapshot checks.
2. Risk: data loop regression after store migration.
   Mitigation: ship explicit regression tests around save/reload loop prevention.
3. Risk: reader deep-link regressions.
   Mitigation: add route contract tests and end-to-end jump checks for `book` + `cfi`.
4. Risk: API behavior drift during rewrite.
   Mitigation: parity tests against old route semantics before cutover.

## 10. Rollback Strategy

1. Keep legacy `docs/.vuepress` app runnable until Phase 7 sign-off.
2. Route cutover behind environment flag (`USE_NEW_WEB_APP`, `USE_NEW_API`).
3. Maintain compatibility reader links in both old and new clients during transition.
4. If regression is found, flip traffic/dev usage back to legacy app and keep data file format unchanged.

## 11. Immediate Next Actions

1. Create workspace skeleton and shared contract package (Phase 0 + Phase 1 start).
2. Implement API parity for `bilingual-data` with tests (Phase 2).
3. Migrate `useBilingualData` semantics into Pinia store before moving heavy UI components (Phase 3 first, then Phase 4).
