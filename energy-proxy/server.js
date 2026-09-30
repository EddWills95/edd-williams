import express from 'express';
import cors from 'cors';
import { mapStats } from './map-stats.js';
import { mapHistory } from './map-history.js';
import { openBuildStats, tokenMatches, validateSnapshot } from './build-stats.js';

// PaaS env-var UIs routinely round-trip pasted values with a trailing newline or stray
// whitespace — trim each one so a copy-paste artifact doesn't silently break auth or
// produce a malformed fetch URL.
const trim = (v) => v?.trim();
const HA_URL = trim(process.env.HA_URL);
const HA_TOKEN = trim(process.env.HA_TOKEN);
const PORT = trim(process.env.PORT) || 3001;
const CACHE_TTL_SECONDS = trim(process.env.CACHE_TTL_SECONDS) || '60';
const ALLOWED_ORIGINS = trim(process.env.ALLOWED_ORIGINS) || 'http://localhost:3000';
const BUILD_STATS_TOKEN = trim(process.env.BUILD_STATS_TOKEN);
const BUILD_STATS_DB = trim(process.env.BUILD_STATS_DB) || '/data/build-stats.db';
const BUILD_STATS_TZ = trim(process.env.BUILD_STATS_TZ) || 'Europe/London';
const GRID_EXPORT_IS_POSITIVE = trim(process.env.HA_GRID_POWER_SIGN) === 'export-positive';

if (!HA_URL || !HA_TOKEN) {
	console.error('HA_URL and HA_TOKEN must both be set. See .env.example.');
	process.exit(1);
}

// Log non-secret shape info at startup — enough to catch "value got mangled" without ever
// printing the token itself.
console.log(
	`HA_URL="${HA_URL}" (length ${HA_URL.length}), HA_TOKEN length ${HA_TOKEN.length}, starts with "${HA_TOKEN.slice(0, 6)}..."`
);

// entity_id -> the key it maps to in the response payload
const ENTITIES = {
	batterySavingsTotalPence: 'sensor.battery_system_value_total',
	solarGenerationTotalKwh: 'sensor.stream_ac_pro_0388_solar_generation_energy',
	solarGenerationTodayKwh: 'sensor.stream_ac_pro_0388_solar_generation_today',
	batterySoc: 'sensor.combined_battery_soc',
	batteryPowerW: 'sensor.combined_battery_power',
	batteryAction: 'sensor.battery_action'
};

const cacheTtlMs = Number(CACHE_TTL_SECONDS) * 1000;
let cache = null; // { data, fetchedAt }

