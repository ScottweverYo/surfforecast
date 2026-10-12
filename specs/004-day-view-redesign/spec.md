# Feature Specification: Day View Redesign

**Feature Branch**: `004-day-view-redesign`
**Created**: 2026-04-03
**Status**: Draft
**Input**: User description: "couple of design changes: Show daily average swell and wind in the day preview. Change 'Next best session' to Next best moment, for example friday morning shows a nice grade in the morning, thats an opportunity for a session. Show tides in the detailed day view as a line through the hours. Open the day detailed view in a collapsible instead of opening a new page."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Swell and wind at a glance in the day list (Priority: P1)

A surfer scans the 14-day forecast list on the home page and wants to immediately understand whether each day has enough swell and acceptable wind, without opening the detail view. Currently only the composite score is visible; adding average swell height and average wind speed lets the user filter days visually before committing to a deeper look.

**Why this priority**: Directly improves the day-selection workflow — the primary interaction on the home screen. All other changes depend on users arriving at this list first.

**Independent Test**: Implement DayRow changes only; the rest of the app can remain unchanged. Value is delivered when a user can see swell and wind per row.

**Acceptance Scenarios**:

1. **Given** the forecast is loaded, **When** the user views the day list, **Then** each day row displays the average swell height (e.g., "1.2 m") and average wind speed for that day alongside the composite score.
2. **Given** a day has no forecast data, **When** the row renders, **Then** swell and wind values show a dash ("—") rather than crashing or showing zero.
3. **Given** different days, **When** their averages differ, **Then** each row shows its own correct values (no cross-contamination between days).

---

### User Story 2 — "Next best moment" replaces "Next best session" (Priority: P1)

A surfer wants to know the single upcoming window when conditions are most favourable. The current card identifies a wide continuous block of hours; the redesigned card should instead identify a named time-of-day moment (morning, midday, afternoon, or evening) and present it as a concrete opportunity tied to a recognisable label, like "Friday morning".

**Why this priority**: This is the most prominent card on the home screen and sets the user's mental model for when to surf. Renaming and refining the concept directly affects daily planning.

**Independent Test**: Change the card label and algorithm in isolation. Value is delivered when the card reads "Next best moment" and names a time-of-day period.

**Acceptance Scenarios**:

1. **Given** forecast data is available, **When** the home page loads, **Then** the card is labelled "Next best moment" (not "Next best session").
2. **Given** Friday morning has the best hourly scores in the morning window, **When** the card is shown, **Then** it reads "Friday morning" with the average score for that window.
3. **Given** multiple named windows have the same score, **When** the card is shown, **Then** the earliest upcoming window is selected.
4. **Given** no window in the next 14 days meets a minimum acceptable score, **When** the card is shown, **Then** a graceful fallback message is displayed (e.g., "No good moments in the next 14 days").

---

### User Story 3 — Tide height line in the detailed day view (Priority: P2)

A surfer opens the detail view for a specific day and wants to see how the tide moves across the day — not just Low/Mid/High labels but the actual curve, so they can judge whether tide is rising or falling at their preferred session time.

**Why this priority**: Tides are a key scoring factor at Scheveningen; a visual curve adds meaningful context beyond the table labels that already exist.

**Independent Test**: Add the tide chart to the detail view independently of the collapsible change. Delivers value in the existing route-based day page even before the collapsible is implemented.

**Acceptance Scenarios**:

1. **Given** the user opens a day's detail view, **When** the hourly breakdown is shown, **Then** a continuous tide height line chart is visible, covering the full 24-hour span of the day.
2. **Given** the tide chart is rendered, **When** the user reads it, **Then** the vertical axis represents tide height in centimetres (above NAP) and the horizontal axis represents hours of the day (00:00–23:00).
3. **Given** a day where the tide peaks at 13:00, **When** the user views the chart, **Then** the line clearly shows a peak at 13:00.
4. **Given** tide data is unavailable, **When** the chart would render, **Then** the chart area is hidden and a fallback text "Tide data unavailable" is shown.

---

### User Story 4 — Day detail expands inline as a collapsible (Priority: P2)

Instead of navigating away from the home page to a separate `/day/[date]` route, tapping a day row expands an inline collapsible panel directly beneath that row, showing the full hourly breakdown and tide chart. The user stays on the home page and can collapse the panel to compare other days.

**Why this priority**: Reduces navigation friction. Users frequently want to compare two or three days in sequence; the current page-navigation model forces a back-press between each.

**Independent Test**: Implement the collapsible on the home page while keeping the `/day/[date]` route alive. Value is delivered when a day can be expanded inline.

