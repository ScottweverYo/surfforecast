# Data Model: WhatsApp Share Target

**Feature**: `002-whatsapp-share-target`

This feature adds no new persistent entities. It extends two existing ones.

---

## Extended: ExpertMessage (existing)

No schema changes. The existing `ExpertMessage` interface in `src/lib/types.ts` is used as-is.

The share target route calls `addExpertMessage(text, new Date())` — the same function the manual form uses. `ingestedAt` reflects the moment of sharing (today).

---

## New: UndoToastState (transient — store only, not persisted)

Lives in `src/lib/stores/undoToast.ts`. Never written to localStorage or IndexedDB.

```ts
interface UndoToastState {
  id: string;               // UUID, for keying the toast
  expertMessageId: string;  // ID of the just-ingested ExpertMessage
  timeoutId: ReturnType<typeof setTimeout>;
}
```

| Field | Type | Description |
|---|---|---|
| `id` | `string` | UUID — allows replacing a previous toast if share fires twice quickly |
| `expertMessageId` | `string` | ID of the message to remove on undo |
| `timeoutId` | `ReturnType<typeof setTimeout>` | Handle to clear the auto-dismiss timer on undo/edit |

**Lifecycle**: Created by the share target route immediately after `addExpertMessage`. Destroyed after undo, edit navigation, or 3-second auto-dismiss.

---

## Extended: expertMessages store

New exported action:

```ts
updateExpertMessage(id: string, rawText: string, newDate: Date): ExpertMessage
```

Finds the existing message by `id`, re-runs `parseDutchForecast(rawText, newDate)`, preserves the original `id`, updates `ingestedAt`, replaces `timeWindows` / `comparison`, persists to localStorage.

---

## Manifest Extension

`static/manifest.webmanifest` gains two new fields (not a data entity but a schema extension):

```json
{
  "share_target": {
    "action": "/share-target",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  },
  "launch_handler": {
    "client_mode": "focus-existing"
  }
}
```
