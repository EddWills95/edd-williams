import express from 'express';
import cors from 'cors';

const {
	HA_URL,
	HA_TOKEN,
	PORT = 3001,
	CACHE_TTL_SECONDS = '600',
	ALLOWED_ORIGINS = 'http://localhost:3000'
} = process.env;

if (!HA_URL || !HA_TOKEN) {
	console.error('HA_URL and HA_TOKEN must both be set. See .env.example.');
	process.exit(1);
}

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
	const res = await fetch(`${HA_URL}/api/states/${entityId}`, {
		headers: {
			Authorization: `Bearer ${HA_TOKEN}`,
			'Content-Type': 'application/json'
		}
	});
	if (!res.ok) {
		throw new Error(`Home Assistant returned ${res.status} for ${entityId}`);
	}
	return res.json();
}

// Home Assistant reports this as a bare verb (DISCHARGE / CHARGE / IDLE); the UI wants the
// gerund form ("Discharging · 401W"). Explicit map rather than string-mangling since it's a
// small fixed set and a silent guess would be wrong for anything unexpected (e.g. IDLE).
const BATTERY_ACTION_LABELS = {
	DISCHARGE: 'Discharging',
	CHARGE: 'Charging',
	IDLE: 'Idle'
};

function batteryActionLabel(value) {
	return BATTERY_ACTION_LABELS[value] ?? value ?? null;
}

async function fetchStats() {
	const entries = Object.entries(ENTITIES);
	const states = await Promise.all(entries.map(([, entityId]) => fetchEntityState(entityId)));

	const raw = {};
	entries.forEach(([key], i) => {
		raw[key] = states[i].state;
	});

	return {
		batterySavingsTotal: Number((Number(raw.batterySavingsTotalPence) / 100).toFixed(2)),
		solarGenerationTotalKwh: Number(Number(raw.solarGenerationTotalKwh).toFixed(1)),
		solarGenerationTodayKwh: Number(Number(raw.solarGenerationTodayKwh).toFixed(2)),
		batterySoc: Number(Number(raw.batterySoc).toFixed(1)),
		batteryPowerW: Math.round(Number(raw.batteryPowerW)),
		batteryAction: batteryActionLabel(raw.batteryAction),
		asOf: new Date().toISOString()
	};
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

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()) }));

app.get('/healthz', (_req, res) => {
	res.json({ ok: true });
});

app.get('/api/energy-stats', async (_req, res) => {
	try {
		const stats = await getStats();
		res.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);
		res.json(stats);
	} catch (err) {
		console.error('Failed to fetch energy stats:', err.message);
		res.status(502).json({ error: 'Failed to fetch energy stats' });
	}
});

app.listen(PORT, () => {
	console.log(`energy-proxy listening on :${PORT}`);
});
