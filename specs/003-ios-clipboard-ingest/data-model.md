# Data Model: iOS Clipboard Ingest

**Feature**: `003-ios-clipboard-ingest` | **Date**: 2026-04-03

---

## Overview

This feature introduces no new persistent data entities. It reuses `ExpertMessage` (feature 001) and `UndoToastState` (feature 002) without modification. The only new state is local to the `ClipboardPasteButton` component and is never persisted.

---

## New Transient State (component-local only)

### ClipboardButtonState

Lives inside `ClipboardPasteButton.svelte`. Not exported, not shared.

| Field | Type | Description |
|-------|------|-------------|
| `warning` | `string \| null` | Inline warning message to display below the button. Null = no warning. |
| `isAvailable` | `boolean` | Whether `navigator.clipboard.readText` is callable in the current context. Derived once on mount. |

**Lifecycle**:
- `isAvailable`: set once on component mount by checking `window.isSecureContext && navigator.clipboard`; never changes after that
- `warning`: set on invalid clipboard read or permission denial; auto-cleared after 3 seconds via `setTimeout`; also cleared on next button tap

---

## Reused Entities (unchanged)

### ExpertMessage (feature 001)
Created by `addExpertMessage(text, new Date())` when clipboard text passes validation. No new fields.

### UndoToastState (feature 002)
Set by `showUndoToast(message.id)` after successful ingest. No changes to the store.

---

## Data Flow

```
User taps button
  → navigator.clipboard.readText()       [browser API, transient]
  → validate length (≥ 20 chars)
  → truncate if > 1500 chars
  → addExpertMessage(text, new Date())   [creates ExpertMessage → localStorage]
  → showUndoToast(message.id)            [sets UndoToastState → memory only]
```
