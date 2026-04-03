# Tasks: WhatsApp Share Target — Auto-ingest Expert Forecasts

**Input**: Design documents from `/specs/002-whatsapp-share-target/`
**Branch**: `002-whatsapp-share-target`
**Stack**: TypeScript 5.x · SvelteKit 2 · Svelte 5 (runes) · vite-plugin-pwa · Vitest · Playwright

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US1, US2)

---

## Phase 1: Setup

**Purpose**: Manifest and route scaffolding — no new dependencies required.

- [X] T001 Add `share_target` and `launch_handler` fields to `static/manifest.webmanifest` per contracts/share-target.md
- [X] T002 [P] Create `src/routes/share-target/+page.svelte` as an empty skeleton with `export const ssr = false` and a `<p>Verwerken…</p>` placeholder
- [X] T003 [P] Create `src/routes/expert/[id]/+page.svelte` as an empty skeleton that reads `params.id` and renders a placeholder heading

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared store and component needed by both user stories.

**⚠️ CRITICAL**: Share-target route (US1) and re-parse route (US2) both depend on these.

- [X] T004 Implement `src/lib/stores/undoToast.ts`: export `undoToast` writable store (`UndoToastState | null`), `showUndoToast(expertMessageId: string): void` (generates UUID id, stores `expertMessageId` and `timeoutId: null`), `clearUndoToast(): void` (cancels any stored `timeoutId` then sets store to null). `UndoToastState = { id: string; expertMessageId: string; timeoutId: ReturnType<typeof setTimeout> | null }`. No persistence — memory only.
- [X] T005 [P] Add `updateExpertMessage(id: string, rawText: string, newDate: Date): ExpertMessage` to `src/lib/stores/expertMessages.ts`: find existing message by id, re-run `parseDutchForecast(rawText, newDate)`, preserve original id, update `ingestedAt` to `newDate.toISOString()`, replace `comparison` with fresh divergence records, persist updated array to localStorage, update store, return updated message. Throw if id not found.
- [X] T006 [P] Implement `src/components/UndoToast.svelte` in Svelte 5 runes mode: subscribes to `undoToast` store via `$undoToast`; renders a fixed-position overlay (bottom centre, `z-index: 100`) only when store is non-null; shows message "Voorspelling opgeslagen ✓"; **Ongedaan maken** button calls `removeExpertMessage(toast.expertMessageId)` then `clearUndoToast()`; **Bewerken** button calls `goto('/expert/' + toast.expertMessageId)` then `clearUndoToast()`; uses `$effect` with cleanup return to set a `setTimeout(clearUndoToast, 3000)` when toast appears (store the handle back into `undoToast` via a store update so `clearUndoToast` can cancel it); renders a CSS progress bar that shrinks over 3 seconds using a `animation: shrink 3s linear forwards` keyframe; `role="status" aria-live="polite" aria-atomic="true"` on the container
- [X] T007 Mount `<UndoToast />` inside the `<div class="app-shell">` in `src/routes/+layout.svelte`, imported from `$components/UndoToast.svelte`

**Checkpoint**: `UndoToast` renders when store is set; dismisses after 3 s; undo and edit buttons work.

---

## Phase 3: User Story 1 — Share from WhatsApp, auto-ingest (Priority: P1) 🎯 MVP

**Goal**: Share → Surfforecast appears in share sheet → message ingested → undo toast on dashboard.

**Independent Test**: Navigate to `http://localhost:5173/share-target?text=Vrijdag+heuphoog+met+zuid+4bft+offshore.` in the browser. App redirects to `/` and the undo toast appears at the bottom. Expert messages list gains one entry. Tap Ongedaan maken → entry is removed.

- [X] T008 [US1] Implement `src/routes/share-target/+page.svelte`: in `$effect` (browser-only), read `const text = new URL(window.location.href).searchParams.get('text')?.trim() ?? ''`; if blank, call `goto('/')` and return; truncate `text` to 1500 characters if longer; call `addExpertMessage(text, new Date())` to get the new message; call `showUndoToast(message.id)`; call `goto('/')`. Render a minimal "Verwerken…" loading state as the visible DOM (the effect fires immediately so users rarely see it). Set `export const ssr = false` at top of `<script module>`.
- [X] T009 [US1] Write E2E test `tests/e2e/shareTarget.spec.ts`: navigate to `/share-target?text=Vrijdag+heuphoog+met+zuidwest+4bft+offshore.+Schev+goed+tot+10u.`; assert redirect to `/`; assert `.toast-content` is visible; assert `expertMessages` localStorage key contains one entry; click **Ongedaan maken**; assert localStorage entry is removed and toast is gone.

