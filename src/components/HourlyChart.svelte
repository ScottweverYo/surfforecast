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

	const data = $derived(slots.map((s) => s.score.composite));

	const bgColors = $derived(
		slots.map((s) => {
			const c = s.score.composite;
			if (c >= 3.5) return '#22c55e';
			if (c >= 2.5) return '#eab308';
			if (c >= 1.5) return '#f97316';
			return '#ef4444';
		})
	);

	let Chart: typeof import('chart.js').Chart | undefined = $state(undefined);
	let BarComponent: any = $state(undefined);

	if (isBrowser) {
		import('chart.js').then(({ Chart: C, CategoryScale, LinearScale, BarElement, Tooltip }) => {
			C.register(CategoryScale, LinearScale, BarElement, Tooltip);
			Chart = C;
			return import('svelte-chartjs');
		}).then((mod) => {
			if (mod) BarComponent = mod.Bar;
		});
	}

	const chartData = $derived({
		labels,
		datasets: [
			{
				data,
				backgroundColor: bgColors,
				borderRadius: 3,
				borderSkipped: false
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
				min: 0,
				max: 5,
				ticks: { color: '#94a3b8', stepSize: 1 },
				grid: { color: '#334155' }
			},
			x: { ticks: { color: '#94a3b8', maxRotation: 0 }, grid: { display: false } }
		}
	};
</script>

<div class="chart-wrap" role="img" aria-label="Hourly surf score chart">
	{#if isBrowser && BarComponent && Chart}
		{@const BarChart = BarComponent}
		<BarChart data={chartData} options={chartOptions} />
	{:else}
		<div class="chart-placeholder">Grafiek laden…</div>
	{/if}
</div>

<style>
	.chart-wrap { height: 160px; position: relative; }
	.chart-placeholder {
		height: 160px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-muted);
		font-size: 0.875rem;
	}
</style>
