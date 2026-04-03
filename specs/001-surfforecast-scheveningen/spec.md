# Feature Specification: Surfforecast — Scheveningen Surf Condition Predictor

**Feature Branch**: `001-surfforecast-scheveningen`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "A web application that predicts wavesurfing conditions for Scheveningen, Netherlands, unifying multiple data sources into one easy-to-read forecast, validated against expert meteorologist input, and improved over time by real session logging."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View the 14-Day Forecast & Next Best Session (Priority: P1)

Scott opens the app on his phone while sitting in the car park at Scheveningen. He wants to know immediately: is it worth paddling out now, and when is the next best window this week?

The app opens to a dashboard showing:
- A "Next Best Session" card at the top, with date, time window, key conditions, score (1–5 stars), and a confidence level
- A 14-day colour-coded list/calendar beneath it — green (good), yellow (fair), orange (poor), red (flat/blown out)

He taps a day to see the hourly breakdown: swell height, swell period, swell direction, wind speed, wind direction, and tide state per hour.

**Why this priority**: This is the core value of the app. Everything else is built on top of this.

**Independent Test**: Navigate to the app root. A 14-day forecast renders with colour codes, a "Next Best Session" card is visible, and tapping any day reveals an hourly breakdown.

**Acceptance Scenarios**:

1. **Given** the app loads, **When** no action is taken, **Then** the "Next Best Session" card is the first visible element, showing date, time window, score, and at least 3 key conditions
2. **Given** the 14-day view is displayed, **When** Scott scans the list, **Then** each day shows a colour (green/yellow/orange/red) and an overall star rating (1–5)
3. **Given** Scott taps a specific day, **When** the detail view opens, **Then** he sees hourly slots with swell height, period, direction, wind speed, wind direction, and tide state
4. **Given** data is older than 6 hours, **When** the app loads, **Then** it fetches fresh forecast data automatically (4× per day cadence; manual refresh available at any time)
5. **Given** the device is offline, **When** the app loads, **Then** it shows the last cached forecast with a visible "last updated" timestamp

---

### User Story 2 — Paste Expert Meteorologist Message & Compare (Priority: P2)

Scott receives a WhatsApp message from his meteorologist with a Dutch free-form surf forecast. He pastes it into the app. The app parses it and shows a side-by-side comparison: what the expert says vs. what the model predicts for the same period and location.

Where there is significant divergence (expert says good, model says poor, or vice versa), the app flags this clearly. Over time, these divergences are tracked so the scoring algorithm can be calibrated against the expert's accuracy.

**Why this priority**: The meteorologist adds local knowledge that models miss. Validating predictions against expert input is a key differentiator.

**Independent Test**: Paste the example message (see Appendix B). App extracts at least: relevant time windows for Scheveningen, wave height estimate, wind direction, tidal reference. Comparison view renders with at least one agreement or divergence flag.

**Acceptance Scenarios**:

1. **Given** Scott pastes a Dutch free-form forecast text, **When** he submits it, **Then** the app extracts: spots/regions mentioned, time windows, wave height descriptors (e.g. "heuphoog"), wind direction and Beaufort scale, tidal terms (afgaand/opkomend/laagtij/mid-tij)
2. **Given** the text is parsed, **When** the comparison view renders, **Then** it shows model prediction vs. expert claim side by side for the relevant date/time
3. **Given** a significant divergence exists (e.g. expert says good, model says poor), **When** Scott views the comparison, **Then** the divergence is highlighted visually with a clear label
4. **Given** multiple expert messages have been pasted over time, **When** Scott views the divergence history, **Then** he can see a log of past agreements and divergences
5. **Given** no Scheveningen-specific information is found in the text, **When** the parse completes, **Then** the app informs the user that no Scheveningen data was found and shows the regional summary instead

---

### User Story 3 — Log a Surf Session (Priority: P3)

After surfing, Scott logs his session: date, time, spot, personal rating (1–5 stars), and optional notes. The app stores this and compares it against the model's prediction for that slot. Over many sessions, this calibrates the scoring algorithm.

**Why this priority**: Session logging closes the feedback loop and enables algorithm improvement over time. It is valuable but not required for day-one use.

