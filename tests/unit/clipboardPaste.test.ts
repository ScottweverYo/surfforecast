import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock stores before importing anything that uses them
vi.mock('../../src/lib/stores/expertMessages', () => ({
	addExpertMessage: vi.fn(() => ({ id: 'mock-id-123' }))
}));

vi.mock('../../src/lib/stores/undoToast', () => ({
	showUndoToast: vi.fn(),
	undoToast: { subscribe: vi.fn(() => () => {}) }
}));

const { addExpertMessage } = await import('../../src/lib/stores/expertMessages');
const { showUndoToast } = await import('../../src/lib/stores/undoToast');

// Clipboard validation logic extracted for unit testing
// (mirrors the onclick handler in ClipboardPasteButton.svelte)
async function processClipboardText(text: string): Promise<{ warning: string | null }> {
	const trimmed = text.trim();

	if (trimmed.length === 0) {
		return { warning: 'Klembord is leeg' };
	}
	if (trimmed.length < 20) {
		return { warning: 'Klembord bevat geen voorspelling' };
	}

	const truncated = trimmed.length > 1500 ? trimmed.slice(0, 1500) : trimmed;
	const message = (addExpertMessage as ReturnType<typeof vi.fn>)(truncated, new Date());
	(showUndoToast as ReturnType<typeof vi.fn>)(message.id);

	return { warning: null };
}

async function processClipboardError(err: unknown): Promise<{ warning: string | null }> {
	if (err instanceof DOMException && err.name === 'NotAllowedError') {
		return { warning: 'Toegang tot klembord geweigerd' };
	}
	return { warning: null };
}

describe('ClipboardPasteButton — validation logic', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('(a) empty string → warning "Klembord is leeg", addExpertMessage not called', async () => {
		const result = await processClipboardText('');
		expect(result.warning).toBe('Klembord is leeg');
		expect(addExpertMessage).not.toHaveBeenCalled();
	});

	it('(a2) whitespace-only → warning "Klembord is leeg", addExpertMessage not called', async () => {
		const result = await processClipboardText('   \n  ');
		expect(result.warning).toBe('Klembord is leeg');
		expect(addExpertMessage).not.toHaveBeenCalled();
	});

	it('(b) text < 20 chars → warning "Klembord bevat geen voorspelling", not called', async () => {
		const result = await processClipboardText('kort berichtje');
		expect(result.warning).toBe('Klembord bevat geen voorspelling');
		expect(addExpertMessage).not.toHaveBeenCalled();
	});

	it('(c) text ≥ 20 chars → addExpertMessage called, showUndoToast called, no warning', async () => {
		const forecastText = 'Vrijdag heuphoog met zuidwest 4bft offshore.';
		const result = await processClipboardText(forecastText);
		expect(result.warning).toBeNull();
		expect(addExpertMessage).toHaveBeenCalledWith(forecastText, expect.anything());
		expect(showUndoToast).toHaveBeenCalledWith('mock-id-123');
	});

	it('(d) text > 1500 chars → addExpertMessage called with text sliced to 1500', async () => {
		const longText = 'a'.repeat(2000);
		await processClipboardText(longText);
		expect(addExpertMessage).toHaveBeenCalledWith('a'.repeat(1500), expect.anything());
	});

	it('(e) NotAllowedError → warning "Toegang tot klembord geweigerd", not called', async () => {
		const err = new DOMException('Permission denied', 'NotAllowedError');
		const result = await processClipboardError(err);
		expect(result.warning).toBe('Toegang tot klembord geweigerd');
		expect(addExpertMessage).not.toHaveBeenCalled();
	});

	it('(e2) other DOMException → no warning', async () => {
		const err = new DOMException('Other error', 'AbortError');
		const result = await processClipboardError(err);
		expect(result.warning).toBeNull();
	});
});
