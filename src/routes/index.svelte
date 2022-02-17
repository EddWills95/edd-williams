<script>
	import TopSection from '../components/top-section.svelte';
	import Projects from '../components/projects.svelte';
	import About from '../components/about.svelte';
	import Experience from '../components/experience.svelte';
	import Header from '../components/header.svelte';
	import Contact from '../components/contact.svelte';
</script>

<!-- This might not need to be main -->
<main class="h-full w-full min-h-screen flex flex-col bg-gunmetal relative overflow-hidden">
	<Header />

	<!-- Main Content -->
	<div class="flex-grow flex flex-col gap-4 justify-center items-center">
		<TopSection />

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
			<h2 class="text-2xl mb-4">More projects</h2>

			<Projects />
		</section>

		<hr class="section-break" />

		<span class="anchor" id="contact" />
		<section class="min-h-[200px] flex flex-col justify-start items-center">
			<h2 class="text-2xl mb-4 underline">Contact</h2>

			<Contact />
		</section>
	</div>
</main>
