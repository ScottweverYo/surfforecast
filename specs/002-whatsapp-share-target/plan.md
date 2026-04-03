# Implementation Plan: WhatsApp Share Target — Auto-ingest Expert Forecasts

**Branch**: `002-whatsapp-share-target` | **Date**: 2026-04-03 | **Spec**: `specs/002-whatsapp-share-target/spec.md`

---

## Summary

Register the PWA as an OS share target so Scott can share WhatsApp forecast messages directly into the app with 2 taps. Shared text is auto-ingested via `addExpertMessage`, a 3-second undo toast appears on the dashboard, and a detail route allows correcting the reference date without re-pasting. Android Chrome only (iOS WebKit does not implement Web Share Target).

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: SvelteKit 2, Svelte 5 (runes mode), vite-plugin-pwa (VitePWA / Workbox)
**Storage**: localStorage (expert messages, existing) — no new storage
**Testing**: Vitest (unit), Playwright (E2E, mobile Pixel 5 390×844)
**Target Platform**: Android Chrome 76+ (PWA installed); iOS explicitly out of scope
**Project Type**: PWA — static SPA, `@sveltejs/adapter-static`
**Constraints**: No backend; all processing client-side; share target must use GET method; HTTPS required in production

## Constitution Check

Constitution template is unpopulated for this project — no formal gates apply. Guiding principles from the existing codebase:

- **No backend**: feature must be fully client-side ✓
- **Static SPA**: no SSR on share-target route (`ssr = false`) ✓
- **Offline-capable**: parser and storage are local; share target works in airplane mode ✓

## Project Structure

### Documentation (this feature)

```text
specs/002-whatsapp-share-target/
├── plan.md           ← this file
├── research.md       ← Phase 0 output
├── data-model.md     ← Phase 1 output
├── quickstart.md     ← Phase 1 output
├── contracts/
│   └── share-target.md
└── tasks.md          ← /speckit.tasks output (next step)
```

### Source Code Changes

```text
static/
└── manifest.webmanifest          # Add share_target + launch_handler

src/
├── routes/
│   ├── share-target/
│   │   └── +page.svelte          # NEW — reads ?text=, ingests, redirects
│   └── expert/
│       └── [id]/
│           └── +page.svelte      # NEW — re-parse with corrected date
├── lib/
│   └── stores/
│       ├── undoToast.ts          # NEW — transient toast state store
│       └── expertMessages.ts     # EXTEND — add updateExpertMessage()
└── components/
    └── UndoToast.svelte          # NEW — fixed overlay, 3s auto-dismiss

tests/
├── unit/
│   └── undoToast.test.ts         # NEW — store logic tests
└── e2e/
    └── shareTarget.spec.ts       # NEW — Playwright share target simulation
```

## Phase Breakdown

### Phase 1: Manifest + Share Route (US1 core)

1. Update `manifest.webmanifest` — add `share_target` and `launch_handler`
2. Create `/share-target/+page.svelte` — reads `window.location.searchParams`, ingests, redirects
3. Create `undoToast.ts` store — `showUndoToast()`, `clearUndoToast()`, `UndoToastState`
4. Create `UndoToast.svelte` — fixed overlay, Ongedaan maken + Bewerken buttons, 3s progress bar
5. Mount `<UndoToast />` in `+layout.svelte`

### Phase 2: Re-parse Route (US2)

6. Add `updateExpertMessage(id, rawText, newDate)` to expertMessages store
7. Create `/expert/[id]/+page.svelte` — detail view with date picker + Opnieuw analyseren

### Phase 3: Tests + Polish

8. Unit tests for `undoToast` store (show, undo, timeout, replace)
9. Unit tests for `updateExpertMessage`
10. E2E test simulating share target via direct URL navigation
11. Precache `/share-target` in Workbox config for offline reliability

## Key Implementation Notes

- **Parse query params via `window.location`**, not `$page.url` — avoids SvelteKit hydration bug (#2081) where `searchParams` is null on first load from OS navigation
- **`ssr = false`** on share-target route — ensures it only runs in browser
- **1500-char truncation** — silently truncate shared text before ingestion (spec allows 2000-byte GET params, this gives a safety margin)
- **Single toast** — `showUndoToast` replaces any existing toast; `timeoutId` from old toast is cleared first
- **`focus-existing` launch handler** — prevents double window on Android when app is backgrounded
