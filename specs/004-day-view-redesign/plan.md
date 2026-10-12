# Implementation Plan: Day View Redesign

**Branch**: `004-day-view-redesign` | **Date**: 2026-04-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-day-view-redesign/spec.md`

## Summary

Four incremental UI improvements to the forecast home page and day detail view: (1) show daily average swell height and wind speed in every day row, (2) replace the "Next best session" card with a "Next best moment" card that identifies named time-of-day windows, (3) add a tide height line chart to the detailed day view, (4) convert the day detail from a separate route to an inline collapsible accordion on the home page — while keeping the existing `/day/[date]` route alive.

All changes are frontend-only. No new API calls or data-fetching logic are required; every piece of data is already present in the existing `ForecastSlot` objects.

---

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: SvelteKit 2, Svelte 5 (runes mode), Chart.js, date-fns, idb-keyval, vite-plugin-pwa  
**Storage**: localStorage (existing); no new storage  
**Testing**: npm test (vitest, existing)  
**Target Platform**: PWA / mobile-first browser  
**Project Type**: Web application (frontend-only SPA)  
**Performance Goals**: No new network requests; all derived data computed from cached slots  
**Constraints**: Offline-capable (Workbox); no breaking changes to `/day/[date]` route  
**Scale/Scope**: Single-user PWA, 14-day forecast window, ~336 hourly slots

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is a blank template with no active principles. No gates to enforce. ✓

---

## Project Structure

### Documentation (this feature)

```text
specs/004-day-view-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (affected paths)

```text
frontend/src/
├── lib/
│   ├── types.ts                    # MODIFY — new DailySummary type; updated NextBestSession
│   └── scoring/
│       └── index.ts                # MODIFY — new findNextBestMoment(); keep findNextBestSession()
├── components/
│   ├── DayRow.svelte               # MODIFY — add avgSwellHeight + avgWindSpeed props
│   ├── NextBestCard.svelte         # MODIFY — relabel; show windowName instead of time range
│   ├── DayDetail.svelte            # NEW — shared hourly table + tide chart (extracted component)
│   └── TideChart.svelte            # NEW — Chart.js line chart of tide height
└── routes/
    ├── +page.svelte                # MODIFY — expanded dailySummaries; collapsible accordion logic
    └── day/[date]/
        └── +page.svelte            # MODIFY — delegate to DayDetail component
```

---

## Complexity Tracking

No constitution violations. Section not applicable.

---

## Phases

### Phase 1 — Data model and type changes

**Goal**: Formalise new types so all downstream components have a stable contract.

**Changes to `frontend/src/lib/types.ts`**:

1. Add `DailySummary` interface (currently an anonymous inline object in `+page.svelte`):
   ```
   DailySummary {
     date: string           // ISO date "YYYY-MM-DD"
     meanScore: number      // 1–5, rounded to nearest 0.5
     confidence: Confidence
     avgSwellHeight: number // metres, one decimal, average across day slots
     avgWindSpeed: number   // Beaufort integer, average across day slots
   }
   ```

2. Add `TimeWindow` union type:
   ```
   type TimeWindow = 'morning' | 'midday' | 'afternoon' | 'evening'
   ```

3. Update `NextBestSession`:
   - Replace `startHour: number` and `endHour: number` with `window: TimeWindow`
   - Keep all other fields unchanged (`date`, `compositeScore`, `confidence`, `topConditions`)

---

### Phase 2 — Scoring algorithm: `findNextBestMoment`

**Goal**: Replace the arbitrary sliding-window approach with named time-of-day window evaluation.

**File**: `frontend/src/lib/scoring/index.ts`

**Named window definitions** (local time hours, inclusive start / exclusive end):

| Window | Start | End | Label (NL) |
|--------|-------|-----|------------|
| morning | 06 | 10 | ochtend |
| midday | 10 | 14 | middag (early) |
| afternoon | 14 | 18 | middag |
| evening | 18 | 21 | avond |

**Algorithm**:
1. For each of the next 14 days × 4 windows:
   a. Collect slots whose local hour falls within the window's range
   b. Skip the entire window if its start time is in the past (relative to `now`)
   c. Require at least one slot in the window with `swellHeight ≥ 0.3 m`
   d. Compute mean composite score across the window's slots
   e. Apply +0.01 confidence bonus for 'standard' confidence (matches existing behaviour)
2. Select the window with the highest mean score; ties broken by earliest window
3. Return `null` if no window has a mean score ≥ 2.0
4. Return `NextBestSession` with `window: TimeWindow` instead of `startHour`/`endHour`

**Keep `findNextBestSession`** (the old function) in place but unexported or deprecated — do not delete until all callers are updated.

---

### Phase 3 — DayRow: swell and wind averages

**Goal**: Surface `avgSwellHeight` and `avgWindSpeed` in each day preview row.

**Changes**:

- `+page.svelte`: extend the `dailySummaries` derivation to collect `swellHeight` and `windSpeed` per slot, then average them. Convert wind speed from m/s to Beaufort using the existing `msToBft()` helper (already used in the day detail page).
- `DayRow.svelte`: add two optional display fields:
  - Swell: `X.X m` (one decimal)
  - Wind: `Bft X` (integer Beaufort)
  - If data unavailable, show `—`

