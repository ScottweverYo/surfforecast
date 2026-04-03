<script lang="ts">
	import { addSession } from '$lib/stores/sessions';

	let { onAdded }: { onAdded?: () => void } = $props();

	const today = new Date().toISOString().slice(0, 10);

	let date = $state(today);
	let startHour = $state(9);
	let endHour = $state(11);
	let spot = $state('Scheveningen');
	let personalRating: 1 | 2 | 3 | 4 | 5 = $state(3);
	let notes = $state('');
	let error = $state('');

	function handleSubmit() {
		if (!date) { error = 'Datum is verplicht'; return; }
		if (endHour <= startHour) { error = 'Eindtijd moet na begintijd zijn'; return; }
		error = '';
		addSession({ date, startHour, endHour, spot, personalRating, notes });
		// Reset
		date = today;
		startHour = 9;
		endHour = 11;
		personalRating = 3;
		notes = '';
		onAdded?.();
	}

	const hours = Array.from({ length: 24 }, (_, i) => i);
	const ratings: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
	const ratingLabels: Record<number, string> = {
		1: '★ Slecht',
		2: '★★ Matig',
		3: '★★★ Oké',
		4: '★★★★ Goed',
		5: '★★★★★ Top'
	};
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="session-form">
	<div class="field">
		<label for="session-date">Datum</label>
		<input id="session-date" type="date" bind:value={date} max={today} />
	</div>

	<div class="field-row">
		<div class="field">
			<label for="start-hour">Van</label>
			<select id="start-hour" bind:value={startHour}>
				{#each hours as h}
					<option value={h}>{String(h).padStart(2, '0')}:00</option>
				{/each}
			</select>
		</div>
		<div class="field">
			<label for="end-hour">Tot</label>
			<select id="end-hour" bind:value={endHour}>
				{#each hours as h}
					<option value={h}>{String(h).padStart(2, '0')}:00</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="field">
		<label for="session-spot">Locatie</label>
		<input id="session-spot" type="text" bind:value={spot} />
	</div>

	<div class="field">
		<label for="personal-rating">Beoordeling</label>
		<select id="personal-rating" bind:value={personalRating}>
			{#each ratings as r}
				<option value={r}>{ratingLabels[r]}</option>
			{/each}
		</select>
	</div>

	<div class="field">
		<label for="session-notes">Notities</label>
		<textarea id="session-notes" bind:value={notes} rows={3} placeholder="Optioneel…"></textarea>
	</div>

	{#if error}
		<p class="form-error">{error}</p>
	{/if}

	<button type="submit" class="btn btn-primary">Sessie opslaan</button>
</form>

<style>
	.session-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text);
	}

	input, select, textarea {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.9rem;
	}

	input:focus, select:focus, textarea:focus {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}

	textarea { resize: vertical; }

	.form-error {
		color: var(--color-score-red);
		font-size: 0.85rem;
		margin: 0;
	}
</style>
