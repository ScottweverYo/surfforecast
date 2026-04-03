# Scoring Algorithm Contract

**Branch**: `001-surfforecast-scheveningen` | **Date**: 2026-04-02

This document defines the interface and behaviour of the scoring module (`src/lib/scoring/`).
The scoring module is pure (no side effects, no API calls) and fully unit-testable.

---

## Public Interface

```typescript
// src/lib/scoring/index.ts

export interface ScoringWeights {
  swellDirection: number;   // must sum to 1.0 with all other weights
  windDirection: number;
  swellHeight: number;
  swellPeriod: number;
  tideState: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  swellDirection: 0.30,
  windDirection: 0.25,
  swellHeight: 0.20,
  swellPeriod: 0.15,
  tideState: 0.10,
};

/**
 * Compute a Score for a single forecast hour.
 * Pure function — same inputs always produce same output.
 */
export function computeScore(
  slot: Pick<ForecastSlot, 'swellHeight' | 'swellPeriod' | 'swellDirection' | 'windSpeed' | 'windDirection' | 'tideState' | 'tideDirection'>,
  weights?: ScoringWeights
): Score;

/**
 * Find the next best session window from a sorted array of slots.
 * Returns null if no window with score >= 2 exists in the future.
 */
export function findNextBestSession(
  slots: ForecastSlot[],
  now: Date,
  windowHours?: number  // default: 2
): NextBestSession | null;

/**
 * Compute model accuracy from session logs.
 * Returns null if fewer than 5 sessions have a modelScore.
 */
export function computeModelAccuracy(sessions: SessionLog[]): ModelAccuracy | null;
```

---

## Scoring Rules (Scheveningen-Specific)

### Swell Direction (weight: 30%)

| Bearing (FROM) | Score | Label |
|----------------|-------|-------|
| 315–340° (NW–NNW) | 5 | excellent |
| 270–315° (W–NW) | 4 | good |
| 340–360° (N) | 4 | good |
| 240–270° (WSW–W) | 3 | fair |
| 360–30° (N–NNE) | 2 | poor |
| All other bearings | 1 | poor |

### Wind Direction (weight: 25%)

| Bearing (FROM) | Score | Label |
|----------------|-------|-------|
| 80–120° (E–ESE, offshore) | 5 | excellent |
| 45–80° (NE, side-offshore) | 4 | good |
| 120–160° (SE, light onshore) | 3 | fair |
| 160–220° (S, direct onshore) | 2 | poor |
| 220–360° or 0–45° (W/NW/SW/N) | 1 | poor |

**Note**: Wind direction at Scheveningen beach face ~270° (faces West). Offshore = E/ESE. Onshore = W/NW/SW.

### Swell Height / Hs (weight: 20%)

| Hs (metres) | Score | Label |
|-------------|-------|-------|
| 0.6–1.2m | 5 | excellent |
| 1.2–1.5m | 4 | good |
| 0.4–0.6m | 3 | fair |
| 1.5–2.0m | 2 | poor |
| 0.3–0.4m | 2 | poor |
| < 0.3m or > 2.0m | 1 (cap) | poor |

**Hard cap**: If `Hs < 0.3m`, composite score is forced to 1 regardless of other parameters. `Score.cappedByHeight = true`.

### Swell Period / Tp (weight: 15%)

| Tp (seconds) | Score | Label |
|--------------|-------|-------|
| ≥ 12s | 5 | excellent |
| 10–12s | 5 | excellent |
| 8–10s | 4 | good |
| 6–8s | 3 | fair |
| < 6s | 1 | poor |

**Note**: Period is subordinate — a 10s period with 0.2m height does not create a surfable wave.

### Tide State (weight: 10%)

| State | Direction | Score | Label |
|-------|-----------|-------|-------|
| mid | flooding | 5 | excellent |
| mid | ebbing | 4 | good |
| mid | slack | 4 | good |
| low | flooding | 3 | fair |
| low | slack | 3 | fair |
| low | ebbing | 2 | poor |
| high | any | 1 | poor |

---

## Composite Formula

```
composite = Σ (parameterScore[i] × weight[i])    for all i
```

Rounded to nearest 0.5 for star display. Stored as float internally.

If `cappedByHeight = true`: `composite = 1.0`, all parameter scores still computed and shown.

---

## Explanation Strings

Each `ParameterScore.explanation` is a short plain-language string generated from the input value. Examples:

- Swell direction 318°: `"NNW swell (318°) — ideal angle for Scheveningen"`
- Wind direction 95°: `"E 3 Bft offshore — ideal glass conditions"`
- Wind direction 250°: `"W 4 Bft onshore — ruins wave quality"`
- Swell height 0.2m: `"Flat (0.2m) — not surfable"`
- Tide high + ebbing: `"High tide — likely closeouts at Scheveningen pier"`

Strings are defined as template functions in `src/lib/scoring/explanations.ts`.

---

## Calibration (FR-010)

The `ScoringWeights` object is loaded from localStorage at startup. If absent, `DEFAULT_WEIGHTS` applies.

Weights can be adjusted via the settings UI. The UI must validate that `sum(weights) ≈ 1.0` (±0.001 tolerance) before saving.

Future calibration from session logs (FR-010 advanced) is out of scope for v1; the hook is `computeModelAccuracy()` which provides the correlation data needed for future weight optimisation.
