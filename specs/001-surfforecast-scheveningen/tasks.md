# Tasks: Surfforecast — Scheveningen Surf Condition Predictor

**Input**: Design documents from `/specs/001-surfforecast-scheveningen/`
**Branch**: `001-surfforecast-scheveningen`
**Stack**: TypeScript 5.x · SvelteKit (SPA) · Vite · vite-plugin-pwa · Chart.js · date-fns · idb-keyval · Vitest · Playwright

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Project initialisation and toolchain configuration

- [X] T001 Initialise SvelteKit project with TypeScript: `npm create svelte@latest . -- --name surfforecast --template skeleton --types typescript` in repo root
- [X] T002 Install runtime dependencies: `npm install chart.js svelte-chartjs date-fns idb-keyval`
- [X] T003 [P] Install dev dependencies: `npm install -D vite-plugin-pwa @playwright/test vitest @vitest/ui jsdom`
- [X] T004 [P] Configure vite-plugin-pwa in `vite.config.ts`: Workbox `generateSW` strategy, cache app shell + API responses, `registerType: 'autoUpdate'`
- [X] T005 [P] Configure Vitest in `vite.config.ts`: `environment: 'jsdom'`, `include: ['tests/unit/**/*.test.ts']`; configure Playwright in `playwright.config.ts`: mobile viewport 390×844, baseURL `http://localhost:5173`
- [X] T006 [P] Create `static/manifest.webmanifest` (name, short_name, display: standalone, start_url, theme_color) and placeholder `static/icons/` directory with 192×192 and 512×512 PNG icons

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, API clients, scoring engine, and forecast store. All user stories depend on this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Define all shared TypeScript interfaces in `src/lib/types.ts`: `ForecastSlot`, `Score`, `ParameterScore`, `ForecastCache`, `NextBestSession`, `ExpertMessage`, `SpotMention`, `TimeWindowExtraction`, `WaveDescriptor`, `WindDescriptor`, `TideDescriptor`, `DivergenceRecord`, `SessionLog`, `ModelAccuracy`, `ScoringWeights` — match exactly the interfaces in `specs/001-surfforecast-scheveningen/data-model.md`
- [X] T008 [P] Implement Open-Meteo Marine API client in `src/lib/api/marine.ts`: fetch `https://marine-api.open-meteo.com/v1/marine` for Scheveningen coords (52.1033, 4.2700), parse hourly `swell_wave_height/period/direction`, `wind_wave_height/period` into partial `ForecastSlot[]`; handle HTTP errors gracefully (return null on failure)
- [X] T009 [P] Implement Open-Meteo Weather API client in `src/lib/api/wind.ts`: fetch `https://api.open-meteo.com/v1/forecast` with `hourly=windspeed_10m,winddirection_10m,windgusts_10m&forecast_days=16&wind_speed_unit=ms`, parse into `{timestamp, windSpeed, windDirection, windGusts}[]`; handle errors gracefully
- [X] T010 [P] Implement Rijkswaterstaat tide client in `src/lib/api/tide.ts`: POST to `https://waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES_DBO/OphalenWaarnemingen` with station `SCHEVNGN` and parameter `WATHTE`; parse water level readings into `{timestamp, tideHeight}[]`; derive `tideState` (low < -50cm NAP, mid -50–50cm, high > 50cm) and `tideDirection` (flooding/ebbing/slack) from consecutive readings; handle errors gracefully
- [X] T011 Implement forecast orchestrator in `src/lib/api/forecast.ts`: call all three clients concurrently (`Promise.allSettled`), merge by timestamp into `ForecastSlot[]`, assign `confidence: 'reduced'` to slots > 7 days from fetch time, populate `dataSourceStatus` for each source, return `ForecastCache`; on total failure return null
- [X] T012 [P] Implement per-parameter scoring rules in `src/lib/scoring/parameters.ts`: five pure functions (`scoreSwellDirection`, `scoreWindDirection`, `scoreSwellHeight`, `scoreSwellPeriod`, `scoreTideState`) each returning `ParameterScore`; implement exact score thresholds from `contracts/scoring-algorithm.md`
- [X] T013 [P] Implement scoring explanation strings in `src/lib/scoring/explanations.ts`: template functions for each parameter that return plain-English explanation strings given the raw value and score label (e.g. `explainWindDirection(95, 'excellent') → "E offshore (95°) — ideal glass conditions"`)
- [X] T014 Implement scoring module public API in `src/lib/scoring/index.ts`: `computeScore(slot, weights?)` → `Score` (apply default weights from `DEFAULT_WEIGHTS`, enforce height cap: if `swellHeight < 0.3m` force composite to 1 and set `cappedByHeight: true`); `findNextBestSession(slots, now, windowHours?)` → `NextBestSession | null` (best 2–4h contiguous window with mean composite ≥ 2, preferring next 7 days); `computeModelAccuracy(sessions)` → `ModelAccuracy | null` (Pearson r + MAE, require ≥ 5 sessions with non-null modelScore)
- [X] T015 Implement forecast store in `src/lib/stores/forecast.ts`: Svelte writable store wrapping `ForecastCache`; on first subscribe check IndexedDB (`idb-keyval` key `'forecast_scheveningen'`) — if missing or `fetchedAt` > 6 hours ago, fetch fresh via `src/lib/api/forecast.ts`; expose `refresh()` function for manual refresh; persist to IndexedDB on every successful fetch; export `isLoading`, `lastError` derived stores
- [X] T016 [P] Unit tests for scoring module in `tests/unit/scoring.test.ts`: test each parameter's boundary values (ideal/acceptable/poor/edge), height cap enforcement, composite formula with default and custom weights, `findNextBestSession` with future/past/flat slots, `computeModelAccuracy` threshold
- [X] T017 [P] Unit tests for forecast staleness and confidence in `tests/unit/forecast.test.ts`: mock `idb-keyval` and API clients; verify 6h staleness trigger, `confidence: 'reduced'` assignment at day 7/8 boundary, `dataSourceStatus` when one source fails, `refresh()` forces fetch regardless of age

