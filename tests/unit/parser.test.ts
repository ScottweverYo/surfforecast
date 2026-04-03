import { describe, it, expect } from 'vitest';
import { parseDutchForecast } from '../../src/lib/parser/index';
import { detectSpots } from '../../src/lib/parser/spots';
import { extractTimeWindows } from '../../src/lib/parser/timeWindows';
import { extractWaveDescriptors } from '../../src/lib/parser/waveDescriptors';
import { extractWindDescriptors } from '../../src/lib/parser/windDescriptors';
import { extractTideDescriptors } from '../../src/lib/parser/tideDescriptors';

// Appendix C example message from spec.md
const APPENDIX_C = `Korte Samenvatting: vrijdag eerst swell, maar bijna (te) snel gaat het over in windgolven. Zaterdag minder wind en begint met 0,5m golven die steeds kleiner worden. Heel laat op de dag verschijnt er in N-H en wadden een nieuwe WNW swell. Zondag WZW windgolven met minder wind einde middag (in zuiden betere golven in de ochtend). Maandag alerts voor Z-H de hele dag, in het noorden in de middag pas mooi clean. Zeeland wat minder gunstig, vanaf 16u nog wel leuke lijntjes. BE idem, nog iets kleiner. Dinsdag ook swell uit NW, super op de wadden en in N-H en deels Z-H ook nog heuphoog.

Detailbericht voor vrijdag: Eerste licht 7-8u nog mooi in N-H heuphoog met zuid 4bft offshore. Rond Egmond en Zvoort al snel te side en toenemende naar 5bft wind. Wijk langer goed te doen tot 10u mid-tij. Ook Z-H langer goed, vooral rond schev en hvh. In Z-H komt afgaand te laat, wel nog goed op schev van 17-20u.`;

// Reference date: a Wednesday so "vrijdag" resolves to the coming Friday
const REF_DATE = new Date('2026-04-01T09:00:00Z'); // Wednesday

describe('detectSpots', () => {
	it('detects schev as Scheveningen (isScheveningen: true)', () => {
		const spots = detectSpots(APPENDIX_C);
		const schev = spots.find(s => s.resolved === 'Scheveningen');
		expect(schev).toBeDefined();
		expect(schev!.isScheveningen).toBe(true);
	});

	it('detects Z-H as Zuid-Holland (isScheveningen: true)', () => {
		const spots = detectSpots(APPENDIX_C);
		const zh = spots.find(s => s.resolved === 'Zuid-Holland');
		expect(zh).toBeDefined();
		expect(zh!.isScheveningen).toBe(true);
	});

	it('detects N-H as Noord-Holland (isScheveningen: false)', () => {
		const spots = detectSpots(APPENDIX_C);
		const nh = spots.find(s => s.resolved === 'Noord-Holland');
		expect(nh).toBeDefined();
		expect(nh!.isScheveningen).toBe(false);
	});

	it('returns empty array for text with no known spots', () => {
		expect(detectSpots('Geen specifieke locaties vermeld.')).toHaveLength(0);
	});
});

describe('extractTimeWindows', () => {
	it('extracts vrijdag 17–20u window', () => {
		const windows = extractTimeWindows(APPENDIX_C, REF_DATE);
		const friday17 = windows.find(w => w.dayReference === 'vrijdag' && w.startHour === 17 && w.endHour === 20);
		expect(friday17).toBeDefined();
	});

	it('resolves dag names to absolute dates', () => {
		const windows = extractTimeWindows(APPENDIX_C, REF_DATE);
		const friday = windows.find(w => w.dayReference === 'vrijdag');
		expect(friday).toBeDefined();
		// Should resolve to 2026-04-03 (Friday after Wednesday 2026-04-01)
		expect(friday!.resolvedDate).toBe('2026-04-03');
	});

	it('extracts vrijdag 7–8u window', () => {
		const windows = extractTimeWindows(APPENDIX_C, REF_DATE);
		const friday7 = windows.find(w => w.dayReference === 'vrijdag' && w.startHour === 7 && w.endHour === 8);
		expect(friday7).toBeDefined();
	});
});

