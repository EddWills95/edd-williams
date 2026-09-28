<script>
	const WORDMARK_PRODIGIES =
		'm118.602 15.11-2.922-2.624c-1.059-.972-1.44-1.44-1.44-2.793V6.096c0-.762.128-1.27.634-1.27.505 0 .678.508.678 1.27v5.334h5.968V7.238c0-4.697-2.285-7.238-6.56-7.238s-6.899 2.54-6.899 7.238v3.514c0 2.88.973 4.362 2.835 6.051l3.133 2.752c.973.848 1.353 1.184 1.353 2.496v3.853c0 .762-.169 1.27-.678 1.27-.464 0-.634-.508-.634-1.27v-5.46h-6.009v4.318c0 4.784 2.454 7.238 6.729 7.238s6.772-2.454 6.772-7.238v-3.133c0-3.261-.804-4.573-2.964-6.519zM95.53 31.66h11.004v-5.036h-4.697v-8.253h4.192V13.29h-4.192V5.376h4.697V.339H95.53zm-8.295 0h6.349V.34h-6.349zM78.643 0c-4.403 0-6.985 2.454-6.985 7.11v17.652c0 4.656 2.243 7.238 5.926 7.238 1.78 0 3.386-.931 3.936-2.202.592 1.524 1.904 1.904 3.853 1.904V15.62h-6.096v10.666c0 .509-.211.89-.634.89-.592 0-.678-.551-.678-1.313V6.138c0-.804.17-1.312.678-1.312.467 0 .634.508.634 1.312v6.857h6.096V7.11c0-4.656-2.33-7.11-6.73-7.11M63.405 31.66h6.349V.34h-6.35zM8.21.34H0v31.32h6.307V20.318h1.904c3.555 0 5.799-2.115 5.799-5.885v-8.17c0-3.81-2.244-5.926-5.799-5.926zm-.55 13.84c0 1.1-.211 1.522-.72 1.522h-.592V4.995h.592c.509 0 .72.423.72 1.482zm22.137 6.178c0-1.82-.467-3.26-2.454-4.275 1.987-.973 2.454-2.413 2.454-4.192V6.262c0-3.81-2.201-5.926-5.798-5.926h-8.211v31.322h6.349V18.493h.592c.508 0 .72.422.72 1.481v8.212c0 1.1.041 2.454.38 3.472h6.35c-.298-1.143-.382-2.33-.382-3.472v-7.83zm-6.348-8c0 1.06-.212 1.482-.72 1.482h-.592V4.995h.592c.508 0 .72.423.72 1.482v5.885zM55.744.34h-8.211v31.322h8.211c3.555 0 5.798-2.115 5.798-5.885V6.266c0-3.808-2.243-5.927-5.798-5.927m-.55 25.184c0 1.06-.212 1.482-.72 1.482h-.592V4.995h.592c.508 0 .72.423.72 1.482zM38.644 0c-4.4 0-6.983 2.454-6.983 7.11v17.776c0 4.656 2.582 7.11 6.982 7.11s6.986-2.454 6.986-7.11V7.11c0-4.656-2.624-7.11-6.986-7.11m.636 25.904c0 .762-.17 1.27-.634 1.27-.508 0-.678-.508-.678-1.27V6.096c0-.762.17-1.27.678-1.27.468 0 .634.508.634 1.27z';

	const options = [
		{
			id: 'self-employed',
			buttonText: 'Self Employed',
			image: '',
			imageAlt: '',
			title: 'Self Employed',
			tagline: 'Inventing Mostly',
			link: { text: 'inventing-mostly.com', url: 'https://inventing-mostly.com' },
			client: {
				name: 'Prodigies',
				wordmark: { viewBox: '0 0 125 32', path: WORDMARK_PRODIGIES },
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
			dates: '2025 – Present',
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
			dates: '2023 – 2025',
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
				'Set frontend testing standards, including accessibility-focused testing using ARIA roles',
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
			dates: '2022 – 2023',
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
			dates: '2022 – 2023',
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
			dates: '2018 – 2020',
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
			id: 'earlier',
			buttonText: 'Earlier',
			image: '',
			imageAlt: '',
			title: 'Earlier',
			tagline: 'Getting started',
			highlights: [
				'University of Hertfordshire: rebuilt the internal directory system for a large user base and lots of data',
				'We Got Coders: intensive Ruby on Rails course, finishing with a crypto API project (CryptoCrowd)',
				'University of Exeter (Falmouth): 2:1 in Politics and International Relations, co-founded the Model United Nations Society'
			],
			tech: ['Ruby', 'Rails', 'Angular', 'React', 'GraphQL', 'SQL']
		}
	];

	let selected = options[0];
</script>

<div class="flex flex-col gap-6 sm:flex-row sm:gap-8">
	<ol
		class="flex flex-row overflow-x-auto sm:flex-col sm:overflow-visible sm:self-start shrink-0 sm:w-44"
	>
		{#each options as option, i}
			<li class="relative">
				<span
					aria-hidden="true"
					class="hidden sm:block absolute left-0 -ml-px w-0.5 bg-pale-cerulean/60 {i === 0
						? 'top-1/2'
						: 'top-0'} {i === options.length - 1 ? 'bottom-1/2' : 'bottom-0'}"
				></span>
				<button
					type="button"
					on:click={() => (selected = option)}
					aria-current={selected.id === option.id}
					class="timeline-item group relative w-full whitespace-nowrap px-3 py-2 text-left origin-left transition-all duration-200 hover:cursor-pointer sm:whitespace-normal sm:py-3 sm:pl-6 sm:hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-pale-cerulean rounded-sm"
					class:timeline-selected={selected.id === option.id}
				>
					<span
						class="timeline-dot hidden sm:block absolute top-1/2 -left-[9px] h-4 w-4 -translate-y-1/2 rounded-full border-2 border-pale-cerulean bg-gunmetal transition-all duration-200 group-hover:scale-125 group-hover:border-burnt-sienna-400"
					></span>
					<span class="block text-base sm:text-lg leading-tight">{option.buttonText}</span>
					{#if option.dates}
						<span class="block text-xs text-pale-cerulean">{option.dates}</span>
					{/if}
				</button>
			</li>
		{/each}
	</ol>
	<div class="min-w-0 flex-1">
		{#each options as option}
			{#if selected.id === option.id}
				<article class="experience-panel flex flex-col gap-6 py-1 sm:min-h-[26rem]">
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
							<p class="italic text-pale-cerulean">
								{option.tagline}{option.dates ? ` · ${option.dates}` : ''}
							</p>
						</div>
					</header>
					{#if option.link}
						<p class="text-base">
							More of what I build at
							<a
								class="underline text-bdazzled-blue-100"
								href={option.link.url}
								target="_blank"
								rel="noopener noreferrer">{option.link.text}</a
							>
						</p>
					{/if}
					{#if option.client}
						<section class="flex flex-col gap-4 rounded border-2 border-pale-cerulean/30 p-4">
							<div class="flex items-start gap-4">
								<div>
									<h4 class="text-sm uppercase tracking-widest text-burnt-sienna-400">Client</h4>
									<h5 class="text-2xl">
										<a
											class="hover:text-burnt-sienna-400 transition-colors"
											href={option.client.url}
											target="_blank"
											rel="noopener noreferrer"
											aria-label={option.client.name}
										>
											{#if option.client.wordmark}
												<svg
													class="h-7 w-auto"
													viewBox={option.client.wordmark.viewBox}
													aria-hidden="true"
													focusable="false"
												>
													<path fill="currentColor" d={option.client.wordmark.path}></path>
												</svg>
											{:else}
												{option.client.name}
											{/if}
										</a>
									</h5>
									<p class="text-base text-pale-cerulean">{option.client.description}</p>
								</div>
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
