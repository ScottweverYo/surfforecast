# Quickstart: Day View Redesign

**Branch**: `004-day-view-redesign`

## Overview

Four incremental UI improvements, all frontend-only. No new API calls or storage.

## Implementation order

```
1. lib/types.ts          — add DailySummary, TimeWindow; update NextBestSession
2. lib/scoring/index.ts  — add findNextBestMoment()
3. components/DayRow     — add avgSwellHeight + avgWindSpeed props
4. components/NextBestCard — relabel + show window name
5. components/TideChart  — new Chart.js line chart
6. components/DayDetail  — new shared component (hourly table + charts)
7. routes/+page.svelte   — collapsible accordion + expanded DailySummary
8. routes/day/[date]     — delegate to DayDetail
```

## Key files

| File | Role |
|------|------|
| `frontend/src/lib/types.ts` | Type contracts |
| `frontend/src/lib/scoring/index.ts` | `findNextBestMoment()` algorithm |
| `frontend/src/components/DayRow.svelte` | Day list row |
| `frontend/src/components/NextBestCard.svelte` | Highlight card |
| `frontend/src/components/TideChart.svelte` | **New** tide line chart |
| `frontend/src/components/DayDetail.svelte` | **New** shared detail panel |
| `frontend/src/routes/+page.svelte` | Home page (accordion state) |
| `frontend/src/routes/day/[date]/+page.svelte` | Deep-link route (uses DayDetail) |

## Run

```bash
cd frontend
npm run dev
```

## Test

```bash
npm test && npm run lint
```
