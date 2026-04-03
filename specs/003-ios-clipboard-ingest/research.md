# Research: iOS Clipboard Ingest

**Feature**: `003-ios-clipboard-ingest` | **Date**: 2026-04-03

---

## Decision 1: Clipboard API availability detection

**Decision**: Gate on `typeof window !== 'undefined' && window.isSecureContext && !!navigator.clipboard`

**Rationale**: Three guards are needed. `typeof window` avoids SSR crashes (SvelteKit renders server-side). `isSecureContext` is `false` on plain HTTP and `file://` — the Clipboard API is undefined in insecure contexts. `navigator.clipboard` checks for browser support (missing in very old iOS versions). The button component must derive its visibility from this check, evaluated only in the browser.

**Alternatives considered**: Checking `navigator.clipboard` alone — insufficient; crashes on SSR and silently fails on HTTP.

---

## Decision 2: iOS prompt behaviour — every read, not once

**Decision**: The iOS clipboard prompt appears **every single time** `readText()` is called. Design the UX to expect this; do not promise users a one-time prompt.

**Rationale**: Unlike Chrome/Android which remember the grant, iOS Safari (and iOS PWA — same WebKit engine) shows a small "Paste" callout bar on every `readText()` call. There is no persistent permission. SC-002 in the spec ("prompt appears at most once per device") is incorrect for iOS and should be treated as aspirational Android behaviour only.

**Impact on spec**: SC-002 is noted as inaccurate for iOS but is not a blocker — the feature still works; the UX is slightly more taps than hoped.

**Alternatives considered**: `permissions.query({ name: 'clipboard-read' })` — not supported in Safari or Firefox; Chrome only. Cannot be used to pre-check or cache permission state.

---

## Decision 3: Clipboard read must fire inside a synchronous click handler

**Decision**: Call `navigator.clipboard.readText()` directly inside the button's `onclick` handler. Do not use `$effect`, `$derived`, or any async break before the call.

**Rationale**: iOS enforces that Clipboard API calls originate from a synchronous user gesture. Any `await` before the `readText()` call breaks the gesture chain and causes a `NotAllowedError`. In Svelte 5 runes, the click handler is the correct and only valid place. `$derived` is for pure values (no side effects). `$effect` runs after DOM update, decoupled from the user gesture.

**Alternatives considered**: Triggering from `$effect` — rejected; async and not gesture-bound. Triggering on `onmount` — rejected; no user gesture.

---

## Decision 4: Error handling — catch NotAllowedError

**Decision**: Wrap `readText()` in try/catch and handle `DOMException` with `name === 'NotAllowedError'` to show "Toegang tot klembord geweigerd".

**Rationale**: This is the only error thrown when the user dismisses the iOS paste prompt or when the call occurs outside a gesture. All other errors (network, quota) are not applicable to clipboard reads.

**Alternatives considered**: Checking `error.message` — fragile, message strings vary by browser. Checking `instanceof DOMException` only — insufficient; need the specific error name.

---

## Decision 5: No new dependencies

**Decision**: Zero new npm packages. The Clipboard API is native browser API.

**Rationale**: The feature is small — a single button on the dashboard that calls one native API. All shared infrastructure (`addExpertMessage`, `showUndoToast`, `UndoToast`) already exists from features 001 and 002.

---

## Decision 6: Component vs inline

**Decision**: Implement as a self-contained `ClipboardPasteButton.svelte` component, not inline in `+page.svelte`.

**Rationale**: The button has non-trivial local state (warning message, disabled state, availability check) that would clutter the dashboard page. A component keeps the dashboard clean and makes the button independently testable.

---

## Decision 7: Minimum length threshold — 20 characters

**Decision**: Reject clipboard text shorter than 20 characters with "Klembord bevat geen voorspelling". No language detection.

**Rationale**: 20 characters is long enough to exclude phone numbers, URLs, short reactions, and clipboard artifacts, but short enough not to reject any real forecast fragment. The Dutch NLP parser already handles non-forecast text gracefully (returns empty extractions without crashing), so deeper validation would add complexity with no benefit.
