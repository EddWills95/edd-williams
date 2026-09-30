<script>
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { quartOut } from 'svelte/easing';
	import { energyStats, buildStats } from '$lib/live-stats.js';

	const SEGMENTS = 10;
	const indices = [...Array(SEGMENTS).keys()];

	$: status = $energyStats.status;
	$: stats = $energyStats.data;
	$: today = $buildStats.data?.today;
	$: build =
		today && [today.written, today.linesAdded, today.commits].every(Number.isInteger)
			? today
			: null;

	$: soc = Number.isFinite(stats?.batterySoc) ? Math.min(Math.max(stats.batterySoc, 0), 100) : null;
	$: solarToday = Number.isFinite(stats?.solarGenerationTodayKwh)
		? stats.solarGenerationTodayKwh
		: null;
	$: cups = Number.isInteger(stats?.kettleCupsToday) ? stats.kettleCupsToday : null;
	$: cupIcons = cups === null ? [] : [...Array(Math.min(cups, 8)).keys()];
	$: charging = stats?.batteryAction === 'Charging';

	// The gauge fills from empty to the real reading once, when the data first lands.
	const level = tweened(0, { duration: 1600, easing: quartOut });
	let reduced = false;
	onMount(() => {
		reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});
	$: if (soc !== null) level.set(soc, { duration: reduced ? 0 : 1600 });

	$: filled = ($level / 100) * SEGMENTS;

	// 5,780,295 -> "5.8M", 15,368 -> "15.4k", 34 -> "34"
	function compact(n) {
		if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
		if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
		if (n >= 1e4) return `${(n / 1e3).toFixed(1)}k`;
		return n.toLocaleString('en-GB');
	}
</script>

<section
	id="banner"
	class="relative w-full min-h-[calc(100svh-4rem)] mt-16 flex flex-col items-center justify-center"
	aria-labelledby="banner-heading"
