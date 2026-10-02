<script>
	import { onMount, onDestroy } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { quartOut } from 'svelte/easing';
	import { buildStats } from '$lib/live-stats.js';

	// Its own section: what the person living in the flat has been building. Uses its own
	// endpoint so a missing or failing build-stats response never touches the energy drawing, and
	// rendered only once real data exists (it 404s until the laptop's first push).

	// Stated in the footnote, so every comparison below is checkable.
	const WORDS_PER_TOKEN = 0.75;
	const NOVEL_WORDS = 90_000;
	const LOTR_WORDS = 480_000;

	let now = Date.now();
	let clock;

	const FIELDS = ['written', 'cacheRead', 'linesAdded', 'linesRemoved', 'commits'];
	const isCount = (value) => Number.isInteger(value) && value >= 0;
	const isWindow = (w) => w && typeof w === 'object' && FIELDS.every((f) => isCount(w[f]));

	function valid(data) {
		if (!data || !isWindow(data.today) || !isWindow(data.week) || !isWindow(data.lifetime)) {
			return false;
		}
		return !Number.isNaN(new Date(data.asOf).getTime());
	}

	// Bad payloads are treated like no data: the panel simply doesn't appear.
	$: mocked = $buildStats.mocked;
	$: stats = valid($buildStats.data) ? $buildStats.data : null;
	$: if (stats) now = Date.now();

	onMount(() => {
		clock = setInterval(() => (now = Date.now()), 30_000);
	});

	onDestroy(() => clearInterval(clock));

	const count = (n) => Math.round(n).toLocaleString('en-GB');
	const approx = (n) => (n < 10 ? n.toFixed(1) : count(n));
	const big = (n) =>
		n >= 10_000_000 ? `${(n / 1_000_000).toFixed(n >= 100_000_000 ? 0 : 1)} million` : count(n);

	function tokenCaption(written) {
		const words = written * WORDS_PER_TOKEN;
		if (written === 0) return "Not a word yet today. The kettle's on.";
		if (words < 1_000) return `≈ ${count(words)} words. A strongly worded email.`;
		if (words < NOVEL_WORDS / 2) return `≈ ${count(words)} words. Short-story length, at least.`;
		if (words < LOTR_WORDS) {
			return `≈ ${approx(words / NOVEL_WORDS)} novels' worth of words, if not of plot.`;
		}
		return `≈ ${approx(words / LOTR_WORDS)} × The Lord of the Rings, with fewer elves.`;
	}

	function linesCaption({ linesAdded: added, linesRemoved: removed }) {
		if (added === 0 && removed === 0) return 'No lines today. The keyboard is resting.';
		if (removed > added) return `${count(removed)} removed. Net negative: the best kind of day.`;
		if (removed === 0) return 'Nothing removed. Suspicious.';
		return `${count(removed)} removed, which is the bit I'm proudest of.`;
	}

	function commitsCaption({ commits, linesAdded }) {
		if (commits === 0) return 'Nothing committed today. Living dangerously.';
		if (commits === 1) return 'A single, lonely commit.';
		if (linesAdded === 0) return 'Several commits, no new lines. Tidying up, then.';
		const perCommit = linesAdded / commits;
		if (perCommit >= 400)
			return `≈ ${count(perCommit)} lines a commit. Bring snacks to the review.`;
		if (perCommit <= 20) return `≈ ${count(perCommit)} lines a commit. Small and tidy.`;
		return `≈ ${count(perCommit)} lines a commit.`;
	}

	function cacheCaption({ cacheRead, written }) {
		if (written === 0) return 'Yes, really.';
		return `Yes, really: ${count(cacheRead / written)}× everything written. Its notes are better than mine.`;
	}

	const relative = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
	function ago(ms) {
		const minutes = Math.round(ms / 60_000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return relative.format(-minutes, 'minute');
		const hours = Math.round(minutes / 60);
		if (hours < 48) return relative.format(-hours, 'hour');
		return relative.format(-Math.round(hours / 24), 'day');
	}

	const syncFormat = new Intl.DateTimeFormat('en-GB', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});

	$: asOf = stats ? new Date(stats.asOf) : null;

	// Today's figures count up from zero the first time the sheet scrolls into view. Until then
	// (and under reduced motion, or with no JS) they simply show the real number.
	let sheet;
	let seen = false;
	let reduced = false;
	const written = tweened(0, { easing: quartOut });
	const added = tweened(0, { easing: quartOut });
	const commits = tweened(0, { easing: quartOut });

	onMount(() => {
		reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	$: if (sheet && !seen && !reduced) {
		const io = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				seen = true;
				io.disconnect();
			},
			{ threshold: 0.35 }
		);
		io.observe(sheet);
	}

	$: animate = seen && !reduced;
	$: if (stats) {
		const duration = animate ? 1600 : 0;
		written.set(animate ? stats.today.written : 0, { duration: animate ? duration : 0 });
		added.set(animate ? stats.today.linesAdded : 0, { duration: animate ? duration : 0 });
		commits.set(animate ? stats.today.commits : 0, { duration: animate ? 1000 : 0 });
	}
	$: shown = {
		written: reduced || !sheet || !seen ? stats?.today.written : Math.round($written),
		added: reduced || !sheet || !seen ? stats?.today.linesAdded : Math.round($added),
		commits: reduced || !sheet || !seen ? stats?.today.commits : Math.round($commits)
	};
</script>

<!-- The anchor is always present so links to #code exist at prerender time; the section only
     appears once real data has loaded. -->
