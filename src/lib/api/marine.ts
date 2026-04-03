const BASE = 'https://marine-api.open-meteo.com/v1/marine';
const LAT = 52.1033;
const LON = 4.27;

export interface MarineSlot {
	timestamp: string;
	swellHeight: number;
	swellPeriod: number;
	swellDirection: number;
	windWaveHeight: number;
	windWavePeriod: number;
}

export async function fetchMarineData(): Promise<MarineSlot[] | null> {
	try {
		const url = new URL(BASE);
		url.searchParams.set('latitude', String(LAT));
		url.searchParams.set('longitude', String(LON));
		url.searchParams.set(
			'hourly',
			'swell_wave_height,swell_wave_period,swell_wave_direction,wind_wave_height,wind_wave_period'
		);
		url.searchParams.set('forecast_days', '16');
		url.searchParams.set('timezone', 'Europe/Amsterdam');

		const res = await fetch(url.toString());
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		const h = data.hourly;

		return h.time.map((t: string, i: number) => ({
			timestamp: new Date(t).toISOString(),
			swellHeight: h.swell_wave_height[i] ?? 0,
			swellPeriod: h.swell_wave_period[i] ?? 0,
			swellDirection: h.swell_wave_direction[i] ?? 0,
			windWaveHeight: h.wind_wave_height[i] ?? 0,
			windWavePeriod: h.wind_wave_period[i] ?? 0
		}));
	} catch (e) {
		console.error('[marine] fetch failed', e);
		return null;
	}
}