**Independent Test**: Add a session log entry for today. It appears in the "Recent Sessions" list. The model prediction for that date/time is shown alongside the personal rating.

**Acceptance Scenarios**:

1. **Given** Scott taps "Log Session," **When** he fills in date, time, spot, and rating, **Then** the session is saved and appears in his session history
2. **Given** a session is saved, **When** Scott views it, **Then** the model's predicted score for that date/time is shown next to his actual rating
3. **Given** at least 5 sessions are logged, **When** Scott views the accuracy overview, **Then** a "Model Accuracy" score is shown, reflecting how well the predictions matched his real-world experience
4. **Given** session data accumulates over time, **When** the scoring weights are recalibrated, **Then** the algorithm reflects observed patterns from real sessions

---

### User Story 4 — Understand What Makes a Day Good or Bad (Priority: P4)

Scott wants to understand why a day is rated the way it is — not just see a star rating, but understand the reasoning. Each day's score is decomposable: "Swell direction: excellent, Wind: poor, Period: fair, Tide: good."

**Why this priority**: Transparency in the scoring builds trust and helps Scott decide whether a marginal day is worth going for (e.g. the wind is bad but the swell period is exceptional).

**Independent Test**: On any day's detail view, a score breakdown panel shows individual parameter ratings.

**Acceptance Scenarios**:

1. **Given** Scott views a day's detail, **When** he looks at the score breakdown, **Then** each parameter (swell direction, height, period, wind, tide) is shown with its individual rating and a visual indicator
2. **Given** a day is rated "fair" (yellow), **When** Scott checks the breakdown, **Then** he can identify which parameters are dragging the score down
3. **Given** a parameter is outside the ideal range, **When** Scott taps on it, **Then** a brief plain-language explanation is shown (e.g. "Wind is onshore SW 5 Bft — this typically ruins wave quality at Scheveningen")

---

### Edge Cases

- What happens when one data source (e.g. tide API) is unavailable? The forecast still renders using available data, with a visible warning noting which parameter could not be retrieved.
- What happens when the meteorologist message contains no information about Scheveningen or Z-H? The parser shows what it found regionally and notes the gap.
- What happens when the 14-day forecast extends into a range where model confidence is very low? Days beyond 7 days are shown with a "low confidence" indicator.
- What if two expert messages are pasted for the same date? The app keeps both, shows the most recent, and offers access to the previous version.
- What if Scott logs a session for a date where no forecast data is available (too far in the past)? The session is saved but no model comparison is shown; a note explains why.
- What if swell period is high but height is below the surfable threshold? The scoring must not over-reward period when height is too low to surf.

---

## Requirements *(mandatory)*

### Functional Requirements

**Forecast Engine**

- **FR-001**: The system MUST fetch and display a 14-day surf forecast for Scheveningen, updated at least every 6 hours (4× per day); a manual refresh option MUST be available at any time
- **FR-002**: The system MUST source wave data (height, period, direction) from at least one open wave model or buoy network covering the North Sea
- **FR-003**: The system MUST source wind data (speed, direction) from a meteorological model with coverage of the Dutch coast
- **FR-004**: The system MUST source tide data (state, height, rising/falling) for Scheveningen specifically
- **FR-005**: The system MUST display forecasts at hourly resolution for each day in the 14-day window
- **FR-006**: The system MUST cache the last successful forecast so the app remains usable when offline

**Scoring Algorithm**

- **FR-007**: The system MUST compute a composite surf score (1–5) per hour based on five weighted parameters: swell direction, swell height, swell period, wind direction (incorporating Beaufort strength as a modifier), and tide state
- **FR-008**: The scoring parameters MUST reflect Scheveningen-specific ideal conditions (see Appendix A)
- **FR-009**: The system MUST display a per-parameter score breakdown (swell direction, wind, swell height, swell period, tide) accessible from the day detail view; each parameter shows its individual rating and a plain-language explanation
- **FR-010**: Algorithm weights MUST be adjustable — either manually by the user or through calibration from accumulated session logs
- **FR-011**: Days beyond 7 days MUST be marked with a reduced-confidence indicator

**Dashboard & UX**

