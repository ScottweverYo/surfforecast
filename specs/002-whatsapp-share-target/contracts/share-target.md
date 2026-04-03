# Contract: Web Share Target

**Feature**: `002-whatsapp-share-target`

---

## Share Target Route

**Route**: `GET /share-target`

The OS navigates to this URL when the user selects Surfforecast in the share sheet.

### Query Parameters

| Param | Source | Required | Max length | Notes |
|---|---|---|---|---|
| `text` | WhatsApp message body | Yes (if absent → redirect to `/`) | 1500 chars (truncated silently) | URL-encoded, decoded by `searchParams.get('text')` |
| `title` | Share title (rarely set by WhatsApp) | No | — | Ignored |
| `url` | Shared URL (not applicable for WhatsApp text) | No | — | Ignored |

### Processing Contract

```
Input:  GET /share-target?text=<encoded-forecast-text>

Steps:
  1. Read text via new URL(window.location.href).searchParams.get('text')
  2. If blank/null → goto('/') and return
  3. Truncate to 1500 characters if needed
  4. Call addExpertMessage(text, new Date())  → returns ExpertMessage
  5. Show UndoToast with expertMessageId = message.id
  6. goto('/')

Output: User lands on dashboard with toast visible
```

### Error Cases

| Condition | Behaviour |
|---|---|
| `text` absent or whitespace | Silent redirect to `/`, no ingestion |
| `text` > 1500 chars | Truncate to 1500 chars, ingest normally |
| `addExpertMessage` throws | Catch, redirect to `/expert` with error query param |

---

## Expert Detail Route

**Route**: `GET /expert/[id]`

Allows re-parsing an ingested message with a corrected reference date.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `string` | `ExpertMessage.id` from the store |

### Page Contract

```
Input:  id — looked up from expertMessages store
        If not found → goto('/expert')

Renders:
  - Read-only display of rawText
  - Date picker pre-filled with message.ingestedAt
  - "Opnieuw analyseren" button

On submit:
  - updateExpertMessage(id, rawText, newDate)
  - goto('/expert')
```

---

## Manifest Contract

`static/manifest.webmanifest` must contain:

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

**Validation rules**:
- `method` must be `"GET"` (no server for POST)
- `action` must match the SvelteKit route path exactly
- No `enctype` field (only meaningful for POST)
