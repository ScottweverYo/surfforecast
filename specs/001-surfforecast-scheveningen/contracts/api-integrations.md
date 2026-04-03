# API Integration Contracts

**Branch**: `001-surfforecast-scheveningen` | **Date**: 2026-04-02

These are the external API contracts this app depends on. All are called directly from the browser.

---

## Open-Meteo Marine API (Wave & Swell)

**Base URL**: `https://marine-api.open-meteo.com/v1/marine`  
**Auth**: None  
**CORS**: Supported  
**Rate limit**: None (fair use)

### Request

```
GET https://marine-api.open-meteo.com/v1/marine
  ?latitude=52.1033
  &longitude=4.2700
  &hourly=wave_height,wave_period,wave_direction,wind_wave_height,wind_wave_period,swell_wave_height,swell_wave_period,swell_wave_direction
  &forecast_days=16
  &timezone=Europe%2FAmsterdam
```

Scheveningen coordinates: `52.1033°N, 4.2700°E`

### Response (abbreviated)

```json
{
  "latitude": 52.1033,
  "longitude": 4.27,
  "generationtime_ms": 12.3,
  "utc_offset_seconds": 7200,
  "timezone": "Europe/Amsterdam",
  "hourly_units": {
    "time": "iso8601",
    "wave_height": "m",
    "wave_period": "s",
    "wave_direction": "°",
    "swell_wave_height": "m",
    "swell_wave_period": "s",
    "swell_wave_direction": "°",
    "wind_wave_height": "m",
    "wind_wave_period": "s"
  },
  "hourly": {
    "time": ["2026-04-02T00:00", "2026-04-02T01:00", ...],
    "wave_height": [0.8, 0.85, ...],
    "wave_period": [9.2, 9.4, ...],
    "wave_direction": [312.0, 315.0, ...],
    "swell_wave_height": [0.6, 0.65, ...],
    "swell_wave_period": [10.5, 10.8, ...],
    "swell_wave_direction": [318.0, 320.0, ...],
    "wind_wave_height": [0.2, 0.2, ...],
    "wind_wave_period": [4.1, 4.0, ...]
  }
}
```

### Mapping to ForecastSlot

| API field | ForecastSlot field | Notes |
|-----------|-------------------|-------|
| `swell_wave_height` | `swellHeight` | Use swell component (longer period) |
| `swell_wave_period` | `swellPeriod` | |
| `swell_wave_direction` | `swellDirection` | |
| `wind_wave_height` | `windWaveHeight` | |
| `wind_wave_period` | `windWavePeriod` | |
| `wave_height` | — | Combined; use for display only |

**Note**: Day 0–7 uses European wave model (ICON-EPS); day 8–16 uses GFS global model. Mark confidence accordingly.

---

## Open-Meteo Weather API (Wind)

**Base URL**: `https://api.open-meteo.com/v1/forecast`  
**Auth**: None  
**CORS**: Supported

### Request

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=52.1033
  &longitude=4.2700
  &hourly=windspeed_10m,winddirection_10m,windgusts_10m
  &forecast_days=16
  &timezone=Europe%2FAmsterdam
  &wind_speed_unit=ms
```

### Response (abbreviated)

```json
{
  "hourly": {
    "time": ["2026-04-02T00:00", ...],
    "windspeed_10m": [3.2, 3.5, ...],
    "winddirection_10m": [95.0, 98.0, ...],
    "windgusts_10m": [5.1, 5.4, ...]
  }
}
```

### Mapping to ForecastSlot

| API field | ForecastSlot field |
|-----------|-------------------|
| `windspeed_10m` | `windSpeed` (m/s) |
| `winddirection_10m` | `windDirection` (degrees) |
| `windgusts_10m` | `windGusts` (m/s) |

**Beaufort conversion**: Wind speed (m/s) → Beaufort for display only:
`bft = Math.round(Math.cbrt((windSpeed / 0.836) ** 2))`

---

## Rijkswaterstaat Waterinfo API (Tide)

**Base URL**: `https://waterwebservices.rijkswaterstaat.nl`  
**Auth**: None  
**CORS**: Supported (government public API)

### Station

Scheveningen gauge: code `SCHEVNGN`, parameter `WATHTE` (water level in cm above NAP).

### Request

```
POST https://waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES_DBO/OphalenWaarnemingen
Content-Type: application/json

{
  "AquoMetadataLijst": [{
    "Eenheid": { "Code": "cm" },
    "Grootheid": { "Code": "WATHTE" },
    "Hoedanigheid": { "Code": "NAP" }
  }],
  "LocatieLijst": [{
    "Code": "SCHEVNGN",
    "X": 81000,
    "Y": 454844
  }],
  "Periode": {
    "Begindatumtijd": "2026-04-02T00:00:00.000+01:00",
    "Einddatumtijd": "2026-04-16T23:59:59.000+01:00"
  }
}
```

### Response (abbreviated)

```json
{
  "WaarnemingenLijst": [{
    "MetingLijst": [
      { "Tijdstip": "2026-04-02T00:00:00.000+01:00", "Meetwaarde": { "Waarde_Numeriek": 42 } },
      { "Tijdstip": "2026-04-02T01:00:00.000+01:00", "Meetwaarde": { "Waarde_Numeriek": 85 } }
    ]
  }]
}
```

### Tide State Derivation

Water level in cm above NAP for Scheveningen (approximate thresholds):
- `tideHeight < -50cm`: `low`
- `-50cm ≤ tideHeight ≤ 50cm`: `mid`
- `tideHeight > 50cm`: `high`

`tideDirection` derived from consecutive readings:
- Rising between t and t+1: `flooding`
- Falling: `ebbing`
- Change < 2cm: `slack`

**Fallback**: If RWS API unavailable, tide data omitted; `dataSourceStatus.tide = 'error'`; tide parameter excluded from scoring (weights redistributed proportionally).

---

## Local Storage Schema (UI Contract)

The following localStorage keys form the contract between the data layer and UI components:

```typescript
// Key: 'scoring_weights'
{
  swellDirection: number,  // default: 0.30
  windDirection: number,   // default: 0.25
  swellHeight: number,     // default: 0.20
  swellPeriod: number,     // default: 0.15
  tideState: number        // default: 0.10
  // Must sum to 1.0
}

// Key: 'session_logs'
SessionLog[]               // Array, ordered by date desc

// Key: 'expert_messages'
ExpertMessage[]            // Array, ordered by ingestedAt desc

// Key: 'divergence_records'
DivergenceRecord[]         // Array, ordered by createdAt desc

// Key: 'model_accuracy'
ModelAccuracy | null       // null until >= 5 sessions logged
```

**IndexedDB** (via `idb-keyval`):
```
Store: 'surfforecast-store'
Key: 'forecast_scheveningen' → ForecastCache
```
