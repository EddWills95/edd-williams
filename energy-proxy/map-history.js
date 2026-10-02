// Pure bucketing of Home Assistant history into fixed-interval series, so it can be tested
// without a Home Assistant instance. HA returns one array of state changes per entity
// ([{ state, last_changed, attributes? }, ...]); a sensor holds its value between changes, so each
// bucket gets the time-weighted average of what the sensor read during it.

export const BUCKET_MINUTES = 15;

const NO_READING = new Set(['unavailable', 'unknown', 'none', '']);

function toNumber(state) {
	const raw = String(state ?? '').trim();
	if (NO_READING.has(raw.toLowerCase())) return null;
	const value = Number(raw);
	return Number.isFinite(value) ? value : null;
}

/**
 * @param {Array<{state: string, last_changed?: string, last_updated?: string, attributes?: object}>} changes
 * @param {{ startMs: number, endMs: number, bucketMs: number, scale?: number }} window
 * @returns {Array<number|null>} one value per bucket, null where the sensor had no reading
 */
export function bucketSeries(changes, { startMs, endMs, bucketMs, scale = 1 }) {
	const count = Math.ceil((endMs - startMs) / bucketMs);
	const sum = new Array(count).fill(0);
	const weight = new Array(count).fill(0);

	const points = (changes ?? [])
		.map((c) => ({ t: Date.parse(c.last_changed ?? c.last_updated), v: toNumber(c.state) }))
		.filter((p) => Number.isFinite(p.t))
		.sort((a, b) => a.t - b.t);

	for (let i = 0; i < points.length; i++) {
		const { t, v } = points[i];
		if (v === null) continue;
		const from = Math.max(t, startMs);
		const to = Math.min(points[i + 1]?.t ?? endMs, endMs);
		if (to <= from) continue;
		for (let b = Math.floor((from - startMs) / bucketMs); b < count; b++) {
			const bStart = startMs + b * bucketMs;
			const bEnd = bStart + bucketMs;
			if (bStart >= to) break;
			const overlap = Math.min(to, bEnd) - Math.max(from, bStart);
			if (overlap > 0) {
				sum[b] += v * scale * overlap;
				weight[b] += overlap;
			}
		}
	}
	return sum.map((s, b) => (weight[b] > 0 ? s / weight[b] : null));
}

// Some power sensors report kW; the first state HA returns carries the unit.
export function wattScale(changes) {
	return changes?.[0]?.attributes?.unit_of_measurement === 'kW' ? 1000 : 1;
}

const round = (n, digits = 0) => (n === null ? null : Number(n.toFixed(digits)));

/**
 * @param {{ solar?: any[], house?: any[], grid?: any[], soc: any[] }} history HA change arrays by role
 * @param {{ now?: Date, hours?: number, gridExportIsPositive?: boolean }} options
 */
export function mapHistory(history, options = {}) {
	const now = options.now ?? new Date();
	const hours = options.hours ?? 24;
	const bucketMs = BUCKET_MINUTES * 60_000;
	const endMs = Math.ceil(now.getTime() / bucketMs) * bucketMs;
	const startMs = endMs - hours * 3_600_000;
	const window = { startMs, endMs, bucketMs };

	const watts = (changes) =>
		changes ? bucketSeries(changes, { ...window, scale: wattScale(changes) }) : null;

	const out = {
		start: new Date(startMs).toISOString(),
		intervalMinutes: BUCKET_MINUTES,
		batterySoc: bucketSeries(history.soc, window).map((v) => round(v, 1))
	};

	const solar = watts(history.solar);
	if (solar) out.solarW = solar.map((v) => (v === null ? null : Math.max(0, round(v))));
	const house = watts(history.house);
	if (house) out.houseW = house.map((v) => (v === null ? null : Math.max(0, round(v))));
	const grid = watts(history.grid);
	if (grid) {
		// Published convention, as in /api/energy-stats: positive = importing, negative = exporting.
		out.gridW = grid.map((v) =>
			v === null ? null : round(options.gridExportIsPositive ? -v : v)
		);
	}
	// Battery power is published as the sensor reports it: signed, positive while discharging and
	// negative while charging.
	const battery = watts(history.batteryPower);
	if (battery) out.batteryW = battery.map((v) => (v === null ? null : round(v)));
	out.asOf = now.toISOString();
	return out;
}
