<script>
	import { energyStats, buildStats } from '$lib/live-stats.js';

	$: stats = $energyStats.data;
	$: today = $buildStats.data?.today;
	$: build =
		today && [today.written, today.linesAdded, today.commits].every(Number.isInteger)
			? today
			: null;

	// 5,780,295 -> "5.8M", 15,368 -> "15.4k", 34 -> "34"
	function compact(n) {
		if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
		if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
		if (n >= 1e4) return `${(n / 1e3).toFixed(1)}k`;
		return n.toLocaleString('en-GB');
	}

	function visitCode() {
		window.open('https://github.com/EddWills95/edd-williams', '_blank');
	}
</script>

<section id="banner" class="section-no-padding relative text-2xl items-center justify-center">
	<h1 class="flex flex-col gap-2">
		<span class="fade-up text-base font-mono font-thin">Hey 👋<br /></span>
		<span class="fade-up text-4xl text-burnt-sienna-400" style="animation-delay: 0.15s"
			>I'm Edd <br /></span
		>
		<span class="fade-up text-3xl flex-col gap-2 text-light-cyan" style="animation-delay: 0.3s">
			I build cool things
		</span>
		<div class="fade-up flex text-3xl text-light-cyan" style="animation-delay: 0.45s">
			<span class="ml-[94px] h-9 relative inline-block min-w-[220px]">
				<span class="phrase-cycle absolute inset-0 whitespace-nowrap" style="animation-delay: 0s"
					>for the web 🌐</span
				>
				<span class="phrase-cycle absolute inset-0 whitespace-nowrap" style="animation-delay: 2.5s"
					>for mobile 📱</span
				>
				<span class="phrase-cycle absolute inset-0 whitespace-nowrap" style="animation-delay: 5s"
					>with batteries 🔋</span
				>
				<span
					class="phrase-cycle absolute inset-0 flex items-center whitespace-nowrap"
					style="animation-delay: 7.5s"
				>
					on bitcoin
					<svg class="inline ml-2" xmlns="http://www.w3.org/2000/svg" width="32" height="32"
						><g fill="none" fill-rule="evenodd"
							><circle cx="16" cy="16" r="16" fill="#F7931A" /><path
								fill="#FFF"
								fill-rule="nonzero"
								d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z"
							/></g
						></svg
					>
				</span>
			</span>
		</div>
	</h1>

	{#if stats || build}
		<div class="fade-up mt-10 flex flex-col items-center gap-3 px-4 text-center">
			{#if stats}
				<a
					href="#home-lab"
					class="flex items-center gap-3 rounded-full border border-pale-cerulean/60 px-4 py-2 text-base hover:bg-bdazzled-blue-500/30 transition-colors"
				>
					<span class="relative flex h-2.5 w-2.5 shrink-0">
						<span
							class="live-ping absolute inline-flex h-full w-full rounded-full bg-burnt-sienna-400"
						></span>
						<span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-burnt-sienna-400"></span>
					</span>
					<span
						>Live from my flat: 🔋 {stats.batterySoc}% · ☀️ {stats.solarGenerationTodayKwh.toFixed(
							1
						)} kWh today</span
					>
				</a>
			{/if}
			{#if build}
				<a
					href="#build"
					class="flex items-center gap-3 rounded-2xl border border-pale-cerulean/60 px-4 py-2 text-base hover:bg-bdazzled-blue-500/30 transition-colors"
				>
					<span class="relative flex h-2.5 w-2.5 shrink-0">
						<span
							class="live-ping absolute inline-flex h-full w-full rounded-full bg-burnt-sienna-400"
						></span>
						<span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-burnt-sienna-400"></span>
					</span>
					<span
						>Live from my laptop: ⌨️ {compact(build.written)} tokens · {compact(build.linesAdded)} lines
						· {compact(build.commits)} commits today</span
					>
				</a>
			{/if}
		</div>
	{/if}

	<a
		href="#about"
		aria-label="Scroll to About"
		class="scroll-cue absolute bottom-6 left-1/2 -translate-x-1/2 text-pale-cerulean"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-6 w-6"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
			><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg
		>
	</a>

	<button
		type="button"
		aria-label="View this site's source code on GitHub"
		class="absolute bottom-0 right-0 bg-white text-black w-24 h-20 text-sm hover:cursor-pointer bg-bottom
    before:absolute before:w-48 before:h-40 before:-top-28 before:-left-24 before:rotate-45 before:bg-gunmetal
    hover:before:-translate-x-2 hover:before:-translate-y-2 before:transition-transform
    "
		style="background-image: url('./code.png')"
		on:click={visitCode}
	></button>
</section>
