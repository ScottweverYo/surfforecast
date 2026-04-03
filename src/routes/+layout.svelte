<script lang="ts">
	import '../app.css';
	import { forecast, isLoading, lastError } from '$lib/stores/forecast';
	import UndoToast from '$components/UndoToast.svelte';

	let { children } = $props();
	let online = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);
	let cachedAt = $derived($forecast?.fetchedAt ?? null);

	function formatAge(iso: string): string {
		const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
		if (diff < 60) return `${diff}m geleden`;
		return `${Math.floor(diff / 60)}u geleden`;
	}

	if (typeof window !== 'undefined') {
		window.addEventListener('online', () => (online = true));
		window.addEventListener('offline', () => (online = false));
	}
</script>

<svelte:head>
	<title>Surfforecast Scheveningen</title>
	<meta name="description" content="Surf condition predictor for Scheveningen, Netherlands" />
</svelte:head>

<div class="app-shell">
	<UndoToast />
	<header class="top-nav">
		<nav class="container nav-inner">
			<a href="/" class="brand">🏄 Surfforecast</a>
			<div class="nav-links">
				<a href="/expert">Expert</a>
				<a href="/sessions">Sessies</a>
				<a href="/settings">⚙</a>
			</div>
		</nav>
	</header>

	{#if !online && cachedAt}
		<div class="banner banner-offline">
			Offline — Opgeslagen voorspelling van {formatAge(cachedAt)}
		</div>
	{:else if $lastError}
		<div class="banner banner-warn">{$lastError}</div>
	{/if}

	<main class="container main-content">
		{@render children()}
	</main>
</div>

<style>
	.app-shell { display: flex; flex-direction: column; min-height: 100dvh; }

	.top-nav {
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.nav-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 52px;
	}

	.brand { font-weight: 700; font-size: 1rem; color: var(--color-text); }
	.nav-links { display: flex; gap: 1.25rem; font-size: 0.875rem; }
	.nav-links a { color: var(--color-muted); }

	.banner {
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
		text-align: center;
	}
	.banner-offline { background: var(--color-score-orange); color: #fff; }
	.banner-warn { background: #7c3aed; color: #fff; }

	.main-content { padding-top: 1.25rem; padding-bottom: 2rem; }
</style>
