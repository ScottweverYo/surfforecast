import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
	get: vi.fn(),
	set: vi.fn()
}));

// Mock API clients (tide is now sync and always succeeds — mock returns a real array)
vi.mock('../../src/lib/api/marine', () => ({ fetchMarineData: vi.fn() }));
vi.mock('../../src/lib/api/wind', () => ({ fetchWindData: vi.fn() }));
vi.mock('../../src/lib/api/tide', () => ({
	fetchTideData: vi.fn(() => [])  // sync, returns TideSlot[] (default: empty)
}));

import { fetchMarineData } from '../../src/lib/api/marine';
import { fetchWindData } from '../../src/lib/api/wind';
import { fetchTideData } from '../../src/lib/api/tide';
import { fetchForecast } from '../../src/lib/api/forecast';

const mockMarine = vi.mocked(fetchMarineData);
const mockWind = vi.mocked(fetchWindData);
const mockTide = vi.mocked(fetchTideData);

function makeTimestamp(daysOffset: number, hour = 12): string {
	const d = new Date();
	d.setDate(d.getDate() + daysOffset);
	d.setUTCHours(hour, 0, 0, 0);
	return d.toISOString();
}

const marineSlot = (ts: string) => ({
	timestamp: ts,
	swellHeight: 0.8,
	swellPeriod: 10,
	swellDirection: 320,
	windWaveHeight: 0.2,
	windWavePeriod: 4
});

const windSlot = (ts: string) => ({
	timestamp: ts,
	windSpeed: 3,
	windDirection: 95,
	windGusts: 5
});

const tideSlot = (ts: string) => ({
	timestamp: ts,
	tideHeight: 20,
	tideState: 'mid' as const,
	tideDirection: 'flooding' as const
});

beforeEach(() => {
	vi.clearAllMocks();
	mockTide.mockReturnValue([]); // sync default
});

describe('fetchForecast', () => {
	it('returns null when both network sources (marine + wind) fail', async () => {
		mockMarine.mockResolvedValue(null);
		mockWind.mockResolvedValue(null);
		const result = await fetchForecast();
		expect(result).toBeNull();
	});

	it('marks dataSourceStatus.wave as error when marine fails', async () => {
		const ts = makeTimestamp(1);
		mockMarine.mockResolvedValue(null);
		mockWind.mockResolvedValue([windSlot(ts)]);
		mockTide.mockReturnValue([tideSlot(ts)]);
		const result = await fetchForecast();
		expect(result).not.toBeNull();
		expect(result!.dataSourceStatus.wave).toBe('error');
		expect(result!.dataSourceStatus.wind).toBe('ok');
	});

	it('assigns reduced confidence to slots > 7 days from now', async () => {
		const nearTs = makeTimestamp(1);
		const farTs = makeTimestamp(9);
		mockMarine.mockResolvedValue([marineSlot(nearTs), marineSlot(farTs)]);
		mockWind.mockResolvedValue([windSlot(nearTs), windSlot(farTs)]);
		mockTide.mockReturnValue([tideSlot(nearTs), tideSlot(farTs)]);
		const result = await fetchForecast();
		expect(result).not.toBeNull();
		const near = result!.slots.find(s => s.timestamp === nearTs);
		const far = result!.slots.find(s => s.timestamp === farTs);
		expect(near?.confidence).toBe('standard');
		expect(far?.confidence).toBe('reduced');
	});

	it('returns slots sorted ascending by timestamp', async () => {
		const ts1 = makeTimestamp(2);
		const ts2 = makeTimestamp(1);
		mockMarine.mockResolvedValue([marineSlot(ts1), marineSlot(ts2)]);
		mockWind.mockResolvedValue([windSlot(ts1), windSlot(ts2)]);
		const result = await fetchForecast();
		expect(result!.slots[0].timestamp).toBe(ts2);
		expect(result!.slots[1].timestamp).toBe(ts1);
	});

	it('computes a score for each slot', async () => {
		const ts = makeTimestamp(1);
		mockMarine.mockResolvedValue([marineSlot(ts)]);
		mockWind.mockResolvedValue([windSlot(ts)]);
		mockTide.mockReturnValue([tideSlot(ts)]);
		const result = await fetchForecast();
		expect(result!.slots[0].score).toBeDefined();
		expect(result!.slots[0].score.composite).toBeGreaterThan(0);
	});
});