describe('extractWaveDescriptors', () => {
	it('extracts heuphoog with correct Hs range', () => {
		const descs = extractWaveDescriptors(APPENDIX_C);
		const heup = descs.find(d => /heuphoog/i.test(d.raw));
		expect(heup).toBeDefined();
		expect(heup!.hsMin).toBe(0.8);
		expect(heup!.hsMax).toBe(1.0);
	});

	it('extracts numeric 0.5m wave', () => {
		const descs = extractWaveDescriptors(APPENDIX_C);
		const half = descs.find(d => d.hsMin <= 0.5 && d.hsMax >= 0.5);
		expect(half).toBeDefined();
	});

	it('detects windgolven wave type', () => {
		const descs = extractWaveDescriptors('WZW windgolven 0.8m');
		const ww = descs.find(d => d.waveType === 'wind_waves');
		expect(ww).toBeDefined();
	});
});

describe('extractWindDescriptors', () => {
	it('extracts 4 Bft', () => {
		const descs = extractWindDescriptors(APPENDIX_C);
		const bft4 = descs.find(d => d.beaufort === 4);
		expect(bft4).toBeDefined();
	});

	it('extracts 5 Bft', () => {
		const descs = extractWindDescriptors(APPENDIX_C);
		const bft5 = descs.find(d => d.beaufort === 5);
		expect(bft5).toBeDefined();
	});

	it('extracts offshore quality', () => {
		const descs = extractWindDescriptors(APPENDIX_C);
		const offshore = descs.find(d => d.quality === 'offshore');
		expect(offshore).toBeDefined();
	});
});

describe('extractTideDescriptors', () => {
	it('extracts afgaand as ebbing', () => {
		const descs = extractTideDescriptors(APPENDIX_C);
		const afgaand = descs.find(d => d.raw.toLowerCase() === 'afgaand');
		expect(afgaand).toBeDefined();
		expect(afgaand!.direction).toBe('ebbing');
	});

	it('extracts mid-tij as mid state', () => {
		const descs = extractTideDescriptors(APPENDIX_C);
		const midtij = descs.find(d => /mid-?tij/i.test(d.raw));
		expect(midtij).toBeDefined();
		expect(midtij!.state).toBe('mid');
	});
});

describe('parseDutchForecast (integration)', () => {
	it('returns ExpertMessage with id and ingestedAt', () => {
		const msg = parseDutchForecast(APPENDIX_C, REF_DATE);
		expect(msg.id).toBeTruthy();
		expect(msg.ingestedAt).toBe(REF_DATE.toISOString());
		expect(msg.rawText).toBe(APPENDIX_C);
	});

	it('returns at least one Scheveningen spot', () => {
		const msg = parseDutchForecast(APPENDIX_C, REF_DATE);
		const schev = msg.extractions.spots.some(s => s.isScheveningen);
		expect(schev).toBe(true);
	});

	it('extracts at least 4 of 5 parameter types', () => {
		const msg = parseDutchForecast(APPENDIX_C, REF_DATE);
		const hasSpots = msg.extractions.spots.length > 0;
		const hasWindows = msg.extractions.timeWindows.length > 0;
		const hasWaves = msg.extractions.waveDescriptors.length > 0;
		const hasWind = msg.extractions.windDescriptors.length > 0;
		const hasTide = msg.extractions.tideDescriptors.length > 0;
		const count = [hasSpots, hasWindows, hasWaves, hasWind, hasTide].filter(Boolean).length;
		expect(count).toBeGreaterThanOrEqual(4); // SC-004
	});

	it('returns empty comparison array (populated by store)', () => {
		const msg = parseDutchForecast(APPENDIX_C, REF_DATE);
		expect(msg.comparison).toHaveLength(0);
		expect(msg.previousVersionId).toBeNull();
	});

	it('handles text with no Scheveningen data gracefully', () => {
		const msg = parseDutchForecast('Zeeland prima, geen bijzonderheden in het noorden.', REF_DATE);
		// No scheveningen-related spots mentioned
		const scheveSpots = msg.extractions.spots.filter(s => s.isScheveningen);
		expect(scheveSpots).toHaveLength(0);
	});
});
