<script>
	import { onMount } from 'svelte';

	// A section drawing through a block of flats, with mine cut away on the second floor,
	// halfway up. Every
	// cable is drawn "source → consumer unit" (or "consumer unit → load"); a flow runs along its
	// cable only when the live reading says power is actually moving that way, and `reverse`
	// flips it (battery discharging, grid exporting).
	//
	// flows: { solar, load, battery, grid } each { active: boolean, reverse: boolean, seconds: number }
	export let flows = {};
	export let soc = null; // battery state of charge, 0–100, or null when unknown
	export let sunOut = false; // only true when solar is generating right now
	export let dim = false;

	const BUILDING = { left: 190, right: 530, roof: 90, ground: 410 };
	const STOREY = 80;
	// Floor slabs, top storey first. Mine is the second floor (base 250).
	const FLOOR_BASES = [170, 250, 330, 410];
	const MY_FLOOR_BASE = 250;
	const BALCONY = { left: 530, right: 626 };

	// The neighbours' windows: two per flat, plus a third on the upper floors.
	const neighbourWindows = FLOOR_BASES.filter((base) => base !== MY_FLOOR_BASE).flatMap((base) => {
		const top = base - STOREY + 22;
		const xs = base === BUILDING.ground ? [222, 420] : [222, 300, 420];
		return xs.map((x) => ({ x, y: top, w: 48, h: 34 }));
	});

	// Balconies on every storey above the ground; only mine carries panels.
	const balconyBases = FLOOR_BASES.filter((base) => base !== BUILDING.ground);
	const balusters = Array.from({ length: 8 }, (_, i) => BALCONY.left + 10 + i * 11);

	// Panels clipped to my balcony railing, tilted a touch outward to catch the sun.
	const panels = [0, 1, 2].map((i) => {
		const x = BALCONY.left + 7 + i * 29;
		return `${x},246 ${x + 26},246 ${x + 31},210 ${x + 5},210`;
	});

	const CABLES = {
		solar: 'M536 232 H500 V202 H358',
		load: 'M358 221 H420',
		battery: 'M322 218 H258',
		// Up the building's service riser, two storeys, then across the ceiling to the fuse box.
		grid: 'M100 410 V426 H206 V178 H340 V192'
	};

	// Where each flow's direction chevron sits, and its heading in degrees for the forward direction.
	const CHEVRONS = {
		solar: { x: 440, y: 202, angle: 180 },
		load: { x: 389, y: 221, angle: 0 },
		battery: { x: 290, y: 218, angle: 180 },
		grid: { x: 206, y: 300, angle: -90 }
	};

	const COLORS = {
		solar: '#F28B72',
		load: '#F9C8BD',
		battery: '#E0FBFC',
		grid: '#98C1D9'
	};

	// Below md the readouts move under the drawing, so crop the empty margins that only exist to
	// hold them and let the building fill the narrow width.
	let compact = false;
	onMount(() => {
		const query = window.matchMedia('(max-width: 767px)');
		const update = () => (compact = query.matches);
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	});

	const BATTERY = { x: 222, y: 188, w: 36, h: 58 };
	$: fillHeight = soc === null ? 0 : (Math.min(Math.max(soc, 0), 100) / 100) * (BATTERY.h - 8);
</script>

<svg
	viewBox={compact ? '64 14 590 430' : '0 20 800 440'}
	class="flat block w-full h-auto"
	class:dim
	aria-hidden="true"
	focusable="false"
