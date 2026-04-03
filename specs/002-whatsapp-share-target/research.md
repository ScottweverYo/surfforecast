# Research: WhatsApp Share Target — Auto-ingest Expert Forecasts

**Feature**: `002-whatsapp-share-target`
**Date**: 2026-04-03

---

## Decision 1: Share Target Method — GET vs POST

**Decision**: Use `method: "GET"` with query parameters.

**Rationale**: The app uses `@sveltejs/adapter-static` — there is no server to handle a POST body. GET delivers the shared text as a URL query parameter (`/share-target?text=…`), which the SPA reads entirely client-side. The Web Share Target Level 1 spec was designed for exactly this case.

**Alternatives considered**:
- POST with `enctype: multipart/form-data` — requires a service worker to intercept the request and forward it to the SPA via postMessage (Web Share Target Level 2). More reliable for large payloads but significantly more complex. Not needed for text-only shares.

**Constraint**: The W3C spec notes that user agents *may* truncate GET parameters exceeding 2000 bytes. Typical Dutch forecast texts are 300–1500 characters. URL-encoded, worst case ~1500 bytes — safely within the limit. Texts over 1500 characters should be silently truncated to 1500 chars before ingestion as a safety margin.

---

## Decision 2: iOS Support

**Decision**: Android-only for launch. Document iOS limitation explicitly.

**Rationale**: WebKit has not implemented the Web Share Target API as of 2026. Bug #194593 (filed 2019) remains open with no assigned owner. The app will **not** appear in the iOS share sheet regardless of manifest configuration.

**iOS alternative**: Not in scope for this feature. Possible future workarounds include a custom URL scheme (`surfforecast://share?text=…`) or a Shortcut automation, but these require separate investigation.

---

## Decision 3: SvelteKit Query Param Parsing in Static SPA

**Decision**: Read shared text via `new URL(window.location.href).searchParams` (not `$page.url.searchParams`) on the share-target route.

**Rationale**: Known SvelteKit issue (#2081) — `$page.url.searchParams` can return `null` on first hydration in production static builds when the page is navigated to directly by the OS (not via client-side routing). Reading `window.location` directly bypasses the hydration phase entirely and is always reliable.

**Implementation**: The `/share-target/+page.svelte` route must set `export const ssr = false` to ensure it only runs in the browser.

---

## Decision 4: Window Reuse / App Launch Behaviour

**Decision**: Add `launch_handler: { client_mode: "focus-existing" }` to the manifest.

**Rationale**: Without this, sharing while the PWA is backgrounded may open a second window on some Chrome versions. `focus-existing` instructs Chrome to bring the existing window to the foreground and navigate it to the share target URL rather than spawning a new instance. Supported in Chrome 98+ (Android and desktop).

---

## Decision 5: Undo Toast Architecture

**Decision**: Global Svelte writable store (`undoToast`) + overlay component rendered in `+layout.svelte`.

**Rationale**: The toast must be visible from any route (the user may be on the dashboard when the share lands). A writable store holds the pending state (`message`, `actionId`, `timeoutId`). The component subscribes and renders a fixed-position overlay. `$effect` with a cleanup return handles `setTimeout` / `setInterval` lifecycle safely in Svelte 5 runes mode (no `onDestroy`).

**Accessibility**: `role="status"`, `aria-live="polite"`, `aria-atomic="true"` — polite live region so screen readers announce without interrupting.

---

## Decision 6: Service Worker Changes

**Decision**: No service worker changes required beyond precaching `/share-target`.

**Rationale**: GET share targets are handled by the existing app shell fallback (`fallback: 'index.html'`). The Workbox `NavigationRoute` already matches `/share-target` and serves `index.html`. The only addition is ensuring `/share-target` is in the precache manifest so the route works offline.

---

## Decision 7: Expert Detail Route for Date Re-parse (US2)

**Decision**: New route `/expert/[id]/+page.svelte` — shows the raw message text, a date picker, and a re-parse button.

**Rationale**: Re-parsing requires calling `parseDutchForecast(rawText, newDate)` and updating the stored message. This is distinct from the expert list page and deserves its own route so the toast's "Bewerken" button can navigate directly to it.

**Store change needed**: `expertMessages` store needs an `updateExpertMessage(id, rawText, newDate)` action that re-parses and replaces the stored entry in-place.
