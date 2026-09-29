// DEV-ONLY fixtures for designing the Home Lab section locally, where CORS blocks the live
// endpoint. Only ever imported behind `import.meta.env.DEV` plus an explicit `?mock=` opt-in in
// home-lab.svelte, so none of this reaches a production build. These are NOT real readings.
//
//   ?mock=1       every field, battery discharging in the evening
//   ?mock=sunny   solar exporting to the grid while the battery charges
//   ?mock=legacy  only the fields the currently deployed proxy returns
//   ?mock=stale   proxy serving an old cached reading
//   ?mock=error   request fails
//   ?mock=loading request never resolves

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

const legacy = () => ({
	batterySavingsTotal: 60.25,
	solarGenerationTotalKwh: 211.3,
	solarGenerationTodayKwh: 1.47,
	batterySoc: 46.8,
	batteryPowerW: 401,
	batteryAction: 'Discharging',
	asOf: minutesAgo(4),
	cached: true
});

const variants = {
	1: () => ({
		...legacy(),
		solarPowerW: 0,
		housePowerW: 452,
		gridPowerW: 51,
		batterySavingsToday: 0.84,
		kettleCupsToday: 6,
		kettleBoilsToday: 3
	}),
	sunny: () => ({
		...legacy(),
		solarGenerationTodayKwh: 6.82,
		batterySoc: 71.4,
		batteryPowerW: -1180,
		batteryAction: 'Charging',
		solarPowerW: 2140,
		housePowerW: 390,
		gridPowerW: -570,
		batterySavingsToday: 0.31,
		kettleCupsToday: 1,
		kettleBoilsToday: 1
	}),
	legacy,
	stale: () => ({ ...legacy(), asOf: minutesAgo(190), stale: true })
};

export function mockStats(variant) {
	if (variant === 'error') return Promise.reject(new Error('mock: simulated failure'));
	if (variant === 'loading') return new Promise(() => {});
	return Promise.resolve((variants[variant] ?? variants[1])());
}

// Build-stats fixtures, selected with `?mockbuild=<variant>` (or any `?mock=`, which uses
// `normal`). Same rule: DEV-ONLY, invented numbers, labelled as mock in the UI.
//
//   ?mockbuild=normal  a typical day
//   ?mockbuild=stale   laptop hasn't synced for a few days
//   ?mockbuild=none    404, as in production before the first push (panel hidden)
//   ?mockbuild=big     very large totals, to check nothing overflows
//   ?mockbuild=zeros   a first day with nothing recorded yet

const buildWindow = (written, cacheRead, linesAdded, linesRemoved, commits) => ({
	written,
	cacheRead,
	linesAdded,
	linesRemoved,
	commits
});

const buildVariants = {
	normal: () => ({
		asOf: minutesAgo(12),
		stale: false,
		today: buildWindow(687_856, 61_204_117, 1_204, 388, 7),
		week: buildWindow(2_431_902, 402_118_553, 5_310, 1_122, 31),
		lifetime: buildWindow(9_118_470, 3_962_429_899, 48_210, 13_407, 312)
	}),
	stale: () => ({
		...buildVariants.normal(),
		asOf: minutesAgo(60 * 70),
		stale: true
	}),
	big: () => ({
		asOf: minutesAgo(3),
		stale: false,
		today: buildWindow(14_902_331, 1_204_993_201, 38_114, 41_920, 64),
		week: buildWindow(88_120_004, 9_812_004_551, 210_442, 99_310, 402),
		lifetime: buildWindow(912_004_118, 98_120_441_337, 2_104_993, 1_020_441, 9_812)
	}),
	zeros: () => ({
		asOf: minutesAgo(1),
		stale: false,
		today: buildWindow(0, 0, 0, 0, 0),
		week: buildWindow(0, 0, 0, 0, 0),
		lifetime: buildWindow(0, 0, 0, 0, 0)
	})
};

export function mockBuildStats(variant) {
	if (variant === 'none') return Promise.reject(new Error('mock: 404, no build stats yet'));
	return Promise.resolve((buildVariants[variant] ?? buildVariants.normal)());
}
