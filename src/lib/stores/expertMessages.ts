import { writable, get } from 'svelte/store';
import type {
	ExpertMessage,
	DivergenceRecord,
	DivergenceLevel,
	ForecastSlot,
	TimeWindowExtraction,
	WaveDescriptor
} from '$lib/types';
import { parseDutchForecast } from '$lib/parser/index';
import { forecast } from '$lib/stores/forecast';

const LS_KEY = 'expert_messages';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uuid(): string {
	return crypto.randomUUID();
}

function loadFromStorage(): ExpertMessage[] {
	try {
		const raw = localStorage.getItem(LS_KEY);
		if (!raw) return [];
		return JSON.parse(raw) as ExpertMessage[];
	} catch {
		return [];
	}
}

function saveToStorage(messages: ExpertMessage[]): void {
	try {
		localStorage.setItem(LS_KEY, JSON.stringify(messages));
	} catch {
		// Silently ignore storage errors (quota exceeded, private browsing, etc.)
	}
}

// ─── Divergence computation ───────────────────────────────────────────────────

function divergenceLevel(diff: number): DivergenceLevel {
	if (diff <= 0.5) return 'agreement';
	if (diff < 2) return 'minor';
	return 'significant';
}

/**
 * Resolve a TimeWindowExtraction to a target UTC timestamp (ms) for slot
 * matching. Uses resolvedDate + startHour (hours offset from midnight local).
 */
function windowToTimestamp(tw: TimeWindowExtraction): number | null {
	if (!tw.resolvedDate || tw.startHour === null) return null;
	// resolvedDate is an ISO date string (YYYY-MM-DD). Treat as UTC midnight.
	const base = new Date(`${tw.resolvedDate}T00:00:00Z`);
	base.setUTCHours(tw.startHour);
	return base.getTime();
}

/**
 * Find the forecast slot whose timestamp is nearest to targetMs.
 * Returns null when no slots exist or the nearest slot is more than 3 hours away.
 */
function nearestSlot(slots: ForecastSlot[], targetMs: number): ForecastSlot | null {
	const MAX_GAP_MS = 3 * 60 * 60 * 1000; // 3 hours
	let best: ForecastSlot | null = null;
	let bestGap = Infinity;

	for (const slot of slots) {
		const gap = Math.abs(new Date(slot.timestamp).getTime() - targetMs);
		if (gap < bestGap) {
			bestGap = gap;
			best = slot;
		}
	}

	return best !== null && bestGap <= MAX_GAP_MS ? best : null;
}

function buildDivergenceRecords(
	messageId: string,
	waveDescriptors: WaveDescriptor[],
	timeWindows: TimeWindowExtraction[],
	slots: ForecastSlot[]
): DivergenceRecord[] {
	if (waveDescriptors.length === 0 || slots.length === 0) return [];

	// Use the first time window for slot matching (if any).
	const firstWindow: TimeWindowExtraction | null = timeWindows.length > 0 ? timeWindows[0] : null;
	const targetMs = firstWindow !== null ? windowToTimestamp(firstWindow) : null;

	const records: DivergenceRecord[] = [];

	for (const wd of waveDescriptors) {
		const expertMidpoint = (wd.hsMin + wd.hsMax) / 2;

		if (targetMs === null) {
			// No time window — cannot match a slot; skip this descriptor.
			continue;
		}

		// firstWindow is guaranteed non-null when targetMs is non-null.
		const fw = firstWindow as TimeWindowExtraction;

		const slot = nearestSlot(slots, targetMs);

		const timeWindowRange =
			fw.startHour !== null && fw.endHour !== null
				? { start: fw.startHour, end: fw.endHour }
				: null;

		if (slot === null) {
			// No slot close enough — record as no_model_data.
			records.push({
				id: uuid(),
				expertMessageId: messageId,
				resolvedDate: fw.resolvedDate,
				timeWindow: timeWindowRange,
				expertClaim: {
					description: wd.raw,
					impliedScore: expertMidpoint
				},
				modelPrediction: {
					meanScore: 0,
					slotCount: 0
				},
				divergence: 'no_model_data',
				createdAt: new Date().toISOString()
			});
			continue;
		}

		const modelValue = slot.swellHeight;
		const diff = Math.abs(expertMidpoint - modelValue);
		const level = divergenceLevel(diff);

		records.push({
			id: uuid(),
			expertMessageId: messageId,
			resolvedDate: fw.resolvedDate,
			timeWindow: timeWindowRange,
			expertClaim: {
				description: wd.raw,
				impliedScore: expertMidpoint
			},
			modelPrediction: {
				meanScore: modelValue,
				slotCount: 1
			},
			divergence: level,
			createdAt: new Date().toISOString()
		});
	}

	return records;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const expertMessages = writable<ExpertMessage[]>([]);

// Load from localStorage on module init (browser only).
if (typeof window !== 'undefined') {
	expertMessages.set(loadFromStorage());
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export function addExpertMessage(rawText: string, ingestedAt: Date = new Date()): ExpertMessage {
	// Parse the raw text into an ExpertMessage skeleton.
	const parsed = parseDutchForecast(rawText, ingestedAt);

	// Check for a prior version with identical trimmed text.
	const current = get(expertMessages);
	const trimmed = rawText.trim();
	const existing = current.find((m) => m.rawText.trim() === trimmed);
	const previousVersionId = existing?.id ?? null;

	// Compute divergence against the current forecast store.
	const forecastCache = get(forecast);
	const slots = forecastCache?.slots ?? [];
	const comparison = buildDivergenceRecords(
		parsed.id,
		parsed.extractions.waveDescriptors,
		parsed.extractions.timeWindows,
		slots
	);

	const message: ExpertMessage = {
		...parsed,
		previousVersionId,
		comparison
	};

	// Persist to store and localStorage.
	const updated = [message, ...current];
	expertMessages.set(updated);
	saveToStorage(updated);

	return message;
}

export function removeExpertMessage(id: string): void {
	expertMessages.update((messages) => {
		const updated = messages.filter((m) => m.id !== id);
		saveToStorage(updated);
		return updated;
	});
}

export function clearExpertMessages(): void {
	expertMessages.set([]);
	saveToStorage([]);
}

export function updateExpertMessage(id: string, rawText: string, newDate: Date): ExpertMessage {
	const current = get(expertMessages);
	const index = current.findIndex((m) => m.id === id);
	if (index === -1) throw new Error(`Expert message not found: ${id}`);

	const existing = current[index];
	const parsed = parseDutchForecast(rawText, newDate);

	const forecastCache = get(forecast);
	const slots = forecastCache?.slots ?? [];
	const comparison = buildDivergenceRecords(
		id,
		parsed.extractions.waveDescriptors,
		parsed.extractions.timeWindows,
		slots
	);

	const updated: ExpertMessage = {
		...parsed,
		id,
		ingestedAt: newDate.toISOString(),
		previousVersionId: existing.previousVersionId,
		comparison
	};

	const updatedMessages = [...current];
	updatedMessages[index] = updated;
	expertMessages.set(updatedMessages);
	saveToStorage(updatedMessages);

	return updated;
}
