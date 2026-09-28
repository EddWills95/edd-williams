import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { openBuildStats, validateSnapshot, tokenMatches, dayInZone } from './build-stats.js';

const NOW = new Date('2026-09-28T12:00:00Z');
const snap = (days, asOf = '2026-09-28T11:00:00Z') => ({ asOf, days });

test('validateSnapshot accepts a good snapshot', () => {
	const r = validateSnapshot(snap([{ day: '2026-09-28', written: 10, cacheRead: 20 }]), NOW);
	assert.equal(r.ok, true);
});

test('validateSnapshot rejects bad input', () => {
	const bad = [
		null,
		{ asOf: 'nope', days: [] },
		snap([]),
		snap([{ day: '2026-13-40', written: 1, cacheRead: 1 }]),
		snap([{ day: '2026-09-28', written: -1, cacheRead: 1 }]),
		snap([{ day: '2026-09-28', written: 1.5, cacheRead: 1 }]),
		snap([{ day: '2026-09-28', written: '1', cacheRead: 1 }]),
		snap([
			{ day: '2026-09-28', written: 1, cacheRead: 1 },
			{ day: '2026-09-28', written: 1, cacheRead: 1 }
		]),
		snap([{ day: '2026-09-28', written: 1, cacheRead: 1 }], '2027-01-01T00:00:00Z'),
		snap([{ day: '2026-09-28', written: 1 }]),
		snap([{ day: '2026-09-28', written: 1, cacheRead: 1, linesAdded: -3 }]),
		snap([{ day: '2026-09-28', written: 1, cacheRead: 1, commits: 2.5 }]),
		snap([{ day: '2026-09-28', written: 1, cacheRead: 1, linesRemoved: '4' }]),
		snap([{ day: '2026-09-28', written: 1, cacheRead: 1, linesAdded: 1e14 }]),
		snap([{ day: '2026-09-28', written: 1, cacheRead: 1, commits: null }])
	];
	for (const body of bad) assert.equal(validateSnapshot(body, NOW).ok, false);
});

test('tokenMatches', () => {
	assert.equal(tokenMatches('secret', 'secret'), true);
	assert.equal(tokenMatches('secret', 'other'), false);
	assert.equal(tokenMatches('', 'secret'), false);
	assert.equal(tokenMatches('secret', undefined), false);
});

test('summary is null before the first push', () => {
	const store = openBuildStats(':memory:');
	assert.equal(store.summary(NOW), null);
});

test('ingest is idempotent and never lowers a day', () => {
	const store = openBuildStats(':memory:');
	const first = validateSnapshot(snap([{ day: '2026-09-28', written: 100, cacheRead: 1000 }]), NOW);
	store.ingest(first.value);
	store.ingest(first.value);
	assert.equal(store.summary(NOW).tokensWrittenToday, 100);

	const lower = validateSnapshot(snap([{ day: '2026-09-28', written: 40, cacheRead: 5 }]), NOW);
	store.ingest(lower.value);
	assert.equal(store.summary(NOW).tokensWrittenToday, 100);
	assert.equal(store.summary(NOW).tokensCacheReadToday, 1000);
});

test('today, rolling week and lifetime', () => {
	const store = openBuildStats(':memory:');
	const r = validateSnapshot(
		snap([
			{ day: '2026-09-28', written: 1, cacheRead: 10 },
			{ day: '2026-09-22', written: 2, cacheRead: 20 }, // 6 days back: inside the week
			{ day: '2026-09-21', written: 4, cacheRead: 40 }, // 7 days back: outside
			{ day: '2026-08-20', written: 8, cacheRead: 80 }
		]),
		NOW
	);
	store.ingest(r.value);
	const s = store.summary(NOW);
	assert.equal(s.tokensWrittenToday, 1);
	assert.equal(s.tokensWrittenWeek, 3);
	assert.equal(s.tokensWrittenLifetime, 15);
	assert.equal(s.tokensCacheReadLifetime, 150);
	assert.equal(s.stale, false);
});

