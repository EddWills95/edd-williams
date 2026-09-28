import { test } from 'node:test';
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
		snap([{ day: '2026-09-28', written: 1, cacheRead: 1 }], '2027-01-01T00:00:00Z')
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
