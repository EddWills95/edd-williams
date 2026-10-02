import test from 'node:test';
import assert from 'node:assert/strict';
import { mapStats, batteryActionFor } from './map-stats.js';

const state = (value) => ({ state: String(value) });
const required = (power) => ({
	batterySavingsTotalPence: state(0),
	solarGenerationTotalKwh: state(0),
	solarGenerationTodayKwh: state(0),
	batterySoc: state(69),
	batteryPowerW: state(power)
});

test('positive battery power is discharging and keeps its sign', () => {
	const stats = mapStats(required(213));
	assert.equal(stats.batteryAction, 'Discharging');
	assert.equal(stats.batteryPowerW, 213);
});

test('negative battery power is charging and keeps its sign', () => {
	const stats = mapStats(required(-1180));
	assert.equal(stats.batteryAction, 'Charging');
	assert.equal(stats.batteryPowerW, -1180);
});

test('trickle power counts as holding', () => {
	assert.equal(batteryActionFor(8), 'Holding');
	assert.equal(batteryActionFor(-25), 'Holding');
});

test('no reading gives no action', () => {
	assert.equal(batteryActionFor(NaN), null);
});
