<script lang="ts">
	import { onMount } from 'svelte';
	import { addExpertMessage } from '$lib/stores/expertMessages';
	import { undoToast, showUndoToast } from '$lib/stores/undoToast';

	let isAvailable = $state(false);
	let warning = $state<string | null>(null);
	let warningTimer: ReturnType<typeof setTimeout> | null = null;

	const isDisabled = $derived($undoToast !== null);

	onMount(() => {
		isAvailable = window.isSecureContext && !!navigator.clipboard;
	});

	function setWarning(msg: string) {
		if (warningTimer !== null) clearTimeout(warningTimer);
		warning = msg;
		warningTimer = setTimeout(() => {
			warning = null;
			warningTimer = null;
		}, 3000);
	}

	function handlePaste() {
		if (warningTimer !== null) {
			clearTimeout(warningTimer);
			warningTimer = null;
		}
		warning = null;

		navigator.clipboard.readText().then((text) => {
			const trimmed = text.trim();
			if (trimmed.length === 0) {
				setWarning('Klembord is leeg');
				return;
			}
			if (trimmed.length < 20) {
				setWarning('Klembord bevat geen voorspelling');
				return;
			}
			const truncated = trimmed.length > 1500 ? trimmed.slice(0, 1500) : trimmed;
			const message = addExpertMessage(truncated, new Date());
			showUndoToast(message.id);
		}).catch((err: unknown) => {
			if (err instanceof DOMException && err.name === 'NotAllowedError') {
				setWarning('Toegang tot klembord geweigerd');
			}
		});
	}
</script>

{#if isAvailable}
	<div class="paste-wrap">
		<button
			class="clipboard-paste-btn"
			onclick={handlePaste}
			disabled={isDisabled}
			aria-label="Voorspelling uit klembord plakken"
		>
			📋 Voorspelling plakken
		</button>
		{#if warning !== null}
			<p class="paste-warning" role="alert">{warning}</p>
		{/if}
	</div>
{/if}

<style>
	.paste-wrap {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.375rem;
	}

	.clipboard-paste-btn {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		color: var(--color-accent);
		cursor: pointer;
		font-size: 0.9375rem;
		font-weight: 600;
		padding: 0.6rem 1.1rem;
		width: 100%;
		text-align: left;
		transition: background 0.1s;
	}

	.clipboard-paste-btn:hover:not(:disabled) {
		background: var(--color-border);
	}

	.clipboard-paste-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.paste-warning {
		font-size: 0.8125rem;
		color: var(--color-score-orange);
		margin: 0;
	}
</style>
