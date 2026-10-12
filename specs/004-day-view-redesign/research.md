# Research: Day View Redesign

**Feature**: 004-day-view-redesign  
**Date**: 2026-04-03

---

## Decision: Named time windows for "Next best moment"

**Decision**: Fixed four windows — morning (06–10), midday (10–14), afternoon (14–18), evening (18–21) — evaluated by mean composite score.

**Rationale**: The user's example ("Friday morning") implies recognisable, named periods rather than arbitrary hours. Fixed ranges are simpler to implement and easier for users to plan around than a sliding 2-hour window. The 06–21 span covers all realistic surf sessions at Scheveningen; hours outside this range are not surfed in practice.

**Alternatives considered**:
- Keep the existing 2-hour sliding window and just relabel — rejected because it would still show "10:00–12:00" without a human-readable name.
- User-configurable window sizes — rejected as out of scope for this feature.

---

## Decision: Wind unit in DayRow

**Decision**: Display average wind speed in Beaufort (integer), matching the hourly table in the day detail view.

**Rationale**: The `msToBft()` conversion helper already exists in the codebase and is used in `routes/day/[date]/+page.svelte`. Reusing it ensures consistency and avoids a new conversion function.

**Alternatives considered**:
- m/s — would be a raw API value, not user-friendly.
- km/h — not used anywhere else in the app.

---

## Decision: Tide chart placement within DayDetail

**Decision**: Place the TideChart between the HourlyChart (score bar chart) and the hourly table.

**Rationale**: This groups both charts together visually before the tabular data, maintaining a scan order of "overview → tide curve → hourly detail". The tide chart is context for the table rows below it.

**Alternatives considered**:
- Below the hourly table — would separate the two charts and require scrolling past the table to reach the tide curve.
- Overlaid on the HourlyChart — technically feasible with Chart.js dual-axis, but complicates the existing chart component and mixes score (1–5) and height (cm) scales in a confusing way.

---

## Decision: Collapsible animation

**Decision**: Use Svelte's built-in `slide` transition (`svelte/transition`) for accordion open/close animation.

**Rationale**: `slide` is zero-dependency (ships with Svelte), handles height animation correctly without requiring explicit `max-height` hacks, and respects `prefers-reduced-motion` via Svelte's transition system.

**Alternatives considered**:
- CSS `max-height` transition — fragile when content height is unknown (DayDetail contains charts with variable height).
- `fade` only — does not communicate expansion visually.

---

## Decision: Keep `/day/[date]` route intact

**Decision**: The route stays and is refactored to use the new `DayDetail` component, not removed.

**Rationale**: Spec FR-011 explicitly requires the route to remain functional for deep-links and bookmarks. The refactor to `DayDetail` also eliminates code duplication between the route and the collapsible.

---

## No NEEDS CLARIFICATION items remain

All unknowns were resolved via codebase exploration and the user's confirmed preference (accordion: one open at a time).
