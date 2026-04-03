import type { WaveDescriptor, WaveType } from '$lib/types';

const HEIGHT_TERMS: Array<{ pattern: RegExp; hsMin: number; hsMax: number }> = [
	{ pattern: /hoofdhoog/gi, hsMin: 1.2, hsMax: 1.5 },
	{ pattern: /schouderhoog/gi, hsMin: 1.0, hsMax: 1.3 },
	{ pattern: /heuphoog/gi, hsMin: 0.8, hsMax: 1.0 },
	{ pattern: /kniehoog/gi, hsMin: 0.4, hsMax: 0.6 }
];

const NUMERIC = /(\d+[,.]\d+|\d+)\s*(?:à\s*(\d+[,.]\d+|\d+)\s*)?m\b/gi;

function detectWaveType(context: string): WaveType {
	if (/windgolven|windzee|wind\s*golf/i.test(context)) return 'wind_waves';
	if (/swell|gronddeining/i.test(context)) return 'swell';
	return 'unknown';
}

export function extractWaveDescriptors(text: string): WaveDescriptor[] {
	const results: WaveDescriptor[] = [];

	for (const { pattern, hsMin, hsMax } of HEIGHT_TERMS) {
		pattern.lastIndex = 0;
		let m;
		while ((m = pattern.exec(text)) !== null) {
			const context = text.slice(Math.max(0, m.index - 30), m.index + 50);
			results.push({
				raw: m[0],
				hsMin,
				hsMax,
				waveType: detectWaveType(context)
			});
		}
	}

	// Numeric patterns: "0.5m", "1-1.5m", "0,5m"
	NUMERIC.lastIndex = 0;
	let nm;
	while ((nm = NUMERIC.exec(text)) !== null) {
		const v1 = parseFloat(nm[1].replace(',', '.'));
		const v2 = nm[2] ? parseFloat(nm[2].replace(',', '.')) : v1;
		if (v1 > 0 && v1 < 10) {
			const context = text.slice(Math.max(0, nm.index - 30), nm.index + 30);
			results.push({
				raw: nm[0],
				hsMin: Math.min(v1, v2),
				hsMax: Math.max(v1, v2),
				waveType: detectWaveType(context)
			});
		}
	}

	return results;
}
