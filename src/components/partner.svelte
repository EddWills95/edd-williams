<script>
	import { partnerStats, apiUrl } from '$lib/live-stats.js';

	// The PokeTokenBar partner: the Pokémon that grows as I spend Claude Code tokens.
	// Sits under the Code sheet. Like the build panel it appears only once real data exists (the
	// endpoint 404s until the first push) and a bad payload counts as no data.

	const isCount = (v) => Number.isSafeInteger(v) && v >= 0;

	function valid(d) {
		return d && typeof d.name === 'string' && isCount(d.xp) && typeof d.shiny === 'boolean';
	}

	$: partner = valid($partnerStats.data) ? $partnerStats.data : null;
	$: mocked = $partnerStats.mocked;

	// "mr-mime" -> "Mr Mime"
	const title = (name) =>
		name
			.split('-')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');

	// The same bar the app shows: tokens spent in the current evolution stage over that stage's
	// cost. Clamped, as the app does, because usage can briefly overshoot a stage.
	$: hasBar =
		partner &&
		isCount(partner.stageXp) &&
		Number.isSafeInteger(partner.stageThreshold) &&
		partner.stageThreshold > 0;
	$: used = hasBar ? Math.min(partner.stageXp, partner.stageThreshold) : 0;
	$: fraction = hasBar ? used / partner.stageThreshold : 0;
	$: isFinal = partner && partner.stage >= partner.stages;
	$: stageText = isFinal ? 'Final form' : `Stage ${partner?.stage} of ${partner?.stages}`;

	const count = (n) => n.toLocaleString('en-GB');
	// 389,103,472 -> "389.1M"
	const compact = (n) =>
		n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : count(n);

	$: sprite = partner?.spriteUrl ? apiUrl(partner.spriteUrl) : null;
	// Names in the payload are the PokéAPI slugs, which is also how Pokémon Database names pages.
	$: pokedexUrl = partner
		? `https://pokemondb.net/pokedex/${encodeURIComponent(partner.name)}`
		: '';
	$: label = partner ? title(partner.name) : '';
</script>

{#if partner}
	<aside class="partner" aria-label="My PokeTokenBar partner: {label}">
		<p class="label">
			<span>Partner Pokémon</span>
			<a class="nums" href={pokedexUrl} target="_blank" rel="noopener noreferrer"
				>Pokédex #{String(partner.speciesId).padStart(3, '0')}</a
			>
		</p>

		<div class="sprite">
			{#if sprite}
				<img
					src={sprite}
					alt={title(partner.name)}
					width="80"
					height="80"
					loading="lazy"
					decoding="async"
				/>
			{/if}
		</div>

		<div class="body">
			<p class="name">
				<a href={pokedexUrl} target="_blank" rel="noopener noreferrer"
					>{title(partner.name)}{partner.shiny ? ' ✨' : ''}</a
				>
				{#if hasBar}<span class="stage">{stageText}</span>{/if}
			</p>

			{#if hasBar}
				<div
					class="bar"
					role="progressbar"
					aria-label={isFinal ? 'Progress to graduation' : 'Progress to next evolution'}
					aria-valuemin="0"
					aria-valuemax="100"
					aria-valuenow={Math.floor(fraction * 100)}
				>
					<span class="fill" style="width: {fraction * 100}%"></span>
				</div>
				<p class="meta nums">
					{compact(used)} / {compact(partner.stageThreshold)} · {Math.floor(fraction * 100)}%
				</p>
				<p class="meta nums">
					{compact(partner.stageThreshold - used)}
					{isFinal ? 'to graduation' : 'to next evolution'}
				</p>
			{:else}
				<p class="meta nums">{compact(partner.xp)} tokens</p>
			{/if}

			<p class="note">
				The Pokémon in my menu bar (<a
					href="https://github.com/chattymin/poketokenbar"
					target="_blank"
					rel="noopener noreferrer">PokeTokenBar</a
				>). It grows as I spend Claude Code tokens, so it only evolves while I build.
			</p>
		</div>

		{#if mocked}
			<p class="mock-flag">Mock data</p>
		{/if}
	</aside>
{/if}

<style>
	/* Plain CSS (no @apply), matching the blueprint sheet in build-stats.svelte. */
	.partner {
		position: relative;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		grid-template-areas:
			'label label'
			'sprite body';
		gap: 0.75rem 1rem;
		align-items: center;
		width: 100%;
		max-width: 40rem;
		margin: 1rem auto 0;
		padding: 1rem;
		border: 2px solid rgba(152, 193, 217, 0.6);
		border-radius: 2px;
		background-color: #293241;
		background-image:
			linear-gradient(rgba(152, 193, 217, 0.045) 1px, transparent 1px),
			linear-gradient(90deg, rgba(152, 193, 217, 0.045) 1px, transparent 1px);
		background-size: 8px 8px;
	}

	@media (min-width: 1280px) {
		.partner {
			max-width: none;
		}
	}

	.label {
		grid-area: label;
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #98c1d9;
	}

	.sprite {
		grid-area: sprite;
		display: grid;
		place-items: center;
		width: 5rem;
		height: 5rem;
	}

	.sprite img {
		max-width: 100%;
		max-height: 100%;
		image-rendering: pixelated;
		object-fit: contain;
	}

	.body {
		grid-area: body;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.name {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
		font-size: 1rem;
		line-height: 1.4;
		font-weight: 500;
		color: #e0fbfc;
	}

	.nums {
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
		font-variant-numeric: lining-nums tabular-nums;
	}

	.stage {
		color: #f28b72;
		white-space: nowrap;
		font-size: 0.875rem;
	}

	.name a,
	.label a {
		color: inherit;
		text-decoration: none;
	}

	.name a:hover,
	.label a:hover {
		color: #f28b72;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.bar {
		height: 0.5rem;
		border: 1px solid rgba(152, 193, 217, 0.6);
		border-radius: 1px;
		background: rgba(152, 193, 217, 0.12);
		overflow: hidden;
	}

	.fill {
		display: block;
		height: 100%;
		background: #ee6c4d;
		transition: width 0.8s ease-out;
	}

	.meta {
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #98c1d9;
		overflow-wrap: anywhere;
	}

	.note {
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-style: italic;
		color: #98c1d9;
	}

	.note a {
		color: #e0fbfc;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.note a:hover {
		color: #f28b72;
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

	@media (prefers-reduced-motion: reduce) {
		.fill {
			transition: none;
		}
	}
</style>
