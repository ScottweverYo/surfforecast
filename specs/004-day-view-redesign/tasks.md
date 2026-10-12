# Tasks: Day View Redesign

**Input**: Design documents from `/specs/004-day-view-redesign/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

**Tests**: Not explicitly requested — no test tasks generated.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- All paths relative to `frontend/src/`

---

## Phase 1: Setup

**Purpose**: No new project scaffolding needed. This phase confirms the branch is active and the existing structure is understood.

- [x] T001 Confirm active branch is `004-day-view-redesign` and `frontend/src/` structure matches plan.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type contract changes that ALL user stories depend on. Must complete before any story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add `DailySummary` interface to `frontend/src/lib/types.ts` (fields: date, meanScore, confidence, avgSwellHeight, avgWindSpeed)
- [x] T003 Add `TimeWindow` union type (`'morning' | 'midday' | 'afternoon' | 'evening'`) to `frontend/src/lib/types.ts`
- [x] T004 Update `NextBestSession` interface in `frontend/src/lib/types.ts`: remove `startHour` and `endHour`, add `window: TimeWindow`

**Checkpoint**: Run `npm run lint` in `frontend/` — type errors expected in callers, will be fixed story-by-story.

---

## Phase 3: User Story 1 — Swell and wind in day preview (Priority: P1) 🎯 MVP

**Goal**: Every day row on the home page shows average swell height (m) and average wind speed (Bft).

**Independent Test**: Load the home page with forecast data. Each day row displays two additional values: a swell height like "1.2 m" and a wind speed like "Bft 3". Rows with no data show "—".

### Implementation for User Story 1

- [x] T005 [US1] Extend the `dailySummaries` derivation in `frontend/src/routes/+page.svelte` to accumulate `swellHeight` and `windSpeed` per slot, then compute `avgSwellHeight` (mean metres, 1 decimal) and `avgWindSpeed` (mean Beaufort integer using existing `msToBft()`) per day — return typed `DailySummary[]`
- [x] T006 [US1] Update `frontend/src/components/DayRow.svelte` to accept `avgSwellHeight: number` and `avgWindSpeed: number` props (both optional, show "—" if falsy/zero)
- [x] T007 [US1] Add swell and wind display to the `DayRow` layout — show "X.X m" and "Bft X" as a secondary line or inline chips; must not wrap on 375 px viewport
- [x] T008 [US1] Update the `<DayRow>` call site in `frontend/src/routes/+page.svelte` to pass `avgSwellHeight` and `avgWindSpeed` from the new `DailySummary` fields

**Checkpoint**: Home page renders each day row with swell and wind values. `npm test && npm run lint` passes.

---

## Phase 4: User Story 2 — Next best moment (Priority: P1)

**Goal**: The highlight card reads "Volgende beste moment" and identifies a named time-of-day window (e.g., "vrijdag ochtend") instead of a raw time range.

**Independent Test**: Load the home page. The card header reads "Volgende beste moment". The day+window label (e.g., "vrijdag ochtend") is visible. Stars and top-conditions chips render as before.

### Implementation for User Story 2

- [x] T009 [US2] Add `findNextBestMoment(slots: ForecastSlot[], now: Date): NextBestSession | null` to `frontend/src/lib/scoring/index.ts` — implement the four named windows (morning 06–10, midday 10–14, afternoon 14–18, evening 18–21); skip windows whose start hour has passed; require swellHeight ≥ 0.3 m; return highest-scoring window (mean composite ≥ 2.0) with `window: TimeWindow`; apply +0.01 confidence bonus for 'standard'; resolve midday/afternoon Dutch labels as "vroege middag" / "late middag"
- [x] T010 [US2] Update `frontend/src/components/NextBestCard.svelte`: change header text from "Volgende beste sessie" to "Volgende beste moment"; replace the `HH:00–HH:00` time range display with the window label (derived from `session.window`) shown alongside the formatted day name (e.g., "vrijdag ochtend")
- [x] T011 [US2] Update `frontend/src/routes/+page.svelte`: replace `findNextBestSession` call with `findNextBestMoment`; store result in the same `nextBestSession` field of the forecast store (type now uses updated `NextBestSession`)
- [x] T012 [US2] Update `frontend/src/lib/stores/forecast.ts` if `nextBestSession` is recomputed or stored there — ensure it calls `findNextBestMoment` and the stored shape matches the updated `NextBestSession` type

**Checkpoint**: Home page shows "Volgende beste moment" card with day+window label. `npm test && npm run lint` passes.

---

## Phase 5: User Story 3 — Tide height line chart (Priority: P2)

**Goal**: The detailed day view includes a continuous tide height line chart (cm above NAP, 00:00–23:00).

**Independent Test**: Open the `/day/[date]` route for any date. A line chart is visible showing tide height (labelled "cm (NAP)") with hours on the x-axis. The curve rises and falls correctly. If no tide data, a fallback message shows instead.

### Implementation for User Story 3

- [x] T013 [US3] Create `frontend/src/components/TideChart.svelte` — accepts `slots: ForecastSlot[]` prop; renders a Chart.js `line` chart with hours on x-axis (`00:00`–`23:00`), `tideHeight` values on y-axis (cm above NAP, labelled "cm (NAP)"); smooth curve (`tension: 0.4`), muted blue, no point markers, no legend; if `slots` is empty or all tideHeight values are 0, render `<p>Tide data unavailable</p>` instead of canvas
- [x] T014 [US3] Add `<TideChart slots={daySlots} />` to `frontend/src/routes/day/[date]/+page.svelte` — place it between the existing `HourlyChart` card and the hourly table

**Checkpoint**: `/day/[date]` route shows tide chart above the hourly table. `npm test && npm run lint` passes.

---

## Phase 6: User Story 4 — Collapsible inline day detail (Priority: P2)

**Goal**: Tapping a day row on the home page expands an inline accordion panel with the full hourly breakdown and tide chart. Only one panel is open at a time. The `/day/[date]` route remains intact.

**Independent Test**: On the home page, tap any day row — a panel slides open beneath it showing the hourly table and tide chart. Tap a second row — the first panel closes and the second opens. Tap the same row again — it closes. Direct-linking to `/day/[date]` still works.

### Implementation for User Story 4

- [x] T015 [US4] Create `frontend/src/components/DayDetail.svelte` — accepts `slots: ForecastSlot[]` prop; contains the `HourlyChart`, `TideChart`, and hourly table (7-column layout: Time, Golf, Periode, Richting, Wind, Getij, Score) with per-hour `ScoreBreakdown` toggle; move `expandedHour` local state into this component
- [x] T016 [US4] Update `frontend/src/routes/day/[date]/+page.svelte` — remove inline hourly table markup and `HourlyChart` invocation; replace with `<DayDetail slots={daySlots} />`; keep page header (back button, date title, confidence badge) and `daySlots` derivation unchanged
- [x] T017 [US4] Add `expandedDate = $state<string | null>(null)` and `slotsForDate(date: string): ForecastSlot[]` helper to `frontend/src/routes/+page.svelte`
- [x] T018 [US4] Update `DayRow` `onclick` in `frontend/src/routes/+page.svelte` — replace `goto('/day/${day.date}')` with `toggleDay(date)` function that sets `expandedDate = expandedDate === date ? null : date`
- [x] T019 [US4] Add `expanded: boolean` prop to `frontend/src/components/DayRow.svelte` and update the chevron icon to reflect open/closed state (e.g., `›` → `⌄` when expanded)
- [x] T020 [US4] Wire the accordion in `frontend/src/routes/+page.svelte` — after each `<DayRow>`, add `{#if expandedDate === day.date}<DayDetail slots={slotsForDate(day.date)} />{/if}` with Svelte `slide` transition (import from `svelte/transition`)

**Checkpoint**: Home page accordion works correctly. `/day/[date]` route still functions. `npm test && npm run lint` passes.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Responsive edge cases, final lint pass, and minor UX details.

- [x] T021 [P] Verify DayRow swell/wind display does not wrap on 375 px viewport — adjust layout if needed in `frontend/src/components/DayRow.svelte`
- [x] T022 [P] Verify TideChart renders correctly inside the collapsible panel (Chart.js canvas sizing) — add `width: 100%` or `responsive: true` if needed in `frontend/src/components/TideChart.svelte`
- [x] T023 Run `npm test && npm run lint` from `frontend/` — resolve any remaining type errors from the `NextBestSession` shape change

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 2
- **Phase 5 (US3)**: Depends on Phase 2
- **Phase 6 (US4)**: Depends on Phase 5 (needs TideChart) and Phase 3 (uses DayRow `expanded` prop)
- **Phase 7 (Polish)**: Depends on Phases 3–6

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2 — independent of US2, US3, US4
- **US2 (P1)**: Starts after Phase 2 — independent of US1, US3, US4
- **US3 (P2)**: Starts after Phase 2 — independent of US1, US2; **must complete before US4**
- **US4 (P2)**: Starts after US3 (needs TideChart) and US1 (needs updated DayRow)

### Parallel Opportunities

After Phase 2 completes:
- US1 (Phase 3) and US2 (Phase 4) can be developed in parallel — different files, no shared state
- US3 (Phase 5) can start in parallel with US1 and US2

---

## Parallel Example: Post-Foundational

```bash
# After Phase 2 completes, these phases can run simultaneously:
Phase 3 (US1): DayRow swell/wind — touches +page.svelte derivation + DayRow.svelte
Phase 4 (US2): Next best moment — touches scoring/index.ts + NextBestCard.svelte + stores
Phase 5 (US3): TideChart — creates new TideChart.svelte (no conflicts)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T004)
3. Complete Phase 3: US1 — swell/wind in day rows (T005–T008)
4. **STOP and VALIDATE**: Home page shows swell and wind in every day row
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready (type contract locked)
2. Phase 3 (US1) → Swell/wind in rows ✓
3. Phase 4 (US2) → Next best moment card ✓
4. Phase 5 (US3) → Tide chart in day detail route ✓
5. Phase 6 (US4) → Inline collapsible accordion ✓
6. Phase 7 → Polish ✓

---

## Notes

- `msToBft()` already exists in `routes/day/[date]/+page.svelte` — extract to `lib/utils.ts` or import directly in `+page.svelte` derivation (avoid duplication)
- Dutch window labels: morning → "ochtend", midday → "vroege middag", afternoon → "late middag", evening → "avond"
- `slide` transition: `import { slide } from 'svelte/transition'` — zero extra dependencies
- Chart.js `responsive: true` is essential for TideChart inside a collapsible (canvas must reflow on open)
- The `expandedHour` local state in `DayDetail.svelte` resets to `null` each time the panel opens — this is correct behaviour (no stale expansion state)
