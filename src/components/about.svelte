<script>
	const skills = [
		'TypeScript',
		'React / React Native',
		'Next.js',
		'Node / NestJS',
		'Python / FastAPI',
		'GraphQL',
		'Playwright / Cypress',
		'D3.js',
		'Docker / AWS',
		'A/B testing'
	];
</script>

<div class="flex flex-col flex-wrap justify-center items-center gap-4 sm:flex-row">
	<article class="flex flex-col gap-4 leading-relaxed">
		<p class="relative">
			I've been messing with technology for as long as I can remember, starting with
			<span class="italic text-burnt-sienna-400">JavaScript animations</span> and
			<span class="italic text-burnt-sienna-400">Python scrapers</span>, fascinated by how the
			virtual and real worlds could come together. My first real project was a Raspberry Pi
			thermostat, a turning point for me. Professionally that's been since 2018, across payroll,
			energy, banking and now fitness. Day to day I'm a product-focused engineer, happiest on the
			parts people actually touch: onboarding, experiments and design systems.
		</p>

		<p class="relative">
			The hands-on side started around 2012, when my dad came home babbling about
			<span class="italic text-burnt-sienna-400">some internet currency</span> the guys in his
			office were going crazy for. I was hooked, and that curiosity spread from a Bitcoin node on a
			Raspberry Pi to solar, battery storage and a pile of self-hosted services. I'm fanatical about
			<span class="italic text-burnt-sienna-400">repurposing</span> and
			<span class="italic text-burnt-sienna-400">upcycling</span> batteries, and I don't think the importance
			of energy storage can be overstated. The numbers in the Solar section above are live from my flat.
		</p>

		<p class="relative">
			With an education in politics, I come at software from a slightly different angle. I love
			building products <span class="italic text-burnt-sienna-400">for people</span> and
			<span class="italic text-burnt-sienna-400">with people</span>, in collaborative teams
			researching, designing and building end to end. These days I'm freelancing as Inventing
			Mostly, currently rebuilding the back end of a creative talent platform.
		</p>

		<div class="flex w-full flex-wrap gap-8 justify-center items-center mt-4">
			<div class="flex flex-col gap-3 max-w-md">
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
			<div class="w-auto h-48 offset-border">
				<img class="z-10 w-48 h-48 rounded" src="./edd.webp" alt="Edd" width="192" height="192" />
			</div>
		</div>
	</article>
</div>
