<script lang="ts">
	import type { Score } from '$lib/types';

	let { score }: { score: Score } = $props();

	const PARAM_LABELS: Record<string, string> = {
		swellDirection: 'Swellrichting',
		windDirection: 'Windrichting',
		swellHeight: 'Golfhoogte',
		swellPeriod: 'Golfperiode',
		tideState: 'Getij'
	};

	const PARAM_WEIGHTS: Record<string, string> = {
		swellDirection: '30%',
		windDirection: '25%',
		swellHeight: '20%',
		swellPeriod: '15%',
		tideState: '10%'
	};

	type ParamKey = keyof typeof score.parameters;
	const paramKeys: ParamKey[] = ['swellDirection', 'windDirection', 'swellHeight', 'swellPeriod', 'tideState'];

	function scoreClass(value: number): string {
		if (value >= 4.5) return 'score-green';
		if (value >= 3.5) return 'score-green';
		if (value >= 2.5) return 'score-yellow';
		if (value >= 1.5) return 'score-orange';
		return 'score-red';
	}

	function barWidth(value: number): string {
		return `${((value - 1) / 4) * 100}%`;
	}
</script>

<div class="breakdown">
	{#if score.cappedByHeight}
		<p class="capped-notice">Golven te laag — score geforceerd op 1</p>
	{/if}

	{#each paramKeys as key}
		{@const param = score.parameters[key]}
		<div class="param-row">
			<div class="param-header">
				<span class="param-name">{PARAM_LABELS[key]}</span>
				<span class="param-weight">{PARAM_WEIGHTS[key]}</span>
				<span class="param-value {scoreClass(param.value)}">{param.value.toFixed(1)}</span>
			</div>
			<div class="param-bar-bg">
				<div
					class="param-bar {scoreClass(param.value)}"
					style="width: {barWidth(param.value)}"
				></div>
			</div>
			<p class="param-explanation">{param.explanation}</p>
		</div>
	{/each}

	<div class="composite-row">
		<span class="composite-label">Totaal</span>
		<span class="composite-value {scoreClass(score.composite)}">{score.composite.toFixed(1)}</span>
	</div>
</div>

<style>
	.breakdown {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.capped-notice {
		background: #fee2e2;
		color: #991b1b;
		padding: 0.4rem 0.75rem;
		border-radius: 6px;
		font-size: 0.8rem;
		margin: 0;
	}

	.param-row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.param-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.param-name {
		flex: 1;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.param-weight {
		font-size: 0.75rem;
		color: var(--color-muted);
	}

	.param-value {
		font-weight: 700;
		font-size: 0.95rem;
		min-width: 2.5rem;
		text-align: right;
	}

	.param-bar-bg {
		height: 6px;
		background: var(--color-border);
		border-radius: 3px;
		overflow: hidden;
	}

	.param-bar {
		height: 100%;
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.param-bar.score-green  { background: var(--color-score-green); }
	.param-bar.score-yellow { background: var(--color-score-yellow); }
	.param-bar.score-orange { background: var(--color-score-orange); }
	.param-bar.score-red    { background: var(--color-score-red); }

	.param-explanation {
		font-size: 0.78rem;
		color: var(--color-muted);
		margin: 0;
		line-height: 1.4;
	}

	.composite-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border);
	}

	.composite-label {
		font-weight: 700;
		font-size: 0.95rem;
	}

	.composite-value {
		font-weight: 800;
		font-size: 1.2rem;
	}

	.score-green  { color: var(--color-score-green); }
	.score-yellow { color: var(--color-score-yellow); }
	.score-orange { color: var(--color-score-orange); }
	.score-red    { color: var(--color-score-red); }
</style>
