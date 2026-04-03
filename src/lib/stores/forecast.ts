import { writable, get } from 'svelte/store';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import type { ForecastCache } from '$lib/types';
import { fetchForecast } from '$lib/api/forecast';

const IDB_KEY = 'forecast_scheveningen';
const STALE_MS = 6 * 60 * 60 * 1000; // 6 hours

const _forecast = writable<ForecastCache | null>(null);
export const isLoading = writable<boolean>(false);
export const lastError = writable<string | null>(null);

export const forecast = { subscribe: _forecast.subscribe };

function isStale(cache: ForecastCache): boolean {
	return Date.now() - new Date(cache.fetchedAt).getTime() > STALE_MS;
}

export async function loadForecast(force = false): Promise<void> {
	// Try loading from IndexedDB first
	let cached: ForecastCache | undefined;
	try {
		cached = await idbGet<ForecastCache>(IDB_KEY);
	} catch {
		// IndexedDB unavailable (e.g. SSR context)
		return;
	}

	if (cached && !force && !isStale(cached)) {
		_forecast.set(cached);
		return;
	}

	isLoading.set(true);
	lastError.set(null);

	// Show stale cache immediately while fetching
	if (cached) _forecast.set(cached);

	try {
		const fresh = await fetchForecast();
		if (fresh) {
			_forecast.set(fresh);
			await idbSet(IDB_KEY, fresh);
		} else {
			if (cached) {
				lastError.set('Could not fetch forecast — showing cached data');
			} else {
				lastError.set('No forecast data available');
			}
		}
	} catch {
		lastError.set(cached ? 'Could not fetch forecast — showing cached data' : 'No forecast data available');
	} finally {
		isLoading.set(false);
	}
}

export async function refresh(): Promise<void> {
	await loadForecast(true);
}

// Auto-init in browser
if (typeof window !== 'undefined') {
	loadForecast();
}
