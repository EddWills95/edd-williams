<script>
	import { onMount } from 'svelte';

	// The flat's power as a single-line diagram, drawn on a canvas so the stage is one fixed
	// surface: four nodes around a vertical bus bar, with dashes that run along each trace at a
	// speed that tracks the real watts. Nothing here is DOM layout, so nothing can drift or overlap.
	//
	// nodes: { solar, battery, grid, load } each { value, detail } (strings, '––' when unknown)
	// flows: { solar, load, battery, grid } each { active, reverse, seconds } (see balcony-solar.svelte)
	export let nodes = {};
	export let flows = {};
	export let soc = null; // 0–100 or null
	export let sunOut = false;
	export let dim = false;

	const COLORS = { solar: '#F28B72', battery: '#E0FBFC', load: '#F9C8BD', grid: '#98C1D9' };
	const LABELS = { solar: 'Solar', battery: 'Battery', grid: 'Grid', load: 'Flat' };
	const LINE = 'rgba(152, 193, 217, 0.6)';
	const CELLS = 10;
	const DASH = 14; // 2 dash + 12 gap, matches setLineDash below
	const PAD = 12;

	let wrap;
	let canvas;
	let W = 0;
	let H = 0;
	let dpr = 1;
	let reduced = false;
	let visible = false;
	let raf = 0;
	let last = 0;
	let phase = 0;
	let sunAngle = 0;
	let revealStart = null;
	let reveal = 1; // 0 → 1; plotted bottom-up the first time the stage is seen

	$: dataKey = JSON.stringify([nodes, flows, soc, sunOut, dim]);
	$: if (dataKey && canvas) draw();

	function layout() {
		const narrow = W < 480;
		const items = [];
		if (narrow) {
			const nodeH = 112;
			const nodeW = W - 72 - PAD;
			const gap = (H - 2 * PAD - 4 * nodeH) / 3;
			['solar', 'battery', 'grid', 'load'].forEach((key, i) => {
				items.push({ key, x: 72, y: PAD + i * (nodeH + gap), w: nodeW, h: nodeH, side: 'right' });
			});
			const first = items[0].y + nodeH / 2;
			const lastY = items[3].y + nodeH / 2;
			return { narrow, items, bus: { x: 28, y1: first - 14, y2: lastY + 14, vertical: true } };
		}
		const nodeW = Math.min(W * 0.34, 260);
		const nodeH = Math.min(112, (H - 2 * PAD - 24) / 2);
		const top = PAD;
		const bottom = H - PAD - nodeH;
		const left = PAD;
		const right = W - PAD - nodeW;
		items.push(
			{ key: 'solar', x: left, y: top, w: nodeW, h: nodeH, side: 'left' },
			{ key: 'grid', x: right, y: top, w: nodeW, h: nodeH, side: 'right' },
			{ key: 'battery', x: left, y: bottom, w: nodeW, h: nodeH, side: 'left' },
			{ key: 'load', x: right, y: bottom, w: nodeW, h: nodeH, side: 'right' }
		);
		const busX = W / 2;
		return {
			narrow,
			items,
			bus: { x: busX, y1: top + nodeH / 2 - 14, y2: bottom + nodeH / 2 + 14, vertical: true }
		};
	}

	// Each trace runs node → bus, so "forward" means power flowing from the node into the bus.
	function tracePoints(item, bus) {
		const cy = item.y + item.h / 2;
		if (item.side === 'left') return [item.x + item.w, cy, bus.x - 3, cy];
		return [item.x, cy, bus.x + 3, cy]; // right-hand nodes and the narrow stack
	}

	function forward(key) {
		const flow = flows[key];
		if (!flow?.active) return null;
		if (key === 'solar') return true; // generation always feeds the bus
		if (key === 'load') return false; // the bus always feeds the flat
		if (key === 'battery') return flow.reverse; // discharging feeds the bus
		return !flow.reverse; // grid: importing feeds the bus, exporting takes from it
	}

	function fitFont(ctx, text, weight, size, family, maxW) {
		let s = size;
		ctx.font = `${weight} ${s}px ${family}`;
		while (ctx.measureText(text).width > maxW && s > 11) {
			s -= 0.5;
			ctx.font = `${weight} ${s}px ${family}`;
		}
	}

	const SANS = "Raleway, 'Helvetica Neue', sans-serif";
	const MONO = "'IBM Plex Mono', ui-monospace, monospace";

	function drawNode(ctx, item) {
		const { key, x, y, w, h } = item;
		const data = nodes[key] ?? {};
		ctx.save();
		ctx.fillStyle = 'rgba(41, 50, 65, 0.92)';
		ctx.strokeStyle = LINE;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, 2);
		ctx.fill();
		ctx.stroke();

		const tx = x + 14;
		const inner = w - 28;
		ctx.textBaseline = 'alphabetic';

		// label with its key swatch
		ctx.fillStyle = COLORS[key];
		ctx.fillRect(tx, y + 19, 14, 4);
		ctx.fillStyle = '#98C1D9';
		ctx.font = `500 14px ${SANS}`;
		if ('letterSpacing' in ctx) ctx.letterSpacing = '0.7px';
		ctx.fillText(LABELS[key].toUpperCase(), tx + 22, y + 25);
		if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

		// value
		ctx.fillStyle = '#E0FBFC';
		fitFont(ctx, data.value ?? '––', 400, 24, MONO, inner);
		ctx.fillText(data.value ?? '––', tx, y + 56);

		// detail
		ctx.fillStyle = '#98C1D9';
		fitFont(ctx, data.detail ?? '', 400, 14, SANS, inner);
		ctx.fillText(data.detail ?? '', tx, y + 78);

		if (key === 'battery') {
			const barY = y + h - 20;
			const gap = 3;
			const cw = (inner - gap * (CELLS - 1)) / CELLS;
			const filled = soc === null ? 0 : (Math.min(Math.max(soc, 0), 100) / 100) * CELLS;
			for (let i = 0; i < CELLS; i++) {
				const part = Math.min(Math.max(filled - i, 0), 1);
				ctx.fillStyle = 'rgba(152, 193, 217, 0.14)';
				ctx.fillRect(tx + i * (cw + gap), barY, cw, 8);
				if (part > 0) {
					ctx.fillStyle = COLORS.solar;
					ctx.globalAlpha = 0.4 + part * 0.6;
					ctx.fillRect(tx + i * (cw + gap), barY, cw, 8);
					ctx.globalAlpha = 1;
				}
			}
		}

		if (key === 'solar') drawSun(ctx, x + w - 24, y + 24);
		ctx.restore();
	}

	function drawSun(ctx, cx, cy) {
		ctx.save();
		ctx.translate(cx, cy);
		ctx.strokeStyle = sunOut ? COLORS.solar : 'rgba(152, 193, 217, 0.5)';
		ctx.fillStyle = sunOut ? COLORS.solar : 'rgba(152, 193, 217, 0.25)';
		ctx.lineWidth = 2;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.rotate(sunOut ? sunAngle : 0);
		for (let i = 0; i < 8; i++) {
			ctx.rotate(Math.PI / 4);
			ctx.beginPath();
			ctx.moveTo(0, 9);
			ctx.lineTo(0, 13);
			ctx.stroke();
		}
		ctx.restore();
	}

	function drawTrace(ctx, item, bus) {
		const [x1, y1, x2, y2] = tracePoints(item, bus);
		ctx.save();
		ctx.lineCap = 'round';
		ctx.strokeStyle = 'rgba(224, 251, 252, 0.28)';
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();

		const dir = forward(item.key);
		if (dir !== null) {
			const seconds = flows[item.key]?.seconds ?? 1.5;
			const speed = DASH / seconds;
			const shift = (phase * speed) % DASH;
			ctx.strokeStyle = COLORS[item.key];
			ctx.lineWidth = 3;
			ctx.setLineDash([2, 12]);
			ctx.lineDashOffset = dir ? -shift : shift;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
			ctx.setLineDash([]);

			// A chevron at the midpoint: direction still reads when the dashes hold still.
			const mx = (x1 + x2) / 2;
			const my = (y1 + y2) / 2;
			const heading = (x2 >= x1 ? 0 : Math.PI) + (dir ? 0 : Math.PI);
			ctx.translate(mx, my);
			ctx.rotate(heading);
			ctx.fillStyle = 'rgba(41, 50, 65, 1)';
			ctx.fillRect(-7, -8, 14, 16);
			ctx.strokeStyle = COLORS[item.key];
			ctx.lineWidth = 2.5;
			ctx.lineJoin = 'round';
			ctx.beginPath();
			ctx.moveTo(-3, -5);
			ctx.lineTo(3, 0);
			ctx.lineTo(-3, 5);
			ctx.stroke();
		}
		ctx.restore();
	}

	function draw() {
		if (!canvas || !W || !H) return;
		const ctx = canvas.getContext('2d');
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, W, H);

		const { items, bus } = layout();
		ctx.save();
		if (reveal < 1) {
			const e = 1 - Math.pow(1 - reveal, 4);
			ctx.beginPath();
			ctx.rect(0, H * (1 - e), W, H * e + 1);
			ctx.clip();
		}
		ctx.globalAlpha = dim ? 0.45 : 1;

		// bus bar
		ctx.fillStyle = 'rgba(152, 193, 217, 0.16)';
		ctx.strokeStyle = '#E0FBFC';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(bus.x - 3, bus.y1, 6, bus.y2 - bus.y1, 2);
		ctx.fill();
		ctx.stroke();

		for (const item of items) drawTrace(ctx, item, bus);
		for (const item of items) drawNode(ctx, item);
		ctx.restore();
	}

	function size() {
		if (!wrap || !canvas) return;
		const rect = wrap.getBoundingClientRect();
		W = Math.round(rect.width);
		H = Math.round(rect.height);
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		draw();
	}

	function frame(now) {
		raf = 0;
		if (!visible || document.hidden) return;
		const dt = Math.min((now - last) / 1000, 0.1);
		last = now;
		phase += dt;
		sunAngle += dt * 0.35;
		if (revealStart === null) revealStart = now;
		reveal = Math.min((now - revealStart) / 1800, 1);
		draw();
		raf = requestAnimationFrame(frame);
	}

	function start() {
		if (reduced || raf) return;
		last = performance.now();
		raf = requestAnimationFrame(frame);
	}

	onMount(() => {
		reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!reduced) reveal = 0;

		const ro = new ResizeObserver(size);
		ro.observe(wrap);
		size();

		const io = new IntersectionObserver(
			([entry]) => {
				visible = entry.isIntersecting;
				if (visible) start();
			},
			{ threshold: 0.15 }
		);
		io.observe(wrap);

		const onVisibility = () => {
			if (!document.hidden) start();
		};
		document.addEventListener('visibilitychange', onVisibility);

		// The canvas doesn't trigger font loads; ask for them, then repaint with the real faces.
		Promise.all([
			document.fonts.load(`500 14px Raleway`),
			document.fonts.load(`400 14px Raleway`),
			document.fonts.load(`400 24px 'IBM Plex Mono'`)
		]).then(draw);

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
		};
	});
</script>

<div class="stage" bind:this={wrap}>
	<canvas bind:this={canvas} aria-hidden="true"></canvas>
</div>

<style>
	/* The stage's shape is set by CSS alone, so it holds its space before anything is drawn. */
	.stage {
		position: relative;
		width: 100%;
		aspect-ratio: 100 / 56;
	}

	@container (max-width: 29.99rem) {
		.stage {
			aspect-ratio: 100 / 165;
		}
	}

	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