<span class="anchor" id="code"></span>
<!-- #build is the section's old name; kept so links that already exist still land here. -->
<span class="anchor" id="build"></span>
{#if stats}
	<section class="base-section build-section justify-start" aria-labelledby="build-section-heading">
		<h2 id="build-section-heading" class="section-title">Code</h2>

		<p class="mt-2 max-w-prose text-light-cyan text-base">
			My day job: what's been going on at the laptop today, counted from my own Claude Code usage
			and git. AI has changed everything about my job and it's given untold power to create. While
			there's a slight resentment in showing my claude stats, it is the new reality and I am
			undeniably more productive
		</p>

		<div class="build-sheet" bind:this={sheet}>
			{#if mocked}
				<p class="mock-flag">Mock data: dev fixture, not real numbers</p>
			{/if}

			<header class="build-head">
				<div>
					<h3 id="build-heading" class="build-title">Live from the laptop</h3>
					<p class="tagline">
						The flat runs on the sun. The code runs on the sun, tea and a fair amount of AI.
					</p>
				</div>
				<p class="synced">
					Synced <time class="nums" datetime={asOf.toISOString()}>{syncFormat.format(asOf)}</time>,
					{ago(now - asOf.getTime())}
				</p>
			</header>

			{#if stats.stale}
				<p class="stale-note" role="status">
					These haven't updated since {syncFormat.format(asOf)}, so they're frozen until the laptop
					next checks in.
				</p>
			{/if}

			<dl class="stats">
				<div class="stat">
					<dt class="label">Tokens written</dt>
					<dd class="today nums">{count(shown.written)} <span class="unit">today</span></dd>
					<dd class="lifetime"><span class="nums">{big(stats.lifetime.written)}</span> all time</dd>
					<dd class="caption">{tokenCaption(stats.today.written)}</dd>
				</div>

				<div class="stat">
					<dt class="label">Lines added</dt>
					<dd class="today nums">
						{count(shown.added)} <span class="unit">today</span>
					</dd>
					<dd class="lifetime">
						<span class="nums">{big(stats.lifetime.linesAdded)}</span> all time
					</dd>
					<dd class="caption">{linesCaption(stats.today)}</dd>
				</div>

				<div class="stat">
					<dt class="label">Commits</dt>
					<dd class="today nums">{count(shown.commits)} <span class="unit">today</span></dd>
					<dd class="lifetime"><span class="nums">{big(stats.lifetime.commits)}</span> all time</dd>
					<dd class="caption">{commitsCaption(stats.today)}</dd>
				</div>
			</dl>

			<div class="notes">
				<p class="week nums">
					This week: {big(stats.week.written)} tokens written · {count(stats.week.linesAdded)} lines added,
					{count(stats.week.linesRemoved)} removed · {count(stats.week.commits)}
					{stats.week.commits === 1 ? 'commit' : 'commits'}.
				</p>
				{#if stats.lifetime.cacheRead > 0}
					<p class="cache nums">
						Also read from cache, all time: <strong>{count(stats.lifetime.cacheRead)}</strong>
						tokens.
						{cacheCaption(stats.lifetime)}
					</p>
				{/if}
				<p class="footnote">
					Tokens come from my Claude Code usage; lines and commits from git. Word counts assume
					about
					{WORDS_PER_TOKEN} words per token, a novel at {count(NOVEL_WORDS)} words and The Lord of the
					Rings at about {count(LOTR_WORDS)}.
				</p>
			</div>
		</div>
	</section>

	<hr class="section-break" />
{/if}

<style>
	/* Plain CSS (no @apply), matching the flat drawing's sheet in balcony-solar.svelte. */
	.build-sheet {
		width: 100%;
		position: relative;
		max-width: 40rem;
		margin: 1rem auto 0;
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

	.build-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-end;
		gap: 0.5rem 1.5rem;
		padding: 1rem;
		border-bottom: 2px solid rgba(152, 193, 217, 0.6);
	}

	.build-title {
		font-size: 1.5rem;
		font-weight: 500;
		line-height: 1.3;
		color: #e0fbfc;
	}

	.tagline {
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #98c1d9;
		font-style: italic;
		max-width: 38ch;
	}

	.synced {
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #98c1d9;
	}

	.stale-note {
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-style: italic;
		color: #e0fbfc;
		border-bottom: 1px solid rgba(152, 193, 217, 0.3);
	}

	.stats {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 1rem;
		border-top: 1px solid rgba(152, 193, 217, 0.3);
	}

	.stat:first-child {
		border-top: 0;
	}

	.label {
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #98c1d9;
	}

	.today {
		font-size: 1.5rem;
		line-height: 1.25;
		color: #f28b72;
		overflow-wrap: anywhere;
	}

	.unit {
		font-size: 0.875rem;
		color: #98c1d9;
	}

	.lifetime {
		font-size: 1rem;
		line-height: 1.4;
		color: #e0fbfc;
	}

	.caption {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #98c1d9;
	}

	.notes {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		border-top: 2px solid rgba(152, 193, 217, 0.6);
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #e0fbfc;
	}

	.cache strong {
		font-weight: 500;
		color: #f28b72;
		overflow-wrap: anywhere;
	}

	.footnote {
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #98c1d9;
	}

	@media (min-width: 1280px) {
		.build-sheet {
			max-width: none;
			align-self: start;
		}
	}

	@media (min-width: 640px) {
		.stats {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.stat {
			border-top: 0;
			border-left: 1px solid rgba(152, 193, 217, 0.3);
		}

		.stat:first-child {
			border-left: 0;
		}

		.today {
			font-size: 1.25rem;
		}
	}
</style>
