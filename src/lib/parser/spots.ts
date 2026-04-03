import type { SpotMention } from '$lib/types';

const SPOT_MAP: Record<string, { resolved: string; isScheveningen: boolean }> = {
	schev: { resolved: 'Scheveningen', isScheveningen: true },
	'z-h': { resolved: 'Zuid-Holland', isScheveningen: true },
	zh: { resolved: 'Zuid-Holland', isScheveningen: true },
	'n-h': { resolved: 'Noord-Holland', isScheveningen: false },
	nh: { resolved: 'Noord-Holland', isScheveningen: false },
	hvh: { resolved: 'Hoek van Holland', isScheveningen: false },
	zvoort: { resolved: 'Zandvoort', isScheveningen: false },
	zandvoort: { resolved: 'Zandvoort', isScheveningen: false },
	egmond: { resolved: 'Egmond', isScheveningen: false },
	wijk: { resolved: 'Wijk aan Zee', isScheveningen: false },
	zeeland: { resolved: 'Zeeland', isScheveningen: false },
	wadden: { resolved: 'Waddeneilanden', isScheveningen: false }
};

export function detectSpots(text: string): SpotMention[] {
	const lower = text.toLowerCase();
	const found: SpotMention[] = [];
	const seen = new Set<string>();

	for (const [raw, info] of Object.entries(SPOT_MAP)) {
		// Use word-boundary-ish matching
		const pattern = new RegExp(`(?<![a-z])${raw}(?![a-z])`, 'gi');
		if (pattern.test(lower) && !seen.has(info.resolved)) {
			seen.add(info.resolved);
			found.push({ raw, resolved: info.resolved, isScheveningen: info.isScheveningen });
		}
	}

	return found;
}
