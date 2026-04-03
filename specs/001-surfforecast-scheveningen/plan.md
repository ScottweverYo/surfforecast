# Implementation Plan: Surfforecast — Scheveningen Surf Condition Predictor

**Branch**: `001-surfforecast-scheveningen` | **Date**: 2026-04-02 | **Spec**: `specs/001-surfforecast-scheveningen/spec.md`

## Summary

Build a mobile-first PWA that fetches wave (Open-Meteo Marine), wind (Open-Meteo Weather), and tide (Rijkswaterstaat) data for Scheveningen, computes a 14-day composite surf score using Scheveningen-specific parameter weights, and surfaces the best upcoming session window as the dashboard hero. A Dutch-text NLP parser (regex/keyword mapping) enables side-by-side expert comparison. Session logging closes the feedback loop. All logic runs client-side — no backend.

---

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: SvelteKit (SPA mode), Vite, vite-plugin-pwa, Chart.js, date-fns, idb-keyval  
**Storage**: Browser localStorage (sessions, expert messages, weights) + IndexedDB via idb-keyval (forecast cache)  
**Testing**: Vitest (unit), Playwright (E2E, mobile viewport)  
**Target Platform**: Mobile browser (PWA, no installation required); iOS Safari 16+ / Android Chrome 110+  
**Project Type**: web-app (SPA/PWA, static deployment)  
**Performance Goals**: Initial dashboard load < 3 seconds on standard mobile connection (FR-016); expert text parse + comparison render < 5 seconds (SC-003)  
**Constraints**: No backend, no accounts, offline-capable (service worker), localStorage-persisted state; forecast refresh cadence 4×/day (every 6h) with manual refresh override  
**Scale/Scope**: Single user, single location (Scheveningen v1), ~336 hourly slots per forecast cycle

---

## Constitution Check

*Note: The project constitution (`.specify/memory/constitution.md`) is a template and has not been filled in for this project. No project-specific governance gates apply. Standard software engineering principles apply.*

**General gates — all pass**:
- [x] Single, well-scoped purpose (surf forecast for one location)
- [x] No backend complexity justified: all APIs are browser-CORS-friendly, personal-use, no shared data
- [x] Storage approach appropriate: IndexedDB for large forecast payloads; localStorage for small structured records
- [x] Testing plan covers pure functions (scoring, parser) with unit tests and dashboard behaviour with E2E tests
- [x] Performance target (3s mobile load) achievable with SvelteKit compiled output (~3.6kB runtime) + lazy API fetches

No violations. Complexity tracking table not required.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-surfforecast-scheveningen/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── api-integrations.md    ← API schemas + storage contracts
│   └── scoring-algorithm.md   ← Scoring module public interface
└── tasks.md             ← Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── api/
│   │   ├── marine.ts          # Open-Meteo Marine client (wave/swell)
│   │   ├── wind.ts            # Open-Meteo Weather client (wind)
│   │   ├── tide.ts            # Rijkswaterstaat client (tide)
│   │   └── forecast.ts        # Orchestrates all 3 sources → ForecastCache
│   ├── scoring/
│   │   ├── index.ts           # computeScore(), findNextBestSession(), computeModelAccuracy()
│   │   ├── parameters.ts      # Per-parameter scoring rules (Scheveningen-specific)
│   │   └── explanations.ts    # Plain-language explanation strings
│   ├── parser/
│   │   ├── index.ts           # parseDutchForecast(text) → ExpertMessage
│   │   ├── spots.ts           # Spot/region detection
│   │   ├── timeWindows.ts     # Time window extraction
│   │   ├── waveDescriptors.ts # heuphoog etc → Hs ranges
│   │   ├── windDescriptors.ts # bft + direction
│   │   └── tideDescriptors.ts # afgaand, opkomend etc
│   ├── stores/
│   │   ├── forecast.ts        # Svelte store: ForecastCache, auto-fetch on stale
│   │   ├── sessions.ts        # Svelte store: SessionLog[], CRUD + accuracy
│   │   └── expertMessages.ts  # Svelte store: ExpertMessage[], CRUD + comparison
│   └── types.ts               # All shared TypeScript interfaces
│
├── routes/
│   ├── +layout.svelte         # Shell: nav, offline banner, update banner
│   ├── +page.svelte           # Dashboard: NextBestSession + 14-day list
│   ├── day/[date]/
│   │   └── +page.svelte       # Day detail: hourly breakdown + score breakdown
│   ├── expert/
│   │   └── +page.svelte       # Expert message paste + comparison view
│   └── sessions/
│       └── +page.svelte       # Session log list + form + accuracy overview
│
└── components/
    ├── NextBestCard.svelte
    ├── DayRow.svelte
    ├── HourlyChart.svelte
    ├── ScoreBreakdown.svelte
    ├── SessionForm.svelte
    ├── ExpertPasteForm.svelte
    └── DivergencePanel.svelte

static/
├── manifest.webmanifest
└── icons/

tests/
├── unit/
│   ├── scoring.test.ts
│   ├── parser.test.ts
│   └── forecast.test.ts
└── e2e/
    ├── dashboard.spec.ts
    ├── dayDetail.spec.ts
    └── expertPaste.spec.ts
```

**Structure Decision**: Single frontend project (no backend). SvelteKit file-based routing. All business logic in `src/lib/` (pure modules). Stores connect lib to routes. Static deployment from `/build`.

---

## Key Design Decisions

### Data APIs
- **Wave/swell**: Open-Meteo Marine API — free, no auth, browser CORS, North Sea coverage, 16-day forecast
- **Wind**: Open-Meteo Weather API (KNMI HARMONIE variant for ≤7 days) — same provider, consistent fetch
- **Tide**: Rijkswaterstaat Waterinfo API — official Dutch government tide data, Scheveningen station `SCHEVNGN`

### 14-Day Confidence Split
Days 0–7: European wave model (standard confidence). Days 8–16: GFS global model (reduced confidence). This maps naturally to FR-011 ("days beyond 7 shown with low confidence indicator").

### Dutch NLP
Pure regex/keyword mapping against the complete vocabulary in Appendix B of the spec. No external NLP library or LLM required. Full unit test coverage against the Appendix C example message.

### Scoring
Weighted linear composite (1–5) across **five parameters**: swell direction, swell height, swell period, wind direction (Beaufort strength is an input to this parameter, not scored separately — see FR-007 and Appendix A), and tide state. Hard cap: Hs < 0.3m → score = 1. Weights adjustable in localStorage. See `contracts/scoring-algorithm.md` for full rules.

**FR-009 deferral note**: The per-parameter score breakdown (FR-009) is intentionally implemented as Phase 6 (US4, P4). It is accessible from the day detail view, not inline in the 14-day list. This is a deliberate prioritisation decision: the scoring data is fully computed from Phase 2 onward; the breakdown UI is additive and does not block the MVP.

### Refresh Cadence
Staleness threshold: **6 hours** (4× per day). Auto-fetch triggers on app load when `fetchedAt` is older than 6h. A **manual refresh button** on the dashboard bypasses the threshold and forces an immediate fetch of all three sources. No backend or server-side cron required — the data doesn't change frequently enough to justify the infrastructure.

### Storage
- IndexedDB: forecast cache (~336 slots × 14 days of hourly JSON)
- localStorage: sessions, expert messages, divergence records, weights, accuracy

### Offline
vite-plugin-pwa (Workbox) generates a service worker that caches the app shell. Last successful forecast stored in IndexedDB and served when offline, with "last updated" banner.

---

## Complexity Tracking

No constitution violations. N/A.
