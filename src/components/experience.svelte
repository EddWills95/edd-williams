<script>
	const options = [
		{
			id: 'self-employed',
			buttonText: 'Self Employed',
			image: '',
			imageAlt: '',
			title: 'Self Employed',
			tagline: 'Inventing Mostly',
			client: {
				name: 'Prodigies',
				url: 'https://prodigiesofficial.com',
				description:
					'A creative talent platform connecting designers, photographers, illustrators and other creatives with brands and agencies through profiles, portfolios, messaging and paid project briefs.',
				highlights: [
					'Rebuilding the platform back end, migrating from Directus to Supabase',
					'Working across the Next.js and React front end alongside the new back end'
				],
				tech: ['Next.js', 'React', 'TypeScript', 'Supabase', 'Directus', 'Tailwind CSS']
			}
		},
		{
			id: 'runna',
			buttonText: 'Runna',
			image: './runna.webp',
			imageAlt: 'runna logo',
			title: 'Runna',
			tagline: 'Senior Software Engineer',
			highlights: [
				'Product-focused engineer in the Growth squad',
				'Built Levels, a points-based gamification system to drive engagement beyond running plans',
				'Delivered A/B experiments in the subscription flow to improve sign-up conversion'
			],
			tech: [
				'React-Native',
				'TypeScript',
				'Apollo',
				'GraphQL',
				'Node.js',
				'Lambda',
				'DynamoDB',
				'AWS'
			]
		},
		{
			id: 'OakNorth',
			buttonText: 'OakNorth',
			image: './oaknorth.webp',
			imageAlt: 'oaknorth logo',
			title: 'OakNorth',
			tagline: 'Mid → Senior Software Engineer',
			highlights: [
				'Lead engineer on a greenfield business banking web app, shipping an industry-first dashboard for complex, multi-entity accounts',
				'Built onboarding flows that reduced time to first use from weeks to days',
				'Designed and shipped a secure passcode recovery flow using biometrics',
				'Core contributor to the React/React Native design system; resolved render performance issues in production',
				'Co-led the frontend chapter, setting standards for TypeScript, testing and architecture'
			],
			tech: [
				'React',
				'React Native',
				'Zustand',
				'Vite',
				'React-Query',
				'React Testing Library',
				'Python',
				'FastAPI',
				'AWS'
			]
		},
		{
			id: 'limejump',
			buttonText: 'Limejump',
			image: './limejump.webp',
			imageAlt: 'limejump logo',
			title: 'Limejump',
			tagline: 'Full Stack Engineer',
			highlights: [
				'Built a real-time monitoring and revenue dashboard for large-scale battery clients',
				'Designed a custom D3 charting system for energy market data',
				'Contributed to a NestJS backend deployed on Kubernetes',
				'Supported other engineers through regular pairing and code reviews'
			],
			tech: ['React', 'Redux', 'Node', 'NestJS', 'D3.js', 'Kubernetes']
		},
		{
			id: 'ovo',
			buttonText: 'OVO',
			image: './ovo.webp',
			imageAlt: 'ovo logo',
			title: 'OVO Energy',
			tagline: 'Full Stack Engineer',
			highlights: [
				'Frontend engineer on OVO Beyond, a carbon-neutral subscription product',
				'Built aligned features across web and React Native',
				'Used A/B testing to validate customer-facing features',
				'Delivered a third-party integration enabling customer investment in renewable energy'
			],
			tech: ['React', 'React Native', 'Redux', 'AWS Lambda', 'Node', 'Typescript']
		},
		{
			id: 'quickbooks',
			buttonText: 'Quickbooks',
			image: './qb.webp',
			imageAlt: 'quickbooks logo',
			title: 'Quickbooks Payroll',
			tagline: 'Junior → Mid Engineer',
			highlights: [
				'Core engineer on the UK payroll product',
				'Drove 300% customer growth through time tracking and automated pension submissions',
				'Reduced time to first payroll by 19 days via improved onboarding',
				'Led frontend GraphQL migration from Relay to Apollo Client'
			],
			tech: ['React', 'GraphQL (Relay + Apollo)', 'Micro-Frontends', 'Groovy']
		},
		{
			id: 'herts',
			buttonText: 'Herts Uni',
			image: './herts.webp',
			imageAlt: 'herts logo',
			title: 'University of Hertfordshire',
			tagline: 'Internal Directory System rebuild',
			highlights: ['Learn quickly', 'Directory had lots of customers and data'],
			tech: ['Angular', 'React', 'GraphQL', 'Ruby on Rails']
		},
		{
			id: 'wgc',
			buttonText: 'We Got Coders',
			image: './wgc.webp',
			imageAlt: 'quickbooks logo',
			title: 'We Got Coders',
			tagline: 'Intensive Ruby on Rails training course',
			highlights: [
				'Full stack training',
				'On-site experience',
				'SQL experiment days',
				'Final crypto API project (CryptoCrowd)'
			],
			tech: ['Ruby', 'Rails', 'SQL']
		}
	];

	let selected = options[0];
