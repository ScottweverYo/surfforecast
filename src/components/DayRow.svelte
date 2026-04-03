<script lang="ts">
	let {
		date,
		meanScore,
		confidence,
		onclick
	}: {
		date: string;
		meanScore: number;
		confidence: 'standard' | 'reduced';
		onclick: () => void;
	} = $props();

	const dateLabel = $derived(
		new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
			.format(new Date(date + 'T12:00:00'))
	);

	const scoreClass = $derived(
		meanScore >= 3.5 ? 'green' : meanScore >= 2.5 ? 'yellow' : meanScore >= 1.5 ? 'orange' : 'red'
	);

	const scoreDisplay = $derived(
		(confidence === 'reduced' ? '~' : '') + meanScore.toFixed(1)
	);

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onclick();
		}
	}
</script>

<div
	class="day-row"
	role="button"
	tabindex="0"
	onclick={onclick}
	onkeydown={handleKey}
	aria-label="Bekijk details voor {dateLabel}"
>
	<div class="score-strip score-strip-{scoreClass}"></div>

	<span class="day-date">{dateLabel}</span>

	<span class="day-score">
		{scoreDisplay} ★
		{#if confidence === 'reduced'}
			<span class="reduced-label">7d+</span>
		{/if}
	</span>

	<span class="day-chevron" aria-hidden="true">›</span>
</div>

<style>
	.day-row {
		display: flex;
		align-items: center;
		min-height: 56px;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
		gap: 0.75rem;
		padding-right: 1rem;
		transition: background 0.1s;
		user-select: none;
	}

	.day-row:hover, .day-row:focus { background: var(--color-border); outline: none; }

	.score-strip {
		width: 5px;
		align-self: stretch;
		flex-shrink: 0;
		border-radius: 0 2px 2px 0;
	}
	.score-strip-green  { background: var(--color-score-green); }
	.score-strip-yellow { background: var(--color-score-yellow); }
	.score-strip-orange { background: var(--color-score-orange); }
	.score-strip-red    { background: var(--color-score-red); }

	.day-date {
		flex: 1;
		font-size: 0.9375rem;
		text-transform: capitalize;
	}

	.day-score {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-muted);
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.reduced-label {
		font-size: 0.625rem;
		background: var(--color-border);
		color: var(--color-muted);
		padding: 1px 4px;
		border-radius: 3px;
	}

	.day-chevron { color: var(--color-muted); font-size: 1.25rem; }
</style>
