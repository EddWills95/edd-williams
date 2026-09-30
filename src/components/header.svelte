<script>
	import { tick } from 'svelte';
	import EddHome from './edd-home.svelte';

	const CVLink =
		'https://www.dropbox.com/scl/fi/pt5echoorwr9sazn4c7f2/Edd-Williams-2026-CV-Google.pdf?rlkey=4hm3255ymj9eytpjuk14vs4t1&st=oqkzwobm&dl=0';

	const links = [
		{ href: '#solar', label: 'Solar' },
		{ href: '#code', label: 'Code' },
		{ href: '#about', label: 'About' },
		{ href: '#experience', label: 'Experience' },
		{ href: '#projects', label: 'Projects' },
		{ href: '#contact', label: 'Contact' }
	];

	let menuOpen = false;
	let menuEl;
	let openButton;
	let closeButton;

	async function handleOpenMenu() {
		menuOpen = true;
		await tick();
		closeButton?.focus();
	}

	function handleCloseMenu() {
		if (!menuOpen) return;
		menuOpen = false;
		openButton?.focus();
	}

	// Keep Tab inside the open menu and let Escape close it.
	function onKeydown(event) {
		if (!menuOpen) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			handleCloseMenu();
			return;
		}
		if (event.key !== 'Tab' || !menuEl) return;
		const focusable = menuEl.querySelectorAll('a[href], button');
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
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

<svelte:window bind:scrollY={y} on:keydown={onKeydown} />

<div
	id="hidden-menu"
	bind:this={menuEl}
	role="dialog"
	aria-modal="true"
	aria-label="Site menu"
	inert={!menuOpen}
	class="fixed transition-transform duration-300 h-screen w-screen inset-0 p-4 z-50 bg-bdazzled-blue-700 {menuOpen
		? ''
		: 'translate-x-full'}"
>
	<div class="flex justify-between">
		<EddHome handler={handleCloseMenu} />
		<button
			type="button"
			aria-label="Close menu"
			on:click={handleCloseMenu}
			bind:this={closeButton}
			class="icon-button absolute right-2 top-2"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				aria-hidden="true"
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
	<nav aria-label="Menu" class="mt-8">
		<ul class="list-none flex flex-col gap-2 text-2xl">
			{#each links as link}
				<li>
					<a class="nav-link justify-center" on:click={handleCloseMenu} href={link.href}
						>{link.label}</a
					>
				</li>
			{/each}
			<li class="flex justify-center">
				<a href={CVLink} target="_blank" rel="noopener noreferrer" class="w-16 rounded-button">CV</a
				>
			</li>
		</ul>
	</nav>
</div>

<header
	id="header"
	class="fixed w-full transition-transform flex justify-between items-center px-4 py-2 bg-gunmetal z-40 {headerClass}"
>
	<EddHome />

	<!-- Mobile -->
	<button
		type="button"
		aria-label="Open menu"
		aria-expanded={menuOpen}
		aria-controls="hidden-menu"
		on:click={handleOpenMenu}
		bind:this={openButton}
		class="icon-button mobile-only"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-6 w-6"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			aria-hidden="true"
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
	<nav aria-label="Main" class="hidden sm:block">
		<ul class="list-none gap-1 flex items-center">
			{#each links as link}
				<li>
					<a class="nav-link" href={link.href}>{link.label}</a>
				</li>
			{/each}
			<li>
				<a href={CVLink} target="_blank" rel="noopener noreferrer" class="w-14 rounded-button">CV</a
				>
			</li>
		</ul>
	</nav>
</header>

<style>
	.icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
	}

	@media (min-width: 640px) {
		.icon-button.mobile-only {
			display: none;
		}
	}

	.nav-link {
		display: flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0 0.5rem;
		text-underline-offset: 4px;
	}

	.nav-link:hover {
		text-decoration: underline;
	}
</style>
