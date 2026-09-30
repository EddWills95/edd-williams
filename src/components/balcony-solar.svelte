<script>
	import { onMount, onDestroy } from 'svelte';
	import FlowCanvas from './balcony-solar-canvas.svelte';
	import { energyStats } from '$lib/live-stats.js';
	import { replay } from '$lib/replay.js';
	import DayStrip from './balcony-solar-day.svelte';

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
	// While the day strip is being scrubbed (or plays out), the diagram shows that moment instead.
	$: replaying = $replay !== null && !!stats;
	$: live = status === 'ready' && (replaying || !stale);
	$: view = replaying
		? {
				...stats,
				solarPowerW: $replay.solarW ?? undefined,
				housePowerW: $replay.houseW ?? undefined,
				gridPowerW: $replay.gridW ?? undefined,
				batterySoc: $replay.soc ?? stats.batterySoc,
				batteryPowerW: Math.abs($replay.batteryW ?? 0),
				batteryAction:
					$replay.batteryW === null
						? 'Unknown'
						: $replay.batteryW > 25
							? 'Discharging'
							: $replay.batteryW < -25
								? 'Charging'
								: 'Holding',
				solarGenerationTodayKwh: $replay.solarKwh ?? 0
			}
		: stats;

	$: hasSolarNow = isNum(view?.solarPowerW);
	$: hasHouse = isNum(view?.housePowerW);
	$: hasGrid = isNum(view?.gridPowerW);
	$: hasSavingsToday = isNum(view?.batterySavingsToday);
	$: hasTea = isNum(view?.kettleCupsToday);
	$: batteryMoving =
		isNum(view?.batteryPowerW) &&
		Math.abs(view.batteryPowerW) > 0 &&
		(view.batteryAction === 'Charging' || view.batteryAction === 'Discharging');
	$: gridDirection = !hasGrid
		? null
		: Math.abs(view.gridPowerW) < 5
			? 'balanced'
			: view.gridPowerW > 0
				? 'importing'
				: 'exporting';

	// Flows only animate on a fresh reading — motion on old numbers would be a lie.
	$: flows = live
		? {
				solar: {
					active: hasSolarNow && view.solarPowerW > 0,
					reverse: false,
					seconds: secondsFor(view.solarPowerW ?? 0)
				},
				load: {
					active: hasHouse && view.housePowerW > 0,
					reverse: false,
					seconds: secondsFor(view.housePowerW ?? 0)
				},
				battery: {
					active: batteryMoving,
					reverse: view.batteryAction === 'Discharging',
					seconds: secondsFor(view.batteryPowerW ?? 0)
				},
				grid: {
					active: gridDirection === 'importing' || gridDirection === 'exporting',
					reverse: gridDirection === 'exporting',
					seconds: secondsFor(view.gridPowerW ?? 0)
				}
			}
		: {};

	$: summary = view
		? [
				hasSolarNow
					? `balcony solar panels producing ${formatPower(view.solarPowerW)}`
					: `balcony solar panels have produced ${kwh(view.solarGenerationTodayKwh, 2)} kWh today`,
				`battery at ${Math.round(view.batterySoc)}%${batteryMoving ? `, ${view.batteryAction.toLowerCase()} at ${formatPower(view.batteryPowerW)}` : ''}`,
				hasHouse ? `flat using ${formatPower(view.housePowerW)}` : null,
				gridDirection === 'importing' || gridDirection === 'exporting'
					? `${gridDirection} ${formatPower(view.gridPowerW)} ${gridDirection === 'importing' ? 'from' : 'to'} the grid`
					: gridDirection === 'balanced'
						? 'drawing nothing from the grid'
						: null
			]
				.filter(Boolean)
				.join('; ')
		: '';

	const UNKNOWN = { value: '––', detail: '' };
	$: nodes =
		status === 'ready' && view
			? {
					solar: hasSolarNow
						? {
								value: formatPower(view.solarPowerW),
								detail: `${kwh(view.solarGenerationTodayKwh, 2)} kWh today`
							}
						: { value: `${kwh(view.solarGenerationTodayKwh, 2)} kWh`, detail: 'generated today' },
					battery: {
						value: `${Math.round(view.batterySoc)}%`,
						detail: `${view.batteryAction ?? 'Unknown'}${batteryMoving ? ` · ${formatPower(view.batteryPowerW)}` : ''}`
					},
					grid: hasGrid
						? {
								value: gridDirection === 'balanced' ? '0 W' : formatPower(view.gridPowerW),
								detail: gridDirection
							}
						: UNKNOWN,
					load: hasHouse ? { value: formatPower(view.housePowerW), detail: 'in use' } : UNKNOWN
				}
			: { solar: UNKNOWN, battery: UNKNOWN, grid: UNKNOWN, load: UNKNOWN };

	const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
