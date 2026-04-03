# Feature Specification: iOS Clipboard Ingest — Smart Paste Button

**Feature Branch**: `003-ios-clipboard-ingest`
**Created**: 2026-04-03
**Status**: Draft
**Depends on**: `001-surfforecast-scheveningen` (expert message store, Dutch NLP parser), `002-whatsapp-share-target` (undo toast infrastructure)

---

## Context

On iOS, the Web Share Target API is not supported (WebKit bug #194593). Scott cannot share a WhatsApp forecast message directly to the app. Currently he must open the app, navigate to the Expert page, paste text into a textarea, set the reference date, and tap Analyseren — five or more steps. This feature reduces that to: copy message in WhatsApp → open app → tap one button. The dashboard gains a prominent "Voorspelling plakken" button that reads the clipboard and auto-ingests the forecast, reusing the same undo toast introduced in feature 002.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Paste a copied forecast from the dashboard (Priority: P1)

Scott copies a Dutch surf forecast message in WhatsApp (long-press → Copy). He opens the Surfforecast app and sees a "Voorspelling plakken" button on the dashboard. He taps it once. The app reads the clipboard, ingests the message, and shows the same 3-second undo toast as the Android share target. No navigation, no form.

**Why this priority**: This is the core feature. Everything else is edge-case handling around this one flow.

**Independent Test**: Copy any Dutch text (≥ 20 characters) to the clipboard. Open the app. Tap "Voorspelling plakken". The expert messages list gains one entry and the undo toast appears at the bottom.

**Acceptance Scenarios**:

1. **Given** Scott has copied a WhatsApp forecast message, **When** he taps "Voorspelling plakken" on the dashboard, **Then** the app reads the clipboard, ingests the message, and shows the undo toast — no other interaction required
2. **Given** the undo toast is visible, **When** Scott taps **Ongedaan maken**, **Then** the message is removed and the toast dismisses immediately
3. **Given** the 3-second window expires without interaction, **When** the toast auto-dismisses, **Then** the message remains permanently in the expert messages list
4. **Given** Scott taps **Bewerken** in the toast, **When** navigating to the detail view, **Then** the reference date is editable and re-parse works as per feature 002
5. **Given** the user is on iOS and taps the button for the first time, **When** the iOS permission prompt appears, **Then** after granting access the ingest proceeds without requiring a second tap

---

### User Story 2 — Graceful handling of non-forecast clipboard content (Priority: P2)

The clipboard might contain something that isn't a forecast — a phone number, a URL, a different WhatsApp message. The app should not silently ingest junk.

**Why this priority**: Prevents confusing entries appearing in the expert messages list from accidental taps when the clipboard holds unrelated content.

**Independent Test**: Copy a URL or a short piece of text (< 20 characters) to the clipboard. Tap "Voorspelling plakken". An inline warning appears and no entry is added to the expert messages list.

**Acceptance Scenarios**:

1. **Given** the clipboard contains text shorter than 20 characters, **When** Scott taps the paste button, **Then** an inline warning "Klembord bevat geen voorspelling" appears and nothing is ingested
2. **Given** the clipboard is empty, **When** Scott taps the paste button, **Then** an inline warning "Klembord is leeg" appears and nothing is ingested
3. **Given** the clipboard text is longer than 1500 characters, **When** Scott taps the button, **Then** the text is silently truncated to 1500 characters and ingested normally with no warning

---

### Edge Cases

- What if the user denies the clipboard permission prompt? → Button shows "Toegang tot klembord geweigerd" inline and does nothing; user can re-enable in iOS Settings
- What if the Clipboard API is unavailable (non-HTTPS or very old browser)? → Button is not rendered at all; no error or empty space shown
- What if the user taps the button multiple times while a toast is already visible? → Button is disabled while the toast is showing; no duplicate ingestion occurs
- What if the clipboard contains the same text as the most recently ingested message? → The existing deduplication logic in `addExpertMessage` applies; a new version entry is created with `previousVersionId` set

---

## Requirements *(mandatory)*

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | The dashboard MUST display a "Voorspelling plakken" button only when the Clipboard API is available and the page is served over HTTPS |
| FR-002 | Tapping the button MUST trigger a clipboard read; on iOS this shows a system "Paste" callout on every read (WebKit behaviour, no workaround) |
| FR-003 | If the clipboard text is blank or shorter than 20 characters, the button MUST show an inline warning message and MUST NOT ingest anything |
| FR-004 | If the clipboard text is valid (≥ 20 characters), the button MUST call `addExpertMessage` with the text and today's date, then show the undo toast |
| FR-005 | Clipboard text longer than 1500 characters MUST be silently truncated before ingestion |
| FR-006 | If clipboard permission is denied by the user, the button MUST display "Toegang tot klembord geweigerd" and take no further action |
| FR-007 | While the undo toast is visible, the paste button MUST be disabled to prevent duplicate ingestion |
| FR-008 | Inline warning messages MUST auto-clear after 3 seconds or when the user taps the button again |

### Key Entities

- **Clipboard read result**: Transient text string; not persisted — passed directly to `addExpertMessage`
- **ExpertMessage**: Existing entity from feature 001; created by `addExpertMessage` and persisted to local device storage
- **UndoToastState**: Existing transient store from feature 002; displayed after successful ingest

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From copying a message in WhatsApp to it appearing in the expert list requires exactly 2 user actions (copy + tap button) and completes in under 5 seconds
- **SC-002**: The iOS clipboard "Paste" callout appears on every tap (WebKit limitation — no workaround); the total flow is 2 taps (button + Paste callout) rather than 1, which is still a significant improvement over the current 5+ tap manual flow
- **SC-003**: Invalid clipboard content (empty or < 20 characters) is rejected 100% of the time with a visible inline message; no junk entries are created
- **SC-004**: The feature works fully offline — no network connection is required at any point in the flow

---

## Assumptions

- The primary target device is iPhone running iOS 13.4+ (where `navigator.clipboard.readText()` is available in PWAs); Android users already have the share target from feature 002 and do not need this button
- "Valid" forecast text is defined purely by minimum length (≥ 20 characters); no Dutch-language detection is applied — the parser handles non-forecast text gracefully without crashing
- The 1500-character truncation limit is inherited from feature 002 for consistency
- The button appears on the main dashboard (`/` route) only, not on the Expert page which already has a manual paste form
- The undo toast component and `showUndoToast` / `addExpertMessage` from features 001 and 002 are fully available and require no modification
