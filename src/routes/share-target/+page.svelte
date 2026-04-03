<script module lang="ts">
	export const ssr = false;
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { addExpertMessage } from '$lib/stores/expertMessages';
	import { showUndoToast } from '$lib/stores/undoToast';

	$effect(() => {
		const text = new URL(window.location.href).searchParams.get('text')?.trim() ?? '';

		if (!text) {
			goto('/');
			return;
		}

		const truncated = text.length > 1500 ? text.slice(0, 1500) : text;

		try {
			const message = addExpertMessage(truncated, new Date());
			showUndoToast(message.id);
		} catch {
			goto('/expert');
			return;
		}

		goto('/');
	});
</script>

<p>Verwerken…</p>
