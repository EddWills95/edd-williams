import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
	chunk,
	buildPartner,
	commitsByDay,
	createTokenCollector,
	isNoisePath,
	mergeDays,
	parseGitLog,
	resolveRenamedPath,
	spriteKey,
	totals,
	xpForLevel
} from './collect.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const TZ = 'Europe/London';

function tokensFrom(...files) {
	const collector = createTokenCollector();
	for (const file of files) for (const line of fixture(file).split('\n')) collector.addLine(line);
	return collector;
}

test('tokens: written = output + cache creation, de-duplicated on (message.id, requestId)', () => {
	const days = tokensFrom('session.jsonl', 'resumed.jsonl').byDay(TZ);
	// msg_1 appears three times across two files but counts once; msg_2 adds 20 written.
	assert.deepEqual(days.get('2026-09-28'), { written: 1120, cacheRead: 11000 });
});

test('tokens: days are London calendar days, not UTC', () => {
	const days = tokensFrom('session.jsonl', 'resumed.jsonl').byDay(TZ);
	// 23:30 UTC on 30 Jun is 00:30 BST on 1 Jul; 22:30 UTC on 27 Sep is still the 27th in BST.
	assert.deepEqual(days.get('2026-07-01'), { written: 10, cacheRead: 9 });
	assert.deepEqual(days.get('2026-09-27'), { written: 100, cacheRead: 1 });
	assert.equal(days.has('2026-06-30'), false);
	// The same instant in UTC lands on the other side of midnight.
	assert.equal(tokensFrom('session.jsonl').byDay('UTC').has('2026-06-30'), true);
});

test('tokens: ignores non-assistant lines, missing usage, bad counts and truncated lines', () => {
	const collector = tokensFrom('session.jsonl');
	// msg_1, msg_2, msg_3 and msg_5 (whose junk counts become 0); not msg_4, the summary or the
	// truncated last line.
	assert.equal(collector.size, 4);
	assert.doesNotThrow(() => collector.addLine('{"usage": nope'));
});

test('tokens: repeated copies keep the largest counts', () => {
	const collector = createTokenCollector();
	const line = (output) =>
		JSON.stringify({
			type: 'assistant',
			timestamp: '2026-09-28T12:00:00Z',
			requestId: 'r',
			message: { id: 'm', usage: { output_tokens: output, cache_read_input_tokens: 1 } }
		});
	collector.addLine(line(5));
	collector.addLine(line(50));
	collector.addLine(line(20));
	assert.deepEqual(collector.byDay(TZ).get('2026-09-28'), { written: 50, cacheRead: 1 });
});

test('rename paths resolve to the new name', () => {
	assert.equal(resolveRenamedPath('src/{old => new}/a.js'), 'src/new/a.js');
	assert.equal(resolveRenamedPath('src/{ => lib}/a.js'), 'src/lib/a.js');
	assert.equal(resolveRenamedPath('src/{lib => }/a.js'), 'src/a.js');
	assert.equal(resolveRenamedPath('old.js => new.js'), 'new.js');
	assert.equal(resolveRenamedPath('plain/path.js'), 'plain/path.js');
});

test('noise paths', () => {
	const noise = [
		'yarn.lock',
		'app/package-lock.json',
		'pnpm-lock.yaml',
		'bun.lock',
		'dist/index.js',
		'packages/ui/build/out.js',
		'.svelte-kit/generated/root.js',
		'node_modules/lodash/lodash.js',
		'static/vendor.min.js',
		'static/site.min.css',
		'dist.js.map',
		'src/app.js.map',
		'src/__snapshots__/a.test.js.snap',
		'api/schema.generated.ts',
		'proto/api.pb.go',
		'App.xcodeproj/project.pbxproj',
		'src/{old => dist}/a.js',
		'"weird name/yarn.lock"'
	];
	const code = [
		'src/app.js',
		'src/build.js', // a file called build, not a build directory
		'src/distance.ts',
		'README.md',
		'src/lock.js',
		'src/{dist => lib}/a.js',
		'src/minimal.js'
	];
	for (const path of noise) assert.equal(isNoisePath(path), true, path);
	for (const path of code) assert.equal(isNoisePath(path), false, path);
});

test('git log parsing excludes noise, binaries and bulk data from line counts', () => {
	const commits = parseGitLog(fixture('git-log.txt'));
	assert.equal(commits.length, 4);
	// src/app.js 12/3 + renamed thing.ts 5/0 + quoted docs file 3/1. Not the lockfile, dist,
	// minified, binary, or the 9000-line data files.
	assert.deepEqual(commits[0], {
		sha: 'aaa111',
		email: 'edd.williams@me.com',
		day: '2026-09-28',
		linesAdded: 20,
		linesRemoved: 4
	});
	assert.deepEqual(commits[3], {
		sha: 'ddd444',
		email: 'edd.williams@me.com',
		day: '2026-09-27',
		linesAdded: 0,
		linesRemoved: 0
	});
});

test('commits are filtered by author and de-duplicated by SHA across clones', () => {
	const commits = parseGitLog(fixture('git-log.txt'));
	const emails = new Set(['edd.williams@me.com']);
	// The same history seen from a second clone must not double count.
	const days = commitsByDay([...commits, ...commits], emails);
	assert.deepEqual(days.get('2026-09-28'), { linesAdded: 20, linesRemoved: 4, commits: 1 });
	assert.deepEqual(days.get('2026-09-27'), { linesAdded: 4, linesRemoved: 1, commits: 2 });
});