async function fetchEntityState(entityId) {
	const url = `${HA_URL}/api/states/${entityId}`;
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${HA_TOKEN}`,
			'Content-Type': 'application/json'
		}
	});
	if (!res.ok) {
		const body = await res.text().catch(() => '<unreadable body>');
		throw new Error(`Home Assistant returned ${res.status} for ${entityId} (${url}): ${body}`);
	}
	return res.json();
}

// Optional extras: response key -> env var naming the entity to read. Unset = field omitted.
// These are opt-in (rather than hard-coded like ENTITIES) so a new sensor can be wired up in
// Dokploy without a code change, and so a missing/renamed sensor can never take the whole
// endpoint down — the existing fields above keep working regardless.
const OPTIONAL_ENTITY_ENV = {
	solarPowerW: 'HA_ENTITY_SOLAR_POWER',
	housePowerW: 'HA_ENTITY_HOUSE_POWER',
	gridPowerW: 'HA_ENTITY_GRID_POWER',
	batterySavingsToday: 'HA_ENTITY_SAVINGS_TODAY',
	kettleCupsToday: 'HA_ENTITY_KETTLE_CUPS',
	kettleBoilsToday: 'HA_ENTITY_KETTLE_BOILS'
};

// The kettle helpers are created by hand in Home Assistant with fixed ids, so they default on
// (the env var still overrides them). A missing entity is just omitted, like any other optional.
const OPTIONAL_ENTITY_DEFAULTS = {
	kettleCupsToday: 'sensor.kettle_cups_today',
	kettleBoilsToday: 'sensor.kitchen_kettle_plug_kettle_boils_today'
};

const OPTIONAL_ENTITIES = Object.fromEntries(
	Object.entries(OPTIONAL_ENTITY_ENV)
		.map(([key, envVar]) => [key, trim(process.env[envVar]) || OPTIONAL_ENTITY_DEFAULTS[key]])
		.filter(([, entityId]) => entityId)
);

console.log(
	`Optional entities configured: ${Object.keys(OPTIONAL_ENTITIES).join(', ') || 'none'}`
);

async function fetchStats() {
	const entries = Object.entries(ENTITIES);
	const optionalEntries = Object.entries(OPTIONAL_ENTITIES);

	const [states, optionalResults] = await Promise.all([
		Promise.all(entries.map(([, entityId]) => fetchEntityState(entityId))),
		Promise.allSettled(optionalEntries.map(([, entityId]) => fetchEntityState(entityId)))
	]);

	const required = {};
	entries.forEach(([key], i) => {
		required[key] = states[i];
	});

	const optional = {};
	optionalEntries.forEach(([key], i) => {
		const result = optionalResults[i];
		if (result.status === 'fulfilled') {
			optional[key] = result.value;
		} else {
			console.error(`Optional entity for ${key} failed, omitting it:`, result.reason.message);
		}
	});

	return mapStats(required, optional, { gridExportIsPositive: GRID_EXPORT_IS_POSITIVE });
}

async function getStats() {
	const now = Date.now();
	if (cache && now - cache.fetchedAt < cacheTtlMs) {
		return { ...cache.data, cached: true };
	}
	try {
		const data = await fetchStats();
		cache = { data, fetchedAt: now };
		return { ...data, cached: false };
	} catch (err) {
		if (cache) {
			console.error('Home Assistant fetch failed, serving stale cache:', err.message);
			return { ...cache.data, cached: true, stale: true };
		}
		throw err;
	}
}

// The last 24 hours as 15-minute buckets, for the site's "day in the life" strip. Only the
// sensors already published live (solar, house, grid, battery charge) are read, and the
// response is cached for five minutes since a day's shape barely changes between requests.
const HISTORY_TTL_MS = 5 * 60_000;
let historyCache = null; // { data, fetchedAt }

async function fetchHistory() {
	const end = new Date();
	const start = new Date(end.getTime() - 25 * 3_600_000); // a little early, so a value set before the window carries in
	const roles = {
		soc: ENTITIES.batterySoc,
		batteryPower: ENTITIES.batteryPowerW,
		batteryAction: ENTITIES.batteryAction,
		solar: OPTIONAL_ENTITIES.solarPowerW,
		house: OPTIONAL_ENTITIES.housePowerW,
		grid: OPTIONAL_ENTITIES.gridPowerW
	};
	const wanted = Object.entries(roles).filter(([, id]) => id);
	const url =
		`${HA_URL}/api/history/period/${start.toISOString()}` +
		`?filter_entity_id=${wanted.map(([, id]) => id).join(',')}` +
		`&end_time=${end.toISOString()}&minimal_response`;
	const res = await fetch(url, { headers: { Authorization: `Bearer ${HA_TOKEN}` } });
	if (!res.ok) throw new Error(`Home Assistant returned ${res.status} for history`);
	const groups = await res.json();

	// One array per entity, in no guaranteed order; match them back by entity_id.
	const history = {};
	for (const changes of groups) {
		const id = changes[0]?.entity_id;
		const role = wanted.find(([, entityId]) => entityId === id)?.[0];
		if (role) history[role] = changes;
	}
	history.soc ??= [];
	return mapHistory(history, { now: end, gridExportIsPositive: GRID_EXPORT_IS_POSITIVE });
}

async function getHistory() {
	const now = Date.now();
	if (historyCache && now - historyCache.fetchedAt < HISTORY_TTL_MS) return historyCache.data;
	try {
		const data = await fetchHistory();
		historyCache = { data, fetchedAt: now };
		return data;
	} catch (err) {
		if (historyCache) {
			console.error('History fetch failed, serving stale cache:', err.message);
			return historyCache.data;
		}
		throw err;
	}
}

// Build stats are optional: if the token isn't set or the database can't be opened, the
// energy endpoint carries on and only the build routes report unavailable.
let buildStats = null;
if (BUILD_STATS_TOKEN) {
	try {
		buildStats = openBuildStats(BUILD_STATS_DB, { timeZone: BUILD_STATS_TZ });
		console.log(`Build stats enabled, database at ${BUILD_STATS_DB}`);
	} catch (err) {
		console.error(`Build stats disabled, could not open ${BUILD_STATS_DB}:`, err.message);
	}
} else {
	console.log('Build stats disabled (BUILD_STATS_TOKEN not set)');
}

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()) }));

app.get('/healthz', (_req, res) => {
	res.json({ ok: true });
});

app.get('/api/energy-stats', async (_req, res) => {
	try {
		const stats = await getStats();
		res.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=30`);
		res.json(stats);
	} catch (err) {
		console.error('Failed to fetch energy stats:', err.message);
		res.status(502).json({ error: 'Failed to fetch energy stats' });
	}
});

app.get('/api/energy-history', async (_req, res) => {
	try {
		const history = await getHistory();
		res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=120');
		res.json(history);
	} catch (err) {
		console.error('Failed to fetch energy history:', err.message);
		res.status(502).json({ error: 'Failed to fetch energy history' });
	}
});

app.get('/api/build-stats', (_req, res) => {
	const summary = buildStats?.summary();
	if (!summary) return res.status(404).json({ error: 'No build stats yet' });
	res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
	res.json(summary);
});

// Write endpoint for the Mac job. Not CORS-enabled for browsers in any useful way: it needs
// the bearer token, which only the Mac holds.
app.post('/api/build-stats', express.json({ limit: '64kb' }), (req, res) => {
	if (!buildStats) return res.status(503).json({ error: 'Build stats not enabled' });

	const header = req.get('Authorization') ?? '';
	const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
	if (!tokenMatches(provided, BUILD_STATS_TOKEN)) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	const result = validateSnapshot(req.body);
	if (!result.ok) return res.status(400).json({ error: result.error });

	try {
		buildStats.ingest(result.value);
		res.json({ ok: true, days: result.value.days.length });
	} catch (err) {
		console.error('Failed to store build stats:', err.message);
		res.status(500).json({ error: 'Failed to store build stats' });
	}
});

app.listen(PORT, () => {
	console.log(`energy-proxy listening on :${PORT}`);
});
