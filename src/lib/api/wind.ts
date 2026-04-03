const BASE = 'https://api.open-meteo.com/v1/forecast';
const LAT = 52.1033;
const LON = 4.27;

export interface WindSlot {
	timestamp: string;
	windSpeed: number;
	windDirection: number;
	windGusts: number;
}

export async function fetchWindData(): Promise<WindSlot[] | null> {
	try {
		const url = new URL(BASE);
		url.searchParams.set('latitude', String(LAT));
		url.searchParams.set('longitude', String(LON));
		url.searchParams.set('hourly', 'windspeed_10m,winddirection_10m,windgusts_10m');
		url.searchParams.set('forecast_days', '16');
		url.searchParams.set('timezone', 'Europe/Amsterdam');
		url.searchParams.set('wind_speed_unit', 'ms');

		const res = await fetch(url.toString());
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		const h = data.hourly;

		return h.time.map((t: string, i: number) => ({
			timestamp: new Date(t).toISOString(),
			windSpeed: h.windspeed_10m[i] ?? 0,
			windDirection: h.winddirection_10m[i] ?? 0,
			windGusts: h.windgusts_10m[i] ?? 0
		}));
	} catch (e) {
		console.error('[wind] fetch failed', e);
		return null;
	}
}
