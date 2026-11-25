<script>
	const skills = [
		'TypeScript',
		'React / React Native',
		'Next.js',
		'Node / NestJS',
		'Supabase / Postgres',
		'Python / FastAPI',
		'GraphQL',
		'AI / LLM tooling',
		'Playwright / Cypress',
		'D3.js',
		'Docker / AWS',
		'A/B testing'
	];

	const photos = [
		{
			src: './photos/defender.webp',
			alt: 'Edd sitting on the roof of his Land Rover Defender'
		},
		{
			src: './photos/skiing.webp',
			alt: 'Edd in a ski jacket with a beer, slopes behind him'
		},
		{
			src: './photos/pub-dog.webp',
			alt: 'Edd hugging a dog at a pub table'
		},
		{
			src: './photos/brother.webp',
			alt: 'Edd and his brother in sunglasses among city towers'
		},
		{
			src: './photos/wedding.webp',
			alt: 'Edd in a dinner suit beside a vintage Land Rover serving champagne'
		},
		{
			src: './photos/driving.webp',
			alt: 'Edd at the wheel of a car, smiling back at the camera'
		},
		{
			src: './photos/street-food.webp',
			alt: 'Edd eating street food at a market'
		}
	];
</script>

<div class="flex flex-col gap-10">
	<article class="flex flex-col gap-4 leading-relaxed">
		<p>
			I'm a software engineer, currently
			<span class="italic text-burnt-sienna-400">founding engineer at Prodigies</span>, building the
			platform that connects brands with creative talent. Before that I spent eight years shipping
			product at Quickbooks, OVO, Limejump, OakNorth, Runna and Wise. I'm happiest on the parts
			people actually touch: onboarding, experiments and design systems.
		</p>

		<p>
			Outside work I'm usually tinkering. My flat runs on
			<span class="italic text-burnt-sienna-400">balcony solar</span> and a battery wired into Home
			Assistant to dodge expensive electricity (the numbers above are live), and there's a NAS
			running far more self-hosted services than one person needs. Most of my side projects lately
			are me learning <span class="italic text-burnt-sienna-400">AI tooling</span> by using it on real
			things.
		</p>

		<p>
			Off the laptop, I'm probably out in the
			<span class="italic text-burnt-sienna-400">Defender</span> with the rooftop tent, on a
			mountain somewhere, or at the pub with friends. I studied politics, and it's still how I think
			about software: it's <span class="italic text-burnt-sienna-400">for people</span>, so build it
			<span class="italic text-burnt-sienna-400">with people</span>.
		</p>
	</article>

	<ul class="photo-strip" aria-label="A few photos of me">
		{#each photos as photo, i}
			<li class="photo-card" style="--tilt: {i % 2 === 0 ? -2 : 2}deg">
				<figure>
					<img
						class="aspect-[4/5] w-full rounded-sm object-cover"
						src={photo.src}
						alt={photo.alt}
						width="640"
						height="800"
						loading="lazy"
						decoding="async"
					/>
				</figure>
			</li>
		{/each}
	</ul>

	<div class="flex flex-col gap-3">
		<p class="italic">A flavour of my toolset:</p>
		<ul class="flex flex-wrap gap-2">
			{#each skills as skill}
				<li
					class="rounded-full border border-pale-cerulean/60 bg-bdazzled-blue-500/30 px-3 py-0.5 text-sm"
				>
					{skill}
				</li>
			{/each}
		</ul>
	</div>
</div>

<style>
	.photo-strip {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1.25rem;
		/* Four 12rem cards plus gaps: keeps the 4 + 3 layout on wide screens. */
		max-width: 52rem;
		margin-inline: auto;
	}

	.photo-card {
		width: calc(50% - 0.625rem);
		max-width: 12rem;
		padding: 0.5rem 0.5rem 1.5rem;
		background: #f4f1ea;
		border-radius: 2px;
		box-shadow: 0 10px 24px -12px rgb(0 0 0 / 0.6);
		transform: rotate(var(--tilt));
		transition: transform 200ms ease;
	}

	.photo-card:hover {
		transform: rotate(0deg) scale(1.04);
	}

	@media (min-width: 640px) {
		.photo-card {
			width: calc(25% - 0.95rem);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.photo-card {
			transition: none;
		}
	}
</style>
