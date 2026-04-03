<script lang="ts">
	import type { DivergenceRecord } from '$lib/types';

	let { records }: { records: DivergenceRecord[] } = $props();

	const LEVEL_LABELS: Record<string, { label: string; cls: string }> = {
		agreement:    { label: 'Akkoord',       cls: 'level-agreement' },
		minor:        { label: 'Kleine afwijking', cls: 'level-minor' },
		significant:  { label: 'Grote afwijking',  cls: 'level-significant' },
		no_model_data: { label: 'Geen modeldata',  cls: 'level-nodata' }
	};

	function timeRange(rec: DivergenceRecord): string {
		if (!rec.timeWindow) return rec.resolvedDate;
		return `${rec.resolvedDate} ${rec.timeWindow.start}–${rec.timeWindow.end}u`;
	}
</script>

{#if records.length === 0}
	<p class="empty">Geen vergelijkingspunten gevonden.</p>
{:else}
	<ul class="divergence-list">
		{#each records as rec (rec.id)}
			{@const info = LEVEL_LABELS[rec.divergence] ?? LEVEL_LABELS.no_model_data}
			<li class="divergence-item">
				<span class="time-range">{timeRange(rec)}</span>
				<span class="expert-claim">{rec.expertClaim.description}</span>
				{#if rec.expertClaim.impliedScore !== null}
					<span class="value">Expert: {rec.expertClaim.impliedScore.toFixed(1)} m</span>
				{/if}
				{#if rec.divergence !== 'no_model_data'}
					<span class="value">Model: {rec.modelPrediction.meanScore.toFixed(1)} m</span>
				{/if}
				<span class="level-badge {info.cls}">{info.label}</span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.empty {
		color: var(--color-muted);
		font-size: 0.85rem;
	}

	.divergence-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.divergence-item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem;
		background: var(--color-surface);
		border-radius: 6px;
		border: 1px solid var(--color-border);
		font-size: 0.85rem;
	}

	.time-range {
		color: var(--color-muted);
		font-size: 0.75rem;
		white-space: nowrap;
	}

	.expert-claim {
		flex: 1;
		min-width: 8rem;
		font-weight: 500;
	}

	.value {
		color: var(--color-muted);
		white-space: nowrap;
	}

	.level-badge {
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.level-agreement  { background: #d1fae5; color: #065f46; }
	.level-minor      { background: #fef9c3; color: #854d0e; }
	.level-significant { background: #fee2e2; color: #991b1b; }
	.level-nodata     { background: var(--color-border); color: var(--color-muted); }
</style>