>
	<defs>
		<pattern id="ground-hatch" width="10" height="10" patternUnits="userSpaceOnUse">
			<path d="M0 10 L10 0" class="structure" />
		</pattern>
	</defs>

	<!-- sun, only when the panels are actually producing -->
	{#if sunOut}
		<g transform="translate(612 52)">
			<circle r="16" fill={COLORS.solar} />
			{#each [0, 45, 90, 135, 180, 225, 270, 315] as a (a)}
				<line
					x1="0"
					y1="-24"
					x2="0"
					y2="-30"
					stroke={COLORS.solar}
					stroke-width="3"
					stroke-linecap="round"
					transform="rotate({a})"
				/>
			{/each}
		</g>
	{/if}

	<!-- ground -->
	<rect x="0" y="410" width="800" height="30" fill="url(#ground-hatch)" />
	<line x1="0" y1="410" x2="800" y2="410" class="structure strong" />

	<!-- street feeder pillar: where the grid comes in -->
	<g class="structure strong">
		<rect x="80" y="360" width="40" height="50" rx="3" />
	</g>
	<line x1="88" y1="370" x2="112" y2="370" class="structure" />

	<!-- the block -->
	<g class="structure strong">
		<rect
			x={BUILDING.left}
			y={BUILDING.roof}
			width={BUILDING.right - BUILDING.left}
			height={BUILDING.ground - BUILDING.roof}
		/>
		<!-- parapet -->
		<rect
			x={BUILDING.left - 4}
			y={BUILDING.roof - 8}
			width={BUILDING.right - BUILDING.left + 8}
			height="8"
		/>
	</g>
	<g class="structure">
		{#each FLOOR_BASES.slice(0, -1) as base (base)}
			<line x1={BUILDING.left} y1={base} x2={BUILDING.right} y2={base} />
		{/each}
		{#each neighbourWindows as w (`${w.x}-${w.y}`)}
			<rect x={w.x} y={w.y} width={w.w} height={w.h} />
			<line x1={w.x + w.w / 2} y1={w.y} x2={w.x + w.w / 2} y2={w.y + w.h} />
		{/each}
		<!-- communal entrance -->
		<rect x="332" y="352" width="44" height="58" />
		<line x1="324" y1="346" x2="384" y2="346" />
	</g>

	<!-- balconies -->
	{#each balconyBases as base (base)}
		<g class="structure" class:mine={base === MY_FLOOR_BASE}>
			<rect x={BALCONY.left} y={base - 4} width={BALCONY.right - BALCONY.left} height="4" />
			<line x1={BALCONY.left} y1={base - 36} x2={BALCONY.right} y2={base - 36} />
			<line x1={BALCONY.right} y1={base - 36} x2={BALCONY.right} y2={base - 4} />
			{#each balusters as x (x)}
				<line x1={x} y1={base - 36} x2={x} y2={base - 4} />
			{/each}
		</g>
	{/each}

	<!-- service riser: the shared duct the supply climbs to reach my floor -->
	<rect
		x="198"
		y={MY_FLOOR_BASE - STOREY}
		width="16"
		height={BUILDING.ground - MY_FLOOR_BASE + STOREY}
		class="riser"
	/>

	<!-- my flat, cut away -->
	<rect
		x={BUILDING.left}
		y={MY_FLOOR_BASE - STOREY}
		width={BUILDING.right - BUILDING.left}
		height={STOREY}
		class="my-flat"
	/>

	<!-- solar panels on my balcony railing -->
	<g class="panels">
		{#each panels as points (points)}
			<polygon {points} />
		{/each}
	</g>

	<!-- battery with a live state-of-charge fill -->
	<rect
		x={BATTERY.x}
		y={BATTERY.y}
		width={BATTERY.w}
		height={BATTERY.h}
		rx="4"
		class="structure strong"
	/>
	<rect x={BATTERY.x + 12} y={BATTERY.y - 5} width="12" height="5" rx="1" class="node" />
	{#if fillHeight > 0}
		<rect
			x={BATTERY.x + 4}
			y={BATTERY.y + BATTERY.h - 4 - fillHeight}
			width={BATTERY.w - 8}
			height={fillHeight}
			rx="2"
			fill={COLORS.battery}
		/>
	{/if}

	<!-- socket: the flat's load -->
	<rect x="420" y="212" width="24" height="18" rx="3" class="structure strong" />
	<circle cx="428" cy="221" r="1.8" class="node" />
	<circle cx="436" cy="221" r="1.8" class="node" />

	<!-- cables, then the live flows along them -->
	{#each Object.entries(CABLES) as [key, d] (key)}
		<path {d} class="cable" />
	{/each}
	{#each Object.entries(CABLES) as [key, d] (key)}
		{@const flow = flows[key]}
		{#if flow?.active}
			<path
				{d}
				class="flow"
				class:reverse={flow.reverse}
				stroke={COLORS[key]}
				style="animation-duration: {flow.seconds}s"
			/>
			<g
				transform="translate({CHEVRONS[key].x} {CHEVRONS[key].y}) rotate({CHEVRONS[key].angle +
					(flow.reverse ? 180 : 0)})"
			>
				<circle r="9" class="chevron-bg" />
				<path d="M-3 -5 L3 0 L-3 5" stroke={COLORS[key]} class="chevron" />
			</g>
		{/if}
	{/each}

	<!-- consumer unit: where every cable meets -->
	<rect x="322" y="192" width="36" height="36" rx="3" class="hub" />
	<line x1="329" y1="203" x2="351" y2="203" class="structure" />
	<line x1="329" y1="210" x2="351" y2="210" class="structure" />
	<line x1="329" y1="217" x2="351" y2="217" class="structure" />
</svg>

<style>
	.flat {
		transition: opacity 0.4s ease-out;
	}

	.flat.dim {
		opacity: 0.55;
	}

	.structure {
		fill: none;
		stroke: rgba(152, 193, 217, 0.45);
		stroke-width: 1.5;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.structure.strong,
	.structure.mine {
		stroke: #98c1d9;
		stroke-width: 2;
	}

	.structure.mine {
		stroke-width: 1.5;
	}

	.my-flat {
		fill: rgba(152, 193, 217, 0.08);
		stroke: #e0fbfc;
		stroke-width: 2;
	}

	.riser {
		fill: rgba(152, 193, 217, 0.05);
		stroke: rgba(152, 193, 217, 0.45);
		stroke-width: 1;
		stroke-dasharray: 4 4;
	}

	.node {
		fill: #98c1d9;
	}

	.panels polygon {
		fill: #3d5a80;
		stroke: #98c1d9;
		stroke-width: 1.5;
		stroke-linejoin: round;
	}

	.hub {
		fill: #293241;
		stroke: #e0fbfc;
		stroke-width: 2;
	}

	.cable {
		fill: none;
		stroke: rgba(224, 251, 252, 0.28);
		stroke-width: 4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.flow {
		fill: none;
		stroke-width: 4;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 2 12;
		animation: flow-along linear infinite;
	}

	.flow.reverse {
		animation-direction: reverse;
	}

	.chevron-bg {
		fill: #293241;
	}

	.chevron {
		fill: none;
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	@keyframes flow-along {
		from {
			stroke-dashoffset: 14;
		}
		to {
			stroke-dashoffset: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.flat {
			transition: none;
		}

		/* Direction still reads from the chevrons; the dashes just hold still. */
		.flow {
			animation: none;
		}
	}
</style>
