<script lang="ts">
	import { addExpertMessage } from '$lib/stores/expertMessages';
	import { extractTimeWindows } from '$lib/parser/timeWindows';

	let { onAdded }: { onAdded?: () => void } = $props();

	const todayISO = new Date().toISOString().slice(0, 10);

	let rawText = $state('');
	let refDate = $state(todayISO);
	let isSubmitting = $state(false);
	let error = $state('');

	// Preview resolved day names as the user types/changes date
	const resolvedDays = $derived.by(() => {
		if (!rawText.trim() || !refDate) return [];
		try {
			const date = new Date(refDate + 'T12:00:00');
			const windows = extractTimeWindows(rawText, date);
			// Deduplicate by dayReference
			const seen = new Set<string>();
			return windows
				.filter(w => { if (seen.has(w.dayReference)) return false; seen.add(w.dayReference); return true; })
				.map(w => ({ day: w.dayReference, date: w.resolvedDate }));
		} catch {
			return [];
		}
	});

	function handleSubmit() {
		const trimmed = rawText.trim();
		if (!trimmed) { error = 'Plak hier een voorspellingstekst'; return; }
		if (!refDate)  { error = 'Kies een referentiedatum'; return; }
		isSubmitting = true;
		error = '';
		try {
			addExpertMessage(trimmed, new Date(refDate + 'T12:00:00'));
			rawText = '';
			refDate = todayISO;
			onAdded?.();
		} catch {
			error = 'Kon bericht niet verwerken';
		} finally {
			isSubmitting = false;
		}
	}

	function fmtDate(iso: string): string {
		return new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
			.format(new Date(iso + 'T12:00:00'));
	}
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="paste-form">
	<label for="forecast-text" class="paste-label">Expert voorspelling plakken</label>
	<textarea
		id="forecast-text"
		class="paste-textarea"
		bind:value={rawText}
		rows={8}
		placeholder="Plak hier de tekst van de expert forecast…"
		disabled={isSubmitting}
	></textarea>

	<div class="ref-date-row">
		<label for="ref-date" class="ref-date-label">
			Geschreven op
			<span class="hint">(daagnamen worden hierop afgestemd)</span>
		</label>
		<input
			id="ref-date"
			type="date"
			class="ref-date-input"
			bind:value={refDate}
			max={todayISO}
			disabled={isSubmitting}
		/>
	</div>

	{#if resolvedDays.length > 0}
		<div class="day-preview">
			{#each resolvedDays as r}
				<span class="day-chip">
					<span class="day-name">{r.day}</span>
					<span class="day-resolved">→ {fmtDate(r.date)}</span>
				</span>
			{/each}
		</div>
	{/if}

	{#if error}
		<p class="paste-error">{error}</p>
	{/if}

	<button type="submit" class="btn btn-primary" disabled={isSubmitting || !rawText.trim()}>
		{isSubmitting ? 'Verwerken…' : 'Analyseren'}
	</button>
</form>

<style>
	.paste-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.paste-label {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--color-text);
	}

	.paste-textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.85rem;
		line-height: 1.5;
		resize: vertical;
		box-sizing: border-box;
	}

	.paste-textarea:focus {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}

	.ref-date-row {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.ref-date-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.hint {
		font-weight: 400;
		color: var(--color-muted);
		font-size: 0.8rem;
	}

	.ref-date-input {
		padding: 0.45rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.9rem;
		width: fit-content;
	}

	.ref-date-input:focus {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}

	.day-preview {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.day-chip {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.2rem 0.5rem;
		font-size: 0.8rem;
	}

	.day-name {
		font-weight: 600;
	}

	.day-resolved {
		color: var(--color-muted);
	}

	.paste-error {
		color: var(--color-score-red);
		font-size: 0.85rem;
		margin: 0;
	}
</style>