**Checkpoint**: Types, API clients, scoring engine, and forecast store are complete and tested. User stories can now proceed.

---

## Phase 3: User Story 1 — 14-Day Forecast & Next Best Session (Priority: P1) 🎯 MVP

**Goal**: Dashboard showing NextBestSession card + colour-coded 14-day list; tap a day for hourly breakdown; manual refresh; offline mode with last-updated banner.

**Independent Test**: Open `http://localhost:5173`. NextBestCard is visible above the fold on a 390px viewport. 14-day list shows colour-coded rows. Tap any day → hourly slots with swell/wind/tide values. Go offline → last cached forecast renders with "last updated" timestamp. Tap refresh → loading state → fresh data.

- [X] T018 [P] [US1] Implement `NextBestCard` component in `src/components/NextBestCard.svelte`: display date (formatted with `date-fns` nl locale), time window (e.g. "14:00–16:00"), star rating (1–5, round to nearest 0.5), confidence badge ("Low confidence" if reduced), and top 3 `ParameterScore` conditions with icons; accepts `NextBestSession` prop
- [X] T019 [P] [US1] Implement `DayRow` component in `src/components/DayRow.svelte`: single row for 14-day list; background colour based on mean composite score (green ≥ 4, yellow = 3, orange = 2, red = 1); show date, star rating, reduced-confidence indicator for days 8+; navigates to `/day/[date]` on tap
- [X] T020 [US1] Implement app shell layout in `src/routes/+layout.svelte`: top nav with app title; offline detection (`navigator.onLine` + `window.addEventListener('offline'/'online')`); offline banner with last-updated timestamp from forecast store; PWA update prompt when new service worker available
- [X] T021 [US1] Implement dashboard route in `src/routes/+page.svelte`: subscribe to forecast store; render `NextBestCard` at top (above fold, no scroll on 390px); render `DayRow` list for 14 days beneath; include manual refresh button that calls `forecast.refresh()` and shows spinner while `$isLoading`; show per-source warnings when `dataSourceStatus` has errors
- [X] T022 [US1] Implement day detail route in `src/routes/day/[date]/+page.svelte`: load slots for `params.date` from forecast store; render hourly table with columns: time, swell height (m), swell period (s), swell direction (°), wind speed (Bft), wind direction, tide state; render `HourlyChart` component; include back-navigation to dashboard
- [X] T023 [P] [US1] Implement `HourlyChart` component in `src/components/HourlyChart.svelte`: Chart.js line/bar chart showing composite score per hour across the day; x-axis = hours, y-axis = 1–5 score; colour-coded bars matching green/yellow/orange/red scale; accepts `ForecastSlot[]` prop
- [X] T024 [US1] E2E test in `tests/e2e/dashboard.spec.ts`: mock forecast API responses; assert NextBestCard is visible in viewport on mobile; assert 14 DayRow items render; assert colour classes match scores; assert manual refresh button triggers loading state; assert offline banner appears when `navigator.onLine` set to false
- [X] T025 [US1] E2E test in `tests/e2e/dayDetail.spec.ts`: navigate to `/day/2026-04-05`; assert hourly table rows render; assert swell height, wind direction, tide state columns are present; assert reduced-confidence indicator on day 9+

