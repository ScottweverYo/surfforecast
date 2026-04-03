import { writable, get } from 'svelte/store';
import { forecast } from '$lib/stores/forecast';
import { computeModelAccuracy } from '$lib/scoring/index';
import type { SessionLog, ModelAccuracy } from '$lib/types';

const STORAGE_KEY = 'session_logs';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadFromStorage(): SessionLog[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		return JSON.parse(raw) as SessionLog[];
	} catch {
		return [];
	}
}

function saveToStorage(logs: SessionLog[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
	} catch {
		// Quota exceeded or storage unavailable — fail silently.
	}
}

/**
 * Find the forecast slot whose timestamp is closest to the given ISO target.
 * Returns the slot or undefined if no forecast is loaded.
 */
function findClosestSlot(targetISO: string) {
	const cache = get(forecast);
	if (!cache || cache.slots.length === 0) return undefined;

	const targetMs = new Date(targetISO).getTime();
	return cache.slots.reduce((best, slot) => {
		const slotMs = new Date(slot.timestamp).getTime();
		const bestMs = new Date(best.timestamp).getTime();
		return Math.abs(slotMs - targetMs) < Math.abs(bestMs - targetMs) ? slot : best;
	});
}

/**
 * Recompute model accuracy and update the store.
 * computeModelAccuracy returns null when there are fewer than 5 valid sessions.
 */
function refreshAccuracy(logs: SessionLog[]): void {
	const result = computeModelAccuracy(logs);
	modelAccuracy.set(result);
}

// ─── Stores ───────────────────────────────────────────────────────────────────

export const sessions = writable<SessionLog[]>([]);
export const modelAccuracy = writable<ModelAccuracy | null>(null);

// ─── Module init (browser only) ───────────────────────────────────────────────

if (typeof window !== 'undefined') {
	const initial = loadFromStorage();
	sessions.set(initial);

	const withScore = initial.filter((s) => s.modelScore !== null);
	if (withScore.length >= 5) {
		refreshAccuracy(initial);
	}
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Add a new session log entry.
 * The caller provides every field except `id`, `modelScore`, and `createdAt`.
 */
export function addSession(
	entry: Omit<SessionLog, 'id' | 'modelScore' | 'createdAt'>
): SessionLog {
	// Build the ISO timestamp to search against: date + startHour (UTC noon of that hour).
	const targetISO = new Date(
		`${entry.date}T${String(entry.startHour).padStart(2, '0')}:00:00.000Z`
	).toISOString();

	const slot = findClosestSlot(targetISO);
	const modelScore = slot ? slot.score.composite : null;

	const newLog: SessionLog = {
		...entry,
		id: crypto.randomUUID(),
		modelScore,
		createdAt: new Date().toISOString()
	};

	sessions.update((current) => {
		const updated = [...current, newLog];
		saveToStorage(updated);

		const withScore = updated.filter((s) => s.modelScore !== null);
		if (withScore.length >= 5) {
			refreshAccuracy(updated);
		}

		return updated;
	});

	return newLog;
}

/** Remove a single session by id. */
export function removeSession(id: string): void {
	sessions.update((current) => {
		const updated = current.filter((s) => s.id !== id);
		saveToStorage(updated);
		refreshAccuracy(updated);
		return updated;
	});
}

/** Wipe all sessions and reset accuracy. */
export function clearSessions(): void {
	sessions.set([]);
	modelAccuracy.set(null);
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Storage unavailable — fail silently.
	}
}
