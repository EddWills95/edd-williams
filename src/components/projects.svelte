<script>
	const projects = [
		{
			id: 'umbrel',
			title: 'Umbrel',
			tagline: 'Bitcoin + Lightning RaspberryPi node',
			text: 'A self-hosted bitcoin node with an app store for self-sovereignty apps. Contributed to the UI, fixing bugs and adding features. Started a project to integrate a screen. ',
			image: './umbrel.webp',
			imageAlt: 'get umbrel',
			github: 'https://github.com/getumbrel/umbrel-dashboard/pulls?q=is%3Apr+author%3AEddWills95+',
			url: 'https://getumbrel.com/'
		},
		{
			id: 'epsolar',
			title: 'EPSolar Dashboard',
			tagline: 'RaspberryPi Solar change controller',
			text: 'Raspberry Pi dashboard that integrates with an EPSolar charge controller. Involved hardware serial investigations and experimentation',
			image: './raspberry-pi.webp',
			imageAlt: 'raspberry pi'
		},
		{
			id: 'pi-thermo',
			title: 'Raspberry Pi Thermostat',
			tagline: 'My first hardware/software project!',
			text: 'A PHP, Javascript and Python thermostat using a DHT22 that switches a heating system on and off. While my presentation leaves a lot to be desired, I proved to myself that I was able to create useful projects using my own code. A real turning point in my life',
			github: 'https://github.com/EddWills95/ThermoPi',
			image: './thermo-pi.webp',
			imageAlt: 'raspberry pi thermostat'
		}
	];
</script>

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
				<div class="flex gap-3">
					{#if project.url}
						<a
							href={project.url}
							target="_blank"
							rel="noopener noreferrer"
							class="rounded-button py-1 text-base">Visit site →</a
						>
					{/if}
					{#if project.github}
						<a
							href={project.github}
							target="_blank"
							rel="noopener noreferrer"
							class="rounded-button py-1 text-base">View code →</a
						>
					{/if}
				</div>
			{/if}
		</article>
	{/each}
</div>

<a
	href="https://inventing-mostly.com"
	target="_blank"
	rel="noopener noreferrer"
	class="mt-10 p-6 flex flex-col gap-2 items-center text-center border-2 border-burnt-sienna-400 rounded hover:bg-burnt-sienna-400/10 transition-colors"
>
	<span class="text-xl">More projects live at</span>
	<span class="text-2xl text-burnt-sienna-400 underline">inventing-mostly.com →</span>
	<span class="italic text-base">Where I actually keep most of what I build</span>
</a>
