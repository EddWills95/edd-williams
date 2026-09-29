<script>
	import { onMount, onDestroy } from 'svelte';
	import FlatDrawing from './home-lab-flat.svelte';
	import { energyStats } from '$lib/live-stats.js';

	// The proxy caches for a minute and we poll every ~75s; well past that, the flat has stopped
	// checking in.
	const STALE_AFTER_MS = 5 * 60_000;

	let now = Date.now();
	let clock;

	$: status = $energyStats.status;
	$: stats = $energyStats.data;
	$: mocked = $energyStats.mocked;
	// Each fresh reading resets "now" so the freshness maths never lags the data.
	$: if (stats) now = Date.now();

	onMount(() => {
		clock = setInterval(() => (now = Date.now()), 30_000);
	});

	onDestroy(() => clearInterval(clock));

	const isNum = (value) => typeof value === 'number' && Number.isFinite(value);

	function formatPower(watts) {
		const w = Math.abs(watts);
		return w >= 1000 ? `${(w / 1000).toFixed(w >= 10_000 ? 0 : 1)} kW` : `${Math.round(w)} W`;
	}

	const kwh = (value, digits) =>
		value.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });

	const relative = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
	function ago(ms) {
		const minutes = Math.round(ms / 60_000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return relative.format(-minutes, 'minute');
		const hours = Math.round(minutes / 60);
		if (hours < 48) return relative.format(-hours, 'hour');
		return relative.format(-Math.round(hours / 24), 'day');
	}

	// Speed tracks power: a trickle crawls, a few kW races. Clamped so it never strobes.
	const secondsFor = (watts) => Math.max(0.45, 2.4 - Math.log10(Math.max(Math.abs(watts), 10)));

	$: asOf = stats?.asOf ? new Date(stats.asOf) : null;
	$: validAsOf = asOf && !Number.isNaN(asOf.getTime()) ? asOf : null;
	$: stale =
		status === 'ready' &&
		(stats?.stale === true || !validAsOf || now - validAsOf.getTime() > STALE_AFTER_MS);
	$: live = status === 'ready' && !stale;

	$: hasSolarNow = isNum(stats?.solarPowerW);
	$: hasHouse = isNum(stats?.housePowerW);
	$: hasGrid = isNum(stats?.gridPowerW);
	$: hasSavingsToday = isNum(stats?.batterySavingsToday);
	$: hasTea = isNum(stats?.kettleCupsToday);
	$: batteryMoving =
		isNum(stats?.batteryPowerW) &&
		Math.abs(stats.batteryPowerW) > 0 &&
		(stats.batteryAction === 'Charging' || stats.batteryAction === 'Discharging');
	$: gridDirection = !hasGrid
		? null
		: Math.abs(stats.gridPowerW) < 5
			? 'balanced'
			: stats.gridPowerW > 0
				? 'importing'
				: 'exporting';

	// Flows only animate on a fresh reading — motion on old numbers would be a lie.
	$: flows = live
		? {
				solar: {
					active: hasSolarNow && stats.solarPowerW > 0,
					reverse: false,
					seconds: secondsFor(stats.solarPowerW ?? 0)
				},
				load: {
					active: hasHouse && stats.housePowerW > 0,
					reverse: false,
					seconds: secondsFor(stats.housePowerW ?? 0)
				},
				battery: {
					active: batteryMoving,
					reverse: stats.batteryAction === 'Discharging',
					seconds: secondsFor(stats.batteryPowerW ?? 0)
				},
				grid: {
					active: gridDirection === 'importing' || gridDirection === 'exporting',
					reverse: gridDirection === 'exporting',
					seconds: secondsFor(stats.gridPowerW ?? 0)
				}
			}
		: {};

	$: summary = stats
		? [
				hasSolarNow
					? `balcony solar panels producing ${formatPower(stats.solarPowerW)}`
					: `balcony solar panels have produced ${kwh(stats.solarGenerationTodayKwh, 2)} kWh today`,
				`battery at ${Math.round(stats.batterySoc)}%${batteryMoving ? `, ${stats.batteryAction.toLowerCase()} at ${formatPower(stats.batteryPowerW)}` : ''}`,
				hasHouse ? `flat using ${formatPower(stats.housePowerW)}` : null,
				gridDirection === 'importing' || gridDirection === 'exporting'
					? `${gridDirection} ${formatPower(stats.gridPowerW)} ${gridDirection === 'importing' ? 'from' : 'to'} the grid`
					: gridDirection === 'balanced'
						? 'drawing nothing from the grid'
						: null
			]
				.filter(Boolean)
				.join('; ')
		: '';

	const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
</script>

<span class="anchor" id="home-lab"></span>
<section class="base-section justify-start" aria-labelledby="home-lab-heading">
	<h2 id="home-lab-heading" class="text-2xl mb-4">Home Lab</h2>

	<p class="p-4 mt-4 text-light-cyan text-base max-w-[65ch]">
		Alongside the day job, I run a small home lab — solar, battery storage, and a pile of
		self-hosted services. This is my flat, drawn from the same Home Assistant setup that runs it:
		the lines move when power does.
	</p>

	<figure class="sheet mt-4" aria-busy={status === 'loading'}>
		{#if mocked}
			<p class="mock-flag">Mock data: dev fixture, not real readings</p>
		{/if}

		<div class="relative">
			<FlatDrawing
				{flows}
				soc={status === 'ready' ? stats.batterySoc : null}
				sunOut={live && hasSolarNow && stats.solarPowerW > 0}
				dim={status !== 'ready' || stale}
			/>

			{#if status === 'ready'}
				<p class="sr-only">Live reading from the flat: {summary}.</p>

				<dl class="readouts" aria-hidden="true">
					<div class="readout" style="--x: 80.5%; --y: 42%">
						<dt><span class="key key-solar"></span>Solar</dt>
						{#if hasSolarNow}
							<dd class="value nums">{formatPower(stats.solarPowerW)}</dd>
							<dd class="detail nums">{kwh(stats.solarGenerationTodayKwh, 2)} kWh today</dd>
						{:else}
							<dd class="value nums">{kwh(stats.solarGenerationTodayKwh, 2)} kWh</dd>
							<dd class="detail">generated today</dd>
						{/if}
					</div>

					<div class="readout" style="--x: 2%; --y: 31%">
						<dt><span class="key key-battery"></span>Battery</dt>
						<dd class="value nums">{Math.round(stats.batterySoc)}%</dd>
						<dd class="detail nums">
							{stats.batteryAction ?? 'Unknown'}{batteryMoving
								? ` · ${formatPower(stats.batteryPowerW)}`
								: ''}
						</dd>
					</div>

					{#if hasHouse}
						<div class="readout" style="--x: 80.5%; --y: 62%">
							<dt><span class="key key-load"></span>Flat</dt>
							<dd class="value nums">{formatPower(stats.housePowerW)}</dd>
							<dd class="detail">in use</dd>
						</div>
					{/if}

					{#if hasGrid}
						<div class="readout" style="--x: 2%; --y: 56%">
							<dt><span class="key key-grid"></span>Grid</dt>
							<dd class="value nums">
								{gridDirection === 'balanced' ? '0 W' : formatPower(stats.gridPowerW)}
							</dd>
							<dd class="detail">{gridDirection}</dd>
						</div>
					{/if}
				</dl>
			{/if}
		</div>

		<figcaption class="title-block" class:has-tea={hasTea && status === 'ready'}>
			{#if status === 'loading'}
				<p class="state-note col-span-full">Checking in with the flat…</p>
			{:else if status === 'error'}
				<div class="state-note col-span-full flex flex-wrap items-center gap-x-4 gap-y-2">
					<p>
						Couldn't reach the live stats right now — the home lab might be offline, or having a
						nap.
					</p>
					<button type="button" class="retry" on:click={() => energyStats.refresh()}
						>Try again</button
					>
				</div>
			{:else}
				{#if stale}
					<p class="state-note col-span-full" role="status">
						The flat last checked in {validAsOf ? ago(now - validAsOf.getTime()) : 'a while ago'}
						— it might be having a nap, so these numbers are frozen until it wakes up.
					</p>
				{/if}

				<div class="cell cell-feature">
					<span class="label">Saved by the battery</span>
					<span class="big nums">£{stats.batterySavingsTotal.toFixed(2)}</span>
					<span class="detail nums">
						{#if hasSavingsToday}£{stats.batterySavingsToday.toFixed(2)} of it today{:else}since it
							went in{/if}
					</span>
				</div>

				<div class="cell">
					<span class="label">Solar, all time</span>
					<span class="mid nums">{kwh(stats.solarGenerationTotalKwh, 0)} kWh</span>
				</div>

				{#if hasTea}
					<div class="cell cell-tea">
						<span class="label">Tea, today</span>
						<span class="mid nums"
							>{stats.kettleCupsToday} {stats.kettleCupsToday === 1 ? 'cup' : 'cups'}</span
						>
						<span class="detail">estimated from the kettle</span>
					</div>
				{/if}

				<div class="cell">
					<span class="label">Last reading</span>
					{#if validAsOf}
						<time class="mid nums" datetime={validAsOf.toISOString()}
							>{timeFormat.format(validAsOf)}</time
						>
						<span class="detail">{ago(now - validAsOf.getTime())}</span>
					{:else}
						<span class="mid">Unknown</span>
					{/if}
				</div>

				<div class="cell cell-wide">
					<span class="label">Drawn from</span>
					<span class="detail text-light-cyan">Home Assistant, via a tiny proxy</span>
					<a
						class="source-link"
						href="https://github.com/EddWills95/edd-williams/tree/main/energy-proxy"
						target="_blank"
						rel="noopener noreferrer">How it's built →</a
					>
				</div>
			{/if}
		</figcaption>
	</figure>
</section>

<style>
	/* Plain CSS rather than @apply: Tailwind-in-<style> sends vite-plugin-svelte's dependency
	   watcher into infinite recursion in dev. Colours are the tailwind.config.cjs tokens. */
	.sheet {
		position: relative;
		max-width: 40rem;
		margin-left: auto;
		margin-right: auto;
		border: 2px solid rgba(152, 193, 217, 0.6);
		border-radius: 2px;
		background-image:
			linear-gradient(rgba(152, 193, 217, 0.045) 1px, transparent 1px),
			linear-gradient(90deg, rgba(152, 193, 217, 0.045) 1px, transparent 1px);
		background-size: 8px 8px;
	}

	.mock-flag {
		position: absolute;
		top: -0.875rem;
		right: 0.75rem;
		z-index: 10;
		padding: 0 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		background: #293241;
		color: #f28b72;
	}

	.nums {
		font-variant-numeric: lining-nums tabular-nums;
	}

	/* Readouts: a key grid under the drawing on small screens, pinned beside their part of
	   the flat from md up. */
	.readouts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.25rem 1rem;
		padding: 0.5rem 1rem 1.25rem;
		border-top: 1px solid rgba(152, 193, 217, 0.3);
	}

	.readout {
		display: flex;
		flex-direction: column;
	}

	.readout dt,
	.label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #98c1d9;
	}

	.key {
		display: inline-block;
		width: 1rem;
		height: 0.25rem;
		border-radius: 9999px;
	}

	.key-solar {
		background: #f28b72;
	}
	.key-battery {
		background: #e0fbfc;
	}
	.key-load {
		background: #f9c8bd;
	}
	.key-grid {
		background: #98c1d9;
	}

	.value {
		font-size: 1.5rem;
		line-height: 1.25;
		color: #e0fbfc;
	}

	.detail {
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #98c1d9;
	}

	@media (min-width: 768px) {
		.readouts {
			display: block;
			padding: 0;
			border: 0;
		}

		.readout {
			position: absolute;
			left: var(--x);
			top: var(--y);
		}

		.value {
			font-size: 1.125rem;
		}

		.readout dt,
		.label,
		.detail {
			font-size: 0.75rem;
			line-height: 1rem;
		}
	}

	/* Title block: the corner of an architect's sheet where the drawing's facts live. */
	.title-block {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		border-top: 2px solid rgba(152, 193, 217, 0.6);
		font-size: 1rem;
	}

	.cell {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 1rem;
		border-top: 1px solid rgba(152, 193, 217, 0.3);
	}

	.cell-feature,
	.cell-wide,
	.cell-tea {
		grid-column: span 2 / span 2;
	}

	.cell-feature {
		border-top: 0;
	}

	@media (min-width: 640px) {
		.title-block {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}

		.cell {
			border-top: 0;
			border-left: 1px solid rgba(152, 193, 217, 0.3);
		}

		.has-tea {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}

		.cell-feature,
		.cell-wide,
		.cell-tea {
			grid-column: auto;
		}

		.cell-feature {
			border-left: 0;
		}
	}

	.big {
		font-size: 1.875rem;
		line-height: 1.2;
		color: #f28b72;
	}

	.mid {
		font-size: 1.25rem;
		line-height: 1.25;
		color: #e0fbfc;
	}

	.state-note {
		padding: 1rem;
		color: #e0fbfc;
		font-style: italic;
	}

	.retry {
		font-style: normal;
		padding: 0.25rem 0.75rem;
		border: 2px solid #98c1d9;
		border-radius: 2px;
		color: #e0fbfc;
		transition: background-color 0.15s ease-out;
	}

	.retry:hover {
		background: #3d5a80;
	}

	.source-link {
		font-size: 0.875rem;
		text-decoration: underline;
		text-underline-offset: 4px;
		color: #a2b7d3;
	}

	.source-link:hover {
		color: #e0fbfc;
	}

	.retry:focus-visible,
	.source-link:focus-visible {
		outline: 2px solid #f28b72;
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.retry {
			transition: none;
		}
	}
</style>