**Acceptance Scenarios**:

1. **Given** the user taps a day row, **When** the row is in its collapsed state, **Then** the full hourly detail panel expands beneath that row with a smooth animation.
2. **Given** one day's panel is open, **When** the user taps a different day row, **Then** the previously open panel closes and the new one opens (accordion behaviour — one open at a time).
3. **Given** a day panel is open, **When** the user taps the same row again, **Then** the panel collapses.
4. **Given** the page loads, **When** no interaction has occurred, **Then** all day panels are collapsed.
5. **Given** the detail panel is open, **When** the user scrolls, **Then** the panel scrolls naturally with the page (no fixed-height overflow clipping).

---

### Edge Cases

- What happens when the forecast has only partial data for a day (e.g., only 6 of 24 hours populated)? Averages and charts should be computed from available hours only, with no crash.
- What happens when the screen is very narrow (small mobile)? The collapsible panel must not overflow or truncate the tide chart horizontally.
- What happens if the user has a deep-linked `/day/[date]` bookmark? The existing route must still work.
- What happens when "Next best moment" finds a window today that has already passed? It must skip past hours and only consider windows starting in the future.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each day row in the forecast list MUST display the average swell height (in metres, one decimal place) computed across all available hourly slots for that day.
- **FR-002**: Each day row in the forecast list MUST display the average wind speed (in the same unit already used in the hourly table) computed across all available hourly slots for that day.
- **FR-003**: The "Next best session" card MUST be relabelled "Next best moment" throughout the interface.
- **FR-004**: The next-best-moment algorithm MUST evaluate forecast hours grouped into four named time-of-day windows: morning (06:00–10:00), midday (10:00–14:00), afternoon (14:00–18:00), and evening (18:00–21:00).
- **FR-005**: The next-best-moment card MUST display the day name and window name (e.g., "Friday morning") for the highest-scoring upcoming window.
- **FR-006**: The next-best-moment algorithm MUST only consider windows whose start time is in the future relative to the current local time.
- **FR-007**: The detailed day view MUST include a tide height line chart spanning 00:00–23:00, with one data point per hour plotted as a continuous curve.
- **FR-008**: The tide chart's vertical axis MUST show tide height in centimetres above NAP.
- **FR-009**: Tapping a day row on the home page MUST expand an inline collapsible panel showing the full hourly table and tide chart for that day.
- **FR-010**: Only one day collapsible panel MAY be open at a time (accordion behaviour).
- **FR-011**: The existing `/day/[date]` route MUST remain functional for direct deep-links and bookmarks.
- **FR-012**: When swell, wind, or tide data is unavailable for a slot, the UI MUST display a dash or fallback label rather than zero or a crash.

### Key Entities

- **Day Preview Row**: A summary row for one calendar day showing composite score, average swell height, and average wind speed.
- **Named Time Window**: A labelled sub-day period (morning / midday / afternoon / evening) used as the unit for next-best-moment evaluation.
- **Tide Height Chart**: A continuous line chart mapping hourly tide height (cm above NAP) across a 24-hour day.
- **Collapsible Day Panel**: An inline expandable section beneath a day row containing the hourly breakdown table and tide chart.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can identify the average swell height and wind speed for any day without leaving the home screen or tapping anything.
- **SC-002**: The "Next best moment" card names a specific day-and-period (e.g., "Saturday afternoon") for every page load when at least one future window exists with a score above the minimum threshold.
- **SC-003**: A user can open and read the full hourly breakdown for any day without navigating away from the home page.
- **SC-004**: The tide chart is visible and correctly shaped (rising/falling curve) for every day that has tide data, accessible via the collapsible panel.
- **SC-005**: All four changes are independently non-breaking — the app must remain fully functional if any single change is reverted.

---

## Assumptions

- The app already computes hourly swell height and wind speed per slot; daily averages will be derived from existing slot data without new API calls.
- "Wind speed" in the day preview uses the same unit (Beaufort) already displayed in the hourly table.
- Named time windows (morning/midday/afternoon/evening) are fixed hour ranges and are not user-configurable in this feature.
- The collapsible panel reuses the same hourly data and tide logic already present in the `/day/[date]` route — no new data fetching is introduced.
- The existing `/day/[date]` route is kept as-is for backward compatibility; it is not removed or redirected.
- "Next best moment" searches the same 14-day forecast window as the current "Next best session" feature.
- The tide height chart uses the existing harmonic tidal computation already in the app — no external tide API is needed.
