<script>
	import EddHome from './edd-home.svelte';

	function handleOpenMenu() {
		document.querySelector('#hidden-menu').classList.remove('translate-x-full');
	}

	function handleCloseMenu() {
		document.querySelector('#hidden-menu').classList.add('translate-x-full');
	}

	let y = 0;
	let lastY = 0;
	const tolerance = 4;
	const offset = 64;

	$: headerClass = updateClass(y);

	function updateClass(y) {
		const dy = lastY - y;
		lastY = y;

		return deriveClass(y, dy);
	}

	function deriveClass(y, dy) {
		if (y < offset) {
			return 'show';
		}

		if (Math.abs(dy) <= tolerance) {
			return headerClass;
		}

		if (dy < 0) {
			return '-translate-y-14';
		}

		return '';
	}
</script>

<svelte:window bind:scrollY={y} />

<div
	id="hidden-menu"
	class="fixed transition-transform duration-300 h-screen w-screen inset-0 p-4 z-50 translate-x-full bg-bdazzled-blue-700"
>
	<div class="flex justify-between">
		<EddHome handler={handleCloseMenu} />
		<button on:click={handleCloseMenu} class="absolute right-4 top-4">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</div>
	<nav class="mt-8">
		<ul class="list-none flex flex-col gap-4 text-2xl sm:hidden">
			<li
				class="h-8 w-auto px-2 flex justify-center items-center hover:underline underline-offset-2"
			>
				<a on:click={handleCloseMenu} href="#about">About</a>
			</li>
			<li
				class="h-8 w-auto px-2 flex justify-center items-center hover:underline underline-offset-2"
			>
				<a on:click={handleCloseMenu} href="#experience">Experience</a>
			</li>
			<li
				class="h-8 w-auto px-2 flex justify-center items-center hover:underline underline-offset-2"
			>
				<a on:click={handleCloseMenu} href="#projects">Projects</a>
			</li>
			<li
				class="h-8 w-auto px-2 flex justify-center items-center hover:underline underline-offset-2"
			>
				<a on:click={handleCloseMenu} href="#contact">Contact</a>
			</li>
			<li class="h-8 w-auto flex justify-center items-center">
				<a
					href="https://www.dropbox.com/s/m6421udkx2a14lo/Edd%20Williams%20-%20CV.pdf?dl=0"
					target="_blank"
					class="w-12 rounded-button">CV</a
				>
			</li>
		</ul>
	</nav>
</div>

<header
	id="header"
	class="fixed w-full transition-transform flex justify-between items-center p-4 bg-gunmetal z-40 {headerClass}"
>
	<EddHome />

	<!-- Mobile -->
	<button on:click={handleOpenMenu} class="sm:hidden">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-6 w-6"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 6h16M4 12h16M4 18h16"
			/>
		</svg>
	</button>

	<!-- Regular -->
	<ul class="hidden list-none gap-2 md:flex">
		<li class="h-8 w-auto px-2 flex justify-center items-center hover:underline underline-offset-2">
			<a href="#about">About</a>
		</li>
		<li class="h-8 w-auto px-2 flex justify-center items-center hover:underline underline-offset-2">
			<a href="#experience">Experience</a>
		</li>
		<li class="h-8 w-auto px-2 flex justify-center items-center hover:underline underline-offset-2">
			<a href="#projects">Projects</a>
		</li>
		<li class="h-8 w-auto px-2 flex justify-center items-center hover:underline underline-offset-2">
			<a href="#contact">Contact</a>
		</li>
		<li class="h-8 w-auto">
			<a
				href="https://www.dropbox.com/s/m6421udkx2a14lo/Edd%20Williams%20-%20CV.pdf?dl=0"
				target="_blank"
				class="w-12 rounded-button">CV</a
			>
		</li>
	</ul>
</header>
