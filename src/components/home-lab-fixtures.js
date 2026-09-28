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
		batterySavingsToday: 0.84
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
		batterySavingsToday: 0.31
	}),
	legacy,
	stale: () => ({ ...legacy(), asOf: minutesAgo(190), stale: true })
};

export function mockStats(variant) {
	if (variant === 'error') return Promise.reject(new Error('mock: simulated failure'));
	if (variant === 'loading') return new Promise(() => {});
	return Promise.resolve((variants[variant] ?? variants[1])());
}
