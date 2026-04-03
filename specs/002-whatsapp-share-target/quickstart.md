# Quickstart: WhatsApp Share Target

**Feature**: `002-whatsapp-share-target`

---

## Prerequisites

- Android device with Chrome 76+ (or Chrome-based browser)
- App deployed to HTTPS (share target does not work on `localhost`)
- PWA installed to home screen

---

## Acceptance Test Scenarios

### Scenario 1: Basic share flow (US1 happy path)

1. Open the deployed app in Chrome on Android
2. Tap the browser menu → "Add to Home Screen" → Install
3. Open WhatsApp — find a Dutch surf forecast message
4. Long-press the message → tap the **share icon** (forward arrow)
5. In the share sheet, tap **Surfforecast**
6. **Expected**: App opens to dashboard; toast "Voorspelling opgeslagen ✓" is visible at the bottom with **Ongedaan maken** and **Bewerken** buttons
7. Wait 3 seconds
8. **Expected**: Toast auto-dismisses; expert messages list has a new entry

### Scenario 2: Undo within 3 seconds

1. Repeat steps 1–6 from Scenario 1
2. Immediately tap **Ongedaan maken**
3. **Expected**: Toast disappears; the expert messages list does **not** contain the shared message

### Scenario 3: Edit reference date

1. Repeat steps 1–6 from Scenario 1
2. Tap **Bewerken** in the toast
3. **Expected**: Navigates to `/expert/[id]` showing the message text and a date picker
4. Change the date to the day the forecast was originally written
5. Tap **Opnieuw analyseren**
6. **Expected**: Navigates back to `/expert`; the message's day-name chips (vrijdag, zaterdag, etc.) show updated resolved dates

### Scenario 4: Empty share (edge case)

1. Using browser DevTools or a test harness, navigate to `/share-target` with no `text` param
2. **Expected**: Immediately redirects to `/` with no toast and no message ingested

### Scenario 5: Long message truncation

1. Share a WhatsApp message longer than 1500 characters to the app
2. **Expected**: Message is ingested (truncated), toast appears, no crash or error

### Scenario 6: Share while app is backgrounded

1. Open the installed PWA on the dashboard
2. Switch to WhatsApp (app goes to background)
3. Share a forecast message to Surfforecast
4. **Expected**: PWA comes to foreground (same window, not a new one); toast is visible

### Scenario 7: Share while offline

1. Enable airplane mode
2. Open the installed PWA (loads from cache)
3. Share a message from WhatsApp to Surfforecast
4. **Expected**: App opens, message is ingested locally (parser is client-side), toast appears — no network required

---

## Testing on iOS

Web Share Target is **not supported** on iOS as of 2026. The Surfforecast app will not appear in the iOS share sheet. This is a WebKit limitation (bug #194593, open since 2019).

iOS users must continue using the manual paste form at `/expert`.

---

## Testing Share Target in Chrome DevTools (Desktop)

1. Open DevTools → Application → Manifest
2. Verify the `share_target` entry is listed
3. DevTools does not simulate share sheet — test on a real Android device or use Chrome's "Share…" menu on desktop Chrome with a test URL

## Lighthouse PWA Audit

After deploying, run Lighthouse on the root URL. Verify:
- **Installable**: ✓
- **share_target in manifest**: listed under "Manifest"
- No warnings about `method` or `action`
