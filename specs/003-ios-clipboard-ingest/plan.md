# Implementation Plan: iOS Clipboard Ingest — Smart Paste Button

**Branch**: `003-ios-clipboard-ingest` | **Date**: 2026-04-03 | **Spec**: `specs/003-ios-clipboard-ingest/spec.md`

---

## Summary

Add a "Voorspelling plakken" button to the dashboard that reads the clipboard and auto-ingests a Dutch forecast message using the existing `addExpertMessage` + undo toast infrastructure. iOS-first solution to compensate for the lack of Web Share Target API on WebKit. The button is hidden on non-HTTPS or when Clipboard API is unavailable.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: SvelteKit 2, Svelte 5 (runes mode) — no new packages
**Storage**: localStorage (existing) — no new storage
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: iOS Safari / iOS PWA (home screen); also works on desktop Chrome for development
**Project Type**: PWA — static SPA, `@sveltejs/adapter-static`
**Constraints**:
- Clipboard API requires HTTPS or localhost (button hidden on HTTP)
- iOS shows "Paste" callout on **every** `readText()` call — not just once (WebKit limitation, no workaround)
- `readText()` must be called directly inside a synchronous `onclick` handler — no `await` before it

## Constitution Check

Constitution template is unpopulated — no formal gates apply. Feature is fully client-side, static, no backend. ✓

## Project Structure

### Documentation (this feature)

```text
specs/003-ios-clipboard-ingest/
├── plan.md           ← this file
├── research.md       ← Phase 0 output
├── data-model.md     ← Phase 1 output
├── quickstart.md     ← Phase 1 output
├── contracts/
│   └── paste-button.md
└── tasks.md          ← /speckit.tasks output (next step)
```

### Source Code Changes

```text
src/
├── components/
│   └── ClipboardPasteButton.svelte   # NEW — self-contained paste button
└── routes/
    └── +page.svelte                  # EXTEND — mount <ClipboardPasteButton />

tests/
├── unit/
│   └── clipboardPaste.test.ts        # NEW — component logic unit tests
└── e2e/
    └── clipboardPaste.spec.ts        # NEW — Playwright clipboard simulation
```

## Key Implementation Notes

- **`onclick` handler only**: Call `navigator.clipboard.readText()` directly inside `onclick`. Never in `$effect` or `$derived` — iOS gesture chain breaks on async decoupling.
- **Availability check**: `typeof window !== 'undefined' && window.isSecureContext && !!navigator.clipboard` — evaluated in a `$state` set during `onMount` (not SSR-safe as a module-level expression).
- **`permissions.query` not used**: Safari does not support `permissions.query({ name: 'clipboard-read' })`. Attempt read and catch `NotAllowedError`.
- **Button disabled while toast visible**: Read `$undoToast` store directly in the component to derive disabled state.
- **Warning auto-clear**: `setTimeout(clearWarning, 3000)` stored in a local variable; cleared on re-tap to avoid stale timers.
- **No new dependencies**: Native browser API only.

## Phase Breakdown

### Phase 1: Component + Dashboard Integration

1. Create `ClipboardPasteButton.svelte` — availability detection, click handler, validation, warning display
2. Mount `<ClipboardPasteButton />` in `src/routes/+page.svelte` dashboard

### Phase 2: Tests

3. Unit tests for clipboard validation logic (mock `navigator.clipboard`)
4. E2E test simulating clipboard content via Playwright's `page.evaluate` + `clipboard-write` permission
