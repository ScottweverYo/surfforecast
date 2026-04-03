<script lang="ts">
	import { forecast, isLoading, refresh } from '$lib/stores/forecast';
	import NextBestCard from '$components/NextBestCard.svelte';
	import DayRow from '$components/DayRow.svelte';
	import { goto } from '$app/navigation';
	import ClipboardPasteButton from '$components/ClipboardPasteButton.svelte';

	// Group slots by date and compute daily mean score
	const dailySummaries = $derived.by(() => {
		const cache = $forecast;
		if (!cache) return [];
		const byDate = new Map<string, { scores: number[]; confidence: 'standard' | 'reduced' }>();
		for (const slot of cache.slots) {
			const date = slot.timestamp.slice(0, 10);
			if (!byDate.has(date)) byDate.set(date, { scores: [], confidence: slot.confidence });
			byDate.get(date)!.scores.push(slot.score.composite);
		}
		return [...byDate.entries()]
			.map(([date, { scores, confidence }]) => ({
				date,
				meanScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 2) / 2,
				confidence
			}))
			.slice(0, 14);
	});
</script>

<section>
	<ClipboardPasteButton />

	{#if $isLoading && !$forecast}
		<div class="loading-state">Voorspelling laden…</div>
	{:else if $forecast}
		<!-- Next Best Session hero -->
		{#if $forecast.nextBestSession}
			<NextBestCard session={$forecast.nextBestSession} />
		{:else}
			<div class="card no-session">Geen goede sessie gevonden in de komende 14 dagen.</div>
		{/if}

		<!-- Data source warnings -->
		{#if $forecast.dataSourceStatus.wave === 'error'}
			<div class="source-warn">⚠ Golfdata niet beschikbaar</div>
		{/if}
		{#if $forecast.dataSourceStatus.tide === 'error'}
			<div class="source-warn">⚠ Getijdendata niet beschikbaar</div>
		{/if}

		<!-- 14-day list -->
		<div class="day-list" aria-label="14-daagse voorspelling">
			{#each dailySummaries as day}
				<DayRow
					date={day.date}
					meanScore={day.meanScore}
					confidence={day.confidence}
					onclick={() => goto(`/day/${day.date}`)}
				/>
			{/each}
		</div>
	{:else}
		<div class="card no-session">Geen data beschikbaar.</div>
	{/if}

	<!-- Manual refresh -->
	<div class="refresh-row">
		<button class="btn" onclick={refresh} disabled={$isLoading} aria-label="Ververs voorspelling">
			{$isLoading ? 'Laden…' : '↻ Ververs'}
		</button>
		{#if $forecast}
			<span class="last-updated">
				Bijgewerkt: {new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' })
					.format(new Date($forecast.fetchedAt))}
			</span>
		{/if}
	</div>
</section>

<style>
	section { display: flex; flex-direction: column; gap: 1rem; }

	.loading-state {
		text-align: center;
		color: var(--color-muted);
		padding: 3rem 0;
	}

	.no-session {
		color: var(--color-muted);
		text-align: center;
		font-size: 0.9375rem;
	}

	.source-warn {
		font-size: 0.8125rem;
		color: var(--color-score-orange);
		padding: 0.375rem 0;
	}

	.day-list {
		border-top: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.refresh-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding-top: 0.25rem;
	}

	.last-updated {
		font-size: 0.75rem;
		color: var(--color-muted);
	}
</style>
