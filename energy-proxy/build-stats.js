// Build stats: token totals pushed from the Mac, stored as one row per day in a SQLite file.
// Pure-ish module (no express, no env) so it can be exercised on its own with a temp database.
import { DatabaseSync } from 'node:sqlite';
import { createHash, timingSafeEqual } from 'node:crypto';

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS_PER_PUSH = 400;
const MAX_COUNT = 1e13; // sanity ceiling; far above any real token count
const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

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
 * Expected shape: { asOf: ISO string, days: [{ day: 'YYYY-MM-DD', written: int, cacheRead: int }] }
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
		if (!isCount(entry.written) || !isCount(entry.cacheRead)) {
			return { ok: false, error: `written and cacheRead must be non-negative integers (${entry.day})` };
		}
		seen.add(entry.day);
		days.push({ day: entry.day, written: entry.written, cacheRead: entry.cacheRead });
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

export function openBuildStats(path, { timeZone = 'Europe/London' } = {}) {
	const db = new DatabaseSync(path);
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

	// max() per day: a day's total can only grow, so a re-run, a retry or a Mac whose logs
	// have since been pruned can never lower or double count what's already stored.
	const upsertDay = db.prepare(`
		INSERT INTO daily_tokens (day, written, cache_read) VALUES (?, ?, ?)
		ON CONFLICT(day) DO UPDATE SET
			written = max(written, excluded.written),
			cache_read = max(cache_read, excluded.cache_read)
	`);
	const setMeta = db.prepare(`
		INSERT INTO meta (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`);
	const getAsOf = db.prepare(`SELECT value FROM meta WHERE key = 'asOf'`);
	const sumSince = db.prepare(`
		SELECT COALESCE(SUM(written), 0) AS written, COALESCE(SUM(cache_read), 0) AS cache_read
		FROM daily_tokens WHERE day >= ?
	`);
	const sumDay = db.prepare(`SELECT written, cache_read FROM daily_tokens WHERE day = ?`);

	function ingest({ asOf, days }) {
		db.exec('BEGIN');
		try {
			for (const d of days) upsertDay.run(d.day, d.written, d.cacheRead);
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

		const today = dayInZone(now, timeZone);
		const todayRow = sumDay.get(today);
		const week = sumSince.get(shiftDay(today, -6)); // rolling seven days including today
		const lifetime = sumSince.get('0000-01-01');

		return {
			tokensWrittenToday: todayRow?.written ?? 0,
			tokensWrittenWeek: week.written,
			tokensWrittenLifetime: lifetime.written,
			tokensCacheReadToday: todayRow?.cache_read ?? 0,
			tokensCacheReadLifetime: lifetime.cache_read,
			asOf,
			stale: now.getTime() - new Date(asOf).getTime() > STALE_AFTER_MS
		};
	}

	return { ingest, summary, close: () => db.close() };
}