**Checkpoint**: User Story 1 is fully functional. App is deployable as MVP.

---

## Phase 4: User Story 2 — Expert Meteorologist Message & Comparison (Priority: P2)

**Goal**: Paste free-form Dutch forecast text; app extracts spots, time windows, wave/wind/tide descriptors, generates side-by-side comparison with model, flags significant divergences, stores history.

**Independent Test**: Paste the Appendix C example message from `spec.md`. App extracts: Scheveningen (schev) + Z-H mentions, Friday 17:00–20:00 window, heuphoog (0.8–1.0m), afgaand (ebbing), S 4 Bft offshore. Comparison view renders with at least one divergence or agreement flag. Result appears in expert message history.

- [X] T026 [P] [US2] Implement spot detection in `src/lib/parser/spots.ts`: match against known abbreviations and terms (`schev` → Scheveningen, `Z-H` → Zuid-Holland, `N-H` → Noord-Holland, `hvh` → Hoek van Holland, `Zvoort` → Zandvoort); return `SpotMention[]`; mark `isScheveningen: true` for schev/Z-H matches; case-insensitive
- [X] T027 [P] [US2] Implement time window extraction in `src/lib/parser/timeWindows.ts`: regex `/(\d{1,2})[:\-–](\d{2})\s*u?/g` for hour ranges; Dutch day name resolution (vrijdag/zaterdag/zondag/maandag/dinsdag/woensdag/donderdag → absolute date relative to ingestion date); return `TimeWindowExtraction[]`
- [X] T028 [P] [US2] Implement wave descriptor parser in `src/lib/parser/waveDescriptors.ts`: map Dutch height terms (`heuphoog` → {min: 0.8, max: 1.0}, `schouderhoog` → {min: 1.0, max: 1.3}, `hoofdhoog` → {min: 1.2, max: 1.5}) plus numeric patterns (`/(\d+[,.]?\d*)\s*m\b/`); detect `swell` vs `windgolven` wave type; return `WaveDescriptor[]`
- [X] T029 [P] [US2] Implement wind descriptor parser in `src/lib/parser/windDescriptors.ts`: extract Beaufort (`/(\d+)\s*bft/i`); extract direction keywords (offshore → ~95°, onshore, zij-offshore/side-off, compass bearings N/O/Z/W and compounds); classify quality (offshore/side-offshore/onshore); return `WindDescriptor[]`
- [X] T030 [P] [US2] Implement tide descriptor parser in `src/lib/parser/tideDescriptors.ts`: exact match for `laagtij` → low, `hoogwater`/`HW` → high, `mid-tij` → mid, `opkomend` → flooding, `afgaand` → ebbing; return `TideDescriptor[]`
- [X] T031 [US2] Implement main parser in `src/lib/parser/index.ts`: `parseDutchForecast(rawText: string, ingestedAt: Date): ExpertMessage` — orchestrate all five sub-parsers, generate UUID id, set `previousVersionId: null` (store handles duplicate detection); if no Scheveningen spots found, set `comparison: []`
- [X] T032 [US2] Implement expertMessages store in `src/lib/stores/expertMessages.ts`: Svelte writable store backed by localStorage key `'expert_messages'`; `addMessage(raw, ingestedAt)` → parse → compare with forecast store → generate `DivergenceRecord[]` (agreement: diff ≤ 0.5 · minor: 0.5 < diff < 2 · significant: diff ≥ 2) → detect duplicate date ranges and link `previousVersionId` → persist to localStorage; also persist `DivergenceRecord[]` to localStorage key `'divergence_records'`
- [X] T033 [P] [US2] Implement `ExpertPasteForm` component in `src/components/ExpertPasteForm.svelte`: `<textarea>` for Dutch text input, submit button, character count; emits `submit` event with raw text; shows loading state during parse; shows "no Scheveningen data found" message when `comparison` is empty
- [X] T034 [P] [US2] Implement `DivergencePanel` component in `src/components/DivergencePanel.svelte`: accepts `DivergenceRecord` prop; renders model prediction score vs expert claim side by side; highlights divergence level visually (green = agreement, amber = minor, red = significant); label text per level
- [X] T035 [US2] Implement expert message route in `src/routes/expert/+page.svelte`: render `ExpertPasteForm` at top; on submit, trigger store `addMessage`, then render list of `DivergencePanel` components for resulting comparison records; below, show history of all past expert messages ordered by `ingestedAt` desc with link to re-view their comparison
- [X] T036 [US2] Unit tests for Dutch parser in `tests/unit/parser.test.ts`: parse the full Appendix C example from `spec.md`; assert extracted `SpotMention[]` includes schev + Z-H; assert `TimeWindowExtraction` includes Friday 17:00–20:00; assert `WaveDescriptor` includes heuphoog with correct Hs range; assert `WindDescriptor` includes S offshore 4 Bft; assert `TideDescriptor` includes afgaand → ebbing; test no-Scheveningen-data edge case
- [X] T037 [US2] E2E test in `tests/e2e/expertPaste.spec.ts`: paste Appendix C text; assert at least one `DivergencePanel` renders; assert comparison view appears within 5 seconds; assert history list updates with new entry

