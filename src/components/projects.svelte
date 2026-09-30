<script>
	const projects = [
		{
			id: 'umbrel',
			title: 'Umbrel',
			tagline: 'Bitcoin + Lightning RaspberryPi node',
			text: 'A self-hosted bitcoin node with an app store for self-sovereignty apps. Contributed to the UI, fixing bugs and adding features. Started a project to integrate a screen. ',
			image: './umbrel.webp',
			imageAlt: 'get umbrel',
			imageSize: 225,
			github: 'https://github.com/getumbrel/umbrel-dashboard/pulls?q=is%3Apr+author%3AEddWills95+',
			url: 'https://getumbrel.com/'
		}
	];

	const registry = [
		{
			name: 'Stash',
			text: 'A mobile wardrobe app that builds outfits from the clothes you already own (coming soon)'
		},
		{
			name: 'onvif-protect-bridge',
			text: 'TypeScript bridge that shows ONVIF cameras as IP cameras in UniFi Protect'
		},
		{
			name: 'Backcast',
			text: 'Next.js and Hono app simulating solar and battery performance against UK energy pricing (in progress)'
		}
	];
</script>

<a
	href="https://inventing-mostly.com"
	target="_blank"
	rel="noopener noreferrer"
	class="mb-10 p-6 flex flex-col gap-4 border-2 border-burnt-sienna-400 rounded hover:bg-burnt-sienna-400/10 transition-colors"
>
	<div>
		<h3 class="text-2xl sm:text-3xl">Where I actually keep most of what I build →</h3>
		<span class="text-base text-burnt-sienna-400">Inventing Mostly</span>
	</div>
	<ul class="flex flex-col gap-3">
		{#each registry as item}
			<li class="leading-snug">
				<span class="text-xl">{item.name}</span>
				<span class="block text-base text-pale-cerulean">{item.text}</span>
			</li>
		{/each}
	</ul>
	<span class="italic text-base underline underline-offset-4">inventing-mostly.com</span>
</a>

<a
	href="#solar"
	class="mb-10 p-6 flex flex-col gap-1 border-2 border-pale-cerulean/60 rounded hover:bg-bdazzled-blue-500/30 transition-colors"
>
	<h3 class="text-2xl sm:text-3xl">Solar</h3>
	<p class="italic text-pale-cerulean">A live drawing of my flat's solar and battery system</p>
	<p class="text-base leading-relaxed">
		Home Assistant, a small proxy I wrote, and a drawing whose lines move when the power does. The
		biggest thing I run, and it's at the top of this page.
	</p>
</a>

<div class="flex flex-col gap-10">
	{#each projects as project}
		<article class="flex flex-col gap-4">
			<header class="flex items-center gap-5 border-b-2 border-pale-cerulean/30 pb-5">
				{#if project.image}
					<div class="offset-border shrink-0">
						<img
							class="rounded-sm object-cover w-auto h-16 sm:h-20"
							src={project.image}
							alt={project.imageAlt ?? ''}
							width={project.imageSize}
							height={project.imageSize}
							loading="lazy"
						/>
					</div>
				{/if}
				<div class="min-w-0">
					<h3 class="text-2xl sm:text-3xl leading-tight">{project.title}</h3>
					<p class="italic text-pale-cerulean">{project.tagline}</p>
				</div>
			</header>
			<p class="leading-relaxed">{project.text}</p>
			{#if project.url || project.github}
				<div class="flex flex-wrap gap-3">
					{#if project.url}
						<a
							href={project.url}
							target="_blank"
							rel="noopener noreferrer"
							class="rounded-button text-base">Visit site →</a
						>
					{/if}
					{#if project.github}
						<a
							href={project.github}
							target="_blank"
							rel="noopener noreferrer"
							class="rounded-button text-base">View code →</a
						>
					{/if}
				</div>
			{/if}
		</article>
	{/each}
</div>
