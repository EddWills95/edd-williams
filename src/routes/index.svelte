<script>
	import About from '../components/about.svelte';
	import Experience from '../components/experience.svelte';
	import Header from '../components/header.svelte';
</script>

<!-- This might not need to be main -->
<main class="h-full w-full min-h-screen flex flex-col bg-gunmetal relative overflow-hidden">
	<Header />

	<!-- Main Content -->
	<div class="flex-grow flex flex-col gap-4 justify-center items-center">
		<section id="banner" class="base-section text-2xl items-center justify-center sm:p-24">
			<h1 class="flex flex-col gap-2">
				<span class="text-base font-mono font-thin">Hi 👋<br /></span>
				<span class="text-4xl text-burnt-sienna">I'm Edd <br /></span>
				<span class="text-3xl flex-col gap-2 text-light-cyan"> I build cool things </span>
				<div class="flex text-3xl text-light-cyan">
					<span class="ml-[94px] h-9 overflow-hidden inline-block">
						<ul class="transform-gpu animate-translate-scroll hover:[animation-play-state:paused]">
							<li>for the web 🌐</li>
							<li>with batteries 🔋</li>
							<li class="flex items-center">
								on bitcoin
								<svg class="inline ml-2" xmlns="http://www.w3.org/2000/svg" width="32" height="32"
									><g fill="none" fill-rule="evenodd"
										><circle cx="16" cy="16" r="16" fill="#F7931A" /><path
											fill="#FFF"
											fill-rule="nonzero"
											d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z"
										/></g
									></svg
								>
							</li>
						</ul>
					</span>
				</div>
			</h1>
		</section>

		<hr class="section-break" />

		<span class="anchor" id="about" />
		<section class="base-section justify-start">
			<h2 class="text-2xl mb-4">Me, Myself and I</h2>

			<About />
		</section>

		<hr class="section-break" />

		<span class="anchor" id="experience" />
		<section class="base-section justify-start">
			<h2 class="text-2xl mb-4">Experience</h2>

			<Experience />
		</section>

		<hr class="section-break" />

		<span class="anchor" id="projects" />
		<section class="base-section justify-start">
			<h2 class="text-2xl mb-4">Projects</h2>
		</section>

		<!-- <section id="contact" /> -->
	</div>
</main>
