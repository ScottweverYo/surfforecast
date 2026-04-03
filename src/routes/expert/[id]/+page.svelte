<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { expertMessages, updateExpertMessage } from '$lib/stores/expertMessages';
	import { extractTimeWindows } from '$lib/parser/timeWindows';

	const id = $derived($page.params.id);
	const message = $derived($expertMessages.find((m) => m.id === id) ?? null);

	$effect(() => {
		if (message === null) {
			goto('/expert');
		}
	});

	let refDate = $state('');

	$effect(() => {
		if (message) {
			refDate = message.ingestedAt.slice(0, 10);
		}
	});

	const dayChips = $derived.by(() => {
		if (!message || !refDate) return [];
		const date = new Date(refDate + 'T12:00:00');
		const windows = extractTimeWindows(message.rawText, date);
		// Deduplicate by dayReference
		const seen = new Set<string>();
		return windows.filter((w) => {
			if (!w.dayReference || seen.has(w.dayReference)) return false;
			seen.add(w.dayReference);
			return true;
		});
	});

	function handleReparse() {
		if (!message || !refDate || !id) return;
		updateExpertMessage(id as string, message.rawText, new Date(refDate + 'T12:00:00'));
		goto('/expert');
	}

	function formatDate(iso: string): string {
		return new Intl.DateTimeFormat('nl-NL', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		}).format(new Date(iso));
	}
</script>

{#if message}
	<div class="page">
		<h1>Bericht bewerken</h1>

		<section class="card">
			<h2>Originele tekst</h2>
			<pre class="raw-text">{message.rawText}</pre>
		</section>

		<section class="card">
			<h2>Referentiedatum</h2>
			<p class="hint">Op welke datum is deze voorspelling geschreven?</p>
			<input type="date" bind:value={refDate} class="date-input" />

			{#if dayChips.length > 0}
				<div class="chips">
					{#each dayChips as chip}
						<span class="chip">
							{chip.dayReference} → {formatDate(chip.resolvedDate + 'T12:00:00')}
						</span>
					{/each}
				</div>
			{/if}
		</section>

		<button
			onclick={handleReparse}
			disabled={!refDate}
			class="btn-primary"
		>
			Opnieuw analyseren
		</button>
	</div>
{/if}

<style>
	.page {
		max-width: 640px;
		margin: 0 auto;
		padding: 1rem 1rem 5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	h1 {
		font-size: 1.4rem;
		font-weight: 700;
	}

	h2 {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.5rem;
	}

	.raw-text {
		font-size: 0.8rem;
		color: var(--color-muted);
		white-space: pre-wrap;
		word-break: break-word;
		background: var(--color-bg);
		padding: 0.5rem;
		border-radius: 4px;
		margin: 0;
	}

	.hint {
		font-size: 0.85rem;
		color: var(--color-muted);
		margin: 0 0 0.5rem;
	}

	.date-input {
		display: block;
		width: 100%;
		padding: 0.5rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-text);
		font-size: 1rem;
		margin-bottom: 0.75rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.chip {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.2rem 0.5rem;
		font-size: 0.8rem;
	}

	.btn-primary {
		align-self: flex-start;
		background: var(--color-accent);
		color: white;
		border: none;
		border-radius: 0.375rem;
		padding: 0.6rem 1.25rem;
		font-size: 0.9375rem;
		cursor: pointer;
		font-weight: 600;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
	}
</style>
