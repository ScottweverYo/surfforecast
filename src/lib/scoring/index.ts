import type {
	ForecastSlot,
	Score,
	ScoringWeights,
	NextBestSession,
	TimeWindow,
	ParameterScore,
	SessionLog,
	ModelAccuracy
} from '$lib/types';
import {
	scoreSwellDirection,
	scoreSwellHeight,
	scoreSwellPeriod,
	scoreTideState,
	scoreWindDirectionWithBft
} from './parameters';

export const DEFAULT_WEIGHTS: ScoringWeights = {
	swellDirection: 0.30,
	windDirection: 0.25,
	swellHeight: 0.20,
	swellPeriod: 0.15,
	tideState: 0.10
};

export function computeScore(
	slot: Pick<
		ForecastSlot,
		'swellHeight' | 'swellPeriod' | 'swellDirection' | 'windSpeed' | 'windDirection' | 'tideState' | 'tideDirection'
	>,
	weights: ScoringWeights = DEFAULT_WEIGHTS
): Score {
	const parameters = {
		swellDirection: scoreSwellDirection(slot.swellDirection),
		windDirection: scoreWindDirectionWithBft(slot.windDirection, slot.windSpeed),
		swellHeight: scoreSwellHeight(slot.swellHeight),
		swellPeriod: scoreSwellPeriod(slot.swellPeriod),
		tideState: scoreTideState(slot.tideState, slot.tideDirection)
	};

	if (slot.swellHeight < 0.3) {
		return { composite: 1, parameters, cappedByHeight: true };
	}

	const composite =
		parameters.swellDirection.value * weights.swellDirection +
		parameters.windDirection.value * weights.windDirection +
		parameters.swellHeight.value * weights.swellHeight +
		parameters.swellPeriod.value * weights.swellPeriod +
		parameters.tideState.value * weights.tideState;

	return { composite: Math.round(composite * 2) / 2, parameters, cappedByHeight: false };
}

const TIME_WINDOWS: { window: TimeWindow; start: number; end: number }[] = [
	{ window: 'morning',   start: 6,  end: 10 },
	{ window: 'midday',    start: 10, end: 14 },
	{ window: 'afternoon', start: 14, end: 18 },
	{ window: 'evening',   start: 18, end: 21 },
];

export function findNextBestMoment(
	slots: ForecastSlot[],
	now: Date
): NextBestSession | null {
	const nowISO = now.toISOString();
	const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();

	// Collect all (date, window, slots) combinations, then sort chronologically
	type Candidate = { date: string; window: TimeWindow; daySlots: ForecastSlot[]; score: number };
	const candidates: Candidate[] = [];

	for (const { window, start, end } of TIME_WINDOWS) {
		const windowSlots = slots.filter((s) => {
			if (s.timestamp <= nowISO) return false;
			if (s.swellHeight < 0.3) return false;
			const h = new Date(s.timestamp).getHours();
			return h >= start && h < end;
		});

		const byDate = new Map<string, ForecastSlot[]>();
		for (const s of windowSlots) {
			const d = s.timestamp.slice(0, 10);
			if (!byDate.has(d)) byDate.set(d, []);
			byDate.get(d)!.push(s);
		}

		for (const [date, daySlots] of byDate) {
			if (daySlots.length === 0) continue;
			const peak = Math.max(...daySlots.map((s) => s.score.composite));
			const bonus = daySlots[0].confidence === 'standard' ? 0.01 : 0;
			candidates.push({ date, window, daySlots, score: peak + bonus });
		}
	}

	// Sort by date, then by window order within the day
	const windowOrder: Record<TimeWindow, number> = { morning: 0, midday: 1, afternoon: 2, evening: 3 };
	candidates.sort((a, b) =>
		a.date !== b.date ? a.date.localeCompare(b.date) : windowOrder[a.window] - windowOrder[b.window]
	);

	// Return the first upcoming window that meets the minimum threshold
	const pick = candidates.find((c) => c.score >= 3.5);
	if (!pick) return null; // no green (≥3.5) window found

	const best = pick.daySlots.reduce((a, b) => (a.score.composite > b.score.composite ? a : b));
	const params = Object.values(best.score.parameters) as ParameterScore[];
	const topConditions = [...params]
		.sort((a, b) => b.value - a.value)
		.slice(0, 3) as [ParameterScore, ParameterScore, ParameterScore];

	const greenSlots = pick.daySlots.filter((s) => s.score.composite >= 3.5);
	const toHHMM = (iso: string) => {
		const h = new Date(iso).getHours();
		return `${String(h).padStart(2, '0')}:00`;
	};
	const startTime = toHHMM(greenSlots[0].timestamp);
	const endTime   = toHHMM(greenSlots[greenSlots.length - 1].timestamp);

	return {
		date: pick.date,
		window: pick.window,
		startTime,
		endTime,
		compositeScore: Math.round(pick.score * 2) / 2,
		confidence: pick.date + 'T00:00:00.000Z' < sevenDaysFromNow ? 'standard' : 'reduced',
		topConditions
	};
}

export function computeModelAccuracy(sessions: SessionLog[]): ModelAccuracy | null {
	const valid = sessions.filter((s) => s.modelScore !== null);
	if (valid.length < 5) return null;

	const n = valid.length;
	const xs = valid.map((s) => s.personalRating);
	const ys = valid.map((s) => s.modelScore as number);
	const meanX = xs.reduce((a, b) => a + b, 0) / n;
	const meanY = ys.reduce((a, b) => a + b, 0) / n;
	const num = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
	const den = Math.sqrt(
		xs.reduce((s, x) => s + (x - meanX) ** 2, 0) *
		ys.reduce((s, y) => s + (y - meanY) ** 2, 0)
	);
	const r = den === 0 ? 0 : num / den;
	const mae = xs.reduce((s, x, i) => s + Math.abs(x - ys[i]), 0) / n;

	return {
		sessionCount: n,
		correlationScore: Math.round(r * 1000) / 1000,
		meanAbsoluteError: Math.round(mae * 100) / 100,
		computedAt: new Date().toISOString()
	};
}
