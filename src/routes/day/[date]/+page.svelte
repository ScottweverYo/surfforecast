<script lang="ts">
	import { page } from '$app/stores';
	import { forecast } from '$lib/stores/forecast';
	import DayDetail from '$components/DayDetail.svelte';
	import { goto } from '$app/navigation';

	const date = $derived($page.params.date ?? '');

	const daySlots = $derived.by(() => {
		return ($forecast?.slots ?? []).filter((s) => s.timestamp.startsWith(date));
	});

	const isReduced = $derived(daySlots[0]?.confidence === 'reduced');
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

	<DayDetail slots={daySlots} />
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
</style>
