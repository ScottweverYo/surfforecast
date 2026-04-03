import type { ExpertMessage } from '$lib/types';
import { detectSpots } from './spots';
import { extractTimeWindows } from './timeWindows';
import { extractWaveDescriptors } from './waveDescriptors';
import { extractWindDescriptors } from './windDescriptors';
import { extractTideDescriptors } from './tideDescriptors';

function uuid(): string {
	return crypto.randomUUID();
}

export function parseDutchForecast(rawText: string, ingestedAt: Date = new Date()): ExpertMessage {
	const spots = detectSpots(rawText);
	const timeWindows = extractTimeWindows(rawText, ingestedAt);
	const waveDescriptors = extractWaveDescriptors(rawText);
	const windDescriptors = extractWindDescriptors(rawText);
	const tideDescriptors = extractTideDescriptors(rawText);

	return {
		id: uuid(),
		rawText,
		ingestedAt: ingestedAt.toISOString(),
		extractions: { spots, timeWindows, waveDescriptors, windDescriptors, tideDescriptors },
		comparison: [], // populated by expertMessages store after fetch
		previousVersionId: null
	};
}
