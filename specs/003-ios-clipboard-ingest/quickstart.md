# Quickstart: iOS Clipboard Ingest

**Feature**: `003-ios-clipboard-ingest`

---

## Prerequisites

- iPhone running iOS 13.4+ (or any modern browser on HTTPS)
- App deployed to HTTPS (Vercel or similar) — clipboard API does not work on HTTP
- PWA optionally installed to home screen (works in Safari browser too)

---

## Acceptance Test Scenarios

### Scenario 1: Happy path — paste a copied forecast

1. In WhatsApp, long-press a Dutch surf forecast message → tap **Copy**
2. Open the Surfforecast app in Safari or as an installed PWA
3. On the dashboard, tap **"Voorspelling plakken"**
4. **iOS**: A small "Paste" callout bar appears — tap **Paste**
5. **Expected**: The undo toast "Voorspelling opgeslagen ✓" appears at the bottom; the expert messages list gains a new entry

### Scenario 2: Undo within 3 seconds

1. Repeat Scenario 1 steps 1–5
2. Immediately tap **Ongedaan maken** in the toast
3. **Expected**: Toast disappears; the expert messages list does **not** contain the pasted message

### Scenario 3: Edit reference date after paste

1. Repeat Scenario 1 steps 1–5
2. Tap **Bewerken** in the toast
3. **Expected**: Navigates to `/expert/[id]`; date picker is pre-filled; day-name chips are visible
4. Change the date, tap **Opnieuw analyseren**
5. **Expected**: Returns to `/expert`; message shows updated resolved dates

### Scenario 4: Empty clipboard

1. Make sure nothing is copied (or copy a single space)
2. Tap "Voorspelling plakken"
3. **Expected**: Warning "Klembord is leeg" appears below the button; no entry added

### Scenario 5: Short clipboard content

1. Copy a phone number or short text (< 20 characters)
2. Tap "Voorspelling plakken"
3. **Expected**: Warning "Klembord bevat geen voorspelling" appears; no entry added

### Scenario 6: Permission denied

1. Tap "Voorspelling plakken"; when the iOS Paste callout appears, dismiss it without tapping Paste
2. **Expected**: Warning "Toegang tot klembord geweigerd" appears; no entry added

### Scenario 7: Button absent on HTTP

1. Open the app on a plain `http://` URL (no HTTPS)
2. **Expected**: "Voorspelling plakken" button is not visible on the dashboard at all

### Scenario 8: Button disabled while toast is active

1. Paste a forecast (Scenario 1) so the undo toast is visible
2. Copy another message and try tapping the paste button
3. **Expected**: Button is visually disabled and does not respond to taps; only one message ingested

### Scenario 9: Offline paste

1. Enable airplane mode
2. Open the installed PWA (loads from cache)
3. Paste a copied forecast message
4. **Expected**: Message is ingested locally; toast appears; no network required

---

## Testing in Desktop Browser (for development)

1. Open the app at `http://localhost:5173` — **note**: clipboard API requires HTTPS or localhost
2. Copy any Dutch text ≥ 20 characters to your OS clipboard
3. Tap "Voorspelling plakken"
4. On desktop Chrome: clipboard read proceeds without any prompt
5. Verify toast appears and localStorage entry is created

## Notes on iOS Prompt

Unlike Chrome/Android (which remember clipboard permission), iOS shows a "Paste" callout bar **every time** the button is tapped. This is a WebKit limitation — no workaround exists. Design expectation: the user taps "Voorspelling plakken" → taps "Paste" in the iOS callout → done. Two taps total instead of one.
