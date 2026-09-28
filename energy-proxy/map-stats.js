// Pure mapping from Home Assistant state objects to the public response payload. Kept separate
// from server.js (which exits without HA credentials and starts listening on import) so the
// mapping can be exercised on its own with fixture states.

// Home Assistant reports this as a bare verb (DISCHARGE / CHARGE / IDLE); the UI wants the
// gerund form ("Discharging · 401W"). Explicit map rather than string-mangling since it's a
// small fixed set and a silent guess would be wrong for anything unexpected (e.g. IDLE).
const BATTERY_ACTION_LABELS = {
	DISCHARGE: 'Discharging',
	CHARGE: 'Charging',
	IDLE: 'Idle',
	HOLD: 'Holding'
};

export function batteryActionLabel(value) {
	return BATTERY_ACTION_LABELS[value] ?? value ?? null;
}

// HA uses these literal strings when a sensor has no reading; they must never be published as
// if they were a number (Number('unavailable') is NaN, which JSON-serialises to null anyway,
// but being explicit keeps a missing sensor distinguishable from a broken mapping).
const NO_READING = new Set(['unavailable', 'unknown', 'none', '']);

function readNumber(stateObj) {
	if (!stateObj) return null;
	const raw = String(stateObj.state ?? '').trim();
	if (NO_READING.has(raw.toLowerCase())) return null;
	const value = Number(raw);
	return Number.isFinite(value) ? value : null;
}

// Power sensors from different integrations report in W or kW; normalise to whole watts.
function readWatts(stateObj) {
	const value = readNumber(stateObj);
	if (value === null) return null;
	const unit = stateObj.attributes?.unit_of_measurement;
	return Math.round(unit === 'kW' ? value * 1000 : value);
}

// The existing savings sensor reports pence. Anything explicitly tagged as pounds is taken as-is.
function readPounds(stateObj) {
	const value = readNumber(stateObj);
	if (value === null) return null;
	const unit = stateObj.attributes?.unit_of_measurement;
	const pounds = unit === 'GBP' || unit === '£' ? value : value / 100;
	return Number(pounds.toFixed(2));
}

/**
 * @param {Record<string, any>} required state objects for every key in ENTITIES (always present)
 * @param {Record<string, any>} optional state objects for configured optional entities; a key is
 *   missing when that entity isn't configured or couldn't be read
 * @param {{ gridExportIsPositive?: boolean, now?: Date }} options
 */
export function mapStats(required, optional = {}, options = {}) {
	const raw = (key) => required[key]?.state;

	// Existing fields: unchanged shape and rounding, so the live site keeps working as-is.
	const stats = {
		batterySavingsTotal: Number((Number(raw('batterySavingsTotalPence')) / 100).toFixed(2)),
		solarGenerationTotalKwh: Number(Number(raw('solarGenerationTotalKwh')).toFixed(1)),
		solarGenerationTodayKwh: Number(Number(raw('solarGenerationTodayKwh')).toFixed(2)),
		batterySoc: Number(Number(raw('batterySoc')).toFixed(1)),
		batteryPowerW: Math.round(Number(raw('batteryPowerW'))),
		batteryAction: batteryActionLabel(raw('batteryAction')),
		asOf: (options.now ?? new Date()).toISOString()
	};

	// Optional fields: only added when configured AND reporting a real number. Consumers must
	// treat every one of these as possibly absent.
	const solarPowerW = readWatts(optional.solarPowerW);
	if (solarPowerW !== null) stats.solarPowerW = Math.max(0, solarPowerW);

	const housePowerW = readWatts(optional.housePowerW);
	if (housePowerW !== null) stats.housePowerW = Math.max(0, housePowerW);

	// Published convention: positive = importing from the grid, negative = exporting to it.
	const gridPowerW = readWatts(optional.gridPowerW);
	if (gridPowerW !== null) {
		stats.gridPowerW = options.gridExportIsPositive ? -gridPowerW : gridPowerW;
	}

	const batterySavingsToday = readPounds(optional.batterySavingsToday);
	if (batterySavingsToday !== null) stats.batterySavingsToday = batterySavingsToday;

	return stats;
}
