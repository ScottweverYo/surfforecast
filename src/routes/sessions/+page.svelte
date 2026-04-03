<script lang="ts">
	import { sessions, modelAccuracy, removeSession } from '$lib/stores/sessions';
	import SessionForm from '$components/SessionForm.svelte';

	let showForm = $state(false);

	function fmt(iso: string): string {
		return new Intl.DateTimeFormat('nl-NL', {
			day: 'numeric', month: 'short', year: 'numeric'
		}).format(new Date(iso));
	}

	const STAR_MAP: Record<number, string> = {
		1: '★', 2: '★★', 3: '★★★', 4: '★★★★', 5: '★★★★★'
	};
</script>

<svelte:head>
	<title>Sessies — Surfforecast Scheveningen</title>
</svelte:head>

<main class="page">
	<div class="page-header">
		<h1>Mijn sessies</h1>
		<button class="btn btn-primary" onclick={() => (showForm = !showForm)}>
			{showForm ? 'Annuleren' : '+ Sessie toevoegen'}
		</button>
	</div>

	{#if showForm}
		<section class="card form-section">
			<SessionForm onAdded={() => (showForm = false)} />
		</section>
	{/if}

	{#if $modelAccuracy}
		<section class="card accuracy-card">
			<h2>Modelnauwkeurigheid</h2>
			<div class="accuracy-stats">
				<div class="stat">
					<span class="stat-value">{$modelAccuracy.correlationScore.toFixed(2)}</span>
					<span class="stat-label">Pearson r</span>
				</div>
				<div class="stat">
					<span class="stat-value">{$modelAccuracy.meanAbsoluteError.toFixed(2)}</span>
					<span class="stat-label">Gem. fout</span>
				</div>
				<div class="stat">
					<span class="stat-value">{$modelAccuracy.sessionCount}</span>
					<span class="stat-label">Sessies</span>
				</div>
			</div>
		</section>
	{/if}

	{#if $sessions.length === 0}
		<p class="empty">Nog geen sessies gelogd.</p>
	{:else}
		<ul class="session-list">
			{#each [...$sessions].reverse() as session (session.id)}
				<li class="session-card card">
					<div class="session-info">
						<span class="session-date">{fmt(session.date)}</span>
						<span class="session-time">{String(session.startHour).padStart(2,'0')}:00–{String(session.endHour).padStart(2,'0')}:00</span>
						<span class="session-spot">{session.spot}</span>
					</div>
					<div class="session-scores">
						<span class="personal-rating" title="Jouw beoordeling">{STAR_MAP[session.personalRating]}</span>
						{#if session.modelScore !== null}
							<span class="model-score" title="Modelscore">{session.modelScore.toFixed(1)}</span>
						{/if}
					</div>
					{#if session.notes}
						<p class="session-notes">{session.notes}</p>
					{/if}
					<button
						class="remove-btn"
						onclick={() => removeSession(session.id)}
						aria-label="Verwijder sessie"
					>✕</button>
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

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.25rem;
	}

	h1 {
		font-size: 1.4rem;
		font-weight: 700;
		margin: 0;
	}

	h2 {
		font-size: 1rem;
		font-weight: 700;
		margin: 0 0 0.75rem;
	}

	.form-section {
		margin-bottom: 1.25rem;
	}

	.accuracy-card {
		margin-bottom: 1.25rem;
	}

	.accuracy-stats {
		display: flex;
		gap: 2rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat-value {
		font-size: 1.4rem;
		font-weight: 800;
		color: var(--color-accent);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-muted);
	}

	.empty {
		color: var(--color-muted);
		text-align: center;
		padding: 2rem 0;
	}

	.session-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.session-card {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto auto;
		gap: 0.3rem 0.5rem;
		padding: 0.75rem 1rem;
		position: relative;
	}

	.session-info {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
	}

	.session-date {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.session-time, .session-spot {
		font-size: 0.8rem;
		color: var(--color-muted);
	}

	.session-scores {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.personal-rating {
		color: var(--color-score-yellow);
		font-size: 0.85rem;
	}

	.model-score {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.1rem 0.4rem;
		font-size: 0.8rem;
		font-weight: 600;
	}

	.session-notes {
		grid-column: 1 / -1;
		font-size: 0.8rem;
		color: var(--color-muted);
		margin: 0;
	}

	.remove-btn {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-muted);
		font-size: 0.85rem;
		padding: 0.2rem 0.4rem;
		line-height: 1;
	}

	.remove-btn:hover {
		color: var(--color-score-red);
	}
</style>
