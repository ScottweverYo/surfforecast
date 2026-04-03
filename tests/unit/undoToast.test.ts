import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { undoToast, showUndoToast, clearUndoToast } from '../../src/lib/stores/undoToast';

beforeEach(() => {
	undoToast.set(null);
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('showUndoToast', () => {
	it('sets store with correct expertMessageId', () => {
		showUndoToast('msg-123');
		const state = get(undoToast);
		expect(state).not.toBeNull();
		expect(state!.expertMessageId).toBe('msg-123');
	});

	it('sets a non-null id on the toast', () => {
		showUndoToast('msg-abc');
		const state = get(undoToast);
		expect(state!.id).toBeTruthy();
	});

	it('timeoutId starts as null (component sets it)', () => {
		showUndoToast('msg-xyz');
		const state = get(undoToast);
		expect(state!.timeoutId).toBeNull();
	});

	it('replaces existing toast and clears old timeout', () => {
		showUndoToast('msg-1');

		// Simulate a stored timeoutId
		const fakeTimeout = setTimeout(() => {}, 9999);
		undoToast.update((t) => (t ? { ...t, timeoutId: fakeTimeout } : null));

		showUndoToast('msg-2');

		const state = get(undoToast);
		expect(state!.expertMessageId).toBe('msg-2');
	});
});

describe('clearUndoToast', () => {
	it('sets store to null', () => {
		showUndoToast('msg-abc');
		clearUndoToast();
		expect(get(undoToast)).toBeNull();
	});

	it('cancels stored timeout when clearing', () => {
		const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
		showUndoToast('msg-abc');

		const fakeTimeout = setTimeout(() => {}, 9999);
		undoToast.update((t) => (t ? { ...t, timeoutId: fakeTimeout } : null));

		clearUndoToast();
		expect(clearSpy).toHaveBeenCalled();
	});
});
