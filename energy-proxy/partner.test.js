import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { isGif, openPartner, spriteKey, validatePartner } from './partner.js';

const NOW = new Date('2026-10-06T12:00:00Z');
const partner = (patch = {}) => ({
	speciesId: 15,
	name: 'beedrill',
	level: 58,
	xp: 420_407_077,
	shiny: false,
	stage: 3,
	stages: 3,
	stageXp: 45_407_077,
	stageThreshold: 375_000_000,
	...patch
});
const push = (p = partner(), asOf = '2026-10-06T11:00:00Z') => ({ asOf, partner: p });
const GIF = Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00;', 'latin1');

function withDb(fn) {
	const dir = mkdtempSync(join(tmpdir(), 'partner-'));
	const store = openPartner(join(dir, 'p.db'));
	try {
		return fn(store);
	} finally {
		store.close();
		rmSync(dir, { recursive: true, force: true });
	}
}

test('validatePartner accepts a good push, with or without stage progress', () => {
	assert.equal(validatePartner(push(), NOW).ok, true);
	const bare = validatePartner(
		push(
			partner({
				stage: undefined,
				stages: undefined,
				stageXp: undefined,
				stageThreshold: undefined
			})
		),
		NOW
	);
	assert.equal(bare.ok, true);
	assert.equal('stageThreshold' in bare.value.partner, false);
});

test('validatePartner rejects bad input', () => {
	const bad = [
		null,
		{ asOf: 'nope', partner: partner() },
		push(partner(), '2027-01-01T00:00:00Z'),
		{ asOf: '2026-10-06T11:00:00Z' },
		push(partner({ speciesId: 0 })),
		push(partner({ speciesId: 1.5 })),
		push(partner({ name: 'Beedrill' })),
		push(partner({ name: '../etc' })),
		push(partner({ name: '' })),
		push(partner({ level: 0 })),
		push(partner({ level: 101 })),
		push(partner({ xp: -1 })),
		push(partner({ xp: '5' })),
		push(partner({ shiny: 'yes' })),
		push(partner({ stageXp: 1.5 })),
		push(partner({ stageXp: -1 })),
		push(partner({ stageThreshold: 0 })),
		push(partner({ stage: 4 })), // beyond stages
		push(partner({ stage: 0 })),
		push(partner({ stages: 99, stage: 1 })),
		push(partner({ stageThreshold: undefined })) // a half-sent group
	];
	for (const body of bad) assert.equal(validatePartner(body, NOW).ok, false);
});

test('validatePartner drops fields it does not know', () => {
	const r = validatePartner(push(partner({ seed: 123, ivs: { hp: 1 }, instanceID: 'x' })), NOW);
	assert.equal(r.ok, true);
	assert.deepEqual(Object.keys(r.value.partner).sort(), Object.keys(partner()).sort());
});

test('summary is null until the first push', () => {
	withDb((store) => {
		assert.equal(store.summary(NOW), null);
		assert.equal(store.sprite(), null);
	});
});

test('a push stores the partner and asks for the sprite once', () => {
	withDb((store) => {
		const first = store.ingest(validatePartner(push(), NOW).value);
		assert.deepEqual(first, { applied: true, needsSprite: true });
		assert.equal(store.summary(NOW).spriteUrl, null);

		assert.equal(store.setSprite(spriteKey(partner()), GIF), true);
		assert.deepEqual(store.sprite(), GIF);

		const again = store.ingest(validatePartner(push(partner({ xp: 384_000_000 })), NOW).value);
		assert.deepEqual(again, { applied: true, needsSprite: false });
		const summary = store.summary(NOW);
		assert.equal(summary.xp, 384_000_000);
		assert.equal(summary.spriteUrl, '/api/partner/sprite?v=15-a');
		assert.equal(summary.stale, false);
	});
});

test('the level can go down: a swap or evolution replaces the record, no max-merge', () => {
	withDb((store) => {
		store.ingest(validatePartner(push(), NOW).value);
		const swapped = partner({ speciesId: 25, name: 'pikachu', level: 7, xp: 20_000_000 });
		const r = store.ingest(validatePartner(push(swapped, '2026-10-06T11:30:00Z'), NOW).value);
		assert.equal(r.applied, true);
		const summary = store.summary(NOW);
		assert.equal(summary.name, 'pikachu');
		assert.equal(summary.level, 7);
		assert.equal(summary.xp, 20_000_000);
		// The new species has no sprite yet, so the old one is not served for it.
		assert.equal(summary.spriteUrl, null);
		assert.equal(r.needsSprite, true);
	});
});

test('an older push cannot overwrite a newer one', () => {
	withDb((store) => {
		store.ingest(validatePartner(push(partner({ level: 54 }), '2026-10-06T11:30:00Z'), NOW).value);
		const late = store.ingest(
			validatePartner(push(partner({ level: 53 }), '2026-10-06T11:00:00Z'), NOW).value
		);
		assert.equal(late.applied, false);
		assert.equal(store.summary(NOW).level, 54);
	});
});

test('a sprite is only accepted for the current partner, and old sprites are pruned', () => {
	withDb((store) => {
		assert.equal(store.setSprite('15-a', GIF), false); // nothing pushed yet
		store.ingest(validatePartner(push(), NOW).value);
		assert.equal(store.setSprite('15-sha', GIF), false); // not the current key
		assert.equal(store.setSprite('15-a', GIF), true);

		store.ingest(
			validatePartner(push(partner({ shiny: true }), '2026-10-06T11:10:00Z'), NOW).value
		);
		assert.equal(store.sprite(), null); // shiny variant not uploaded yet
		const other = Buffer.concat([GIF, Buffer.from('x')]);
		assert.equal(store.setSprite('15-sha', other), true);
		assert.deepEqual(store.sprite(), other);

		// Back to the plain one: the non-shiny gif was pruned, so it is asked for again.
		const back = store.ingest(validatePartner(push(partner(), '2026-10-06T11:20:00Z'), NOW).value);
		assert.equal(back.needsSprite, true);
	});
});

test('stale after 48 hours without a push', () => {
	withDb((store) => {
		store.ingest(validatePartner(push(), NOW).value);
		assert.equal(store.summary(new Date('2026-10-09T12:00:00Z')).stale, true);
	});
});

test('isGif checks the magic bytes', () => {
	assert.equal(isGif(GIF), true);
	assert.equal(isGif(Buffer.from('GIF87a0000', 'latin1')), true);
	assert.equal(isGif(Buffer.from('<html>not a gif</html>')), false);
	assert.equal(isGif(Buffer.alloc(0)), false);
	assert.equal(isGif(undefined), false);
});
