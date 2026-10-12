import type { ForecastCache, ForecastSlot, DataSourceStatus } from '$lib/types';
import { fetchMarineData } from './marine';
import { fetchWindData } from './wind';
import { fetchTideData } from './tide';
import { computeScore, findNextBestMoment } from '$lib/scoring/index';
import { isDaylight } from '$lib/solar';

const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;

export async function fetchForecast(): Promise<ForecastCache | null> {
	const now = new Date();
	const fetchedAt = now.toISOString();

	const [marineResult, windResult] = await Promise.allSettled([
		fetchMarineData(),
		fetchWindData()
	]);

	const marine = marineResult.status === 'fulfilled' ? marineResult.value : null;
	const wind = windResult.status === 'fulfilled' ? windResult.value : null;
	// Tide is computed locally via harmonic prediction — never fails
	const tide = fetchTideData(now, new Date(now.getTime() + 17 * 24 * 3_600_000));

	const status: { wave: DataSourceStatus; wind: DataSourceStatus; tide: DataSourceStatus } = {
		wave: marine ? 'ok' : 'error',
		wind: wind ? 'ok' : 'error',
		tide: tide.length > 0 ? 'ok' : 'error'
	};

	// Return null only if both network sources failed (tide is always locally computed)
	if (!marine && !wind) return null;

	// Build a timestamp index for fast lookups
	const windByTs = new Map(wind?.map((w) => [w.timestamp, w]) ?? []);
	// Build tide lookup keyed by the start-of-hour ISO string (YYYY-MM-DDTHH:00:00.000Z)
	const tideByHour = new Map(
		tide.map((t) => {
			const d = new Date(t.timestamp);
			d.setUTCMinutes(0, 0, 0);
			return [d.toISOString(), t];
		})
	);

	// Use marine timestamps as primary; fall back to wind timestamps
	const timestamps = marine?.map((m) => m.timestamp) ?? wind?.map((w) => w.timestamp) ?? [];

	const slots: ForecastSlot[] = timestamps.map((ts) => {
		const m = marine?.find((x) => x.timestamp === ts);
		const w = windByTs.get(ts);
		// Normalise ts to start-of-hour for tide lookup
		const tsHour = new Date(ts);
		tsHour.setUTCMinutes(0, 0, 0);
		const t = tideByHour.get(tsHour.toISOString());

		const isReduced = new Date(ts).getTime() - now.getTime() > SEVEN_DAYS_MS;

		const partial = {
			timestamp: ts,
			swellHeight: m?.swellHeight ?? 0,
			swellPeriod: m?.swellPeriod ?? 0,
			swellDirection: m?.swellDirection ?? 0,
			windWaveHeight: m?.windWaveHeight ?? 0,
			windWavePeriod: m?.windWavePeriod ?? 0,
			windSpeed: w?.windSpeed ?? 0,
			windDirection: w?.windDirection ?? 0,
			windGusts: w?.windGusts ?? 0,
			tideHeight: t?.tideHeight ?? 0,
			tideState: t?.tideState ?? ('mid' as const),
			tideDirection: t?.tideDirection ?? ('slack' as const),
			confidence: (isReduced ? 'reduced' : 'standard') as 'reduced' | 'standard',
			dataFetchedAt: fetchedAt
		};

		return {
			...partial,
			score: computeScore(partial)
		} as ForecastSlot;
	});

	slots.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
	const daylightSlots = slots.filter((s) => isDaylight(s.timestamp));

	return {
		location: 'scheveningen',
		fetchedAt,
		slots: daylightSlots,
		nextBestSession: findNextBestMoment(daylightSlots, now),
		dataSourceStatus: status
	};
}
