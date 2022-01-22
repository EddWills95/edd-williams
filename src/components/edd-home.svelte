<script>
    export let handler = undefined;

    function useHandler() {
        if (handler) {
            handler();
        }
    }
</script>

<a href="/" on:click={useHandler} class="h-8 w-auto rounded-button">Edd</a>