<script>
	import { onMount, onDestroy } from 'svelte';

	// `container` is the relative-positioned wrapper the source/target nodes live in.
	// Rather than maintaining a parallel coordinate system that has to be kept in sync
	// with the real layout, this canvas measures the actual rendered node positions via
	// getBoundingClientRect on every draw call and on every resize — the curves cannot
	// drift from the circles because they're drawn from the circles' real on-screen positions.
	export let container;
	export let sources = []; // [{ selector: string, color: string }]
	export let targetSelector;

	let mountEl;
	let p5Instance;
	let resizeObserver;

	function bezierPointAt(x1, y1, x2, y2, x3, y3, x4, y4, t) {
		const u = 1 - t;
		return {
			x: u * u * u * x1 + 3 * u * u * t * x2 + 3 * u * t * t * x3 + t * t * t * x4,
			y: u * u * u * y1 + 3 * u * u * t * y2 + 3 * u * t * t * y3 + t * t * t * y4
		};
	}

	function nodeCenter(el, containerRect) {
		const r = el.getBoundingClientRect();
		return {
			x: r.left + r.width / 2 - containerRect.left,
			y: r.top + r.height / 2 - containerRect.top,
			radius: r.width / 2
		};
	}

	onMount(async () => {
		const { default: P5 } = await import('p5');

		const sketch = (p) => {
			const particles = sources.map((_, i) => ({
				t: i / Math.max(sources.length, 1),
				speed: 0.0016 + i * 0.00035
			}));

			p.setup = () => {
				const rect = container.getBoundingClientRect();
				p.createCanvas(Math.max(rect.width, 1), Math.max(rect.height, 1));
				p.noStroke();
			};

			p.draw = () => {
				p.clear();
				const containerRect = container.getBoundingClientRect();
				const targetEl = container.querySelector(targetSelector);
				if (!targetEl) return;
				const target = nodeCenter(targetEl, containerRect);

				sources.forEach((source, i) => {
					const el = container.querySelector(source.selector);
					if (!el) return;
					const from = nodeCenter(el, containerRect);

					// Approach the hub from whichever side the source actually sits on, so the
					// curve reads correctly whether nodes are stacked or arranged in a row.
					const dx = target.x - from.x;
					const startX = from.x + Math.sign(dx || 1) * from.radius;
					const startY = from.y;
					const endX = target.x - Math.sign(dx || 1) * target.radius * 0.6;
					const endY = target.y;
					const c1x = startX + dx * 0.4;
					const c1y = startY;
					const c2x = endX - dx * 0.4;
					const c2y = endY;

					const strokeColor = p.color(source.color);
					strokeColor.setAlpha(70);
					p.stroke(strokeColor);
					p.strokeWeight(2);
					p.noFill();
					p.bezier(startX, startY, c1x, c1y, c2x, c2y, endX, endY);

					const particle = particles[i];
					particle.t += particle.speed;
					if (particle.t > 1) particle.t -= 1;
					const pt = bezierPointAt(startX, startY, c1x, c1y, c2x, c2y, endX, endY, particle.t);

					p.noStroke();
					p.fill(source.color);
					p.circle(pt.x, pt.y, 9);
				});
			};
		};

		p5Instance = new P5(sketch, mountEl);

		resizeObserver = new ResizeObserver(() => {
			if (p5Instance && container) {
				const rect = container.getBoundingClientRect();
				p5Instance.resizeCanvas(Math.max(rect.width, 1), Math.max(rect.height, 1));
			}
		});
		resizeObserver.observe(container);
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
		p5Instance?.remove();
	});
</script>

<div bind:this={mountEl} class="absolute inset-0 pointer-events-none [&>canvas]:!block" />
