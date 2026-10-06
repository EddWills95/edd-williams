#!/usr/bin/env node
// Build-stats job: sums Claude Code tokens and git lines/commits per day on this Mac and POSTs
// the aggregates to the energy proxy. Only per-day totals leave the machine: no repo names, paths,
// commit messages or file names. It also sends the PokeTokenBar partner (name, level, XP, shiny
// flag and sprite, nothing else). Run by launchd hourly; see README.md.
//
//   node job.js [--dry-run] [--days N]
import { createReadStream, readdirSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
	GIT_LOG_FORMAT,
	buildPartner,
	chunk,
	commitsByDay,
	createTokenCollector,
	dayInZone,
	mergeDays,
	parseGitLog,
	shiftDay,
	spriteKey,
	totals
} from './collect.js';

const HOME = homedir();
const env = (name) => process.env[name]?.trim() || undefined;

const CONFIG = {
	url: env('BUILD_STATS_URL') ?? 'https://energy.edd-williams.com/api/build-stats',
	timeZone: env('BUILD_STATS_TZ') ?? 'Europe/London',
	// The claude-prodigies alias sets CLAUDE_CONFIG_DIR=~/.claude-prodigies, so its sessions are
	// logged separately. Overlap between directories is harmless: tokens are de-duplicated.
	logsDirs: (
		env('BUILD_STATS_CLAUDE_DIR') ??
		`${join(HOME, '.claude', 'projects')}:${join(HOME, '.claude-prodigies', 'projects')}`
	)
		.split(':')
		.filter(Boolean),
	roots: (env('BUILD_STATS_ROOTS') ?? `${join(HOME, 'Development')}:${join(HOME, 'Prodigies')}`)
		.split(':')
		.filter(Boolean),
	extraEmails: ['edd.williams@me.com', ...(env('BUILD_STATS_EMAILS') ?? '').split(',')],
	keychainService: 'build-stats-token',
	// PokeTokenBar's data, read-only. BUILD_STATS_PARTNER=off skips the partner entirely.
	partnerDir:
		env('BUILD_STATS_POKETOKENBAR_DIR') ??
		join(HOME, 'Library', 'Application Support', 'PokeTokenBar'),
	partnerEnabled: env('BUILD_STATS_PARTNER') !== 'off',
	maxDepth: 4, // ~/Development/a/b/c/repo at most
	daysPerPost: 200, // the proxy accepts up to 400 days and 64 KB per POST
	attempts: 4
};

// Directories never worth descending into when looking for repos. Dot-directories (including
// .claude/worktrees, whose commits would only be duplicates) are skipped separately.
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'Pods', 'build', 'dist', 'target', 'venv']);

function parseArgs(argv) {
	const args = { dryRun: false, days: undefined };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--dry-run') args.dryRun = true;
		else if (argv[i] === '--days') {
			const n = Number(argv[++i]);
			if (!Number.isSafeInteger(n) || n < 1) throw new Error('--days needs a positive integer');
			args.days = n;
		} else throw new Error(`unknown argument ${argv[i]}`);
	}
	return args;
}

function* walk(dir, depth, match) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return; // unreadable or vanished: not our problem
	}
	if (match(entries)) yield dir;
	if (depth === 0) return;
	for (const entry of entries) {
		// isDirectory() is false for symlinks, so links are never followed.
		if (!entry.isDirectory() || entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
		yield* walk(join(dir, entry.name), depth - 1, match);
	}
}

async function collectTokens(timeZone) {
	const collector = createTokenCollector();
	const files = [];
	for (const logsDir of CONFIG.logsDirs) {
		for (const dir of walk(logsDir, 6, () => true)) {
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(join(dir, entry.name));
			}
		}
	}
	for (const file of files) {
		const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
		for await (const line of lines) collector.addLine(line);
	}
	return { days: collector.byDay(timeZone), files: files.length };
}

function git(repo, args, timeZone) {
	return spawnSync('git', ['-C', repo, '-c', 'core.quotepath=off', ...args], {
		encoding: 'utf8',
		maxBuffer: 512 * 1024 * 1024,
		env: { ...process.env, TZ: timeZone, GIT_TERMINAL_PROMPT: '0' }
	});
}

function collectLines(timeZone) {
	// A real repo has a .git directory; a .git *file* is a worktree or submodule checkout whose
	// commits are already counted from the main clone.
	const isRepo = (entries) => entries.some((e) => e.name === '.git' && e.isDirectory());
	const repos = [
		...new Set(CONFIG.roots.flatMap((root) => [...walk(root, CONFIG.maxDepth, isRepo)]))
	];

	const emails = new Set(CONFIG.extraEmails.map((e) => e.trim().toLowerCase()).filter(Boolean));
	for (const repo of repos) {
		const email = git(repo, ['config', 'user.email'], timeZone).stdout?.trim().toLowerCase();
		if (email) emails.add(email);
	}

	const commits = [];
	let failed = 0;
	for (const repo of repos) {
		const result = git(
			repo,
			[
				'log',
				'--branches',
				'--remotes',
				'--tags',
				'--no-merges',
				'--numstat',
				'--date=format-local:%Y-%m-%d',
				`--format=${GIT_LOG_FORMAT}`,
				...[...emails].map((e) => `--author=${e}`)
			],
			timeZone
		);
		// An empty repo (no commits yet) exits non-zero too; either way it contributes nothing.
		if (result.status !== 0) {
			failed++;
			continue;
		}
		commits.push(...parseGitLog(result.stdout));
	}
	return { days: commitsByDay(commits, emails), repos: repos.length, failed };
}

