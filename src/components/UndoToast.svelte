<script lang="ts">
	import { goto } from '$app/navigation';
	import { undoToast, clearUndoToast } from '$lib/stores/undoToast';
	import { removeExpertMessage } from '$lib/stores/expertMessages';

	function handleUndo() {
		const toast = $undoToast;
		if (!toast) return;
		removeExpertMessage(toast.expertMessageId);
		clearUndoToast();
	}

	function handleEdit() {
		const toast = $undoToast;
		if (!toast) return;
		goto('/expert/' + toast.expertMessageId);
		clearUndoToast();
	}

	$effect(() => {
		if ($undoToast === null) return;

		const timeoutId = setTimeout(clearUndoToast, 3000);

		// Store the handle so clearUndoToast can cancel it.
		undoToast.update((t) => (t ? { ...t, timeoutId } : null));

		return () => {
			clearTimeout(timeoutId);
		};
	});
</script>

{#if $undoToast !== null}
	<div class="toast-container" role="status" aria-live="polite" aria-atomic="true">
		<div class="toast-content">
			<span class="toast-message">Voorspelling opgeslagen ✓</span>
			<div class="toast-actions">
				<button onclick={handleUndo} class="toast-btn">Ongedaan maken</button>
				<button onclick={handleEdit} class="toast-btn toast-btn-edit">Bewerken</button>
			</div>
		</div>
		<div class="toast-progress" aria-hidden="true"></div>
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		background: var(--color-surface, #1e293b);
		border: 1px solid var(--color-border, #334155);
		border-radius: 0.5rem;
		min-width: 18rem;
		max-width: calc(100vw - 2rem);
		overflow: hidden;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
	}

	.toast-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem;
	}

	.toast-message {
		font-size: 0.9375rem;
		color: var(--color-text, #f1f5f9);
		white-space: nowrap;
	}

	.toast-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.toast-btn {
		background: none;
		border: 1px solid var(--color-border, #334155);
		border-radius: 0.25rem;
		color: var(--color-accent, #0ea5e9);
		cursor: pointer;
		font-size: 0.8125rem;
		padding: 0.25rem 0.625rem;
		white-space: nowrap;
	}

	.toast-btn:hover {
		background: var(--color-border, #334155);
	}

	.toast-btn-edit {
		color: var(--color-muted, #94a3b8);
	}

	.toast-progress {
		height: 3px;
		background: var(--color-accent, #0ea5e9);
		transform-origin: left;
		animation: shrink 3s linear forwards;
	}

	@keyframes shrink {
		from { transform: scaleX(1); }
		to { transform: scaleX(0); }
	}
</style>
