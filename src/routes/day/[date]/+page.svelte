<script lang="ts">
	import { page } from '$app/stores';
	import { forecast } from '$lib/stores/forecast';
	import HourlyChart from '$components/HourlyChart.svelte';
	import ScoreBreakdown from '$components/ScoreBreakdown.svelte';
	import { goto } from '$app/navigation';
	import { msToBft } from '$lib/scoring/parameters';

	const date = $derived($page.params.date ?? '');

	const daySlots = $derived.by(() => {
		return ($forecast?.slots ?? []).filter((s) => s.timestamp.startsWith(date));
	});

	const isReduced = $derived(daySlots[0]?.confidence === 'reduced');

	function compassLabel(deg: number): string {
		const dirs = ['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'];
		return dirs[Math.round(deg / 22.5) % 16];
	}

	function tideLabel(state: string, dir: string): string {
		const s: Record<string, string> = { low: 'Laag', mid: 'Mid', high: 'Hoog' };
		const d: Record<string, string> = { flooding: '↑', ebbing: '↓', slack: '→' };
		return `${s[state] ?? state} ${d[dir] ?? ''}`;
	}

	let expandedHour = $state<number | null>(null);

	function toggleBreakdown(h: number) {
		expandedHour = expandedHour === h ? null : h;
	}
</script>

<div class="day-detail">
	<div class="detail-header">
		<button class="btn back-btn" onclick={() => goto('/')} aria-label="Terug naar overzicht">
			‹ Terug
		</button>
		<h1 class="detail-date">
			{new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
				.format(new Date(date + 'T12:00:00'))}
		</h1>
		{#if isReduced}
			<span class="confidence-badge">Lage zekerheid</span>
		{/if}
	</div>

	{#if daySlots.length === 0}
		<div class="card">Geen data beschikbaar voor deze dag.</div>
	{:else}
		<div class="card chart-card">
			<HourlyChart slots={daySlots} />
		</div>

		<div class="table-wrap card">
			<table class="hourly-table">
				<thead>
					<tr>
						<th>Tijd</th>
						<th>Golf</th>
						<th>Periode</th>
						<th>Richting</th>
						<th>Wind</th>
						<th>Getij</th>
						<th>Score</th>
					</tr>
				</thead>
				<tbody>
					{#each daySlots as slot}
						{@const h = new Date(slot.timestamp).getHours()}
						{@const scoreClass =
							slot.score.composite >= 3.5 ? 'green'
							: slot.score.composite >= 2.5 ? 'yellow'
							: slot.score.composite >= 1.5 ? 'orange'
							: 'red'}
						<tr
							class="slot-row"
							onclick={() => toggleBreakdown(h)}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && toggleBreakdown(h)}
							aria-expanded={expandedHour === h}
						>
							<td class="td-time">{String(h).padStart(2, '0')}:00</td>
							<td>{slot.swellHeight.toFixed(1)}m</td>
							<td>{slot.swellPeriod.toFixed(0)}s</td>
							<td>{compassLabel(slot.swellDirection)}</td>
							<td>{msToBft(slot.windSpeed)} Bft {compassLabel(slot.windDirection)}</td>
							<td>{tideLabel(slot.tideState, slot.tideDirection)}</td>
							<td class="td-score score-text-{scoreClass}">
								{slot.score.cappedByHeight ? '—' : slot.score.composite.toFixed(1)}★
							</td>
						</tr>
						{#if expandedHour === h}
							<tr class="breakdown-row">
								<td colspan="7">
									<div class="breakdown-wrap">
										<ScoreBreakdown score={slot.score} />
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.day-detail { display: flex; flex-direction: column; gap: 1rem; }

	.detail-header {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.detail-date {
		font-size: 1.125rem;
		font-weight: 700;
		text-transform: capitalize;
	}

	.back-btn {
		align-self: flex-start;
		font-size: 0.875rem;
		padding: 0.25rem 0.5rem;
	}

	.chart-card { padding: 0.75rem; }

	.table-wrap { padding: 0; overflow-x: auto; }

	.hourly-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}

	.hourly-table th {
		text-align: left;
		padding: 0.5rem 0.75rem;
		color: var(--color-muted);
		font-weight: 600;
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
	}

	.hourly-table td {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
	}

	.hourly-table tr:last-child td { border-bottom: none; }
	.slot-row { cursor: pointer; }
	.slot-row:hover td { background: var(--color-border); }
	.breakdown-row td { padding: 0; }
	.breakdown-wrap {
		padding: 0.75rem 1rem;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}

	.td-time { color: var(--color-muted); }

	.td-score { font-weight: 700; }
	.score-text-green  { color: var(--color-score-green); }
	.score-text-yellow { color: var(--color-score-yellow); }
	.score-text-orange { color: var(--color-score-orange); }
	.score-text-red    { color: var(--color-score-red); }
</style>