- **FR-012**: The app MUST display a "Next Best Session" recommendation as the primary visible element on load, without requiring scrolling on a standard mobile screen
- **FR-013**: The Next Best Session card MUST show: date, time window, composite score, confidence level, and the top 3 contributing conditions
- **FR-014**: The 14-day view MUST use colour coding: green (score 4–5), yellow (score 3), orange (score 2), red (score 1)
- **FR-015**: The app MUST be usable on a mobile browser without installation
- **FR-016**: The primary dashboard MUST load and render within 3 seconds on a standard mobile connection

**Expert Validation**

- **FR-017**: The system MUST accept free-form Dutch text input pasted by the user
- **FR-018**: The system MUST extract from that text: time windows, wave height descriptors, wind direction and Beaufort strength, tidal references, and spot/region mentions
- **FR-019**: The system MUST map Dutch surf terminology to model parameters (see Appendix B)
- **FR-020**: The system MUST display a side-by-side comparison: model prediction vs. expert claim for the same date/time
- **FR-021**: Significant divergences MUST be flagged visually (e.g. model scores the day 4, expert describes poor conditions)
- **FR-022**: All expert message inputs, their parsed extractions, and comparison results MUST be stored with their ingestion date

**Session Logging**

- **FR-023**: Users MUST be able to log a session with: date, time, spot, personal rating (1–5), and optional free-text notes
- **FR-024**: Each logged session MUST display the model's predicted score for that date/time alongside the personal rating
- **FR-025**: The system MUST compute and display a "Model Accuracy" score once 5 or more sessions are logged
- **FR-026**: Session data MUST persist across browser sessions (not lost on refresh)

### Key Entities

- **Forecast**: A set of hourly surf condition predictions for Scheveningen over a 14-day window. Contains: timestamp, swell height (Hs), swell period (Tp), swell direction, wind speed, wind direction, tide state, composite score, per-parameter scores, confidence level.
- **Score**: A computed 1–5 rating derived from weighted parameter assessments against Scheveningen-specific ideal ranges. Each parameter contributes a sub-score; the composite is a weighted average.
- **Expert Message**: A pasted free-form Dutch text from a meteorologist. Contains: raw text, ingestion date, parsed extractions (spots, time windows, conditions), and a comparison result against the model forecast for the relevant period.
- **Session Log**: A user-entered record of a real surf session. Contains: date, time, spot, personal rating (1–5), optional notes, and the linked model forecast score for that slot.
- **Divergence Record**: A stored comparison between an expert claim and the model prediction for the same period. Accumulates over time and is used for algorithm calibration.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The primary dashboard loads and displays a colour-coded 14-day forecast within 3 seconds on a standard mobile connection
- **SC-002**: The "Next Best Session" recommendation is always visible without scrolling on a standard mobile screen
- **SC-003**: A pasted expert message is parsed and a comparison view is rendered within 5 seconds of submission
- **SC-004**: At least 4 of the 5 core parameters (swell direction, height, period, wind, tide) are correctly extracted from a representative Dutch expert message
- **SC-005**: After 10 logged sessions, the model accuracy score shows a meaningful positive correlation between predicted scores and personal ratings
- **SC-006**: On days the expert rates as "good" for Scheveningen, the model's composite score is ≥ 3 in at least 70% of cases after initial calibration
- **SC-007**: The app is fully usable on a mobile browser without installation or account creation

---

## Assumptions

- The primary user is an experienced surfer who understands surf terminology — no tooltips needed for terms like "swell period" or "offshore wind"
- The app is for personal use in v1; multi-user and social features are out of scope
- No account or login is required; session logs and settings are stored in browser local storage for v1
- Meteorologist messages will always be in Dutch; English parsing is not required for v1
- Scheveningen is the only forecast location in v1; multi-spot comparison is out of scope
- Push notifications and alerts are out of scope for v1
- Water temperature may be displayed as an informational field but does not affect the scoring algorithm
- The scoring algorithm starts with researcher-defined weights (Appendix A) and is refined over time via session logs and expert divergence tracking
- Sandbar quality cannot be predicted by the model and is a known limitation — local knowledge from the expert messages partially compensates for this

---

## Appendix A — Scheveningen Scoring Parameters