**Checkpoint**: User Stories 1 and 2 are both fully functional and independently testable.

---

## Phase 5: User Story 3 — Log a Surf Session (Priority: P3)

**Goal**: Log sessions (date, time, spot, rating 1–5, notes); view model score alongside personal rating; see Model Accuracy score after 5+ sessions.

**Independent Test**: Tap "Log Session". Fill date (today), time (10:00–12:00), spot (Scheveningen), rating (4 stars). Save. Session appears in history list with model's predicted score for that slot shown alongside. After 5 sessions logged, "Model Accuracy" panel is visible.

- [X] T038 [US3] Implement sessions store in `src/lib/stores/sessions.ts`: Svelte writable store backed by localStorage key `'session_logs'`; `addSession(input)` → generate UUID, look up `modelScore` from forecast store for matching date/hour range (null if not found), save; `getSessions()` → sorted by date desc; after each add, call `computeModelAccuracy` from scoring module if ≥ 5 sessions have non-null `modelScore`, persist result to localStorage key `'model_accuracy'`
- [X] T039 [P] [US3] Implement `SessionForm` component in `src/components/SessionForm.svelte`: date picker (native `<input type="date">`), start/end hour selects, spot text input (default "Scheveningen"), star rating selector (1–5), optional notes textarea; validate `endHour > startHour` before submit; emits `save` event with form data
- [X] T040 [US3] Implement sessions route in `src/routes/sessions/+page.svelte`: "Log Session" button that toggles `SessionForm` inline; list of past sessions showing date, personal rating (stars), model score (or "no forecast data" note if null), optional notes; `ModelAccuracy` panel below the list showing correlation score and MAE once ≥ 5 sessions with model data exist

**Checkpoint**: User Stories 1, 2, and 3 are all independently functional.

---

## Phase 6: User Story 4 — Score Breakdown (Priority: P4)

**Goal**: On the day detail view, show per-parameter scores (swell direction, wind, height, period, tide) with individual ratings and plain-English explanations tappable inline.

**Independent Test**: Open any day detail. Below the hourly chart, a "Score Breakdown" panel shows 5 rows: Swell Direction, Wind, Swell Height, Swell Period, Tide — each with a label (excellent/good/fair/poor) and a visual indicator. Tap a row → explanation text appears (e.g. "W 4 Bft onshore — ruins wave quality").

- [X] T041 [P] [US4] Implement `ScoreBreakdown` component in `src/components/ScoreBreakdown.svelte`: accepts `Score` prop; renders 5 parameter rows each with name, visual indicator bar (colour-coded by label), and label text; tapping a row toggles the `ParameterScore.explanation` string inline beneath it; accepts optional `slot` prop to show raw values alongside labels
- [X] T042 [US4] Integrate `ScoreBreakdown` into day detail route at `src/routes/day/[date]/+page.svelte`: add a slot-selector (click an hourly row to select it) and render `ScoreBreakdown` for the selected slot's `Score` beneath the hourly table; default to first slot when route loads

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: PWA hardening, offline resilience, and final acceptance validation.

