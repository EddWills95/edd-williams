<script>
	import TopSection from '../components/top-section.svelte';
	import Projects from '../components/projects.svelte';
	import About from '../components/about.svelte';
	import Experience from '../components/experience.svelte';
	import Header from '../components/header.svelte';
	import Contact from '../components/contact.svelte';
	import BalconySolar from '../components/balcony-solar.svelte';
	import BuildStats from '../components/build-stats.svelte';
</script>

<main class="h-full w-full min-h-screen flex flex-col bg-gunmetal relative overflow-x-hidden">
	<Header />

	<!-- Main Content -->
	<div class="flex-grow flex flex-col gap-4 justify-center items-center">
		<TopSection />

		<hr class="section-break" />

		<div class="live-row">
			<BalconySolar />

			<BuildStats />
		</div>

		<span class="anchor" id="about"></span>
		<section class="base-section justify-start">
			<h2 class="section-title">About</h2>

			<About />
		</section>

		<hr class="section-break" />

		<span class="anchor" id="experience"></span>
		<section class="base-section justify-start">
			<h2 class="section-title">Experience</h2>

			<Experience />
		</section>

		<hr class="section-break" />

		<span class="anchor" id="projects"></span>
		<section class="base-section justify-start">
			<h2 class="section-title">Projects</h2>

			<Projects />
		</section>

		<hr class="section-break" />

		<span class="anchor" id="contact"></span>
		<section class="base-section justify-start items-center text-center">
			<h2 class="section-title">Contact</h2>

			<Contact />
		</section>
	</div>
</main>
