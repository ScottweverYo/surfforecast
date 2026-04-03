# Research: Surfforecast — Scheveningen Surf Condition Predictor

**Phase**: 0 | **Branch**: `001-surfforecast-scheveningen` | **Date**: 2026-04-02

---

## Wave & Swell Data

**Decision**: Open-Meteo Marine API as primary wave source; GFS global wave model (via Open-Meteo) for days 8–14.

**Rationale**: Free, no auth required, direct JSON over HTTPS, 5km North Sea resolution, native CORS support for browser requests. Provides Hs, Tp, swell direction, and wind waves separately. Days 0–7 use European wave model; days 8–14 fall back to GFS global model — lower confidence, which aligns exactly with FR-011 (reduced-confidence indicator beyond day 7).

**Alternatives considered**:
- Copernicus Marine Service (NW Shelf 1.5km, higher resolution): requires registration + API key, Python client library, not browser-friendly. Ruled out for v1.
- NOAA WAVEWATCH III: GRIB format, server-side parsing required. No backend in v1.
- KNMI: wind-focused, limited programmatic swell access.

**Endpoint**: `https://marine-api.open-meteo.com/v1/marine` — params: `latitude=52.1033&longitude=4.2700&hourly=wave_height,wave_period,wave_direction,wind_wave_height,wind_wave_period,swell_wave_height,swell_wave_period,swell_wave_direction&forecast_days=16`

---

## Wind Data

**Decision**: Open-Meteo Weather API (KNMI HARMONIE model variant).

**Rationale**: Free, no auth, 14+ day forecast, hourly resolution, covers Scheveningen coordinates. Returns `windspeed_10m`, `winddirection_10m`, `windgusts_10m`. KNMI HARMONIE model selectable as `model=knmi_seamless` for best Dutch coast accuracy within day 7.

**Alternatives considered**:
- KNMI Data Platform directly: gridded GRIB data, not browser-friendly.
- Buienradar API: undocumented/unofficial, fragile.

**Endpoint**: `https://api.open-meteo.com/v1/forecast` — params include `&models=knmi_seamless` within 7-day range, standard GFS beyond.

---

## Tide Data

**Decision**: Rijkswaterstaat Waterinfo API (getij.rws.nl) for Scheveningen-specific tide data.

**Rationale**: Official Dutch government data (Rijkswaterstaat), free, public domain, no auth. Provides observed and predicted water levels for Scheveningen gauge station (`SCHEVNGN`). The getij.rws.nl portal exposes a JSON API; community wrappers confirm access pattern.

**Limitation**: The RWS API provides predictions ~6 months out for tide tables. Tidal data is computed (astronomic) so 14-day range is fully available. Water level at Scheveningen station code: `SCHEVNGN`.

**Alternatives considered**:
- Admiralty API: primarily covers British Isles, Scheveningen may not be covered. Requires auth.
- WorldTides API: paid.

**API pattern**: `https://waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES_DBO/OphalenWaarnemingen` — POST request with station SCHEVNGN, parameter WATHTE (water level), 14-day window.

---

## Dutch Text NLP Parsing

**Decision**: Regex/keyword mapping in pure JavaScript — no external NLP library or LLM needed.

**Rationale**: The expert messages follow semi-structured templated patterns (as demonstrated in Appendix C of the spec). Key entities — wave heights, wind direction/strength, tide terms, spot names — all match simple patterns. The full Dutch surf terminology mapping is defined in Appendix B of the spec, providing a complete vocabulary. Building a lookup map + regex patterns covers 100% of the spec's extraction requirements.

**Implementation pattern**:
- Spot detection: literal match against known abbreviations (`schev`, `Z-H`, `N-H`, `hvh`, `Zvoort`)
- Time window extraction: `/(\d{1,2})[:\-–](\d{2})\s*u?/g` + Dutch day names
- Wave height: height descriptors (`heuphoog`, `schouderhoog`, `hoofdhoog`) → mapped Hs ranges
- Wind: `/(\d+)\s*bft/i` + direction keywords (`offshore`, `onshore`, `zij-offshore`, compass bearings)
- Tide: exact term match (`laagtij`, `hoogwater`, `mid-tij`, `opkomend`, `afgaand`)

