import { describe, it, expect } from 'vitest';
import {
	scoreSwellDirection,
	scoreWindDirection,
	scoreSwellHeight,
	scoreSwellPeriod,
	scoreTideState
} from '../../src/lib/scoring/parameters';
import { computeScore, findNextBestSession, computeModelAccuracy, DEFAULT_WEIGHTS } from '../../src/lib/scoring/index';
import type { ForecastSlot, SessionLog } from '../../src/lib/types';

const makeSlot = (overrides: Partial<ForecastSlot> = {}): ForecastSlot => ({
	timestamp: new Date(Date.now() + 3600_000).toISOString(),
	swellHeight: 0.8,
	swellPeriod: 10,
	swellDirection: 320,
	windWaveHeight: 0.2,
	windWavePeriod: 4,
	windSpeed: 3,
	windDirection: 95,
	windGusts: 5,
	tideHeight: 20,
	tideState: 'mid',
	tideDirection: 'flooding',
	score: null as any,
	confidence: 'standard',
	dataFetchedAt: new Date().toISOString(),
	...overrides
});

describe('scoreSwellDirection', () => {
	it('rates NNW (318°) as excellent', () => {
		const r = scoreSwellDirection(318);
		expect(r.value).toBe(5);
		expect(r.label).toBe('excellent');
	});
	it('rates W (280°) as good', () => {
		expect(scoreSwellDirection(280).value).toBe(4);
	});
	it('rates S (200°) as poor', () => {
		const r = scoreSwellDirection(200);
		expect(r.value).toBe(1);
		expect(r.label).toBe('poor');
	});
	it('rates NE (60°) as poor', () => {
		expect(scoreSwellDirection(60).value).toBe(2);
	});
});

describe('scoreWindDirection', () => {
	it('rates E-offshore (95°) as excellent', () => {
		const r = scoreWindDirection(95);
		expect(r.value).toBe(5);
		expect(r.label).toBe('excellent');
	});
	it('rates NE side-offshore (60°) as good', () => {
		expect(scoreWindDirection(60).value).toBe(4);
	});
	it('rates W onshore (270°) as poor', () => {
		const r = scoreWindDirection(270);
		expect(r.value).toBe(1);
		expect(r.label).toBe('poor');
	});
});

describe('scoreSwellHeight', () => {
	it('rates 0.8m as excellent', () => {
		expect(scoreSwellHeight(0.8).value).toBe(5);
	});
	it('rates 0.2m as poor (below surfable)', () => {
		expect(scoreSwellHeight(0.2).value).toBe(1);
	});
	it('rates 0.5m as fair', () => {
		expect(scoreSwellHeight(0.5).value).toBe(3);
	});
	it('rates 2.5m as poor (too big)', () => {
		expect(scoreSwellHeight(2.5).value).toBe(1);
	});
});

describe('scoreSwellPeriod', () => {
	it('rates 11s as excellent', () => {
		expect(scoreSwellPeriod(11).value).toBe(5);
	});
	it('rates 9s as good', () => {
		expect(scoreSwellPeriod(9).value).toBe(4);
	});
	it('rates 5s as poor', () => {
		expect(scoreSwellPeriod(5).value).toBe(1);
	});
});

describe('scoreTideState', () => {
	it('rates mid + flooding as excellent', () => {
		expect(scoreTideState('mid', 'flooding').value).toBe(5);
	});
	it('rates mid + ebbing as good', () => {
		expect(scoreTideState('mid', 'ebbing').value).toBe(4);
	});
	it('rates low + flooding as fair', () => {
		expect(scoreTideState('low', 'flooding').value).toBe(3);
	});
	it('rates high + any as poor', () => {
		expect(scoreTideState('high', 'ebbing').value).toBe(1);
	});
});

describe('computeScore', () => {
	it('caps composite at 1 when swellHeight < 0.3m', () => {
		const score = computeScore(makeSlot({ swellHeight: 0.2 }));
		expect(score.composite).toBe(1);
		expect(score.cappedByHeight).toBe(true);
	});

	it('does not cap when swellHeight >= 0.3m', () => {
		const score = computeScore(makeSlot({ swellHeight: 0.8 }));
		expect(score.cappedByHeight).toBe(false);
		expect(score.composite).toBeGreaterThan(1);
	});

	it('applies custom weights correctly', () => {
		const weights = { swellDirection: 1, windDirection: 0, swellHeight: 0, swellPeriod: 0, tideState: 0 };
		const score = computeScore(makeSlot({ swellDirection: 320 }), weights);
		expect(score.composite).toBe(5); // only swell direction, which is 5 * 1.0
	});

	it('returns all five parameter scores', () => {
		const score = computeScore(makeSlot());
		expect(score.parameters.swellDirection).toBeDefined();
		expect(score.parameters.windDirection).toBeDefined();
		expect(score.parameters.swellHeight).toBeDefined();
		expect(score.parameters.swellPeriod).toBeDefined();
		expect(score.parameters.tideState).toBeDefined();
	});
});

describe('findNextBestSession', () => {
	it('returns null when all slots are in the past', () => {
		const past = [makeSlot({ timestamp: new Date(Date.now() - 7200_000).toISOString() })];
		expect(findNextBestSession(past as ForecastSlot[], new Date())).toBeNull();
	});

	it('returns null when all future slots are flat (Hs < 0.3)', () => {
		const flat = Array.from({ length: 5 }, (_, i) =>
			makeSlot({ timestamp: new Date(Date.now() + (i + 1) * 3600_000).toISOString(), swellHeight: 0.1 })
		);
		const scored = flat.map(s => ({ ...s, score: computeScore(s) })) as ForecastSlot[];
		expect(findNextBestSession(scored, new Date())).toBeNull();
	});

	it('finds a best session from valid future slots', () => {
		const slots = Array.from({ length: 6 }, (_, i) => {
			const s = makeSlot({ timestamp: new Date(Date.now() + (i + 1) * 3600_000).toISOString() });
			return { ...s, score: computeScore(s) } as ForecastSlot;
		});
		const result = findNextBestSession(slots, new Date());
		expect(result).not.toBeNull();
		expect(result!.compositeScore).toBeGreaterThanOrEqual(2);
	});
});

describe('computeModelAccuracy', () => {
	it('returns null when fewer than 5 sessions have modelScore', () => {
		const sessions: SessionLog[] = Array.from({ length: 3 }, (_, i) => ({
			id: `${i}`, date: '2026-04-01', startHour: 10, endHour: 12,
			spot: 'Scheveningen', personalRating: 4 as const, notes: '',
			modelScore: 3.5, createdAt: new Date().toISOString()
		}));
		expect(computeModelAccuracy(sessions)).toBeNull();
	});

	it('computes accuracy when 5+ sessions have modelScore', () => {
		const sessions: SessionLog[] = Array.from({ length: 5 }, (_, i) => ({
			id: `${i}`, date: '2026-04-01', startHour: 10, endHour: 12,
			spot: 'Scheveningen', personalRating: (i % 5 + 1) as 1 | 2 | 3 | 4 | 5,
			notes: '', modelScore: (i % 5 + 1), createdAt: new Date().toISOString()
		}));
		const result = computeModelAccuracy(sessions);
		expect(result).not.toBeNull();
		expect(result!.sessionCount).toBe(5);
		expect(result!.correlationScore).toBeCloseTo(1, 1); // perfect correlation
		expect(result!.meanAbsoluteError).toBe(0);
	});
});
