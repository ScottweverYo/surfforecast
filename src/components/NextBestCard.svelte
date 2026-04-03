<script lang="ts">
	import type { NextBestSession } from '$lib/types';

	let { session }: { session: NextBestSession } = $props();

	const dateLabel = $derived(
		new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
			.format(new Date(session.date + 'T12:00:00'))
	);

	const timeLabel = $derived(
		`${String(session.startHour).padStart(2, '0')}:00–${String(session.endHour).padStart(2, '0')}:00`
	);

	function stars(score: number): string {
		const full = Math.floor(score);
		const half = score - full >= 0.5 ? 1 : 0;
		const empty = 5 - full - half;
		return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
	}
</script>

<article class="nbs-card card">
	<div class="nbs-header">
		<span class="nbs-label">Volgende beste sessie</span>
		{#if session.confidence === 'reduced'}
			<span class="confidence-badge">Lage zekerheid</span>
		{/if}
	</div>

	<div class="nbs-date">{dateLabel}</div>
	<div class="nbs-time">{timeLabel}</div>

	<div class="nbs-score">
		<span class="stars">{stars(session.compositeScore)}</span>
		<span class="score-num">{session.compositeScore.toFixed(1)}</span>
	</div>

	<ul class="nbs-conditions">
		{#each session.topConditions as cond}
			<li class="condition-chip condition-{cond.label}">
				{cond.explanation}
			</li>
		{/each}
	</ul>
</article>

<style>
	.nbs-card {
		border-color: var(--color-accent);
		background: linear-gradient(135deg, var(--color-surface) 0%, #0c1e30 100%);
	}

	.nbs-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.nbs-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-accent);
		font-weight: 600;
	}

	.nbs-date {
		font-size: 1.25rem;
		font-weight: 700;
		text-transform: capitalize;
	}

	.nbs-time {
		font-size: 1rem;
		color: var(--color-muted);
		margin-bottom: 0.75rem;
	}

	.nbs-score {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.stars { font-size: 1.5rem; color: var(--color-score-yellow); letter-spacing: 0.05em; }
	.score-num { font-size: 1rem; color: var(--color-muted); }

	.nbs-conditions {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.condition-chip {
		font-size: 0.8125rem;
		padding: 0.25rem 0.625rem;
		border-radius: 999px;
		background: var(--color-border);
		color: var(--color-text);
		display: inline-block;
		width: fit-content;
	}

	.condition-excellent { background: #14532d; color: #86efac; }
	.condition-good      { background: #1a2e05; color: #a3e635; }
	.condition-fair      { background: #422006; color: #fdba74; }
	.condition-poor      { background: #450a0a; color: #fca5a5; }
</style>