**Alternatives considered**:
- parse-dutch (wooorm): produces syntax trees, heavyweight for this pattern-matching task.
- LLM API call: adds latency, API key requirement, cost. Overkill for a well-defined vocabulary.

---

## Frontend Stack

**Decision**: SvelteKit + Vite + vite-plugin-pwa.

**Rationale**: Svelte's compiled output (~3.6kB runtime vs React's 45kB) matters for FR-016 (3s mobile load target). SvelteKit provides file-based routing, built-in SSG/SPA modes, and excellent PWA support via vite-plugin-pwa (Workbox-based service worker for FR-006 offline caching). Svelte stores replace Redux/Context complexity for forecast and session state. Strong TypeScript support.

**Alternatives considered**:
- React + Vite: heavier bundle, but familiar ecosystem. Not needed given single-user personal-use scope.
- Vue 3: similar size to Svelte compiled, less reactive store ergonomics.
- Vanilla JS: viable but state management for 14-day hourly forecast data becomes unwieldy.

**Key dependencies**:
- `chart.js` + `svelte-chartjs`: hourly condition charts
- `date-fns`: tide window/time manipulation, Dutch locale
- `idb-keyval`: IndexedDB wrapper (larger forecast payloads than localStorage; sessions stay in localStorage per spec assumption)

**Testing**: Vitest (native Vite integration) + Playwright for E2E (mobile viewport).

---

## Architecture Decision: No Backend

**Decision**: Pure client-side SPA/PWA — no backend server for v1.

**Rationale**: All three data APIs (Open-Meteo, RWS tide) support CORS from browsers. Scoring algorithm, NLP parser, session logs, and expert messages all live client-side. No user accounts, no shared data. This satisfies FR-007 (offline-capable), FR-026 (persist across browser sessions), SC-007 (no installation/account required), and dramatically reduces deployment complexity for a personal-use app.

**Storage split**:
- Forecast cache: IndexedDB via `idb-keyval` (can hold ~50MB of hourly JSON)
- Session logs: localStorage (small, structured records)
- Expert messages + divergence records: localStorage
- Algorithm weights: localStorage

**Alternatives considered**:
- Express/Node backend + PostgreSQL: unnecessary complexity for single-user v1.
- Firebase/Supabase: introduces auth, account concepts excluded by spec assumptions.

---

## 14-Day Forecast Confidence Split

**Decision**: Days 0–7 = standard confidence; days 8–14 = reduced confidence (FR-011).

**Rationale**: Open-Meteo Marine uses European wave model for short range (0–7 days), GFS global model for 8–16 days. Wind data similarly degrades beyond 7 days. Tide data remains high-confidence throughout (astronomic). This naturally maps to the "reduced confidence indicator" required by FR-011 and the edge case noted in the spec ("days beyond 7 days shown with low confidence indicator").

---

## Scoring Algorithm Design

**Decision**: Weighted linear scoring, 1–5 scale, weights adjustable via localStorage.

**Default weights** (from Appendix A, Scheveningen-specific):
| Parameter | Weight | Rationale |
|-----------|--------|-----------|
| Swell direction | 30% | Dominant quality factor at Scheveningen (NW–NNW ideal) |
| Wind direction | 25% | Offshore (E-ESE) is rare and critical |
| Swell height | 20% | Must be in surfable range (0.4–1.5m) |
| Swell period | 15% | Quality indicator, but subordinate to height threshold |
| Tide state | 10% | Mid-rising preferred; less binary than wind/swell |

**Edge case handled**: Per spec — if swell height < 0.3m (below surfable threshold), composite score is capped at 1 regardless of period/direction scores.

**Alternatives considered**:
- Machine learning model: requires training data. Session logs will feed future calibration.
- Non-linear scoring: adds complexity without validated benefit at v1.
