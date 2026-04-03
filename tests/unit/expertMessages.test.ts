import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock localStorage before importing the store
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => { store[key] = value; },
		removeItem: (key: string) => { delete store[key]; },
		clear: () => { store = {}; }
	};
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(globalThis, 'crypto', {
	value: { randomUUID: () => Math.random().toString(36).slice(2) },
	writable: true
});

// Import after mocks are set up
const { expertMessages, addExpertMessage, updateExpertMessage } = await import(
	'../../src/lib/stores/expertMessages'
);

const RAW_TEXT =
	'Vrijdag heuphoog met zuidwest 4bft offshore. Schev goed tot 10u.';
const REF_DATE_1 = new Date('2026-04-04T12:00:00Z'); // Saturday → "vrijdag" resolves to previous day
const REF_DATE_2 = new Date('2026-03-28T12:00:00Z'); // Saturday a week earlier

describe('updateExpertMessage', () => {
	beforeEach(() => {
		expertMessages.set([]);
		localStorageMock.clear();
	});

	it('preserves the original message id', () => {
		const original = addExpertMessage(RAW_TEXT, REF_DATE_1);
		const updated = updateExpertMessage(original.id, RAW_TEXT, REF_DATE_2);
		expect(updated.id).toBe(original.id);
	});

	it('updates ingestedAt to reflect newDate', () => {
		const original = addExpertMessage(RAW_TEXT, REF_DATE_1);
		const updated = updateExpertMessage(original.id, RAW_TEXT, REF_DATE_2);
		expect(updated.ingestedAt.slice(0, 10)).toBe(REF_DATE_2.toISOString().slice(0, 10));
	});

	it('resolvedDate in timeWindows differs from original when date changes', () => {
		const original = addExpertMessage(RAW_TEXT, REF_DATE_1);
		const originalDates = original.extractions.timeWindows.map((w) => w.resolvedDate);

		const updated = updateExpertMessage(original.id, RAW_TEXT, REF_DATE_2);
		const updatedDates = updated.extractions.timeWindows.map((w) => w.resolvedDate);

		// At least one resolved date should differ
		const anydiff = originalDates.some((d, i) => d !== updatedDates[i]);
		expect(anydiff).toBe(true);
	});

	it('persists updated message to localStorage', () => {
		const original = addExpertMessage(RAW_TEXT, REF_DATE_1);
		updateExpertMessage(original.id, RAW_TEXT, REF_DATE_2);

		const stored = JSON.parse(localStorageMock.getItem('expert_messages') ?? '[]');
		expect(stored[0].id).toBe(original.id);
		expect(stored[0].ingestedAt.slice(0, 10)).toBe(REF_DATE_2.toISOString().slice(0, 10));
	});

	it('throws if id not found', () => {
		expect(() => updateExpertMessage('nonexistent-id', RAW_TEXT, REF_DATE_1)).toThrow();
	});

	it('updates the svelte store', () => {
		const original = addExpertMessage(RAW_TEXT, REF_DATE_1);
		updateExpertMessage(original.id, RAW_TEXT, REF_DATE_2);

		const messages = get(expertMessages);
		expect(messages[0].ingestedAt.slice(0, 10)).toBe(REF_DATE_2.toISOString().slice(0, 10));
	});
});