**Layout**: Place swell and wind as a secondary line or as two small inline chips beneath (or alongside) the composite score, chosen to fit the existing compact row height. Exact visual treatment is left to implementation, but must not wrap on a 375 px viewport.

---

### Phase 4 — NextBestCard: relabel and show named window

**Goal**: Update the card to read "Volgende beste moment" and display the window name.

**Changes to `NextBestCard.svelte`**:
- Change header text from "Volgende beste sessie" to "Volgende beste moment"
- Replace the `HH:00–HH:00` time range with the window label (e.g., "ochtend", "middag", "avond") displayed alongside the day name — result reads like "vrijdag ochtend"
- All other card content (score, stars, top conditions) remains unchanged

**Changes to `+page.svelte`**:
- Update the `nextBestSession` computation call to use `findNextBestMoment` instead of `findNextBestSession`
- Store result in `forecast.nextBestSession` (or a new `nextBestMoment` field — keep consistent with store shape)

---

### Phase 5 — TideChart component

**Goal**: A standalone Chart.js line chart showing tide height across 24 hours.

**New file**: `frontend/src/components/TideChart.svelte`

**Props**:
- `slots: ForecastSlot[]` — the 24 hourly slots for one day (may be partial)

**Implementation**:
- Use Chart.js `line` type (Chart.js is already a dependency)
- X axis: hour labels `00:00` through `23:00`
- Y axis: tide height in cm (above NAP); auto-scale to data range; label "cm (NAP)"
- Single dataset: `tideHeight` values extracted from slots
- Smooth curve: `tension: 0.4` (cubic bezier interpolation)
- If `slots` is empty or all `tideHeight` values are 0/unavailable, render a fallback `<p>Tide data unavailable</p>` instead of the canvas
- Visual style: thin line, muted blue, no point markers, no legend

---

### Phase 6 — DayDetail shared component

**Goal**: Extract the hourly breakdown (table + tide chart) into a reusable component used by both the collapsible on the home page and the existing route.

**New file**: `frontend/src/components/DayDetail.svelte`

**Props**:
- `slots: ForecastSlot[]` — hourly slots for the day

**Contains** (extracted from `routes/day/[date]/+page.svelte`):
- The `HourlyChart` bar chart (existing)
- The hourly table (7-column layout: Time, Golf, Periode, Richting, Wind, Getij, Score)
- The `ScoreBreakdown` expandable rows (existing per-hour toggle)
- The new `TideChart` component (Phase 5)
- Local state: `expandedHour: number | null` (tracks which row is expanded)

**Placement of TideChart**: Rendered between the HourlyChart and the hourly table, within the same card or a dedicated card.

---

### Phase 7 — Home page collapsible accordion

**Goal**: Replace DayRow navigation to `/day/[date]` with inline accordion expansion.

**Changes to `+page.svelte`**:

1. Add reactive state: `let expandedDate = $state<string | null>(null)`
2. Change DayRow `onclick` from `goto('/day/${day.date}')` to a toggle function:
   ```
   function toggleDay(date: string) {
     expandedDate = expandedDate === date ? null : date;
   }
   ```
3. After each `<DayRow>`, conditionally render `<DayDetail>` using Svelte's `{#if}` block with a slide/fade transition (Svelte built-in `slide` transition from `svelte/transition`)
4. Pass the filtered slots for that date to `<DayDetail slots={slotsForDate(day.date)} />`
5. Add a `slotsForDate(date: string): ForecastSlot[]` derived helper that filters `$forecast.slots` by date prefix

**Accordion behaviour**: Setting `expandedDate` to a new date automatically collapses the previous one (single `$state` value ensures only one can be open).

**Visual indicator**: DayRow should show a down/up chevron to signal open/closed state. Pass an `expanded: boolean` prop to `DayRow`.

---

### Phase 8 — Day detail route: delegate to DayDetail

**Goal**: Eliminate duplication; the existing route uses `DayDetail`.

**Changes to `routes/day/[date]/+page.svelte`**:
- Remove the inline hourly table markup and HourlyChart invocation
- Replace with `<DayDetail slots={daySlots} />`
- Keep the page header (back button, date title, confidence badge) unchanged
- Keep the `daySlots` derivation unchanged

---

## Dependency Order

```
Phase 1 (types)
  → Phase 2 (scoring algorithm)
  → Phase 3 (DayRow data)        [can run in parallel with Phase 2]
  → Phase 4 (NextBestCard)       [depends on Phase 2]
  → Phase 5 (TideChart)          [independent]
  → Phase 6 (DayDetail)          [depends on Phase 5]
  → Phase 7 (home collapsible)   [depends on Phase 3 + Phase 6]
  → Phase 8 (route refactor)     [depends on Phase 6]
```

Phases 2 and 3 can be developed in parallel after Phase 1. Phases 5 and 6 can be developed in parallel with Phases 2–4. Phases 7 and 8 are final integration.
