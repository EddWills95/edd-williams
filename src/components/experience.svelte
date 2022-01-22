<script>
	const options = [
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
			buttonText: 'QuickBooks',
			image: './qb.png',
			imageAlt: 'quickbooks logo',
			title: 'Quickbooks',
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
			title: 'Quickbooks',
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

<div>
	<div class="overflow-x-scroll grid grid-flow-col gap-8">
		{#each options as option, i}
			<div
				on:click={() => (selected = option)}
				class="w-32 flex items-center justify-center p-2 hover:cursor-pointer"
				class:experience-selected={selected.id === option.id}
			>
				<span class="text-center flex justify-center items-center">{option.buttonText}</span>
			</div>
		{/each}
	</div>
	<div class="p-4 flex flex-col gap-2">
		{#each options as option, i}
			{#if selected.id === option.id}
				<div class="flex justify-between items-start gap-4">
					<div class="flex flex-col justify-center">
						<h2 class="text-3xl">{option.title}</h2>
						<p class="italic">{option.tagline}</p>
					</div>
					<div class="offset-border">
						<img class="w-auto h-24" src={option.image} alt={option.imageAlt} />
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
			{/if}
		{/each}
	</div>
</div>
