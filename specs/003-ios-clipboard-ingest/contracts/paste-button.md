# Contract: ClipboardPasteButton Component

**Feature**: `003-ios-clipboard-ingest` | **Date**: 2026-04-03

---

## Component: `src/components/ClipboardPasteButton.svelte`

### Rendering Contract

| Condition | Rendered output |
|-----------|----------------|
| `isSecureContext && navigator.clipboard` unavailable | Nothing — component renders no DOM |
| Available, toast not visible | "Voorspelling plakken" button, enabled |
| Available, toast visible | "Voorspelling plakken" button, **disabled** |
| Warning active | Button + inline warning text below |

### Props

None. The component is self-contained and reads `undoToast` store directly.

### Behaviour on Click

```
onClick:
  1. Clear any existing warning
  2. Call navigator.clipboard.readText()
     ├─ iOS: system "Paste" callout bar appears (every time)
     └─ Desktop: clipboard read proceeds immediately

  3a. On success:
      text = result.trim()
      if text.length === 0       → set warning "Klembord is leeg", return
      if text.length < 20        → set warning "Klembord bevat geen voorspelling", return
      if text.length > 1500      → text = text.slice(0, 1500)
      message = addExpertMessage(text, new Date())
      showUndoToast(message.id)

  3b. On NotAllowedError:
      set warning "Toegang tot klembord geweigerd"

  4. Warning auto-clears after 3000ms via setTimeout
```

### Disabled State

Button `disabled` attribute is `true` when `$undoToast !== null`. Prevents duplicate ingestion while the undo window is open.

### Accessibility

- `aria-label="Voorspelling uit klembord plakken"` on the button
- Warning paragraph has `role="alert"` so screen readers announce it immediately
- Button communicates disabled state via standard HTML `disabled` attribute

---

## Integration Point: Dashboard (`src/routes/+page.svelte`)

`<ClipboardPasteButton />` is mounted once on the dashboard. No props required. Placement: above the forecast score cards, below the page heading, so it is immediately visible on open without scrolling.
