import type { TimeWindowExtraction } from '$lib/types';

const DAY_NAMES: Record<string, number> = {
	maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4,
	vrijdag: 5, zaterdag: 6, zondag: 0
};

function resolveDate(dayName: string, ingestedAt: Date): string {
	const targetDay = DAY_NAMES[dayName.toLowerCase()];
	if (targetDay === undefined) return ingestedAt.toISOString().slice(0, 10);

	const d = new Date(ingestedAt);
	const currentDay = d.getDay();
	let diff = targetDay - currentDay;
	if (diff < 0) diff += 7;
	d.setDate(d.getDate() + diff);
	return d.toISOString().slice(0, 10);
}

export function extractTimeWindows(text: string, ingestedAt: Date): TimeWindowExtraction[] {
	const results: TimeWindowExtraction[] = [];

	// Match Dutch day names followed by optional time ranges (up to 600 chars, stop at next day name or paragraph)
	const dayPattern = new RegExp(
		`(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\\b([^\\n]{0,600})`,
		'gi'
	);

	// Time range pattern: "17-20u", "17:00-20:00", "7-8u", "17u"
	const timePattern = /(\d{1,2})(?:[:h](\d{2}))?[\s\-–]*(?:tot\s*)?(\d{1,2})(?:[:h](\d{2}))?\s*u?\b/g;

	let dayMatch;
	while ((dayMatch = dayPattern.exec(text)) !== null) {
		const dayRef = dayMatch[1];
		const context = dayMatch[2] ?? '';
		const resolvedDate = resolveDate(dayRef, ingestedAt);

		let timeMatch;
		timePattern.lastIndex = 0;
		const timesFound: Array<{ start: number; end: number; raw: string }> = [];

		while ((timeMatch = timePattern.exec(context)) !== null) {
			const startH = parseInt(timeMatch[1]);
			const endH = parseInt(timeMatch[3]);
			if (startH >= 0 && startH <= 23 && endH >= 0 && endH <= 23 && endH > startH) {
				timesFound.push({ start: startH, end: endH, raw: timeMatch[0].trim() });
			}
		}

		if (timesFound.length > 0) {
			for (const t of timesFound) {
				results.push({
					dayReference: dayRef.toLowerCase(),
					resolvedDate,
					startHour: t.start,
					endHour: t.end,
					rawText: `${dayRef} ${t.raw}`
				});
			}
		} else {
			results.push({
				dayReference: dayRef.toLowerCase(),
				resolvedDate,
				startHour: null,
				endHour: null,
				rawText: dayRef
			});
		}
	}

	return results;
}
