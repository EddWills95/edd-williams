import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
	chunk,
	commitsByDay,
	createTokenCollector,
	isNoisePath,
	mergeDays,
	parseGitLog,
	resolveRenamedPath,
	totals
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