| Parameter | Ideal (full score) | Acceptable (partial score) | Poor (low score) |
|---|---|---|---|
| Swell direction | NW–NNW (315–340°) | W–NW (270–315°), N (340–360°) | S, SW, SE |
| Wind direction | E–ESE (offshore, 80–120°) | NE (side-offshore) | W, SW, NW (onshore) |
| Swell height (Hs) | 0.6–1.2m | 0.4–1.5m | <0.3m or >2m |
| Swell period (Tp) | 10–12s | 8–10s | <6s |
| Tide state | Mid (rising preferred) | Low | High (closeouts) |

Local context:
- North Sea waves are disproportionately steep for their height due to shallow bathymetry. A 0.8m North Sea wave is roughly equivalent to a 1.2m Atlantic wave in terms of power.
- Easterly (offshore) winds are rare. Most quality sessions occur during brief anticyclonic windows in spring and autumn when the Atlantic westerlies are suppressed.
- Sandbar position and quality shifts after every significant storm. This is unpredictable from model data and is a known gap — expert messages often include local sandbar observations.
- The Scheveningen pier and groynes create local refraction effects. North side of the pier, mid-tide, with a NW swell is typically the best configuration.

---

## Appendix B — Dutch Surf Terminology Mapping

| Dutch term | English meaning | Model mapping |
|---|---|---|
| heuphoog | hip-high | Hs ≈ 0.8–1.0m |
| schouderhoog | shoulder-high | Hs ≈ 1.0–1.3m |
| hoofdhoog | head-high | Hs ≈ 1.2–1.5m |
| laagtij | low tide | Tide state: low |
| hoogwater / HW | high tide | Tide state: high |
| mid-tij | mid tide | Tide state: mid |
| opkomend | rising tide | Tide direction: flooding |
| afgaand | ebbing tide | Tide direction: ebbing |
| offshore | offshore wind | Wind bearing relative to beach: offshore |
| onshore | onshore wind | Wind bearing relative to beach: onshore |
| zij-offshore / side-off | side-offshore wind | Wind bearing relative to beach: side-offshore |
| N-H | Noord-Holland | Region: Noord-Holland |
| Z-H | Zuid-Holland (incl. Scheveningen) | Region: Zuid-Holland |
| schev | Scheveningen | Spot: Scheveningen |
| hvh | Hoek van Holland | Spot: Hoek van Holland |
| Zvoort | Zandvoort | Spot: Zandvoort |
| bft | Beaufort scale | Wind speed scale (1–12) |
| swell | groundswell | Wave type: groundswell (longer period) |
| windgolven | wind waves | Wave type: wind swell (short period, choppy) |

---

## Appendix C — Example Expert Message

The following is a representative example of the free-form Dutch meteorologist messages that the expert validation feature must be able to parse:

> Korte Samenvatting: vrijdag eerst swell, maar bijna (te) snel gaat het over in windgolven. Zaterdag minder wind en begint met 0,5m golven die steeds kleiner worden. Heel laat op de dag verschijnt er in N-H en wadden een nieuwe WNW swell. Zondag WZW windgolven met minder wind einde middag (in zuiden betere golven in de ochtend). Maandag alerts voor Z-H de hele dag, in het noorden in de middag pas mooi clean. Zeeland wat minder gunstig, vanaf 16u nog wel leuke lijntjes. BE idem, nog iets kleiner. Dinsdag ook swell uit NW, super op de wadden en in N-H en deels Z-H ook nog heuphoog.
>
> Detailbericht voor vrijdag: Eerste licht 7-8u nog mooi in N-H heuphoog met zuid 4bft offshore. Rond Egmond en Zvoort al snel te side en toenemende naar 5bft wind. Wijk langer goed te doen tot 10u mid-tij. Ook Z-H langer goed, vooral rond schev en hvh. In Z-H komt afgaand te laat, wel nog goed op schev van 17-20u.

Key extractions the parser should derive from this message:
- **Scheveningen (schev), Friday**: good 17:00–20:00, ebbing tide (afgaand)
- **Scheveningen (schev), Friday morning**: also good (implied from Z-H reference), hip-high (heuphoog), S 4 Bft offshore
- **Region**: Z-H (Zuid-Holland) — includes Scheveningen
- **Wave type transition**: swell → wind waves through the day
- **Tide reference**: mid tide (mid-tij) at Wijk; ebbing (afgaand) comes late in Z-H