test('asOf only moves forward and stale kicks in after 48h', () => {
	const store = openBuildStats(':memory:');
	const day = [{ day: '2026-09-28', written: 1, cacheRead: 1 }];
	store.ingest(validateSnapshot(snap(day, '2026-09-28T11:00:00Z'), NOW).value);
	store.ingest(validateSnapshot(snap(day, '2026-09-28T09:00:00Z'), NOW).value);
	assert.equal(store.summary(NOW).asOf, '2026-09-28T11:00:00.000Z');
	assert.equal(store.summary(new Date('2026-10-01T12:00:00Z')).stale, true);
});

test('dayInZone uses the local calendar day', () => {
	// 23:30 UTC on 30 Jun is already 1 Jul in London (BST).
	assert.equal(dayInZone(new Date('2026-06-30T23:30:00Z'), 'Europe/London'), '2026-07-01');
});

test('git counters are optional and default to 0', () => {
	const r = validateSnapshot(snap([{ day: '2026-09-28', written: 1, cacheRead: 2 }]), NOW);
	assert.equal(r.ok, true);
	assert.deepEqual(r.value.days[0], {
		day: '2026-09-28',
		written: 1,
		cacheRead: 2,
		linesAdded: 0,
		linesRemoved: 0,
		commits: 0
	});
});

test('summary windows carry every counter, with max() per column', () => {
	const store = openBuildStats(':memory:');
	const day = (d, n) => ({
		day: d,
		written: n,
		cacheRead: n * 10,
		linesAdded: n * 2,
		linesRemoved: n,
		commits: n
	});
	store.ingest(
		validateSnapshot(snap([day('2026-09-28', 1), day('2026-09-24', 2), day('2026-01-01', 4)]), NOW)
			.value
	);
	// A later push that is higher on one column and lower on another only raises the first.
	store.ingest(
		validateSnapshot(
			snap([{ day: '2026-09-28', written: 0, cacheRead: 0, linesAdded: 50, commits: 3 }]),
			NOW
		).value
	);
	const s = store.summary(NOW);
	assert.deepEqual(s.today, {
		written: 1,
		cacheRead: 10,
		linesAdded: 50,
		linesRemoved: 1,
		commits: 3
	});
	assert.deepEqual(s.week, {
		written: 3,
		cacheRead: 30,
		linesAdded: 54,
		linesRemoved: 3,
		commits: 5
	});
	assert.deepEqual(s.lifetime, {
		written: 7,
		cacheRead: 70,
		linesAdded: 62,
		linesRemoved: 7,
		commits: 9
	});
	for (const w of [s.today, s.week, s.lifetime]) {
		for (const v of Object.values(w)) assert.ok(Number.isInteger(v));
	}
	// Flat fields from v1 are still there.
	assert.equal(s.tokensWrittenToday, 1);
	assert.equal(s.tokensWrittenWeek, 3);
	assert.equal(s.tokensCacheReadLifetime, 70);
});

test('opening migrates a v1 database in place, and is safe to repeat', () => {
	const dir = mkdtempSync(join(tmpdir(), 'build-stats-'));
	const path = join(dir, 'v1.db');
	try {
		const v1 = new DatabaseSync(path);
		v1.exec(`
			CREATE TABLE daily_tokens (day TEXT PRIMARY KEY, written INTEGER NOT NULL,
				cache_read INTEGER NOT NULL);
			CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
			INSERT INTO daily_tokens VALUES ('2026-09-28', 100, 1000);
			INSERT INTO meta VALUES ('asOf', '2026-09-28T10:00:00.000Z');
		`);
		v1.close();

		openBuildStats(path).close();
		const store = openBuildStats(path); // second open: migration must be a no-op
		assert.deepEqual(store.summary(NOW).today, {
			written: 100,
			cacheRead: 1000,
			linesAdded: 0,
			linesRemoved: 0,
			commits: 0
		});
		store.ingest(
			validateSnapshot(
				snap([{ day: '2026-09-28', written: 1, cacheRead: 1, linesAdded: 7, commits: 1 }]),
				NOW
			).value
		);
		assert.equal(store.summary(NOW).today.linesAdded, 7);
		assert.equal(store.summary(NOW).today.written, 100);
		store.close();
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
