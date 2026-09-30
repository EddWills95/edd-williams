<script>
	import { onMount, onDestroy } from 'svelte';
	import { energyHistory } from '$lib/live-stats.js';
	import { replay } from '$lib/replay.js';

	// The last 24 hours of the flat as one strip: solar as a filled curve, the flat's use as a
	// stepped line, battery charge as a line on its own 0–100% scale. The first time it scrolls
	// into view the day plays out left to right, and the diagram above replays each moment as the
	// cursor passes it; afterwards the strip can be scrubbed by pointer or arrow keys. Like the
	// flow diagram it is one fixed canvas, so nothing in it can drift or overlap.

	const COLORS = { solar: '#F28B72', house: '#E0FBFC', battery: '#98C1D9' };
	const SANS = "Raleway, 'Helvetica Neue', sans-serif";
	const SWEEP_MS = 5500;

	$: data = valid($energyHistory.data) ? $energyHistory.data : null;

	function valid(d) {
		if (!d || !Array.isArray(d.batterySoc) || d.batterySoc.length < 8) return false;
		if (!Number.isFinite(Date.parse(d.start)) || !(d.intervalMinutes > 0)) return false;
		const n = d.batterySoc.length;
		const okSeries = (s) => s === undefined || (Array.isArray(s) && s.length === n);
		return okSeries(d.solarW) && okSeries(d.houseW) && okSeries(d.gridW) && okSeries(d.batteryW);
	}

	$: n = data ? data.batterySoc.length : 0;
	$: stepMs = data ? data.intervalMinutes * 60_000 : 0;
	// Bucket i covers [start + i*step, start + (i+1)*step); mark it by its midpoint.
	const timeAt = (i) => new Date(Date.parse(data.start) + (i + 0.5) * stepMs);

	let wrap;
	let canvas;
	let W = 0;
	let H = 0;
	let dpr = 1;
	let reduced = false;
	let raf = 0;
	let played = false; // has the intro sweep run (or been skipped)
	let sweepStart = null;
	let head = 0; // how far the day has been drawn, as a fractional bucket index
	let cursor = null; // scrubbed bucket index, or null when showing "now"
	let holdTimer;
	let visible = false;
	let io;

	const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

	// Scale to the solar peak and the flat's everyday load; brief spikes (the kettle) run off the
	// top of the plot instead of flattening everything else.
	function niceMax(solar, house) {
		const finite = (arr) => (arr ?? []).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
		const s = finite(solar);
		const h = finite(house);
		const peak = Math.max(
			500,
			s.length ? s[s.length - 1] : 0,
			h.length ? h[Math.floor((h.length - 1) * 0.97)] : 0
		);
		const step = peak > 3000 ? 1000 : 500;
		return Math.ceil(peak / step) * step;
	}

	const fmtW = (w) => (w >= 1000 ? `${(w / 1000).toFixed(1)} kW` : `${Math.round(w)} W`);

	function sampleAt(i) {
		const idx = Math.min(Math.max(Math.round(i), 0), n - 1);
		const pick = (s) => (s && Number.isFinite(s[idx]) ? s[idx] : null);
		const solarW = pick(data.solarW);
		const houseW = pick(data.houseW);
		const gridW = pick(data.gridW);
		// The proxy publishes battery power signed (positive discharging). Older responses without
		// it fall back to the power balance: what the flat uses is covered by solar, the grid and
		// the battery.
		const recorded = pick(data.batteryW);
		const batteryW = data.batteryW
			? recorded
			: solarW !== null && houseW !== null && gridW !== null
				? houseW - solarW - gridW
				: null;

		// Solar generated so far on that local day, from the buckets since local midnight.
		let solarKwh = null;
		if (data.solarW) {
			const day = timeAt(idx).toDateString();
			let wh = 0;
			for (let k = 0; k <= idx; k++) {
				if (timeAt(k).toDateString() === day && Number.isFinite(data.solarW[k])) {
					wh += data.solarW[k] * (stepMs / 3_600_000);
				}
			}
			solarKwh = wh / 1000;
		}
		return {
			idx,
			t: timeAt(idx),
			solarW,
			houseW,
			gridW,
			soc: pick(data.batterySoc),
			batteryW,
			solarKwh
		};
	}

	function publish(i) {
		if (!data) return;
		const s = sampleAt(i);
		replay.set({
			t: s.t,
			solarW: s.solarW,
			houseW: s.houseW,
			gridW: s.gridW,
			soc: s.soc,
			batteryW: s.batteryW,
			solarKwh: s.solarKwh
		});
	}

	function release() {
		clearTimeout(holdTimer);
		cursor = null;
		replay.set(null);
		draw();
	}

	function draw() {
		if (!canvas || !data || !W || !H) return;
		const ctx = canvas.getContext('2d');
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, W, H);

		const padL = 8;
		const padR = 8;
		const top = 34;
		const bottom = H - 26;
		const plotW = W - padL - padR;
		const plotH = bottom - top;
		const x = (i) => padL + (i / (n - 1)) * plotW;
		const maxW = niceMax(data.solarW, data.houseW);
		const yW = (w) => bottom - (Math.min(w, maxW * 1.02) / maxW) * plotH;
		const yS = (s) => bottom - (s / 100) * plotH;
		const shownTo = played ? n - 1 : head;
		const at = cursor ?? (played ? n - 1 : head);

		// grid + axis
		ctx.font = `400 14px ${SANS}`;
		ctx.textBaseline = 'alphabetic';
		ctx.strokeStyle = 'rgba(152, 193, 217, 0.16)';
		ctx.lineWidth = 1;
		ctx.fillStyle = '#98C1D9';
		for (let i = 0; i < n; i++) {
			const t = timeAt(i);
			if (t.getMinutes() < data.intervalMinutes && t.getHours() % 6 === 0) {
				const gx = Math.round(x(i)) + 0.5;
				ctx.beginPath();
				ctx.moveTo(gx, top);
				ctx.lineTo(gx, bottom);
				ctx.stroke();
				const label = timeFmt.format(new Date(t.setMinutes(0, 0, 0)));
				const w = ctx.measureText(label).width;
				ctx.fillText(label, Math.min(Math.max(gx - w / 2, 2), W - w - 2), H - 6);
			}
		}
		ctx.strokeStyle = 'rgba(152, 193, 217, 0.5)';
		ctx.beginPath();
		ctx.moveTo(padL, bottom + 0.5);
		ctx.lineTo(W - padR, bottom + 0.5);
		ctx.stroke();
		if (data.solarW || data.houseW) {
			ctx.fillStyle = '#98C1D9';
			ctx.fillText(fmtW(maxW), padL + 2, top + 14);
		}

		// series, clipped to how much of the day has "played"
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, 0, x(shownTo) + 0.5, H);
		ctx.clip();

		if (data.solarW) {
			ctx.beginPath();
			ctx.moveTo(x(0), bottom);
			for (let i = 0; i < n; i++) ctx.lineTo(x(i), yW(data.solarW[i] ?? 0));
			ctx.lineTo(x(n - 1), bottom);
			ctx.closePath();
			ctx.fillStyle = 'rgba(242, 139, 114, 0.26)';
			ctx.fill();
			line(ctx, data.solarW, x, yW, COLORS.solar, 2);
		}
		if (data.houseW) line(ctx, data.houseW, x, yW, COLORS.house, 2, true);
		line(ctx, data.batterySoc, x, yS, COLORS.battery, 3);
		ctx.restore();

		// cursor
		const cx = x(at);
		const idx = Math.min(Math.max(Math.round(at), 0), n - 1);
		ctx.strokeStyle = 'rgba(224, 251, 252, 0.7)';
		ctx.lineWidth = 1.5;
		ctx.setLineDash([3, 4]);
		ctx.beginPath();
		ctx.moveTo(cx, top - 4);
		ctx.lineTo(cx, bottom);
		ctx.stroke();
		ctx.setLineDash([]);
		const dots = [
			[data.solarW?.[idx], yW, COLORS.solar],
			[data.houseW?.[idx], yW, COLORS.house],
			[data.batterySoc[idx], yS, COLORS.battery]
		];
		for (const [v, fy, color] of dots) {
			if (!Number.isFinite(v)) continue;
			ctx.fillStyle = '#293241';
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(cx, fy(v), 4, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
		}

		// time pill on the axis
		const isNow = idx >= n - 1 && cursor === null;
		const label = isNow ? 'Now' : timeFmt.format(timeAt(idx));
		ctx.font = `500 14px ${SANS}`;
		const pw = ctx.measureText(label).width + 14;
		const px = Math.min(Math.max(cx - pw / 2, 0), W - pw);
		ctx.fillStyle = '#E0FBFC';
		ctx.beginPath();
		ctx.roundRect(px, H - 22, pw, 20, 2);
		ctx.fill();
		ctx.fillStyle = '#293241';
		ctx.fillText(label, px + 7, H - 7);

		// legend row doubles as the readout for the cursor's moment
		const s = sampleAt(at);
		const parts = [];
		if (data.solarW)
			parts.push({
				color: COLORS.solar,
				name: 'Solar',
				v: s.solarW === null ? '––' : fmtW(s.solarW)
			});
		if (data.houseW)
			parts.push({
				color: COLORS.house,
				name: 'Flat',
				v: s.houseW === null ? '––' : fmtW(s.houseW)
			});
		parts.push({
			color: COLORS.battery,
			name: 'Battery',
			v: s.soc === null ? '––' : `${Math.round(s.soc)}%`
		});
		legend(ctx, parts, padL, 20);
	}

	function legend(ctx, parts, x0, y) {
		ctx.font = `400 14px ${SANS}`;
		const measure = (withName) =>
			parts.reduce(
				(sum, p) => sum + 22 + ctx.measureText(withName ? `${p.name} ${p.v}` : p.v).width + 14,
				0
			);
		const withName = measure(true) <= W - x0 - 8;
		let cx = x0;
		for (const p of parts) {
			ctx.fillStyle = p.color;
			ctx.fillRect(cx, y - 10, 14, 4);
			ctx.fillStyle = '#E0FBFC';
			const text = withName ? `${p.name} ${p.v}` : p.v;
			ctx.fillText(text, cx + 20, y);
			cx += 22 + ctx.measureText(text).width + 14;
		}
	}

	function line(ctx, series, x, y, color, width, stepped = false) {
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.beginPath();
		let pen = false;
		let prevY = 0;
		for (let i = 0; i < series.length; i++) {
			const v = series[i];
			if (!Number.isFinite(v)) {
				pen = false;
				continue;
			}
			const px = x(i);
			const py = y(v);
			if (!pen) ctx.moveTo(px, py);
			else if (stepped) {
				ctx.lineTo(px, prevY);
				ctx.lineTo(px, py);
			} else ctx.lineTo(px, py);
			pen = true;
			prevY = py;
		}
		ctx.stroke();
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

	// ---- the intro sweep ----
	function frame(now) {
		raf = 0;
		if (sweepStart === null) sweepStart = now;
		const p = Math.min((now - sweepStart) / SWEEP_MS, 1);
		const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
		head = eased * (n - 1);
		publish(head);
		draw();
		if (p < 1 && !played) raf = requestAnimationFrame(frame);
		else finishSweep();
	}

	function finishSweep() {
		played = true;
		cancelAnimationFrame(raf);
		raf = 0;
		if (cursor === null) replay.set(null);
		draw();
	}

	function startSweep() {
		if (played || raf || !data) return;
		if (reduced) {
			played = true;
			draw();
			return;
		}
		raf = requestAnimationFrame(frame);
	}

	// ---- scrubbing ----
	function indexFromEvent(event) {
		const rect = canvas.getBoundingClientRect();
		const ratio = (event.clientX - rect.left - 8) / (rect.width - 16);
		return Math.min(Math.max(ratio, 0), 1) * (n - 1);
	}

	function scrub(i) {
		if (!played) finishSweep();
		clearTimeout(holdTimer);
		cursor = Math.min(Math.max(Math.round(i), 0), n - 1);
		publish(cursor);
		draw();
	}

	function onPointer(event) {
		if (!data) return;
		if (event.pointerType === 'touch' && event.type === 'pointermove' && event.buttons === 0)
			return;
		scrub(indexFromEvent(event));
	}

	function onPointerEnd(event) {
		if (event.pointerType === 'touch') {
			holdTimer = setTimeout(release, 3000);
		} else if (event.type !== 'pointerup') {
			release();
		}
	}

	function onKey(event) {
		if (!data) return;
		const now = cursor ?? n - 1;
		const step = event.shiftKey ? 4 : 1;
		if (event.key === 'ArrowLeft') scrub(now - step);
		else if (event.key === 'ArrowRight') scrub(now + step);
		else if (event.key === 'Home') scrub(0);
		else if (event.key === 'End') release();
		else if (event.key === 'Escape') release();
		else return;
		event.preventDefault();
	}

	$: valueText = (() => {
		if (!data) return '';
		const s = sampleAt(cursor ?? n - 1);
		const bits = [`${cursor === null ? 'Now' : timeFmt.format(s.t)}`];
		if (s.solarW !== null) bits.push(`solar ${fmtW(s.solarW)}`);
		if (s.houseW !== null) bits.push(`flat using ${fmtW(s.houseW)}`);
		if (s.soc !== null) bits.push(`battery ${Math.round(s.soc)} percent`);
		return bits.join(', ');
	})();

	$: if (data && canvas) {
		draw();
		if (visible) startSweep();
	}

	let ro;
	onMount(() => {
		reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		ro = new ResizeObserver(size);
		if (wrap) ro.observe(wrap);
		io = new IntersectionObserver(
			([entry]) => {
				visible = entry.isIntersecting;
				if (visible) startSweep();
			},
			{ threshold: 0.4 }
		);
		if (wrap) io.observe(wrap);
		document.fonts?.load(`400 14px Raleway`).then(draw);
		document.fonts?.load(`500 14px Raleway`).then(draw);
		return () => {
			ro.disconnect();
			io.disconnect();
		};
	});

	onDestroy(() => {
		if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
		clearTimeout(holdTimer);
		replay.set(null);
	});

	// The wrapper only exists once there's data; wire the observers up when it appears.
	$: if (wrap && canvas) {
		size();
		ro?.observe(wrap);
		io?.observe(wrap);
	}
</script>

{#if data}
	<div
		class="day"
		bind:this={wrap}
		role="slider"
		tabindex="0"
		aria-label="The last 24 hours in the flat. Use the arrow keys to replay a moment; End returns to now."
		aria-valuemin="0"
		aria-valuemax={n - 1}
		aria-valuenow={cursor ?? n - 1}
		aria-valuetext={valueText}
		on:keydown={onKey}
		on:blur={release}
		on:pointerdown={onPointer}
		on:pointermove={onPointer}
		on:pointerleave={onPointerEnd}
		on:pointercancel={onPointerEnd}
		on:pointerup={onPointerEnd}
	>
		<canvas bind:this={canvas} aria-hidden="true"></canvas>
	</div>
{/if}

<style>
	.day {
		position: relative;
		width: 100%;
		aspect-ratio: 100 / 38;
		border-top: 1px solid rgba(152, 193, 217, 0.3);
		touch-action: pan-y;
		cursor: crosshair;
	}

	@container (max-width: 29.99rem) {
		.day {
			aspect-ratio: 100 / 62;
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