</script>

<div class="flex gap-4 sm:gap-8">
	<ol class="flex flex-col self-start shrink-0 w-28 sm:w-44">
		{#each options as option, i}
			<li class="relative">
				<span
					aria-hidden="true"
					class="absolute left-0 -ml-px w-0.5 bg-pale-cerulean/60 {i === 0
						? 'top-1/2'
						: 'top-0'} {i === options.length - 1 ? 'bottom-1/2' : 'bottom-0'}"
				></span>
				<button
					type="button"
					on:click={() => (selected = option)}
					aria-current={selected.id === option.id}
					class="timeline-item group relative w-full py-3 pl-6 text-left origin-left transition-all duration-200 hover:scale-110 hover:cursor-pointer"
					class:timeline-selected={selected.id === option.id}
				>
					<span
						class="timeline-dot absolute top-1/2 -left-[9px] h-4 w-4 -translate-y-1/2 rounded-full border-2 border-pale-cerulean bg-gunmetal transition-all duration-200 group-hover:scale-125 group-hover:border-burnt-sienna-400"
					></span>
					<span class="block text-base sm:text-lg leading-tight">{option.buttonText}</span>
				</button>
			</li>
		{/each}
	</ol>
	<div class="min-w-0 flex-1">
		{#each options as option}
			{#if selected.id === option.id}
				<article class="experience-panel flex flex-col gap-6 py-1">
					<header class="flex items-center gap-5 border-b-2 border-pale-cerulean/30 pb-5">
						{#if option.image}
							<div class="offset-border shrink-0">
								<img
									class="rounded-sm object-cover w-auto h-16 sm:h-20"
									src={option.image}
									alt={option.imageAlt}
									loading="lazy"
								/>
							</div>
						{/if}
						<div class="min-w-0">
							<h3 class="text-2xl sm:text-3xl leading-tight">{option.title}</h3>
							<p class="italic text-pale-cerulean">{option.tagline}</p>
						</div>
					</header>
					{#if option.client}
						<section class="flex flex-col gap-4 rounded border-2 border-pale-cerulean/30 p-4">
							<div>
								<h4 class="text-sm uppercase tracking-widest text-burnt-sienna-400">Client</h4>
								<h5 class="text-2xl">
									<a
										class="hover:text-burnt-sienna-400 transition-colors"
										href={option.client.url}
										target="_blank"
										rel="noopener noreferrer">{option.client.name}</a
									>
								</h5>
								<p class="text-base text-pale-cerulean">{option.client.description}</p>
							</div>
							<ul class="flex flex-col gap-2">
								{#each option.client.highlights as highlight}
									<li class="flex gap-3 leading-snug">
										<span
											aria-hidden="true"
											class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-burnt-sienna-400"
										></span>
										<span>{highlight}</span>
									</li>
								{/each}
							</ul>
							<ul class="flex flex-wrap gap-2">
								{#each option.client.tech as tech}
									<li
										class="rounded-full border border-pale-cerulean/60 bg-bdazzled-blue-500/30 px-3 py-0.5 text-sm"
									>
										{tech}
									</li>
								{/each}
							</ul>
						</section>
					{/if}
					{#if option.highlights?.length}
						<section>
							<h4 class="mb-2 text-sm uppercase tracking-widest text-burnt-sienna-400">
								Highlights
							</h4>
							<ul class="flex flex-col gap-2">
								{#each option.highlights as highlight}
									<li class="flex gap-3 leading-snug">
										<span
											aria-hidden="true"
											class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-burnt-sienna-400"
										></span>
										<span>{highlight}</span>
									</li>
								{/each}
							</ul>
						</section>
					{/if}
					{#if option.tech?.length}
						<section>
							<h4 class="mb-2 text-sm uppercase tracking-widest text-burnt-sienna-400">Tech</h4>
							<ul class="flex flex-wrap gap-2">
								{#each option.tech as tech}
									<li
										class="rounded-full border border-pale-cerulean/60 bg-bdazzled-blue-500/30 px-3 py-0.5 text-sm"
									>
										{tech}
									</li>
								{/each}
							</ul>
						</section>
					{/if}
				</article>
			{/if}
		{/each}
	</div>
</div>
