<script>
	const projects = [
		{
			id: 'umbrel',
			title: 'Umbrel',
			tagline: 'Bitcoin + Lightning RaspberryPi node',
			text: 'A self-hosted bitcoin node with an app store for self-soverignty apps. Contributed to the UI, fixing bugs and adding features. Started a project to integrate a screen. ',
			image: './umbrel.png',
			imageAlt: 'get umbrel',
			github: 'https://github.com/getumbrel/umbrel-dashboard/pulls?q=is%3Apr+author%3AEddWills95+',
			url: 'https://getumbrel.com/'
		},
		{
			id: 'epsolar',
			title: 'EPSolar Dashboard',
			tagline: 'RaspberryPi Solar change controller',
			text: 'Raspberry Pi dashboard that integrates with an EPSolar charge controller. Involved hardware serial investigations and experimentation',
			image: './raspberry-pi.jpeg',
			imageAlt: 'raspberry pi'
		},
		{
			id: 'pi-thermo',
			title: 'Raspberry Pi Thermostat',
			tagline: 'My first hardware/software project!',
			text: 'A PHP, Javascript and Python thermostat using a DHT22 that switches a heating system on and off. While my presentation leaves a lot to be desired, I proved to myself that I was able to create useful projects using my own code. A real turning point in my life',
			github: 'https://github.com/EddWills95/ThermoPi',
			image: './thermo-pi.jpg'
		}
	];
</script>

{#each projects as project, i}
	<div class="p-4 mt-4 flex flex-col gap-4">
		<div
			class="flex gap-8 flex-wrap justify-center items-center"
			class:flex-row-reverse={i % 2 === 0}
		>
			<div class="flex flex-col justify-center">
				<h3 class="text-3xl">{project.title}</h3>
				<p class="italic">{project.tagline}</p>
			</div>
			{#if project.image}
				<div class="offset-border">
					<img
						class="rounded-sm object-cover w-auto h-24"
						src={project.image}
						alt={project.imageAlt}
					/>
				</div>
			{/if}
		</div>
		<p>{project.text}</p>
	</div>
{/each}
