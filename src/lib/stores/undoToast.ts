import { writable, get } from 'svelte/store';

export interface UndoToastState {
	id: string;
	expertMessageId: string;
	timeoutId: ReturnType<typeof setTimeout> | null;
}

export const undoToast = writable<UndoToastState | null>(null);

export function showUndoToast(expertMessageId: string): void {
	// Cancel any existing toast timeout before replacing.
	const current = get(undoToast);
	if (current?.timeoutId !== null && current?.timeoutId !== undefined) {
		clearTimeout(current.timeoutId);
	}

	undoToast.set({
		id: crypto.randomUUID(),
		expertMessageId,
		timeoutId: null
	});
}

export function clearUndoToast(): void {
	const current = get(undoToast);
	if (current?.timeoutId !== null && current?.timeoutId !== undefined) {
		clearTimeout(current.timeoutId);
	}
	undoToast.set(null);
}
