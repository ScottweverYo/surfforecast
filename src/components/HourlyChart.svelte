<script lang="ts">
	import { onMount } from 'svelte';
	import type { ForecastSlot } from '$lib/types';

	let { slots }: { slots: ForecastSlot[] } = $props();

	let canvasEl: HTMLCanvasElement;

	onMount(async () => {
		const {
			Chart,
			BarController, LineController,
			CategoryScale, LinearScale,
			BarElement, PointElement, LineElement,
			Tooltip
		} = await import('chart.js');

		Chart.register(BarController, LineController, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip);

		const labels = slots.map((s) => {
			const h = new Date(s.timestamp).getHours();
			return `${String(h).padStart(2, '0')}:00`;
		});

		const scoreData = slots.map((s) => s.score.composite);
		const tideData  = slots.map((s) => s.tideHeight);

		const bgColors = slots.map((s) => {
			const c = s.score.composite;
			if (c >= 3.5) return '#22c55e';
			if (c >= 2.5) return '#eab308';
			if (c >= 1.5) return '#f97316';
			return '#ef4444';
		});

		const chart = new Chart(canvasEl, {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						type: 'bar' as const,
						data: scoreData,
						backgroundColor: bgColors,
						borderRadius: 3,
						borderSkipped: false,
						yAxisID: 'yScore',
						order: 2
					},
					{
						type: 'line' as const,
						data: tideData,
						borderColor: 'rgba(148, 163, 184, 0.8)',
						backgroundColor: 'transparent',
						borderWidth: 2,
						pointRadius: 0,
						tension: 0.4,
						yAxisID: 'yTide',
						order: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				plugins: { legend: { display: false } },
				scales: {
					yScore: {
						position: 'left',
						min: 0,
						max: 5,
						ticks: { color: '#94a3b8', stepSize: 1 },
						grid: { color: '#334155' }
					},
					yTide: {
						position: 'right',
						ticks: { color: '#64748b', font: { size: 10 } },
						grid: { drawOnChartArea: false }
					},
					x: { ticks: { color: '#94a3b8', maxRotation: 0 }, grid: { display: false } }
				}
			}
		});

		return () => chart.destroy();
	});
</script>

<div class="chart-wrap" role="img" aria-label="Hourly surf score and tide chart">
	<canvas bind:this={canvasEl}></canvas>
</div>

<style>
	.chart-wrap { height: 160px; position: relative; }
	.chart-wrap canvas { width: 100% !important; }
</style>