>
	<div
		class="grid w-full gap-10 px-4 py-10 sm:px-12 lg:w-8/12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center"
	>
		<div class="flex flex-col gap-6">
			<h1 id="banner-heading" class="hero-title fade-up">
				<span class="block text-burnt-sienna-400">Edd Williams</span>
				<span class="block text-light-cyan"
					>Software engineer. Solar and batteries on the side.</span
				>
			</h1>

			<p class="fade-up max-w-prose text-lg text-pale-cerulean" style="animation-delay: 0.12s">
				I build products for web and mobile, and I run my own solar, battery storage and Bitcoin
				node at home. The numbers next to this are live from my flat.
			</p>

			<p class="fade-up flex flex-wrap gap-x-6 gap-y-1 text-base" style="animation-delay: 0.24s">
				<a class="hero-link" href="#solar">See the solar</a>
				<a class="hero-link" href="#projects">Projects</a>
				<a class="hero-link" href="#contact">Say hi</a>
			</p>
		</div>

		<!-- Reserved height, so the live readout never shifts the page when it arrives. -->
		<a
			href="#solar"
			class="gauge fade-up"
			style="animation-delay: 0.36s"
			aria-label="Live from my flat. Jump to the Solar section."
		>
			<span class="gauge-head">
				<span class="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
					{#if status === 'ready'}
						<span
							class="live-ping absolute inline-flex h-full w-full rounded-full bg-burnt-sienna-400"
						></span>
					{/if}
					<span
						class="relative inline-flex h-2.5 w-2.5 rounded-full"
						class:bg-burnt-sienna-400={status === 'ready'}
						class:bg-pale-cerulean={status !== 'ready'}
					></span>
				</span>
				<span>{status === 'ready' ? 'Live from my flat' : 'My flat'}</span>
			</span>

			<svg
				class="battery"
				class:charging
				viewBox="0 0 220 56"
				role="img"
				aria-label={soc === null
					? 'Battery level unknown'
					: `Battery at ${Math.round(soc)} percent`}
			>
				<rect x="1" y="1" width="206" height="54" rx="3" class="shell" />
				<rect x="209" y="17" width="9" height="22" rx="2" class="cap" />
				{#each indices as i}
					<rect
						x={7 + i * 20}
						y="7"
						width="16"
						height="42"
						rx="1.5"
						class="cell"
						class:on={filled > i}
						class:tip={filled > i && filled < i + 1}
						style="--part: {Math.min(Math.max(filled - i, 0), 1)}"
					/>
				{/each}
			</svg>

			<span class="gauge-read">
				<span class="gauge-big data"
					>{soc === null ? '––' : Math.round($level)}<small>%</small></span
				>
				<span class="gauge-side data">
					{#if status === 'ready' && solarToday !== null}
						{solarToday.toFixed(1)} kWh solar today
					{:else if status === 'error' || status === 'empty'}
						Not reporting right now
					{:else}
						Checking in…
					{/if}
				</span>
			</span>

			{#if cups !== null}
				<span class="gauge-tea data">
					<span class="cups" aria-hidden="true">
						{#each cupIcons as i}
							<svg class="cup" viewBox="0 0 24 24" style="--i: {i}">
								<path
									class="steam"
									d="M8 7c-1-1.5 1-2.5 0-4M12 7c-1-1.5 1-2.5 0-4M16 7c-1-1.5 1-2.5 0-4"
								/>
								<path
									class="mug"
									d="M4 10h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 11h1.5a2.5 2.5 0 0 1 0 5H17"
								/>
							</svg>
						{/each}
					</span>
					<span>{cups} {cups === 1 ? 'cup' : 'cups'} of tea today (estimated from the kettle)</span>
				</span>
			{/if}

			<span class="gauge-foot data">
				{#if build}
					{compact(build.written)} tokens · {compact(build.linesAdded)} lines · {compact(
						build.commits
					)} commits today
				{:else}
					&nbsp;
				{/if}
			</span>
		</a>
	</div>

	<a
		href="https://github.com/EddWills95/edd-williams"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="View this site's source code on GitHub"
		class="peel absolute bottom-0 right-0 bg-white text-black w-24 h-20 bg-bottom
    before:absolute before:w-48 before:h-40 before:-top-28 before:-left-24 before:rotate-45 before:bg-gunmetal
    hover:before:-translate-x-2 hover:before:-translate-y-2 before:transition-transform
    "
		style="background-image: url('./code.png')"
	></a>
</section>

<style>
	.hero-title {
		font-size: clamp(2.25rem, 6vw, 4rem);
		line-height: 1.05;
		font-weight: 500;
		letter-spacing: -0.02em;
		text-wrap: balance;
	}

	.hero-title span + span {
		margin-top: 0.75rem;
		font-size: clamp(1.5rem, 3.2vw, 2rem);
		line-height: 1.2;
		letter-spacing: 0;
		font-weight: 400;
	}

	.hero-link {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		color: #e0fbfc;
		text-decoration: underline;
		text-decoration-color: rgba(152, 193, 217, 0.6);
		text-underline-offset: 6px;
		transition: text-decoration-color 0.15s ease-out;
	}

	.hero-link:hover {
		text-decoration-color: #f28b72;
	}

	.data {
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
		font-variant-numeric: lining-nums tabular-nums;
	}

	/* Same blueprint sheet as the Solar and Code panels: hairline grid, ruled border. */
	.gauge {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-height: 19rem;
		padding: 1.25rem;
		border: 2px solid rgba(152, 193, 217, 0.6);
		border-radius: 2px;
		background-image:
			linear-gradient(rgba(152, 193, 217, 0.045) 1px, transparent 1px),
			linear-gradient(90deg, rgba(152, 193, 217, 0.045) 1px, transparent 1px);
		background-size: 8px 8px;
		transition: background-color 0.2s ease-out;
	}

	.gauge:hover {
		background-color: rgba(61, 90, 128, 0.25);
	}

	.gauge-head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #98c1d9;
	}

	.battery {
		width: 100%;
		height: auto;
	}

	.shell {
		fill: none;
		stroke: #98c1d9;
		stroke-width: 2;
	}

	.cap {
		fill: #98c1d9;
	}

	.cell {
		fill: rgba(152, 193, 217, 0.12);
	}

	.cell.on {
		fill: #f28b72;
		fill-opacity: 1;
	}

	.cell.tip {
		fill-opacity: calc(0.35 + var(--part) * 0.65);
	}

	.battery.charging .cell.tip {
		animation: cell-breathe 1.6s ease-in-out infinite;
	}

	@keyframes cell-breathe {
		50% {
			fill-opacity: 0.25;
		}
	}

	.gauge-read {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.25rem 1rem;
	}

	.gauge-big {
		font-size: 2.75rem;
		line-height: 1;
		color: #e0fbfc;
	}

	.gauge-big small {
		margin-left: 0.15rem;
		font-size: 1.25rem;
		color: #98c1d9;
	}

	.gauge-side {
		font-size: 0.875rem;
		color: #98c1d9;
	}

	.gauge-tea {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #98c1d9;
	}

	.cups {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.cup {
		width: 1.5rem;
		height: 1.5rem;
		fill: none;
		stroke: #e0fbfc;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.cup .steam {
		stroke: #f28b72;
		animation: steam 2.4s ease-in-out infinite;
		animation-delay: calc(var(--i) * 0.3s);
	}

	@keyframes steam {
		0%,
		100% {
			opacity: 0.2;
			transform: translateY(1px);
		}
		50% {
			opacity: 1;
			transform: translateY(-1px);
		}
	}

	.gauge-foot {
		margin-top: auto;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(152, 193, 217, 0.3);
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #98c1d9;
		min-height: 2.25rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.battery.charging .cell.tip,
		.cup .steam {
			animation: none;
		}

		.hero-link,
		.gauge {
			transition: none;
		}
	}
</style>
