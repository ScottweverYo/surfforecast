# Data Model: Surfforecast — Scheveningen

**Phase**: 1 | **Branch**: `001-surfforecast-scheveningen` | **Date**: 2026-04-02

---

## Entities

### ForecastSlot

One hour of forecast data for Scheveningen. The atomic unit of the forecast engine.

```typescript
interface ForecastSlot {
  timestamp: string;           // ISO 8601, e.g. "2026-04-05T14:00:00Z"
  
  // Wave parameters (from Open-Meteo Marine API)
  swellHeight: number;         // Hs in metres (significant wave height)
  swellPeriod: number;         // Tp in seconds (peak period)
  swellDirection: number;      // degrees (0–360, meteorological convention: direction FROM)
  windWaveHeight: number;      // Hs of wind-wave component, metres
  windWavePeriod: number;      // Tp of wind-wave component, seconds
  
  // Wind parameters (from Open-Meteo Weather API)
  windSpeed: number;           // m/s at 10m
  windDirection: number;       // degrees (direction FROM)
  windGusts: number;           // m/s
  
  // Tide parameters (from Rijkswaterstaat)
  tideHeight: number;          // metres above chart datum
  tideState: 'low' | 'mid' | 'high';
  tideDirection: 'flooding' | 'ebbing' | 'slack';
  
  // Computed scoring
  score: Score;
  
  // Metadata
  confidence: 'standard' | 'reduced'; // reduced for day 8+
  dataFetchedAt: string;              // ISO 8601 — when this slot was last fetched
}
```

**Validation rules**:
- `swellHeight >= 0`, `swellPeriod > 0`
- `swellDirection` in 0–360
- `tideState` must be derived from `tideHeight` against station datum thresholds
- `confidence = 'reduced'` when slot timestamp > 7 days from `dataFetchedAt`

---

### Score

Composite 1–5 rating with per-parameter breakdown. Computed from a `ForecastSlot` against Scheveningen-specific ideal ranges.

```typescript
interface Score {
  composite: number;               // 1.0–5.0, rounded to nearest 0.5 for display
  
  parameters: {
    swellDirection: ParameterScore;
    windDirection: ParameterScore;
    swellHeight: ParameterScore;
    swellPeriod: ParameterScore;
    tideState: ParameterScore;
  };
  
  cappedByHeight: boolean;         // true if composite was capped due to Hs < 0.3m
}

interface ParameterScore {
  value: number;                   // 1–5
  label: 'excellent' | 'good' | 'fair' | 'poor';
  explanation: string;             // Plain English, e.g. "Offshore E 3 Bft — ideal for Scheveningen"
}
```

**Scoring rules** (from Appendix A of spec):

| Parameter | Excellent (5) | Good (4) | Fair (3) | Poor (1–2) |
|-----------|--------------|----------|----------|------------|
| Swell direction | 315–340° (NW–NNW) | 270–315° or 340–360° | 240–270° | <240° or SW/SE quadrant |
| Wind direction | 80–120° (E–ESE offshore) | 45–80° (NE side-offshore) | 120–180° | 180–360° (onshore) |
| Swell height | 0.6–1.2m | 0.4–0.6m or 1.2–1.5m | 0.3–0.4m or 1.5–2.0m | <0.3m or >2.0m |
| Swell period | ≥10s | 8–10s | 6–8s | <6s |
| Tide state | mid + flooding | mid + ebbing or low | low (extreme) | high (closeouts) |

**Composite formula**: `sum(parameterScore * weight)` where default weights = {swellDirection: 0.30, windDirection: 0.25, swellHeight: 0.20, swellPeriod: 0.15, tideState: 0.10}

**Hard constraint**: If `swellHeight < 0.3`, `composite = 1`, `cappedByHeight = true`.

**Weights storage**: Weights are stored in localStorage under `scoring_weights` key; the default values are used if no overrides exist.

---

### ForecastCache

The full 14-day forecast stored in IndexedDB. Single record, keyed by location (Scheveningen only in v1).

```typescript
interface ForecastCache {
  location: 'scheveningen';        // Fixed for v1
  fetchedAt: string;               // ISO 8601
  slots: ForecastSlot[];           // Sorted ascending by timestamp; ~336 slots (14d × 24h)
  nextBestSession: NextBestSession;
  dataSourceStatus: {
    wave: 'ok' | 'error' | 'stale';
    wind: 'ok' | 'error' | 'stale';
    tide: 'ok' | 'error' | 'stale';
  };
}
```

**Staleness rule**: If `fetchedAt` is > 6 hours ago, fetch fresh data on next app load (4× per day cadence). A manual refresh button on the dashboard forces a fetch regardless of cache age. If fetch fails, use cached data and surface a "last updated" banner (FR-006).

---

### NextBestSession

The computed "best upcoming window" — primary element on the dashboard.

```typescript
interface NextBestSession {
  date: string;                    // ISO date, e.g. "2026-04-05"
  startHour: number;               // 0–23
  endHour: number;                 // 0–23 (exclusive)
  compositeScore: number;          // 1.0–5.0
  confidence: 'standard' | 'reduced';
  topConditions: [ParameterScore, ParameterScore, ParameterScore]; // Top 3 contributing factors
}
```

**Selection logic**: Find the 2–4 hour window (contiguous slots) with highest mean composite score, excluding slots in the past and slots where `swellHeight < 0.3m`. Prefer windows within the next 7 days (standard confidence) unless no window scores ≥ 3.

---

### ExpertMessage

A pasted free-form Dutch meteorologist text with parsed extractions and comparison results.

