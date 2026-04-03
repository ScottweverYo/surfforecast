import type {
	ForecastSlot,
	Score,
	ScoringWeights,
	NextBestSession,
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

export function findNextBestSession(
	slots: ForecastSlot[],
	now: Date,
	windowHours = 2
): NextBestSession | null {
	const nowISO = now.toISOString();
	const future = slots.filter(
		(s) => s.timestamp > nowISO && s.swellHeight >= 0.3
	);
	if (future.length < windowHours) return null;

	const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();

	let bestScore = -Infinity;
	let bestStart = -1;

	for (let i = 0; i <= future.length - windowHours; i++) {
		const window = future.slice(i, i + windowHours);
		// Check contiguous (1-hour gaps)
		let contiguous = true;
		for (let j = 1; j < window.length; j++) {
			const diff =
				new Date(window[j].timestamp).getTime() - new Date(window[j - 1].timestamp).getTime();
			if (diff > 2 * 3600 * 1000) { contiguous = false; break; }
		}
		if (!contiguous) continue;

		const mean = window.reduce((s, sl) => s + sl.score.composite, 0) / windowHours;
		// Prefer standard confidence windows
		const bonus = window[0].confidence === 'standard' ? 0.01 : 0;
		if (mean + bonus > bestScore) {
			bestScore = mean + bonus;
			bestStart = i;
		}
	}

	if (bestStart === -1 || bestScore < 2) return null;

	const window = future.slice(bestStart, bestStart + windowHours);
	const best = window.reduce((a, b) => (a.score.composite > b.score.composite ? a : b));
	const params = Object.values(best.score.parameters) as ParameterScore[];
	const topConditions = [...params]
		.sort((a, b) => b.value - a.value)
		.slice(0, 3) as [ParameterScore, ParameterScore, ParameterScore];

	const startDate = new Date(window[0].timestamp);
	const endDate = new Date(window[windowHours - 1].timestamp);

	return {
		date: startDate.toISOString().split('T')[0],
		startHour: startDate.getUTCHours(),
		endHour: endDate.getUTCHours() + 1,
		compositeScore: Math.round(bestScore * 2) / 2,
		confidence: window[0].timestamp < sevenDaysFromNow ? 'standard' : 'reduced',
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