**Checkpoint**: Sharing any text via the URL works end-to-end. Undo removes the entry.

---

## Phase 4: User Story 2 — Correct reference date after auto-ingest (Priority: P2)

**Goal**: Toast "Bewerken" → detail page with date picker → re-parse → updated resolved dates.

**Independent Test**: Auto-ingest a message via `/share-target?text=…`, tap Bewerken in the toast, change the date to last Monday, tap Opnieuw analyseren, navigate back to `/expert` — the message entry now shows day-name chips resolving to last week's dates.

- [X] T010 [US2] Implement `src/routes/expert/[id]/+page.svelte`: read `params.id`; look up message in `$expertMessages` store; if not found `goto('/expert')`; render the `rawText` in a read-only `<pre>`; render a `<input type="date">` pre-filled with `message.ingestedAt.slice(0, 10)` bound to a `$state` `refDate`; show a day-name preview (same logic as ExpertPasteForm: call `extractTimeWindows(message.rawText, new Date(refDate + 'T12:00:00'))`, deduplicate, render chips showing `dayReference → resolvedDate`); render an **Opnieuw analyseren** button that calls `updateExpertMessage(params.id, message.rawText, new Date(refDate + 'T12:00:00'))` then `goto('/expert')`. Disable the button while `refDate` is empty.

**Checkpoint**: Navigating to `/expert/[existing-id]` shows the message, date picker, chips, and re-parse button. Changing the date updates chips live.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T011 [P] Unit tests `tests/unit/undoToast.test.ts`: test `showUndoToast` sets store with correct `expertMessageId`; test `clearUndoToast` sets store to null; test calling `showUndoToast` twice replaces first toast (old `timeoutId` cleared); use `vi.useFakeTimers()` to assert store clears after 3000 ms when toast is shown via the component's `$effect` (mock the store directly).
- [X] T012 [P] Unit tests for `updateExpertMessage` in `tests/unit/expertMessages.test.ts` (new `describe` block in existing file if it exists, else new file): seed store with one message; call `updateExpertMessage(id, sameRawText, newDate)`; assert `ingestedAt` reflects `newDate`; assert `id` is preserved; assert `timeWindows[0].resolvedDate` differs from original; assert localStorage is updated.
- [X] T013 [P] Harden Workbox config in `vite.config.ts`: add `/share-target` to the `additionalManifestEntries` precache list (or ensure the `NavigationRoute` fallback covers it) so the route loads offline. Verify existing `navigationFallback: 'index.html'` already handles this — if so, document with a comment and mark done.
- [ ] T014 Run the quickstart.md acceptance checklist manually on an Android device (or via Chrome DevTools PWA simulation) and document any gaps in `specs/002-whatsapp-share-target/quickstart.md`.

---

## Dependencies & Execution Order

- **Phase 1** (T001–T003): No dependencies — start immediately, run in parallel
- **Phase 2** (T004–T007): Depends on Phase 1; T004 and T005+T006 are parallel; T007 depends on T006
- **Phase 3** (T008–T009): Depends on Phase 2 (needs `undoToast` store + `UndoToast` component)
- **Phase 4** (T010): Depends on Phase 2 (`updateExpertMessage` from T005); independent of Phase 3
- **Phase 5** (T011–T014): Depends on Phase 3 + Phase 4 complete

### Parallel Opportunities

```
Phase 1:  T001 ‖ T002 ‖ T003
Phase 2:  T004 → serial; T005 ‖ T006 → T007
Phase 3:  T008 → T009
Phase 4:  T010 (parallel with Phase 3)
Phase 5:  T011 ‖ T012 ‖ T013 → T014
```

---

## Implementation Strategy

### MVP (US1 only — 7 tasks)

1. T001 → T002 → T004 → T006 → T007 → T008
2. Validate: share URL works, toast appears, undo works
3. Ship

### Full delivery

Add T005 → T010 (US2 re-parse), then T011–T014 (tests + polish).
