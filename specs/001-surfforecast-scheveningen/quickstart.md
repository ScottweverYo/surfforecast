# Quickstart: Surfforecast — Scheveningen

**Branch**: `001-surfforecast-scheveningen` | **Date**: 2026-04-02

---

## What We're Building

A mobile-first Progressive Web App (PWA) that predicts surf conditions at Scheveningen, Netherlands. No backend, no accounts, no installation required. Runs entirely in the browser.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit (SPA mode) |
| Build tool | Vite + vite-plugin-pwa |
| Language | TypeScript |
| Styling | CSS custom properties (no framework) |
| Charts | Chart.js + svelte-chartjs |
| Date handling | date-fns (with nl locale) |
| IndexedDB | idb-keyval |
| Testing | Vitest (unit) + Playwright (E2E) |
| Deployment | Static site (Netlify / Vercel / GitHub Pages) |

---

## Data Sources (all free, no auth)

| Data | API | Endpoint |
|------|-----|---------|
| Wave/swell | Open-Meteo Marine | `marine-api.open-meteo.com/v1/marine` |
| Wind | Open-Meteo Weather | `api.open-meteo.com/v1/forecast` |
| Tide | Rijkswaterstaat | `waterwebservices.rijkswaterstaat.nl` |

All APIs support browser CORS. All fetches are initiated client-side.

---

## Repository Structure

```
/
├── src/
│   ├── lib/
│   │   ├── api/
│   │   │   ├── marine.ts          # Open-Meteo Marine client
│   │   │   ├── wind.ts            # Open-Meteo Weather client
│   │   │   ├── tide.ts            # Rijkswaterstaat client
│   │   │   └── forecast.ts        # Orchestrates all 3 sources → ForecastCache
│   │   ├── scoring/
│   │   │   ├── index.ts           # computeScore(), findNextBestSession(), computeModelAccuracy()
│   │   │   ├── parameters.ts      # Per-parameter scoring rules (Scheveningen-specific)
│   │   │   └── explanations.ts    # Plain-language explanation strings
│   │   ├── parser/
│   │   │   ├── index.ts           # parseDutchForecast(text) → ExpertMessage
│   │   │   ├── spots.ts           # Spot/region detection
│   │   │   ├── timeWindows.ts     # Time window extraction
│   │   │   ├── waveDescriptors.ts # heuphoog etc → Hs ranges
│   │   │   ├── windDescriptors.ts # bft + direction
│   │   │   └── tideDescriptors.ts # afgaand, opkomend etc
│   │   ├── stores/
│   │   │   ├── forecast.ts        # Svelte store: ForecastCache, auto-fetch on stale
│   │   │   ├── sessions.ts        # Svelte store: SessionLog[], CRUD + accuracy
│   │   │   └── expertMessages.ts  # Svelte store: ExpertMessage[], CRUD + comparison
│   │   └── types.ts               # All shared TypeScript interfaces
│   │
│   ├── routes/
│   │   ├── +layout.svelte         # Shell: nav, offline banner, update banner
│   │   ├── +page.svelte           # Dashboard: NextBestSession + 14-day list
│   │   ├── day/
│   │   │   └── [date]/
│   │   │       └── +page.svelte   # Day detail: hourly breakdown + score breakdown
│   │   ├── expert/
│   │   │   └── +page.svelte       # Expert message paste + comparison view
│   │   └── sessions/
│   │       └── +page.svelte       # Session log list + log form + accuracy overview
│   │
│   └── components/
│       ├── NextBestCard.svelte    # "Next Best Session" hero card
│       ├── DayRow.svelte          # Single row in 14-day list (colour-coded)
│       ├── HourlyChart.svelte     # Chart.js chart for a day's conditions
│       ├── ScoreBreakdown.svelte  # Per-parameter score display
│       ├── SessionForm.svelte     # Log session form
│       ├── ExpertPasteForm.svelte # Paste + parse trigger
│       └── DivergencePanel.svelte # Model vs expert comparison
│
├── static/
│   ├── manifest.webmanifest      # PWA manifest
│   └── icons/                    # App icons (192x192, 512x512)
│
├── tests/
│   ├── unit/
│   │   ├── scoring.test.ts        # All scoring rules + edge cases
│   │   ├── parser.test.ts         # Dutch text parser + Appendix C example
│   │   └── forecast.test.ts       # Staleness logic, confidence assignment
│   └── e2e/
│       ├── dashboard.spec.ts      # 14-day view renders, NextBestCard visible
│       ├── dayDetail.spec.ts      # Hourly breakdown, score breakdown tap
│       └── expertPaste.spec.ts    # Paste Appendix C example, verify extractions
│
├── svelte.config.js
├── vite.config.ts                 # Includes vite-plugin-pwa config
└── package.json
```

---

## Development Setup

```bash
# 1. Install Node.js 20+ and npm
node --version  # should be ≥ 20

# 2. Create the project
npm create svelte@latest surfforecast
# Choose: SvelteKit → Skeleton project → TypeScript → ESLint + Prettier + Vitest

cd surfforecast

# 3. Install dependencies
npm install chart.js svelte-chartjs date-fns idb-keyval
npm install -D vite-plugin-pwa @playwright/test

# 4. Start dev server
npm run dev
# → http://localhost:5173
```

---

## Key Development Sequence

Implement in this order to maintain independent testability:

1. **Types** (`src/lib/types.ts`) — all interfaces, no logic
2. **Scoring module** (`src/lib/scoring/`) — pure functions, full unit tests first
3. **API clients** (`src/lib/api/`) — one client per source, mock in tests
4. **Forecast store** (`src/lib/stores/forecast.ts`) — orchestrates fetch + cache + staleness
5. **Dashboard route** (`src/routes/+page.svelte`) — renders from store; E2E test against mock data
6. **Day detail route** (`src/routes/day/[date]/+page.svelte`)
7. **Dutch parser** (`src/lib/parser/`) — unit test with Appendix C example from spec
8. **Expert message route** (`src/routes/expert/+page.svelte`)
9. **Session logging** (`src/lib/stores/sessions.ts` + route)
10. **PWA config** (service worker, manifest, offline behaviour)

---

## Acceptance Test Checklist

From the spec's User Stories:

- [ ] Dashboard loads with "Next Best Session" card visible without scrolling (mobile viewport 390px wide)
- [ ] 14-day list shows colour-coded rows (green/yellow/orange/red)
- [ ] Tapping a day opens hourly breakdown with swell, wind, tide per slot
- [ ] Data older than 6 hours triggers fresh fetch on load; manual refresh button forces fetch immediately
- [ ] Offline mode shows last cached forecast with "last updated" timestamp
- [ ] Pasting Appendix C example extracts: schev + Z-H mentions, Friday 17:00–20:00 window, heuphoog, afgaand, 4 bft
- [ ] Comparison view shows model vs expert side by side
- [ ] Logging a session saves it and shows model score alongside personal rating
- [ ] After 5+ sessions, "Model Accuracy" score appears in session view
- [ ] Score breakdown shows per-parameter ratings on day detail

---

## Deployment

```bash
npm run build    # Output: /build (static files)

# Deploy /build to any static host:
# Netlify: drag-and-drop or netlify deploy --prod
# Vercel: vercel --prod
# GitHub Pages: push /build to gh-pages branch
```

PWA service worker is generated by vite-plugin-pwa using Workbox. Caches app shell + last forecast payload for offline use.
