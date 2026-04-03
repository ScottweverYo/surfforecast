<script lang="ts">
	import type { ScoringWeights } from '$lib/types';
	import { DEFAULT_WEIGHTS } from '$lib/scoring/index';

	const LS_KEY = 'scoring_weights';

	function loadWeights(): ScoringWeights {
		try {
			const raw = localStorage.getItem(LS_KEY);
			if (raw) return JSON.parse(raw) as ScoringWeights;
		} catch { /* ignore */ }
		return { ...DEFAULT_WEIGHTS };
	}

	function saveWeights(w: ScoringWeights) {
		try {
			localStorage.setItem(LS_KEY, JSON.stringify(w));
		} catch { /* ignore */ }
	}

	const PARAM_LABELS: Record<keyof ScoringWeights, string> = {
		swellDirection: 'Swellrichting',
		windDirection:  'Windrichting',
		swellHeight:    'Golfhoogte',
		swellPeriod:    'Golfperiode',
		tideState:      'Getij'
	};

	const paramKeys = Object.keys(DEFAULT_WEIGHTS) as Array<keyof ScoringWeights>;

	let weights = $state<ScoringWeights>(
		typeof window !== 'undefined' ? loadWeights() : { ...DEFAULT_WEIGHTS }
	);

	let saved = $state(false);

	const total = $derived(
		paramKeys.reduce((sum, k) => sum + weights[k], 0)
	);

	const isValid = $derived(Math.abs(total - 1) < 0.01);

	function handleSave() {
		if (!isValid) return;
		saveWeights(weights);
		saved = true;
		setTimeout(() => (saved = false), 2000);
	}

	function handleReset() {
		weights = { ...DEFAULT_WEIGHTS };
		saveWeights(weights);
		saved = true;
		setTimeout(() => (saved = false), 2000);
	}

	function pct(v: number): string {
		return Math.round(v * 100) + '%';
	}
</script>

<svelte:head>
	<title>Instellingen — Surfforecast Scheveningen</title>
</svelte:head>

<main class="page">
	<h1>Instellingen</h1>

	<section class="card">
		<h2>Scoringsgewichten</h2>
		<p class="hint">Pas de weging van elke parameter aan. De som moet 100% zijn.</p>

		<div class="weights-form">
			{#each paramKeys as key}
				<div class="weight-row">
					<label for="w-{key}" class="weight-label">
						{PARAM_LABELS[key]}
					</label>
					<input
						id="w-{key}"
						type="range"
						min="0"
						max="1"
						step="0.05"
						bind:value={weights[key]}
					/>
					<span class="weight-value">{pct(weights[key])}</span>
				</div>
			{/each}

			<div class="total-row" class:invalid={!isValid}>
				<span>Totaal: {pct(total)}</span>
				{#if !isValid}
					<span class="total-warning">Moet 100% zijn</span>
				{/if}
			</div>
		</div>

		<div class="actions">
			<button class="btn btn-primary" onclick={handleSave} disabled={!isValid}>
				{saved ? 'Opgeslagen ✓' : 'Opslaan'}
			</button>
			<button class="btn" onclick={handleReset}>Reset naar standaard</button>
		</div>
	</section>
</main>

<style>
	.page {
		max-width: 500px;
		margin: 0 auto;
		padding: 1rem 1rem 5rem;
	}

	h1 {
		font-size: 1.4rem;
		font-weight: 700;
		margin-bottom: 1.25rem;
	}

	h2 {
		font-size: 1rem;
		font-weight: 700;
		margin: 0 0 0.25rem;
	}

	.hint {
		font-size: 0.82rem;
		color: var(--color-muted);
		margin: 0 0 1rem;
	}

	.weights-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.weight-row {
		display: grid;
		grid-template-columns: 8rem 1fr 3rem;
		align-items: center;
		gap: 0.75rem;
	}

	.weight-label {
		font-size: 0.9rem;
		font-weight: 500;
	}

	input[type="range"] {
		accent-color: var(--color-accent);
		width: 100%;
	}

	.weight-value {
		font-weight: 700;
		font-size: 0.9rem;
		text-align: right;
	}

	.total-row {
		display: flex;
		justify-content: space-between;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.total-row.invalid {
		color: var(--color-score-red);
	}

	.total-warning {
		font-size: 0.8rem;
		font-weight: 400;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
	}
</style>