</script>

<!-- #home-lab is the section's old name; kept so links that already exist still land here. -->
<span class="anchor" id="home-lab"></span>
<span class="anchor" id="solar"></span>
<section class="base-section justify-start" aria-labelledby="solar-heading">
	<h2 id="solar-heading" class="section-title">Solar</h2>

	<p class="mt-2 max-w-prose text-light-cyan text-base">
		Alongside the day job: solar panels on my balcony, a battery in the flat, and a pile of
		self-hosted services keeping an eye on it all. This is the flat's power as a single-line
		diagram, drawn from the same Home Assistant setup that runs it: the lines move when power does.
	</p>

	<figure class="sheet mt-4" aria-busy={status === 'loading'}>
		{#if mocked}
			<p class="mock-flag">Mock data: dev fixture, not real readings</p>
		{/if}

		<FlowCanvas
			{flows}
			{nodes}
			soc={status === 'ready' ? view.batterySoc : null}
			sunOut={live && hasSolarNow && view.solarPowerW > 0}
			dim={status !== 'ready' || (stale && !replaying)}
		/>

		{#if replaying}
			<p class="replay-flag" aria-hidden="true">
				Replaying {new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(
					$replay.t
				)}
			</p>
		{/if}

		{#if status === 'ready'}
			<DayStrip />
			<p class="sr-only">
				{replaying ? 'Replaying an earlier moment' : 'Live reading from the flat'}: {summary}.
			</p>
		{/if}

		<figcaption class="title-block" class:has-tea={hasTea && status === 'ready'}>
			{#if status === 'loading'}
				<p class="state-note col-span-full">Checking in with the flat…</p>
			{:else if status === 'error'}
				<div class="state-note col-span-full flex flex-wrap items-center gap-x-4 gap-y-2">
					<p>
						Couldn't reach the live stats right now — the flat might be offline, or having a nap.
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

				<div class="cell cell-last">
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
		container-type: inline-size;
		width: 100%;
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

	.replay-flag {
		position: absolute;
		top: 0.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		padding: 0 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		background: #293241;
		color: #e0fbfc;
		pointer-events: none;
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
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
		font-variant-numeric: lining-nums tabular-nums;
	}

	.label {
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #98c1d9;
	}

	.detail {
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #98c1d9;
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
	.cell-wide {
		grid-column: span 2 / span 2;
	}

	/* Narrow sheet, two columns: solar | tea pair up, the last reading spans the row. */
	.has-tea .cell-last {
		grid-column: span 2 / span 2;
	}

	@container (max-width: 29.99rem) {
		.title-block .cell:nth-child(even):not(.cell-feature):not(.cell-wide) {
			border-left: 1px solid rgba(152, 193, 217, 0.3);
		}
	}

	/* Mid-width sheet (a half-width column, say): the facts run three across instead of a tall
	   two-column stack. */
	@container (min-width: 30rem) {
		.title-block,
		.has-tea {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.cell-feature,
		.cell-wide {
			grid-column: span 3 / span 3;
		}

		.has-tea .cell-last {
			grid-column: auto;
		}

		.title-block .cell:nth-child(n + 3):not(.cell-wide) {
			border-left: 1px solid rgba(152, 193, 217, 0.3);
		}
	}

	.cell-feature {
		border-top: 0;
	}

	@container (min-width: 44rem) {
		.title-block {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}

		.cell {
			border-top: 0;
			border-left: 1px solid rgba(152, 193, 217, 0.3);
		}

		.title-block {
			grid-template-columns: minmax(0, 1.5fr) repeat(3, minmax(0, 1fr));
		}

		.has-tea {
			grid-template-columns: minmax(0, 1.5fr) repeat(4, minmax(0, 1fr));
		}

		.cell-feature,
		.cell-wide,
		.cell-tea,
		.has-tea .cell-last {
			grid-column: auto;
		}

		.cell-feature {
			border-left: 0;
		}
	}

	/* Beside the Build sheet the page's row sets the width. */
	@media (min-width: 1280px) {
		.sheet {
			max-width: none;
		}
	}

	.big {
		font-size: 1.625rem;
		line-height: 1.2;
		color: #f28b72;
		overflow-wrap: anywhere;
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
