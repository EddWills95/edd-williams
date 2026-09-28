// Build stats: token and git totals pushed from the Mac, stored as one row per day in a SQLite
// file. Pure-ish module (no express, no env) so it can be exercised on its own with a temp database.
import { DatabaseSync } from 'node:sqlite';
import { createHash, timingSafeEqual } from 'node:crypto';

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS_PER_PUSH = 400;
const MAX_COUNT = 1e13; // sanity ceiling; far above any real token or line count
const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

// Per-day counters: payload key -> column. `written` and `cacheRead` are required in a POST;
// the git counters are optional (default 0) so a job from before they existed still validates.
const COUNTERS = [
	{ key: 'written', column: 'written', required: true },
	{ key: 'cacheRead', column: 'cache_read', required: true },
	{ key: 'linesAdded', column: 'lines_added', required: false },
	{ key: 'linesRemoved', column: 'lines_removed', required: false },
	{ key: 'commits', column: 'commits', required: false }
];
const ADDED_COLUMNS = COUNTERS.filter((c) => !c.required).map((c) => c.column);

// Compare secrets without leaking length or position through timing: hash first so both
// buffers are always the same size.
export function tokenMatches(provided, expected) {
	if (!provided || !expected) return false;
	const a = createHash('sha256').update(provided).digest();
	const b = createHash('sha256').update(expected).digest();
	return timingSafeEqual(a, b);
}

function isCount(value) {
	return Number.isSafeInteger(value) && value >= 0 && value <= MAX_COUNT;
}

function isRealDay(day) {
	if (typeof day !== 'string' || !DAY_PATTERN.test(day)) return false;
	const parsed = new Date(`${day}T00:00:00Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(day);
}

/**
 * Validates an incoming snapshot. Returns { ok: true, value } or { ok: false, error }.
 * Expected shape: { asOf: ISO string, days: [{ day: 'YYYY-MM-DD', written: int, cacheRead: int,
 * linesAdded?: int, linesRemoved?: int, commits?: int }] }. Missing optional counters become 0.
 */
export function validateSnapshot(body, now = new Date()) {
	if (!body || typeof body !== 'object') return { ok: false, error: 'body must be an object' };

	const asOf = new Date(body.asOf);
	if (typeof body.asOf !== 'string' || Number.isNaN(asOf.getTime())) {
		return { ok: false, error: 'asOf must be an ISO timestamp' };
	}
	if (asOf.getTime() > now.getTime() + 5 * 60 * 1000) {
		return { ok: false, error: 'asOf is in the future' };
	}

	if (!Array.isArray(body.days) || body.days.length === 0) {
		return { ok: false, error: 'days must be a non-empty array' };
	}
	if (body.days.length > MAX_DAYS_PER_PUSH) {
		return { ok: false, error: `days must have at most ${MAX_DAYS_PER_PUSH} entries` };
	}

	const days = [];
	const seen = new Set();
	for (const entry of body.days) {
		if (!entry || !isRealDay(entry.day)) return { ok: false, error: 'each day must be YYYY-MM-DD' };
		if (seen.has(entry.day)) return { ok: false, error: `duplicate day ${entry.day}` };
		const day = { day: entry.day };
		for (const { key, required } of COUNTERS) {
			const value = entry[key] === undefined && !required ? 0 : entry[key];
			if (!isCount(value)) {
				return { ok: false, error: `${key} must be a non-negative integer (${entry.day})` };
			}
			day[key] = value;
		}
		seen.add(entry.day);
		days.push(day);
	}

	return { ok: true, value: { asOf: asOf.toISOString(), days } };
}

// "YYYY-MM-DD" for `date` as seen in `timeZone`. en-CA formats dates as ISO year-month-day.
export function dayInZone(date, timeZone) {
	return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

function shiftDay(day, delta) {
	const d = new Date(`${day}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + delta);
	return d.toISOString().slice(0, 10);
}

// Adds columns introduced after the first deploy to an existing database. Checks the schema
// first, so it is a no-op on a fresh or already-migrated database and safe to run every start.
function migrate(db) {
	const existing = new Set(db.prepare(`PRAGMA table_info(daily_tokens)`).all().map((c) => c.name));
	for (const column of ADDED_COLUMNS) {
		if (!existing.has(column)) {
			db.exec(`ALTER TABLE daily_tokens ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`);
		}
	}
}

function toWindow(row) {
	const window = {};
	for (const { key, column } of COUNTERS) window[key] = row?.[column] ?? 0;
	return window;
}

export function openBuildStats(path, { timeZone = 'Europe/London' } = {}) {
	const db = new DatabaseSync(path);
	// The table keeps its original name: it now holds git counters too, but renaming it would
	// make the migration riskier for no gain.
	db.exec(`
		PRAGMA journal_mode = WAL;
		CREATE TABLE IF NOT EXISTS daily_tokens (
			day TEXT PRIMARY KEY,
			written INTEGER NOT NULL,
			cache_read INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS meta (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
	`);
	migrate(db);

	const columns = COUNTERS.map((c) => c.column);

	// max() per column per day: a day's totals can only grow, so a re-run, a retry or a Mac whose
	// logs have since been pruned can never lower or double count what's already stored.
	const upsertDay = db.prepare(`
		INSERT INTO daily_tokens (day, ${columns.join(', ')})
		VALUES (?, ${columns.map(() => '?').join(', ')})
		ON CONFLICT(day) DO UPDATE SET
			${columns.map((c) => `${c} = max(${c}, excluded.${c})`).join(',\n\t\t\t')}
	`);
	const setMeta = db.prepare(`
		INSERT INTO meta (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`);
	const getAsOf = db.prepare(`SELECT value FROM meta WHERE key = 'asOf'`);
	const sumSince = db.prepare(`
		SELECT ${columns.map((c) => `COALESCE(SUM(${c}), 0) AS ${c}`).join(', ')}
		FROM daily_tokens WHERE day >= ?
	`);
	const sumDay = db.prepare(`SELECT ${columns.join(', ')} FROM daily_tokens WHERE day = ?`);

	function ingest({ asOf, days }) {
		db.exec('BEGIN');
		try {
			for (const d of days) upsertDay.run(d.day, ...COUNTERS.map((c) => d[c.key] ?? 0));
			const previous = getAsOf.get()?.value;
			// asOf only moves forward, so an out-of-order retry can't make the data look older.
			if (!previous || asOf > previous) setMeta.run('asOf', asOf);
			db.exec('COMMIT');
		} catch (err) {
			db.exec('ROLLBACK');
			throw err;
		}
	}

	// Null until the first push, so the endpoint can say "no data yet" rather than zeros.
	function summary(now = new Date()) {
		const asOf = getAsOf.get()?.value;
		if (!asOf) return null;

		const todayDay = dayInZone(now, timeZone);
		const today = toWindow(sumDay.get(todayDay));
		const week = toWindow(sumSince.get(shiftDay(todayDay, -6))); // rolling seven days incl. today
		const lifetime = toWindow(sumSince.get('0000-01-01'));

		return {
			asOf,
			stale: now.getTime() - new Date(asOf).getTime() > STALE_AFTER_MS,
			today,
			week,
			lifetime,
			// Flat fields from the first version of the endpoint, kept for older clients.
			tokensWrittenToday: today.written,
			tokensWrittenWeek: week.written,
			tokensWrittenLifetime: lifetime.written,
			tokensCacheReadToday: today.cacheRead,
			tokensCacheReadLifetime: lifetime.cacheRead
		};
	}

	return { ingest, summary, close: () => db.close() };
}
