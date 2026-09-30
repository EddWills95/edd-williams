import { readable } from 'svelte/store';

// One shared poller per endpoint, so the hero chip and the section panels read the same
// numbers from the same request. Polling only runs while something is subscribed and the tab
// is visible; failures back off and keep showing the last good reading.

const BASE = 'https://energy.edd-williams.com';
const MAX_BACKOFF_MS = 10 * 60_000;

// DEV-ONLY: swaps the live endpoint for local fixtures (CORS blocks localhost from the real one).
// The `import.meta.env.DEV` guard lets the bundler drop these branches from production builds.
async function devMock(name) {
	if (!import.meta.env.DEV) return null;
	const params = new URLSearchParams(window.location.search);
	const fixtures = await import('../components/balcony-solar-fixtures.js');
	if (name === 'energy') {
		const variant = params.get('mock');
		return variant ? fixtures.mockStats(variant) : null;
	}
	if (name === 'history') {
		const variant = params.get('mockhistory') ?? (params.has('mock') ? 'normal' : null);
		return variant ? fixtures.mockHistory(variant) : null;
	}
	const variant = params.get('mockbuild') ?? (params.has('mock') ? 'normal' : null);
	return variant ? fixtures.mockBuildStats(variant) : null;
}

/**
 * state: { status: 'loading' | 'ready' | 'empty' | 'error', data, mocked }
 * 'empty' is a 404 (nothing pushed yet); 'error' only shows before the first good reading.
 */
function poller(name, path, intervalMs) {
	let reload = () => {};
	const store = readable({ status: 'loading', data: null, mocked: false }, (set) => {
		if (typeof document === 'undefined') return; // prerender: nothing to poll

		let state = { status: 'loading', data: null, mocked: false };
		let timer;
		let controller;
		let failures = 0;
		let stopped = false;

		const update = (patch) => set((state = { ...state, ...patch }));

		async function load() {
			controller = new AbortController();
			try {
				const mock = await devMock(name);
				if (mock) return update({ status: 'ready', data: mock, mocked: true });
				const res = await fetch(`${BASE}${path}`, { signal: controller.signal });
				if (res.status === 404) {
					failures = 0;
					if (!state.data) update({ status: 'empty' });
				} else if (!res.ok) {
					throw new Error(`${path} returned ${res.status}`);
				} else {
					const data = await res.json();
					failures = 0;
					update({ status: 'ready', data });
				}
			} catch (err) {
				if (stopped || err.name === 'AbortError') return;
				failures += 1;
				console.error(`Failed to load ${name} stats:`, err);
				if (!state.data) update({ status: 'error' });
			}
			schedule();
		}

		function schedule() {
			clearTimeout(timer);
			if (stopped || document.hidden) return;
			timer = setTimeout(load, Math.min(intervalMs * 2 ** failures, MAX_BACKOFF_MS));
		}

		function onVisibility() {
			if (document.hidden) {
				clearTimeout(timer);
				controller?.abort();
				return;
			}
			load();
		}

		reload = () => {
			clearTimeout(timer);
			controller?.abort();
			load();
		};

		document.addEventListener('visibilitychange', onVisibility);
		load();

		return () => {
			stopped = true;
			clearTimeout(timer);
			controller?.abort();
			document.removeEventListener('visibilitychange', onVisibility);
			reload = () => {};
		};
	});
	return { subscribe: store.subscribe, refresh: () => reload() };
}

export const energyStats = poller('energy', '/api/energy-stats', 75_000);
export const energyHistory = poller('history', '/api/energy-history', 10 * 60_000);
export const buildStats = poller('build', '/api/build-stats', 5 * 60_000);
