import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bucketSeries, mapHistory } from './map-history.js';

const T0 = Date.parse('2026-09-30T00:00:00Z');
const MIN = 60_000;
const at = (m, state, attributes) => ({
	state: String(state),
	last_changed: new Date(T0 + m * MIN).toISOString(),
	attributes
});
const window = { startMs: T0, endMs: T0 + 60 * MIN, bucketMs: 15 * MIN };

test('a sensor holds its value between changes', () => {
	assert.deepEqual(bucketSeries([at(0, 100), at(30, 300)], window), [100, 100, 300, 300]);
});

test('buckets are time-weighted', () => {
	// 100 for 5 minutes, 400 for 10 minutes -> (500 + 4000) / 15 = 300
	assert.deepEqual(bucketSeries([at(0, 100), at(5, 400)], window)[0], 300);
});

test('unavailable readings leave gaps, and the last known value does not leak into them', () => {
	assert.deepEqual(bucketSeries([at(0, 100), at(15, 'unavailable'), at(45, 200)], window), [
		100,
		null,
		null,
		200
	]);
});

test('a value set before the window carries into it', () => {
	assert.deepEqual(bucketSeries([at(-90, 50)], window), [50, 50, 50, 50]);
});

test('kW is converted to W and grid sign follows the convention', () => {
	const now = new Date(T0 + 60 * MIN);
	const kw = [at(-1440, 1.5, { unit_of_measurement: 'kW' })];
	const result = mapHistory({ solar: kw, grid: [at(-1440, 200)], soc: [at(-1440, 40)] }, { now });
	assert.equal(result.intervalMinutes, 15);
	assert.equal(result.solarW.length, 96);
	assert.equal(result.solarW[0], 1500);
	assert.equal(result.gridW[0], 200);
	assert.equal(result.batterySoc[0], 40);
	const flipped = mapHistory({ grid: [at(-1440, 200)], soc: [] }, { now, gridExportIsPositive: true });
	assert.equal(flipped.gridW[0], -200);
});

test('unconfigured series are omitted', () => {
	const result = mapHistory({ soc: [at(-1440, 40)] }, { now: new Date(T0) });
	assert.equal('solarW' in result, false);
	assert.equal('houseW' in result, false);
	assert.equal('gridW' in result, false);
});

test('battery power keeps the sign the sensor reports', () => {
	const now = new Date(T0 + 60 * MIN);
	const day = -1440;
	const result = mapHistory(
		{ soc: [at(day, 50)], batteryPower: [at(day, 400), at(-30, -250)] },
		{ now }
	);
	assert.equal(result.batteryW[0], 400);
	assert.equal(result.batteryW[95], -250);
	assert.equal('batteryW' in mapHistory({ soc: [at(day, 50)] }, { now }), false);
});
