# Data Model: Day View Redesign

**Feature**: 004-day-view-redesign  
**Date**: 2026-04-03

---

## New Types

### `DailySummary` (new — formalises anonymous inline type in `+page.svelte`)

| Field | Type | Description |
|-------|------|-------------|
| `date` | `string` | ISO date "YYYY-MM-DD" |
| `meanScore` | `number` | Avg composite score, rounded to nearest 0.5 (1–5) |
| `confidence` | `Confidence` | 'standard' or 'reduced' (from first slot of that day) |
| `avgSwellHeight` | `number` | Mean swell height in metres across all day slots, one decimal |
| `avgWindSpeed` | `number` | Mean wind speed in Beaufort (integer) across all day slots |

---

### `TimeWindow` (new)

```
type TimeWindow = 'morning' | 'midday' | 'afternoon' | 'evening'
```

| Value | Hours (local) | Dutch label |
|-------|--------------|-------------|
| `morning` | 06:00–10:00 | ochtend |
| `midday` | 10:00–14:00 | middag |
| `afternoon` | 14:00–18:00 | middag |
| `evening` | 18:00–21:00 | avond |

*Note: `midday` and `afternoon` both map to "middag" in Dutch. If finer distinction is needed in UI copy, use "vroege middag" / "late middag". Implementation decision.*

---

## Modified Types

### `NextBestSession` (modified)

| Field | Change | Description |
|-------|--------|-------------|
| `date` | unchanged | ISO date of the window |
| `window` | **new** — replaces `startHour` + `endHour` | `TimeWindow` value |
| `compositeScore` | unchanged | Mean score, rounded to nearest 0.5 |
| `confidence` | unchanged | 'standard' or 'reduced' |
| `topConditions` | unchanged | Top 3 `ParameterScore` objects |
| ~~`startHour`~~ | **removed** | Superseded by `window` |
| ~~`endHour`~~ | **removed** | Superseded by `window` |

---

## Unchanged Types (referenced for completeness)

### `ForecastSlot` — no changes

Fields relevant to this feature:
- `swellHeight: number` — metres (used for DailySummary.avgSwellHeight)
- `windSpeed: number` — m/s, converted to Beaufort (used for DailySummary.avgWindSpeed)
- `tideHeight: number` — cm above NAP (used by TideChart)
- `score.composite: number` — 1–5 (used for window scoring)
- `confidence: Confidence` — used for window bonus

### `ParameterScore`, `Score`, `Confidence`, `TideState`, `TideDirection` — no changes

---

## Derived Computations

### DailySummary derivation (in `+page.svelte`)

```
for each slot in forecast.slots:
  date = slot.timestamp[0..10]
  accumulate: scores[], swellHeights[], windSpeeds[], confidence (first slot wins)

DailySummary:
  meanScore    = round(mean(scores) * 2) / 2
  avgSwellHeight = round(mean(swellHeights) * 10) / 10
  avgWindSpeed = round(mean(windSpeeds converted to Bft))
```

### Window score computation (in `findNextBestMoment`)

```
for each (date, window) combination in next 14 days:
  windowSlots = slots where localHour ∈ window.hourRange
               AND swellHeight >= 0.3
               AND slot is in the future
  if windowSlots.empty → skip
  score = mean(windowSlots.map(s => s.score.composite))
  if windowSlots[0].confidence == 'standard' → score += 0.01
  track best (date, window, score)

return best if score >= 2.0, else null
```
