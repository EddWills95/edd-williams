// DEV-ONLY fixtures for designing the Balcony Solar section locally, where CORS blocks the live
// endpoint. Only ever imported behind `import.meta.env.DEV` plus an explicit `?mock=` opt-in in
// balcony-solar.svelte, so none of this reaches a production build. These are NOT real readings.
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

// History fixtures for the day-in-the-life strip, selected with `?mockhistory=<variant>` (or any
// `?mock=`, which uses `normal`). DEV-ONLY, invented, and simulated from a simple battery model
// so the four series stay consistent with each other the way real ones do.
//
//   ?mockhistory=normal  a sunny-ish day: solar peak, evening discharge, a few kettle spikes
//   ?mockhistory=none    request fails (strip hidden)

function simulateDay() {
	const bucketMs = 15 * 60_000;
	const end = Math.ceil(Date.now() / bucketMs) * bucketMs;
	const n = 96;
	const start = end - n * bucketMs;
	const solarW = [];
	const houseW = [];
	const gridW = [];
	const batterySoc = [];
	const batteryW = [];
	const capacityWh = 5000;
	let soc = 34;
	for (let i = 0; i < n; i++) {
		const d = new Date(start + i * bucketMs);
		const hour = d.getHours() + d.getMinutes() / 60;
		const sun = Math.max(0, Math.sin(((hour - 6) / 13) * Math.PI));
		const cloud = 0.75 + 0.25 * Math.sin(i * 1.7) * Math.cos(i * 0.6);
		const solar = Math.round(sun * 2150 * cloud);
		let house = 260 + 60 * Math.sin(i * 0.9);
		if (hour > 6.5 && hour < 8.5) house += 380;
		if (hour > 17.5 && hour < 21.5) house += 520;
		if (i % 23 === 5 || i % 31 === 11) house += 2100; // the kettle
		house = Math.round(house);

		const net = solar - house;
		let grid;
		let battery; // positive discharging, negative charging
		if (net >= 0) {
			const charge = Math.min(net, 2000, ((100 - soc) / 100) * capacityWh * 4);
			soc += (charge * 0.25 * 100) / capacityWh;
			grid = -(net - charge);
			battery = -charge;
		} else {
			const discharge = Math.min(-net, 2000, (soc / 100) * capacityWh * 4);
			soc -= (discharge * 0.25 * 100) / capacityWh;
			grid = -net - discharge;
			battery = discharge;
		}
		solarW.push(solar);
		houseW.push(house);
		gridW.push(Math.round(grid));
		batteryW.push(Math.round(battery));
		batterySoc.push(Number(Math.min(100, Math.max(0, soc)).toFixed(1)));
	}
	return {
		start: new Date(start).toISOString(),
		intervalMinutes: 15,
		solarW,
		houseW,
		gridW,
		batteryW,
		batterySoc,
		asOf: new Date().toISOString()
	};
}

export function mockHistory(variant) {
	if (variant === 'none') return Promise.reject(new Error('mock: history unavailable'));
	return Promise.resolve(simulateDay());
}
