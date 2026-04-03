import type { TideDescriptor, TideState, TideDirection } from '$lib/types';

const TIDE_TERMS: Array<{
	pattern: RegExp;
	state: TideState | null;
	direction: TideDirection | null;
}> = [
	{ pattern: /\blaagtij\b/gi, state: 'low', direction: null },
	{ pattern: /\bhoogwater\b|\bHW\b/g, state: 'high', direction: null },
	{ pattern: /\bhoogtij\b/gi, state: 'high', direction: null },
	{ pattern: /\bmid-?tij\b/gi, state: 'mid', direction: null },
	{ pattern: /\bopkomend\b/gi, state: null, direction: 'flooding' },
	{ pattern: /\bafgaand\b/gi, state: null, direction: 'ebbing' },
	{ pattern: /\bebbe\b/gi, state: null, direction: 'ebbing' },
	{ pattern: /\bvloed\b/gi, state: null, direction: 'flooding' }
];

export function extractTideDescriptors(text: string): TideDescriptor[] {
	const results: TideDescriptor[] = [];

	for (const { pattern, state, direction } of TIDE_TERMS) {
		pattern.lastIndex = 0;
		let m;
		while ((m = pattern.exec(text)) !== null) {
			results.push({ raw: m[0], state, direction });
		}
	}

	return results;
}
