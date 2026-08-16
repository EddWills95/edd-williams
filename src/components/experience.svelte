<script>
	const options = [
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

<div class="overflow-scroll flex w-full">
	{#each options as option, i}
		<div
			on:click={() => (selected = option)}
			class="h-16 min-w-[150px] flex flex-1 justify-center items-center text-center border-l-2 last:border-r-2 hover:cursor-pointer"
			class:experience-selected={selected.id === option.id}
		>
			{option.buttonText}
		</div>
	{/each}
</div>
{#each options as option, i}
	<div class={`p-4 mt-4 flex flex-col gap-2 ${selected.id === option.id ? 'flex' : 'hidden'}`}>
		<div class="flex gap-8 flex-wrap justify-center items-center">
			<div class="flex flex-col justify-center">
				<h3 class="text-3xl">{option.title}</h3>
				<p class="italic">{option.tagline}</p>
			</div>
			<div class="offset-border">
				<img
					class="rounded-sm object-cover w-auto h-24"
					src={option.image}
					alt={option.imageAlt}
					loading="lazy"
				/>
			</div>
		</div>
		<div>
			<h4 class="underline text-sm text-burnt-sienna-400">Highlights</h4>
			<ul class="list-disc list-inside">
				{#each option.highlights as highlight}
					<li>{highlight}</li>
				{/each}
			</ul>
		</div>
		<div>
			<h4 class="underline text-sm text-burnt-sienna-400">Tech</h4>
			<ul class="list-disc list-inside">
				{#each option.tech as tech}
					<li>{tech}</li>
				{/each}
			</ul>
		</div>
	</div>
{/each}