test('mergeDays fills every counter, sorts, drops empty days and applies sinceDay', () => {
	const tokens = new Map([
		['2026-09-28', { written: 5, cacheRead: 6 }],
		['2026-09-20', { written: 1, cacheRead: 0 }],
		['2026-09-21', { written: 0, cacheRead: 0 }]
	]);
	const lines = new Map([
		['2026-09-28', { linesAdded: 3, linesRemoved: 1, commits: 1 }],
		['2026-09-25', { linesAdded: 0, linesRemoved: 2, commits: 1 }]
	]);
	assert.deepEqual(mergeDays([tokens, lines]), [
		{ day: '2026-09-20', written: 1, cacheRead: 0, linesAdded: 0, linesRemoved: 0, commits: 0 },
		{ day: '2026-09-25', written: 0, cacheRead: 0, linesAdded: 0, linesRemoved: 2, commits: 1 },
		{ day: '2026-09-28', written: 5, cacheRead: 6, linesAdded: 3, linesRemoved: 1, commits: 1 }
	]);
	assert.deepEqual(
		mergeDays([tokens, lines], { sinceDay: '2026-09-25' }).map((d) => d.day),
		['2026-09-25', '2026-09-28']
	);
});

test('totals and chunk', () => {
	const days = mergeDays([
		new Map([
			['2026-09-27', { written: 1, linesAdded: 2, commits: 1 }],
			['2026-09-28', { written: 10, linesAdded: 20, commits: 2 }]
		])
	]);
	const t = totals(days, '2026-09-28');
	assert.equal(t.today.written, 10);
	assert.equal(t.lifetime.linesAdded, 22);
	assert.equal(t.lifetime.commits, 3);
	assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

const companionState = (patch = {}, profilePatch = {}) => ({
	active: {
		pathIDs: [13, 14, 15],
		stageIndex: 2,
		isShiny: false,
		rarity: 'common',
		nature: 'impish',
		usedAtStage: 8717301,
		profile: {
			level: 53,
			growthTokens: 383_717_301,
			seed: 123456789,
			instanceID: 'B89C00B7-8AF9-4DB5-859C-8CB48E004944',
			ivs: { hp: 29 },
			moves: [{ name: 'agility', learnedAtLevel: 31 }],
			...profilePatch
		},
		...patch
	}
});
const beedrill = { details: { name: 'beedrill', speciesID: 15 } };

test('partner: level curve matches the app (known data points)', () => {
	// level = 5 + floor(95 * tokens / 750M) for a common; both the user's earlier and current reading.
	for (const tokens of [382_775_174, 383_717_301]) {
		const level = buildPartner(companionState({}, { growthTokens: tokens }), beedrill).level;
		assert.equal(5 + Math.floor((95 * tokens) / 750_000_000), level);
	}
	assert.equal(xpForLevel(100, 'common'), 750_000_000);
	assert.equal(xpForLevel(5, 'common'), 0);
	assert.equal(xpForLevel(100, 'legendary'), 6_000_000_000);
	assert.equal(xpForLevel(53, 'unheard-of'), undefined);
});

test('partner: thresholds bracket the current tokens', () => {
	const partner = buildPartner(companionState(), beedrill);
	assert.equal(partner.levelStartXp, 378_947_369);
	assert.equal(partner.nextLevelXp, 386_842_106);
	assert.ok(partner.levelStartXp <= partner.xp && partner.xp < partner.nextLevelXp);
	// The boundary token itself is the first of the next level.
	assert.equal(5 + Math.floor((95 * partner.nextLevelXp) / 750_000_000), 54);
	assert.equal(5 + Math.floor((95 * (partner.nextLevelXp - 1)) / 750_000_000), 53);
});

test('partner: sends only the whitelisted fields', () => {
	const partner = buildPartner(companionState(), beedrill);
	assert.deepEqual(
		Object.keys(partner).sort(),
		['levelStartXp', 'level', 'name', 'nextLevelXp', 'shiny', 'speciesId', 'xp'].sort()
	);
	const text = JSON.stringify(partner);
	for (const secret of ['seed', 'instanceID', 'ivs', 'B89C00B7', 'impish', 'agility']) {
		assert.equal(text.includes(secret), false);
	}
});

test('partner: species comes from pathIDs[stageIndex]; shiny only when exactly true', () => {
	assert.equal(buildPartner(companionState({ stageIndex: 0 }), beedrill).speciesId, 13);
	assert.equal(buildPartner(companionState({ isShiny: true }), beedrill).shiny, true);
	assert.equal(buildPartner(companionState({ isShiny: 'yes' }), beedrill).shiny, false);
	assert.equal(spriteKey({ speciesId: 15, shiny: false }), '15-a');
	assert.equal(spriteKey({ speciesId: 15, shiny: true }), '15-sha');
});

test('partner: level 100 has no next level; unknown rarity has no thresholds', () => {
	const maxed = buildPartner(
		companionState({}, { level: 100, growthTokens: 750_000_000 }),
		beedrill
	);
	assert.equal(maxed.nextLevelXp, undefined);
	assert.equal(maxed.levelStartXp, 750_000_000);
	const odd = buildPartner(companionState({ rarity: 'mythic' }), beedrill);
	assert.equal(odd.levelStartXp, undefined);
	assert.equal(odd.nextLevelXp, undefined);
	assert.equal(odd.xp, 383_717_301);
});

test('partner: null for an egg, bad names and malformed state', () => {
	const bad = [
		[null, beedrill],
		[{}, beedrill],
		[companionState({ stageIndex: 9 }), beedrill],
		[companionState({ profile: undefined }), beedrill],
		[companionState({}, { level: 3 }), beedrill],
		[companionState({}, { level: 101 }), beedrill],
		[companionState({}, { growthTokens: -1 }), beedrill],
		[companionState({}, { growthTokens: 1.5 }), beedrill],
		[companionState(), null],
		[companionState(), { details: { name: 'Bee Drill!' } }]
	];
	for (const [state, details] of bad) assert.equal(buildPartner(state, details), null);
});