function readToken() {
	if (env('BUILD_STATS_TOKEN')) return env('BUILD_STATS_TOKEN');
	const result = spawnSync(
		'security',
		['find-generic-password', '-s', CONFIG.keychainService, '-w'],
		{ encoding: 'utf8' }
	);
	const token = result.status === 0 ? result.stdout.trim() : '';
	if (!token) {
		throw new Error(`no token in Keychain (service "${CONFIG.keychainService}"); see README.md`);
	}
	return token;
}

// The current partner and its sprite, or null if PokeTokenBar isn't installed, is showing an egg
// or has files in a shape we don't know. Never throws: the partner is a garnish on the stats job.
function readPartner() {
	if (!CONFIG.partnerEnabled) return null;
	try {
		const dir = CONFIG.partnerDir;
		const state = JSON.parse(readFileSync(join(dir, 'companion-state.json'), 'utf8'));
		const speciesId = state?.active?.pathIDs?.[state?.active?.stageIndex];
		const details = JSON.parse(
			readFileSync(join(dir, 'pokemon-details-v1', `${speciesId}.json`), 'utf8')
		);
		const partner = buildPartner(state, details);
		if (!partner) return null;
		return { partner, spritePath: join(dir, 'sprites', `${spriteKey(partner)}.gif`) };
	} catch (err) {
		console.error(`${new Date().toISOString()} build-stats: no partner: ${err.message}`);
		return null;
	}
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function post(body, token, { url = CONFIG.url, method = 'POST', json = true } = {}) {
	let lastError;
	for (let attempt = 1; attempt <= CONFIG.attempts; attempt++) {
		try {
			const res = await fetch(url, {
				method,
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': json ? 'application/json' : 'image/gif'
				},
				body: json ? JSON.stringify(body) : body,
				signal: AbortSignal.timeout(30_000)
			});
			if (res.ok) return json ? await res.json().catch(() => ({})) : undefined;
			const detail = await res.text().catch(() => '');
			lastError = new Error(`HTTP ${res.status} ${detail.slice(0, 200)}`.trim());
			// Client errors (bad token, bad body) won't fix themselves on retry.
			if (res.status < 500 && res.status !== 408 && res.status !== 429) throw lastError;
		} catch (err) {
			if (err === lastError) throw err;
			lastError = err;
		}
		if (attempt < CONFIG.attempts) await sleep(2 ** attempt * 1000); // 2s, 4s, 8s
	}
	throw lastError;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const started = Date.now();
	const now = new Date();
	const today = dayInZone(now, CONFIG.timeZone);
	const sinceDay = args.days ? shiftDay(today, -(args.days - 1)) : undefined;

	const tokens = await collectTokens(CONFIG.timeZone);
	const lines = collectLines(CONFIG.timeZone);
	// Sanity: git dates from a clock-skewed machine can land in the future; the proxy has no
	// problem with that, but they'd never show as "today" so drop them.
	const days = mergeDays([tokens.days, lines.days], { sinceDay }).filter((d) => d.day <= today);
	const sums = totals(days, today);
	const asOf = now.toISOString();
	const partner = readPartner();

	if (args.dryRun) {
		const report = {
			asOf,
			today,
			days: days.length,
			totals: sums,
			payload: { asOf, days },
			partner: partner && {
				payload: { asOf, partner: partner.partner },
				sprite: partner.spritePath
			}
		};
		process.stdout.write(`${JSON.stringify(report, null, '\t')}\n`);
		return;
	}
	if (days.length === 0 && !partner) {
		console.log(`${asOf} build-stats: nothing to send`);
		return;
	}

	const token = readToken();
	const batches = chunk(days, CONFIG.daysPerPost);
	for (const batch of batches) await post({ asOf, days: batch }, token);
	const partnerNote = partner ? await sendPartner(partner, asOf, token) : 'no partner';

	const t = sums.today;
	console.log(
		`${asOf} build-stats: sent ${days.length} days in ${batches.length} POST(s) to ` +
			`${new URL(CONFIG.url).host} in ${((Date.now() - started) / 1000).toFixed(1)}s; ` +
			`today written=${t.written} cacheRead=${t.cacheRead} linesAdded=${t.linesAdded} ` +
			`commits=${t.commits}; ${tokens.files} logs, ${lines.repos} repos` +
			(lines.failed ? ` (${lines.failed} unreadable)` : '') +
			`; ${partnerNote}`
	);
}

// A partner failure is logged but never fails the job: the day totals above are already sent.
// The proxy says whether it still needs the sprite, so the gif only travels when the species or
// shiny flag changes (and again if the proxy lost it).
async function sendPartner({ partner, spritePath }, asOf, token) {
	const label = `${partner.name} Lv ${partner.level}${partner.shiny ? ' (shiny)' : ''}`;
	try {
		const result = await post({ asOf, partner }, token, { url: partnerUrl('/api/partner') });
		if (!result?.needsSprite) return `partner ${label}`;
		const gif = readFileSync(spritePath);
		const key = encodeURIComponent(spriteKey(partner));
		await post(gif, token, {
			url: partnerUrl(`/api/partner/sprite?key=${key}`),
			method: 'PUT',
			json: false
		});
		return `partner ${label} + sprite (${gif.length} bytes)`;
	} catch (err) {
		console.error(`${new Date().toISOString()} build-stats: partner failed: ${err.message}`);
		return 'partner failed';
	}
}

// The partner routes sit next to the build-stats one: same host, same token.
const partnerUrl = (path) => new URL(path, CONFIG.url).toString();

main().catch((err) => {
	console.error(`${new Date().toISOString()} build-stats: failed: ${err.message}`);
	process.exitCode = 1;
});
