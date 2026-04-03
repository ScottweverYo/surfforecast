import type { TideState, TideDirection } from '$lib/types';

export interface TideSlot {
	timestamp: string;
	tideHeight: number;   // cm above NAP
	tideState: TideState;
	tideDirection: TideDirection;
}

// ─── Harmonic tidal prediction for Scheveningen ──────────────────────────────
// Published constituents from IHO / PSMSL datum for Scheveningen (Hook van Holland).
// Amplitude in cm (above mean sea level), phase g in degrees relative to Greenwich.
// Reference epoch: 2000-01-01T00:00:00Z
// Speeds in degrees per hour.

const CONSTITUENTS: Array<{
	name: string;
	speed: number;   // °/hour
	amplitude: number; // cm
	phase: number;   // degrees (g, Greenwich epoch phase)
}> = [
	{ name: 'M2', speed: 28.9841042, amplitude: 88.2, phase: 143.9 },
	{ name: 'S2', speed: 30.0000000, amplitude: 29.5, phase: 167.5 },
	{ name: 'N2', speed: 28.4397295, amplitude: 18.0, phase: 128.5 },
	{ name: 'K1', speed: 15.0410686, amplitude:  8.2, phase: 225.0 },
	{ name: 'O1', speed: 13.9430356, amplitude:  5.5, phase: 210.0 },
	{ name: 'M4', speed: 57.9682084, amplitude:  3.7, phase:  53.0 },
	{ name: 'MS4',speed: 58.9841042, amplitude:  1.8, phase:  80.0 },
];

// Mean water level above NAP for Scheveningen (cm)
const MEAN_LEVEL_CM = 2;

// Reference epoch: milliseconds since unix epoch for 2000-01-01T00:00:00Z
const EPOCH_MS = Date.UTC(2000, 0, 1, 0, 0, 0, 0);

function predictHeight(dateMs: number): number {
	const hoursFromEpoch = (dateMs - EPOCH_MS) / 3_600_000;
	let h = MEAN_LEVEL_CM;
	for (const c of CONSTITUENTS) {
		const angleRad = ((c.speed * hoursFromEpoch - c.phase) * Math.PI) / 180;
		h += c.amplitude * Math.cos(angleRad);
	}
	return Math.round(h);
}

function deriveTideState(cm: number): TideState {
	if (cm < -50) return 'low';
	if (cm > 50) return 'high';
	return 'mid';
}

function deriveTideDirection(current: number, next: number | undefined): TideDirection {
	if (next === undefined) return 'slack';
	const diff = next - current;
	if (diff > 2) return 'flooding';
	if (diff < -2) return 'ebbing';
	return 'slack';
}

/**
 * Generate hourly tidal predictions for Scheveningen using harmonic constituents.
 * Returns slots from `from` to `to` (exclusive), one per hour.
 * Never throws — falls back to an empty array if dates are invalid.
 */
export function fetchTideData(
	from: Date = new Date(),
	to: Date = new Date(Date.now() + 16 * 24 * 3_600_000)
): TideSlot[] {
	try {
		// Snap to the start of the current hour
		const start = new Date(from);
		start.setUTCMinutes(0, 0, 0);

		const slots: Array<{ ts: number; height: number }> = [];
		const cursor = new Date(start);

		while (cursor < to) {
			slots.push({ ts: cursor.getTime(), height: predictHeight(cursor.getTime()) });
			cursor.setUTCHours(cursor.getUTCHours() + 1);
		}

		return slots.map((s, i) => ({
			timestamp: new Date(s.ts).toISOString(),
			tideHeight: s.height,
			tideState: deriveTideState(s.height),
			tideDirection: deriveTideDirection(s.height, slots[i + 1]?.height)
		}));
	} catch {
		return [];
	}
}
