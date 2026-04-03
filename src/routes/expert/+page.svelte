<script lang="ts">
	import { expertMessages, removeExpertMessage } from '$lib/stores/expertMessages';
	import ExpertPasteForm from '$components/ExpertPasteForm.svelte';
	import DivergencePanel from '$components/DivergencePanel.svelte';

	let expandedId = $state<string | null>(null);

	function toggle(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	function fmt(iso: string): string {
		return new Intl.DateTimeFormat('nl-NL', {
			day: 'numeric', month: 'short', year: 'numeric',
			hour: '2-digit', minute: '2-digit'
		}).format(new Date(iso));
	}
</script>

<svelte:head>
	<title>Expert berichten — Surfforecast Scheveningen</title>
</svelte:head>

<main class="page">
	<h1>Expert berichten</h1>

	<section class="card paste-section">
		<ExpertPasteForm onAdded={() => { expandedId = null; }} />
	</section>

	{#if $expertMessages.length === 0}
		<p class="empty">Nog geen berichten geplakt.</p>
	{:else}
		<ul class="message-list">
			{#each $expertMessages as msg (msg.id)}
				<li class="message-card card">
					<div class="message-header">
						<button
							class="expand-btn"
							onclick={() => toggle(msg.id)}
							aria-expanded={expandedId === msg.id}
						>
							<span class="message-date">{fmt(msg.ingestedAt)}</span>
							{#if msg.previousVersionId}
								<span class="version-badge">Update</span>
							{/if}
							<span class="excerpt">{msg.rawText.slice(0, 80)}…</span>
							<span class="chevron">{expandedId === msg.id ? '▲' : '▼'}</span>
						</button>
						<button
							class="remove-btn"
							onclick={() => removeExpertMessage(msg.id)}
							aria-label="Verwijder bericht"
						>✕</button>
					</div>

					{#if expandedId === msg.id}
						<div class="message-detail">
							<h3>Tekst</h3>
							<pre class="raw-text">{msg.rawText}</pre>

							<h3>Extracties</h3>
							<div class="extraction-chips">
								{#each msg.extractions.spots as s}
									<span class="chip {s.isScheveningen ? 'chip-accent' : ''}">📍 {s.resolved}</span>
								{/each}
								{#each msg.extractions.windDescriptors as w}
									{#if w.beaufort !== null}
										<span class="chip">💨 {w.beaufort} Bft</span>
									{/if}
								{/each}
								{#each msg.extractions.waveDescriptors as wd}
									<span class="chip">🌊 {wd.hsMin}–{wd.hsMax} m</span>
								{/each}
								{#each msg.extractions.tideDescriptors as td}
									<span class="chip">🌊 {td.raw}</span>
								{/each}
							</div>

							{#if msg.comparison.length > 0}
								<h3>Vergelijking met model</h3>
								<DivergencePanel records={msg.comparison} />
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	.page {
		max-width: 700px;
		margin: 0 auto;
		padding: 1rem 1rem 5rem;
	}

	h1 {
		font-size: 1.4rem;
		font-weight: 700;
		margin-bottom: 1.25rem;
	}

	.paste-section {
		margin-bottom: 1.5rem;
	}

	.empty {
		color: var(--color-muted);
		text-align: center;
		padding: 2rem 0;
	}

	.message-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.message-card {
		padding: 0;
		overflow: hidden;
	}

	.message-header {
		display: flex;
		align-items: stretch;
	}

	.expand-btn {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		color: var(--color-text);
	}

	.expand-btn:hover {
		background: var(--color-border);
	}

	.message-date {
		font-size: 0.75rem;
		color: var(--color-muted);
		white-space: nowrap;
	}

	.version-badge {
		background: var(--color-accent);
		color: white;
		font-size: 0.7rem;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
	}

	.excerpt {
		flex: 1;
		font-size: 0.85rem;
		color: var(--color-text);
	}

	.chevron {
		font-size: 0.7rem;
		color: var(--color-muted);
	}

	.remove-btn {
		padding: 0 0.75rem;
		background: none;
		border: none;
		border-left: 1px solid var(--color-border);
		cursor: pointer;
		color: var(--color-muted);
		font-size: 1rem;
	}

	.remove-btn:hover {
		color: var(--color-score-red);
		background: #fee2e2;
	}

	.message-detail {
		padding: 1rem;
		border-top: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.message-detail h3 {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
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

	.extraction-chips {
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

	.chip-accent {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
	}
</style>
