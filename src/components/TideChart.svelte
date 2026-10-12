<script lang="ts">
	import type { ForecastSlot } from '$lib/types';

	let { slots }: { slots: ForecastSlot[] } = $props();

	const isBrowser = typeof window !== 'undefined';

	const labels = $derived(
		slots.map((s) => {
			const h = new Date(s.timestamp).getHours();
			return `${String(h).padStart(2, '0')}:00`;
		})
	);

	const tideData = $derived(slots.map((s) => s.tideHeight));

	const hasData = $derived(tideData.some((v) => v !== 0));

	let Chart: typeof import('chart.js').Chart | undefined = $state(undefined);
	let LineComponent: any = $state(undefined);

	if (isBrowser) {
		import('chart.js').then(({ Chart: C, CategoryScale, LinearScale, PointElement, LineElement, Tooltip }) => {
			C.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);
			Chart = C;
			return import('svelte-chartjs');
		}).then((mod) => {
			if (mod) LineComponent = mod.Line;
		});
	}

	const chartData = $derived({
		labels,
		datasets: [
			{
				data: tideData,
				borderColor: '#60a5fa',
				backgroundColor: 'transparent',
				borderWidth: 2,
				pointRadius: 0,
				tension: 0.4
			}
		]
	});

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		animation: false as const,
		plugins: { legend: { display: false } },
		scales: {
			y: {
				ticks: { color: '#94a3b8' },
				grid: { color: '#334155' },
				title: { display: true, text: 'cm (NAP)', color: '#94a3b8', font: { size: 11 } }
			},
			x: { ticks: { color: '#94a3b8', maxRotation: 0 }, grid: { display: false } }
		}
	};
</script>

<div class="tide-chart-wrap">
	{#if slots.length === 0 || !hasData}
		<p class="tide-unavailable">Getijdendata niet beschikbaar</p>
	{:else if isBrowser && LineComponent && Chart}
		{@const LineChart = LineComponent}
		<div class="chart-wrap" role="img" aria-label="Tide height chart">
			<LineChart data={chartData} options={chartOptions} />
		</div>
	{:else}
		<div class="chart-placeholder">Grafiek laden…</div>
	{/if}
</div>

<style>
	.tide-chart-wrap { width: 100%; }

	.chart-wrap { height: 120px; position: relative; }

	.chart-placeholder, .tide-unavailable {
		height: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-muted);
		font-size: 0.875rem;
		margin: 0;
	}
</style>
