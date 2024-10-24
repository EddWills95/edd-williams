<script>
	const options = [
		{
			id: 'OakNorth',
			buttonText: 'OakNorth',
			image: './oaknorth.webp',
			imageAlt: 'oaknorth logo',
			title: 'OakNorth',
			tagline: 'React Native Developer',
			highlights: ['Transactional Banking App', 'Building component library for rebrand'],
			tech: ['React Native', 'Zustand', 'React Testing Library', 'AWS']
		},
		{
			id: 'limejump',
			buttonText: 'Limejump',
			image: './limejump.jpeg',
			imageAlt: 'limejump logo',
			title: 'Limejump',
			tagline: 'Customer Experience Developer',
			highlights: [
				'Customer Battery Optimisation Portal',
				'D3 Powered Charts',
				'Self-Serve PPA Quote calculator (Quotejump)',
				'React Design system'
			],
			tech: ['React', 'Redux', 'Node', 'Angular', 'Storybook', 'Kubernetes']
		},
		{
			id: 'ovo',
			buttonText: 'OVO',
			image: './ovo.png',
			imageAlt: 'ovo logo',
			title: 'OVO Energy',
			tagline: 'OVO Beyond, a carbon offsetting addon',
			highlights: ['Windfarm investment oppertunity', 'A/B Testing'],
			tech: ['React', 'React Native', 'Redux', 'AWS Lambda', 'Node', 'Typescript']
		},
		{
			id: 'quickbooks',
			buttonText: 'Quickbooks',
			image: './qb.png',
			imageAlt: 'quickbooks logo',
			title: 'Quickbooks Payroll',
			tagline: 'Payroll UK',
			highlights: [
				'Employee Time Tracking',
				'Competitor Import',
				'Relay => Apollo upgrade',
				'Auto Pension Submissions',
				'FTU conversions (^50%)'
			],
			tech: ['React', 'GraphQL (Relay + Apollo)', 'Micro-Frontends', 'Groovy']
		},
		{
			id: 'herts',
			buttonText: 'Herts Uni',
			image: './herts.png',
			imageAlt: 'herts logo',
			title: 'University of Hertfordshire',
			tagline: 'Internal Directory System rebuild',
			highlights: ['Learn quickly', 'Directory had lots of customers and data'],
			tech: ['Angular', 'React', 'GraphQL', 'Ruby on Rails']
		},
		{
			id: 'wgc',
			buttonText: 'We Got Coders',
			image: './wgc.png',
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
				<img class="rounded-sm object-cover w-auto h-24" src={option.image} alt={option.imageAlt} />
			</div>
		</div>
		<div>
			<h5 class="underline text-burnt-sienna-500">Highlights</h5>
			<ul class="list-disc list-inside">
				{#each option.highlights as highlight}
					<li>{highlight}</li>
				{/each}
			</ul>
		</div>
		<div>
			<h5 class="underline text-burnt-sienna-500">Tech</h5>
			<ul class="list-disc list-inside">
				{#each option.tech as tech}
					<li>{tech}</li>
				{/each}
			</ul>
		</div>
	</div>
{/each}
