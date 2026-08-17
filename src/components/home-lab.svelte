<script>
	import { onMount } from 'svelte';
	import FlowCanvas from './flow-canvas.svelte';

	const STATS_URL = 'https://energy.edd-williams.com/api/energy-stats';

	let stats = null;
	let error = false;
	let diagramContainer;

	onMount(async () => {
		try {
			const res = await fetch(STATS_URL);
			if (!res.ok) throw new Error(`energy-proxy returned ${res.status}`);
			stats = await res.json();
		} catch (err) {
			console.error('Failed to load home lab stats:', err);
			error = true;
		}
	});

	$: socDeg = stats ? (stats.batterySoc / 100) * 360 : 0;
</script>

<span class="anchor" id="home-lab" />
<section class="base-section justify-start">
	<h2 class="text-2xl mb-4">Home Lab</h2>

	<div class="p-4 mt-4 flex flex-col gap-4">
		<p class="text-light-cyan/60 text-base">
			Alongside the day job, I run a small home lab — solar, battery storage, and a pile of
			self-hosted services. These numbers are pulled live from the same Home Assistant setup that
			runs my house.
		</p>

		{#if error}
			<p class="text-light-cyan/40 text-sm italic">
				Couldn't reach the live stats right now — the home lab might be offline, or having a nap.
			</p>
		{:else if !stats}
			<p class="text-light-cyan/40 text-sm italic">Loading live stats…</p>
		{:else}
			<div bind:this={diagramContainer} class="relative w-full py-8">
				<FlowCanvas
					container={diagramContainer}
					sources={[
						{ selector: '[data-flow-node="solar"]', color: '#98c1d9' },
						{ selector: '[data-flow-node="saved"]', color: '#EE6C4D' }
					]}
					targetSelector={'[data-flow-node="battery"]'}
				/>

				<div
					class="flex flex-col items-center gap-12 sm:flex-row sm:justify-between sm:items-center"
				>
					<!-- Solar node -->
					<div class="flex flex-col items-center gap-2 relative z-10">
						<p class="text-xs uppercase tracking-wide text-light-cyan/50">Solar</p>
						<div
							data-flow-node="solar"
							class="w-24 h-24 rounded-full border-2 border-pale-cerulean bg-gunmetal flex flex-col items-center justify-center"
						>
							<span class="text-xl">☀️</span>
							<span class="text-sm text-pale-cerulean mt-1">
								{stats.solarGenerationTodayKwh.toFixed(2)} kWh
							</span>
						</div>
						<p class="text-xs text-light-cyan/40">
							{stats.solarGenerationTotalKwh.toFixed(0)} kWh lifetime
						</p>
					</div>

					<!-- Battery hub -->
					<div class="flex flex-col items-center gap-2 relative z-10">
						<div
							data-flow-node="battery"
							class="relative w-36 h-36 rounded-full flex items-center justify-center"
							style="background: conic-gradient(#3D5A80 {socDeg}deg, rgba(255,255,255,0.08) {socDeg}deg 360deg)"
						>
							<div
								class="absolute inset-2 rounded-full bg-gunmetal border border-bdazzled-blue-700 flex flex-col items-center justify-center"
							>
								<span class="text-2xl">🔋</span>
								<span class="text-xl mt-1">{stats.batterySoc}%</span>
							</div>
						</div>
						<p class="text-xs text-light-cyan/40 text-center">
							{stats.batteryAction} · {Math.abs(stats.batteryPowerW)}W
						</p>
					</div>

					<!-- Savings node -->
					<div class="flex flex-col items-center gap-2 relative z-10">
						<p class="text-xs uppercase tracking-wide text-light-cyan/50">Saved</p>
						<div
							data-flow-node="saved"
							class="w-24 h-24 rounded-full border-2 border-burnt-sienna-400 bg-gunmetal flex flex-col items-center justify-center"
						>
							<span class="text-xl">💷</span>
							<span class="text-sm text-burnt-sienna-400 mt-1"
								>£{stats.batterySavingsTotal.toFixed(2)}</span
							>
						</div>
						<p class="text-xs text-light-cyan/40">lifetime, battery arbitrage</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
</section>