- [X] T043 [P] Harden PWA offline caching strategy in `vite.config.ts` vite-plugin-pwa config: precache app shell routes (`/`, `/expert`, `/sessions`); runtime cache Open-Meteo and RWS API responses with `NetworkFirst` strategy (24h maxAge); ensure day detail routes (`/day/*`) are navigable offline from cached forecast store
- [X] T044 [P] Add reduced-confidence visual treatment: update `DayRow` (T019) and day detail route (T022) to render a "~" prefix on scores and a "Low confidence — beyond 7 days" tooltip/badge for all slots where `confidence === 'reduced'`
- [X] T045 [P] Implement scoring weights settings panel: add `/settings` route at `src/routes/settings/+page.svelte` with 5 range sliders (one per parameter weight); validate that weights sum to 1.0 (±0.001); save to localStorage key `'scoring_weights'`; changes immediately recompute scores in forecast store
- [X] T046 [P] Add Beaufort display conversion: add `msToBft(ms: number): number` utility in `src/lib/scoring/parameters.ts` and use it throughout the hourly table (T022) and explanation strings (T013) to show wind as "4 Bft" rather than raw m/s
- [ ] T047 [P] Add tide chart overlay to `HourlyChart` (T023): add a secondary y-axis showing tide height (cm NAP) as a subtle area chart behind the score bars; helps correlate tide state with score visually
- [ ] T048 Run full acceptance test checklist from `specs/001-surfforecast-scheveningen/quickstart.md` manually on mobile browser; document any gaps; fix blocking issues before marking complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 — primary MVP deliverable
- **Phase 4 (US2)**: Depends on Phase 2 — can run alongside Phase 3
- **Phase 5 (US3)**: Depends on Phase 2 + Phase 3 (needs forecast store for modelScore lookup)
- **Phase 6 (US4)**: Depends on Phase 3 (integrates into day detail route)
- **Phase 7 (Polish)**: Depends on all desired stories being complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no story dependencies
- **US2 (P2)**: After Phase 2 — independent of US1 (own route, own store)
- **US3 (P3)**: After Phase 2 + US1 complete (needs `modelScore` from forecast store)
- **US4 (P4)**: After US1 complete (integrates into day detail route)

### Within Each Phase

- Types (T007) must be defined before any module that imports from `types.ts`
- API clients (T008–T010) must be complete before forecast store (T015)
- Scoring parameters (T012) and explanations (T013) must be complete before scoring index (T014)
- Parser sub-modules (T026–T030) must be complete before parser index (T031)
- Stores (T015, T032, T038) must be complete before their respective routes

---

## Parallel Opportunities

### Phase 2 parallel batch (after T007 types are done)

```
T008 marine.ts       ← parallel
T009 wind.ts         ← parallel
T010 tide.ts         ← parallel
T012 parameters.ts   ← parallel
T013 explanations.ts ← parallel
T016 unit/scoring    ← parallel
T017 unit/forecast   ← parallel
```

### Phase 3 parallel batch (after T015 forecast store)

```
T018 NextBestCard.svelte   ← parallel
T019 DayRow.svelte         ← parallel
T023 HourlyChart.svelte    ← parallel
```

### Phase 4 parallel batch (after T007 types)

```
T026 spots.ts           ← parallel
T027 timeWindows.ts     ← parallel
T028 waveDescriptors.ts ← parallel
T029 windDescriptors.ts ← parallel
T030 tideDescriptors.ts ← parallel
T033 ExpertPasteForm    ← parallel
T034 DivergencePanel    ← parallel
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3: US1
4. **STOP AND VALIDATE**: Dashboard loads, 14-day list renders, day detail works, offline mode shows cached data
5. Deploy to Netlify/Vercel as static site — app is useful immediately

### Incremental Delivery

1. Setup + Foundational → types, APIs, scoring all tested
2. **Deploy US1** → 14-day forecast + NextBestSession card (MVP)
3. **Deploy US2** → expert paste + comparison
4. **Deploy US3** → session logging + accuracy
5. **Deploy US4** → score breakdown (additive, no regressions)

---

## Notes

- [P] tasks modify different files and have no unfinished dependencies — safe to dispatch in parallel
- Each user story phase produces an independently deployable increment
- No backend: all API calls are client-side; no CORS proxy needed (all three sources support browser CORS)
- `src/lib/types.ts` (T007) is the single source of truth for all interfaces — never duplicate type definitions
- Scoring module (T012–T014) is pure: no imports from Svelte or browser APIs — maximally testable
- IndexedDB (idb-keyval) is used for ForecastCache only; everything else uses localStorage (smaller, synchronous)
- Manual refresh (T021): `forecast.refresh()` bypasses the 6h threshold — always triggers a live fetch