```typescript
interface ExpertMessage {
  id: string;                      // UUID v4
  rawText: string;                 // Original pasted text
  ingestedAt: string;              // ISO 8601
  
  extractions: {
    spots: SpotMention[];
    timeWindows: TimeWindowExtraction[];
    waveDescriptors: WaveDescriptor[];
    windDescriptors: WindDescriptor[];
    tideDescriptors: TideDescriptor[];
  };
  
  comparison: DivergenceRecord[];  // One per relevant time window found
  previousVersionId: string | null; // If this supersedes an earlier message for same date range
}

interface SpotMention {
  raw: string;               // e.g. "schev", "Z-H"
  resolved: string;          // e.g. "Scheveningen", "Zuid-Holland"
  isScheveningen: boolean;
}

interface TimeWindowExtraction {
  dayReference: string;      // e.g. "vrijdag", "zaterdag"
  resolvedDate: string;      // ISO date (resolved from ingestion date context)
  startHour: number | null;
  endHour: number | null;
  rawText: string;           // Original text fragment
}

interface WaveDescriptor {
  raw: string;               // e.g. "heuphoog"
  hsMin: number;             // metres
  hsMax: number;             // metres
  waveType: 'swell' | 'wind_waves' | 'unknown';
}

interface WindDescriptor {
  raw: string;
  directionDegrees: number | null;
  beaufort: number | null;
  quality: 'offshore' | 'side-offshore' | 'onshore' | 'unknown';
}

interface TideDescriptor {
  raw: string;               // e.g. "afgaand", "mid-tij"
  state: 'low' | 'mid' | 'high' | null;
  direction: 'flooding' | 'ebbing' | null;
}
```

**Validation rules**:
- `rawText` must be non-empty
- At least one `SpotMention` or `TimeWindowExtraction` must be found for comparison to proceed
- If no Scheveningen-specific data found: `comparison = []`, surface "no Scheveningen data" message (edge case in spec)
- If multiple messages share an overlapping `resolvedDate`, keep both; link via `previousVersionId`

---

### DivergenceRecord

One comparison between expert claim and model forecast for a specific date/time window.

```typescript
interface DivergenceRecord {
  id: string;                      // UUID v4
  expertMessageId: string;
  resolvedDate: string;            // ISO date
  timeWindow: { start: number; end: number } | null;  // hour range, null = all-day
  
  expertClaim: {
    description: string;           // Synthesised from extracted descriptors
    impliedScore: number | null;   // 1–5 if determinable from extract, else null
  };
  
  modelPrediction: {
    meanScore: number;             // Mean composite over the window
    slots: ForecastSlot[];         // The slots covering this window
  };
  
  divergence: 'agreement' | 'minor' | 'significant' | 'no_model_data';
  // significant = diff ≥ 2.0
  // minor      = 0.5 < diff < 2.0
  // agreement  = diff ≤ 0.5
  // no_model_data = no cached forecast slots for this window
  
  createdAt: string;               // ISO 8601
}
```

---

### SessionLog

A user-entered real surf session record.

```typescript
interface SessionLog {
  id: string;                      // UUID v4
  date: string;                    // ISO date
  startHour: number;               // 0–23
  endHour: number;                 // 0–23
  spot: string;                    // Free text; defaults to "Scheveningen"
  personalRating: 1 | 2 | 3 | 4 | 5;
  notes: string;                   // Optional free text
  
  modelScore: number | null;       // Mean composite for this window from cached forecast, null if unavailable
  createdAt: string;               // ISO 8601
}
```

**Validation rules**:
- `endHour > startHour`
- `personalRating` is integer 1–5
- `modelScore` is null if no forecast data exists for this date (too far in past — shown with explanatory note per edge case in spec)

---

### ModelAccuracy

Computed from ≥ 5 sessions. Shown in session history view.

```typescript
interface ModelAccuracy {
  sessionCount: number;
  correlationScore: number;        // Pearson r, -1 to 1 (shown as percentage)
  meanAbsoluteError: number;       // Mean |personalRating - modelScore| across sessions
  computedAt: string;              // ISO 8601
}
```

**Computation trigger**: Recalculated whenever a new session is saved, if `sessionCount >= 5`.

---

## State Transitions

### Forecast Data Lifecycle

```
[cold start / stale > 6h / manual refresh] → fetch all 3 APIs concurrently
  ↓ success (all sources) → ForecastCache { dataSourceStatus: all 'ok' }
  ↓ partial failure        → ForecastCache { dataSourceStatus: mixed 'error'/'ok' }
                             → render with visible warning per failed source
  ↓ total failure          → use existing cached ForecastCache if exists
                             → show "last updated" banner (FR-006)
  ↓ no cache + failure     → render error state
```

### Expert Message Flow

```
[user pastes text] → NLP parse
  ↓ Scheveningen data found    → render comparison view + store ExpertMessage + DivergenceRecord[]
  ↓ No Scheveningen data found → store ExpertMessage (no comparison) + surface gap message
  ↓ Duplicate date range       → link previousVersionId, show most recent by default
```

---

## Storage Layout

| Entity | Storage | Key |
|--------|---------|-----|
| ForecastCache | IndexedDB (idb-keyval) | `'forecast_scheveningen'` |
| SessionLog[] | localStorage | `'session_logs'` |
| ExpertMessage[] | localStorage | `'expert_messages'` |
| DivergenceRecord[] | localStorage | `'divergence_records'` |
| ScoringWeights | localStorage | `'scoring_weights'` |
| ModelAccuracy | localStorage | `'model_accuracy'` |
