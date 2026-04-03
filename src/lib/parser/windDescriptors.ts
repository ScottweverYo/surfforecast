import type { WindDescriptor } from '$lib/types';

const DIR_TO_DEGREES: Record<string, number> = {
	n: 0, nno: 22, no: 45, ono: 67, o: 90, ozo: 112, zo: 135, zzo: 157,
	z: 180, zzw: 202, zw: 225, wzw: 247, w: 270, wnw: 292, nw: 315, nnw: 337,
	noord: 0, oost: 90, west: 270,
	zu: 180 // aliases
};

function qualityFromDegrees(deg: number): WindDescriptor['quality'] {
	if (deg >= 80 && deg <= 120) return 'offshore';
	if ((deg >= 45 && deg < 80) || (deg > 120 && deg <= 160)) return 'side-offshore';
	return 'onshore';
}

export function extractWindDescriptors(text: string): WindDescriptor[] {
	const results: WindDescriptor[] = [];

	// Match "N 4bft", "Z 5 bft", "zuidwest 3bft", "offshore", "onshore", "zij-offshore"
	const bftPattern = /(\d+)\s*bft/gi;
	const dirPattern = /\b(n|nno|no|ono|o|ozo|zo|zzo|z|zzw|zw|wzw|w|wnw|nw|nnw|noord|oost|west|zu(?:id)?(?:west|oost)?|bezui(?:den)?)\b/gi;
	const qualityTerms = [
		{ re: /\boffshore\b/gi, quality: 'offshore' as const },
		{ re: /\bzij-?offshore\b|\bside-?off\b/gi, quality: 'side-offshore' as const },
		{ re: /\bonshore\b/gi, quality: 'onshore' as const }
	];

	// Find Beaufort mentions with surrounding context
	let bm;
	bftPattern.lastIndex = 0;
	while ((bm = bftPattern.exec(text)) !== null) {
		const beaufort = parseInt(bm[1]);
		const context = text.slice(Math.max(0, bm.index - 40), bm.index);

		// Look for direction in context before bft
		let dirDeg: number | null = null;
		let quality: WindDescriptor['quality'] = 'unknown';
		dirPattern.lastIndex = 0;
		let dm;
		while ((dm = dirPattern.exec(context)) !== null) {
			const key = dm[1].toLowerCase();
			if (key in DIR_TO_DEGREES) {
				dirDeg = DIR_TO_DEGREES[key];
				quality = qualityFromDegrees(dirDeg);
			}
		}

		// Check for quality keywords in context
		for (const { re, quality: q } of qualityTerms) {
			re.lastIndex = 0;
			if (re.test(context)) { quality = q; break; }
		}

		results.push({ raw: bm[0], directionDegrees: dirDeg, beaufort, quality });
	}

	// Standalone quality keywords without bft
	for (const { re, quality } of qualityTerms) {
		re.lastIndex = 0;
		let qm;
		while ((qm = re.exec(text)) !== null) {
			const alreadyCovered = results.some(
				(r) =>
					r.quality === quality &&
					Math.abs(text.indexOf(r.raw) - qm!.index) < 50
			);
			if (!alreadyCovered) {
				results.push({ raw: qm[0], directionDegrees: null, beaufort: null, quality });
			}
		}
	}

	return results;
}
