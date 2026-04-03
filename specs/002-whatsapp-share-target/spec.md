# Feature Specification: WhatsApp Share Target — Auto-ingest Expert Forecasts

**Feature Branch**: `002-whatsapp-share-target`
**Created**: 2026-04-03
**Status**: Draft
**Depends on**: `001-surfforecast-scheveningen` (expert message store, Dutch NLP parser)

---

## Context

Scott receives Dutch surf forecast messages from an expert meteorologist via WhatsApp. Currently he copies the text, opens the app, pastes it into the expert form, sets the reference date, and taps Analyseren. This feature reduces that to: long-press message → share → Surfforecast. The app ingests the message automatically, shows a brief confirmation toast, and returns to whatever Scott was doing.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Share a forecast from WhatsApp with auto-ingest (Priority: P1)

Scott receives the weekly forecast in a WhatsApp group. He long-presses the message, taps the share icon, and selects **Surfforecast** from the OS share sheet. The app opens (or comes to the foreground), immediately processes the message using today's date as reference, shows a toast "Voorspelling opgeslagen ✓" for 3 seconds with an **Ongedaan maken** (undo) button, then returns to the dashboard. No form, no extra taps.

**Independent Test**: Install the PWA. Share any text from WhatsApp to Surfforecast. The expert messages list gains a new entry within 3 seconds, without the user tapping any submit button.

**Acceptance Scenarios**:

1. **Given** the PWA is installed and the device is on Android or iOS 16+, **When** Scott shares a WhatsApp message to Surfforecast, **Then** Surfforecast appears in the OS share sheet as a destination
2. **Given** Scott selects Surfforecast in the share sheet, **When** the app receives the shared text, **Then** `addExpertMessage` is called automatically with the shared text and today's date as `ingestedAt` — no form submission required
3. **Given** the message has been auto-ingested, **When** the toast appears, **Then** it shows "Voorspelling opgeslagen ✓", remains visible for 3 seconds, and includes an **Ongedaan maken** button
4. **Given** Scott taps **Ongedaan maken** within 3 seconds, **When** the undo action fires, **Then** the message is removed from the expert store and the toast disappears
5. **Given** the 3-second window expires without undo, **When** the toast dismisses, **Then** the message remains in the store permanently
6. **Given** the app was in the background when the share occurred, **When** it comes to the foreground, **Then** the user lands on the dashboard (not the expert page) with the toast visible
7. **Given** the shared text is empty or whitespace only, **When** the share target route processes it, **Then** nothing is ingested and no toast appears
8. **Given** the shared text is too long (> 10 000 characters), **When** ingestion is attempted, **Then** the message is truncated to 10 000 characters and ingested normally (no crash)

---

### User Story 2 — Correct the reference date after auto-ingest (Priority: P2)

The auto-ingest uses today's date. If the forecast was written earlier (e.g. Scott received a Monday forecast but only shares it on Wednesday), the day names resolve incorrectly. He taps the toast's **Bewerken** button instead of dismissing it, which opens the expert detail view for that message with the reference date editable. He adjusts the date and taps **Opnieuw analyseren**. The message is re-parsed with the corrected date.

**Independent Test**: Auto-ingest a message, tap Bewerken in the toast, change the date, confirm. The message's `ingestedAt` and all `timeWindows.resolvedDate` values update to reflect the new reference date.

**Acceptance Scenarios**:

1. **Given** the toast is visible, **When** Scott taps **Bewerken**, **Then** the app navigates to `/expert/[id]` showing the message text, a date picker pre-filled with today, and a **Opnieuw analyseren** button
2. **Given** Scott changes the reference date and taps **Opnieuw analyseren**, **When** re-parsing completes, **Then** the expert message's `timeWindows` and `comparison` are updated with the new reference date
3. **Given** re-parsing completes, **When** Scott navigates back, **Then** the updated entry appears at the top of the expert messages list

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | The PWA manifest must declare a `share_target` that accepts `text` via GET parameters at the route `/share-target` |
| FR-002 | The `/share-target` route must extract the `text` query parameter, call `addExpertMessage(text, new Date())`, show the undo toast, then redirect to `/` |
| FR-003 | The undo toast must be visible for exactly 3 seconds; tapping Ongedaan maken within that window removes the ingested message |
| FR-004 | The toast must also offer a **Bewerken** action that navigates to the message detail page for date correction |
| FR-005 | The `/expert/[id]` detail route must allow editing the `ingestedAt` date and re-parsing the message |
| FR-006 | Shared text longer than 1 500 characters must be silently truncated before ingestion (URL query parameter safety margin — see research.md) |
| FR-007 | If `text` is absent or blank, the route must redirect to `/` with no side effects |
| FR-008 | The `share_target` declaration must use `method: "GET"` so it works without a POST-capable server (static SPA) |

---

## Success Criteria

| ID | Criterion |
|----|-----------|
| SC-001 | Share-to-ingest flow completes in ≤ 3 seconds on a mid-range Android device |
| SC-002 | Surfforecast appears in the OS share sheet on Android 10+ (Chrome 76+) after PWA installation |
| SC-003 | Zero data loss: undo removes exactly the message that was just ingested, no other entries |
| SC-004 | Re-parse (US2) produces correct `resolvedDate` values for all day names when reference date is corrected |
| SC-005 | The share target works offline (app already installed + cached) — ingestion uses only local storage and the local parser |

---

## Technical Constraints

- **Static SPA only** — no server-side POST handler. `share_target` must use `method: "GET"` so the shared text arrives as a URL query parameter (`enctype` is not applicable for GET). This is supported by the Web Share Target API Level 1.
- **iOS not supported** — WebKit has not implemented the Web Share Target API (bug #194593, open since 2019). Surfforecast will not appear in the iOS share sheet regardless of manifest configuration. iOS users must continue using the manual paste form.
- **Text only** — WhatsApp shares the message body as plain text. No attachments, images, or metadata are expected.
- **No backend required** — all processing (parsing, storage, scoring) is local to the device.

---

## Out of Scope

- Automatic date detection from message content (e.g. "vrijdag 4 april" as anchor) — deferred
- Push notifications when a new forecast is available in the WhatsApp group — requires a backend
- Multi-message batching (sharing multiple WhatsApp messages at once) — not supported by the share sheet
