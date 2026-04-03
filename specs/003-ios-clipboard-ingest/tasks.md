# Tasks: iOS Clipboard Ingest — Smart Paste Button

**Input**: Design documents from `/specs/003-ios-clipboard-ingest/`
**Branch**: `003-ios-clipboard-ingest`
**Stack**: TypeScript 5.x · SvelteKit 2 · Svelte 5 (runes) · Vitest · Playwright

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US1, US2)

---

## Phase 1: User Story 1 — Paste a copied forecast from the dashboard (Priority: P1) 🎯 MVP

**Goal**: "Voorspelling plakken" button on dashboard reads clipboard, validates, ingests forecast, shows undo toast.

**Independent Test**: Copy any Dutch text ≥ 20 characters. Open the app at `/`. Tap "Voorspelling plakken". On iOS, tap "Paste" in the callout. The undo toast appears and `expertMessages` localStorage key gains one entry.

- [X] T001 [US1] Implement `src/components/ClipboardPasteButton.svelte` in Svelte 5 runes mode:
  - `let isAvailable = $state(false)` — set in `onMount` via `window.isSecureContext && !!navigator.clipboard`; component renders nothing when false
  - `let warning = $state<string | null>(null)` — inline warning text; null = hidden
  - `let warningTimer: ReturnType<typeof setTimeout> | null = null` — tracks auto-clear timer; cancel on re-tap
  - `const isDisabled = $derived($undoToast !== null)` — disabled while undo toast is visible (imports `undoToast` store)
  - `onclick` handler (synchronous — iOS gesture requirement):
    1. Cancel any active `warningTimer`; set `warning = null`
    2. Call `navigator.clipboard.readText()`
    3. On success: trim result; if empty → `warning = 'Klembord is leeg'`; if `length < 20` → `warning = 'Klembord bevat geen voorspelling'`; if `length > 1500` truncate silently; else call `addExpertMessage(text, new Date())` then `showUndoToast(message.id)`
    4. On `NotAllowedError` → `warning = 'Toegang tot klembord geweigerd'`
    5. If warning was set: `warningTimer = setTimeout(() => warning = null, 3000)`
  - Button: `aria-label="Voorspelling uit klembord plakken"`, `disabled={isDisabled}`, class `clipboard-paste-btn`
  - Warning `<p>`: `role="alert"` (only rendered when `warning !== null`)

- [X] T002 [US1] Mount `<ClipboardPasteButton />` in `src/routes/+page.svelte`: import from `$components/ClipboardPasteButton.svelte`; place above the forecast score cards, directly below the page heading so it is visible without scrolling on mobile

**Checkpoint**: Button visible on `/` over HTTPS. Copying ≥ 20 chars and tapping ingest works. Empty/short clipboard shows warning. Undo toast undo + edit both work.

---

## Phase 2: User Story 2 — Graceful handling of non-forecast clipboard content (Priority: P2)

**Goal**: All validation paths (empty, too short, permission denied) show correct inline warnings without ingesting.

**Note**: Validation logic lives entirely in T001's `onclick` handler. US2 is covered by that implementation plus the unit tests in T003.

**Independent Test**: Copy a phone number (< 20 chars). Tap "Voorspelling plakken". Warning "Klembord bevat geen voorspelling" appears. No entry in localStorage.

---

## Phase 3: Polish & Tests

- [X] T003 [P] Write unit tests `tests/unit/clipboardPaste.test.ts`: mock `navigator.clipboard.readText` using `vi.stubGlobal`; spy on `addExpertMessage` and `showUndoToast`; assert:
  - (a) empty string → `warning` = "Klembord is leeg", `addExpertMessage` not called
  - (b) text < 20 chars → `warning` = "Klembord bevat geen voorspelling", not called
  - (c) text ≥ 20 chars → `addExpertMessage` called with correct text, `showUndoToast` called
  - (d) text > 1500 chars → `addExpertMessage` called with text sliced to 1500
  - (e) `NotAllowedError` thrown → `warning` = "Toegang tot klembord geweigerd", not called

- [X] T004 [P] Write E2E test `tests/e2e/clipboardPaste.spec.ts`:
  - Grant `['clipboard-read', 'clipboard-write']` via `browserContext.grantPermissions`
  - Seed clipboard via `page.evaluate(() => navigator.clipboard.writeText('...'))`
  - Navigate to `/`; assert `.clipboard-paste-btn` is visible; click it
  - Assert `.toast-content` appears; assert `localStorage.expert_messages` has one entry
  - Second test: seed with short text (< 20 chars); click; assert warning visible, no localStorage entry

---

## Dependencies & Execution Order

- **Phase 1** (T001 → T002): Sequential — component before mounting
- **Phase 2**: No code tasks — covered by T001 + T003
- **Phase 3** (T003, T004): Parallel; depend on Phase 1 complete

### Parallel Opportunities

```
Phase 1:  T001 → T002
Phase 3:  T003 ‖ T004
```

---

## Implementation Strategy

### MVP (US1 — 2 tasks)

1. T001 → T002
2. Validate: button visible, ingest works, warnings show, undo/edit work
3. Ship

### Full delivery

Add T003 + T004 (unit + E2E tests).
