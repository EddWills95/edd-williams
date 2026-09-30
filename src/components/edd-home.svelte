<script>
	export let handler = undefined;

	function useHandler() {
		if (handler) {
			handler();
		}
	}
</script>

<a href="/" on:click={useHandler} class="rounded-button">Edd</a>
