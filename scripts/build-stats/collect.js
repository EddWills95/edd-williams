// Pure parsing and aggregation for the build-stats job: no filesystem, no git, no network, so it
// can be tested on fixtures. job.js does the I/O and feeds lines and git output through here.

export const COUNTERS = ['written', 'cacheRead', 'linesAdded', 'linesRemoved', 'commits'];

// "YYYY-MM-DD" for `date` as seen in `timeZone`. en-CA formats dates as ISO year-month-day.
export function dayInZone(date, timeZone) {
	return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

export function shiftDay(day, delta) {
	const d = new Date(`${day}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + delta);
	return d.toISOString().slice(0, 10);
}

const count = (value) => (Number.isSafeInteger(value) && value > 0 ? value : 0);

/**
 * Collects Claude Code usage from JSONL log lines. The same API response is logged several times
 * (once per content block, and again in resumed or forked sessions), so entries are de-duplicated
 * on (message.id, requestId); if copies disagree the largest count wins.
 */
export function createTokenCollector() {
	const seen = new Map(); // key -> { timestamp, written, cacheRead }

	function addLine(line) {
		// Cheap pre-filter: most lines are user turns, tool results or metadata.
		if (!line.includes('"usage"')) return;
		let entry;
		try {
			entry = JSON.parse(line);
		} catch {
			return; // a partially written last line, or not JSON at all
		}
		const usage = entry?.message?.usage;
		if (entry?.type !== 'assistant' || !usage || typeof entry.timestamp !== 'string') return;
		if (Number.isNaN(new Date(entry.timestamp).getTime())) return;

		const messageId = entry.message.id;
		const requestId = entry.requestId;
		const key = messageId || requestId ? `${messageId ?? ''}|${requestId ?? ''}` : entry.uuid;
		if (!key) return;

		const written = count(usage.output_tokens) + count(usage.cache_creation_input_tokens);
		const cacheRead = count(usage.cache_read_input_tokens);
		const previous = seen.get(key);
		if (!previous) {
			seen.set(key, { timestamp: entry.timestamp, written, cacheRead });
		} else {
			previous.written = Math.max(previous.written, written);
			previous.cacheRead = Math.max(previous.cacheRead, cacheRead);
			if (entry.timestamp < previous.timestamp) previous.timestamp = entry.timestamp;
		}
	}

	// day -> { written, cacheRead }
	function byDay(timeZone) {
		const days = new Map();
		for (const { timestamp, written, cacheRead } of seen.values()) {
			const day = dayInZone(new Date(timestamp), timeZone);
			const totals = days.get(day) ?? { written: 0, cacheRead: 0 };
			totals.written += written;
			totals.cacheRead += cacheRead;
			days.set(day, totals);
		}
		return days;
	}

	return {
		addLine,
		byDay,
		get size() {
			return seen.size;
		}
	};
}

// Files that change a lot of lines without anyone writing them.
const NOISE_FILES = new Set([
	'yarn.lock',
	'package-lock.json',
	'npm-shrinkwrap.json',
	'pnpm-lock.yaml',
	'bun.lock',
	'bun.lockb',
	'deno.lock',
	'Cargo.lock',
	'Gemfile.lock',
	'Podfile.lock',
	'poetry.lock',
	'uv.lock',
	'Pipfile.lock',
	'composer.lock',
	'go.sum',
	'flake.lock',
	'Package.resolved',
	'pubspec.lock',
	'mix.lock'
]);

// Directories whose contents are built, vendored or generated.
const NOISE_DIRS = new Set([
	'node_modules',
	'dist',
	'build',
	'.svelte-kit',
	'.next',
	'.nuxt',
	'.output',
	'.vercel',
	'coverage',
	'vendor',
	'Pods',
	'DerivedData',
	'__snapshots__',
	'__generated__',
	'generated',
	'.vexp'
]);

const NOISE_NAME_PATTERNS = [
	/\.min\.[a-z0-9]+$/i, // minified bundles
	/\.map$/i, // source maps
	/\.snap$/i, // test snapshots
	/[.-](generated|gen)\.[a-z0-9]+$/i, // foo.generated.ts, foo.gen.go
	/\.g\.dart$/i,
	/\.pb\.(go|swift)$/i,
	/_pb2(_grpc)?\.pyi?$/i,
	/\.pbxproj$/i // Xcode project files
];

/**
 * Resolves git's numstat rename notation to the new path:
 * "src/{old => new}/a.js" -> "src/new/a.js", "old.js => new.js" -> "new.js".
 */
export function resolveRenamedPath(path) {
	const braced = path.match(/^(.*)\{(.*) => (.*)\}(.*)$/);
	if (braced) return `${braced[1]}${braced[3]}${braced[4]}`.replace(/\/{2,}/g, '/');
	const plain = path.indexOf(' => ');
	return plain === -1 ? path : path.slice(plain + 4);
}

export function isNoisePath(rawPath) {
	// Paths with unusual characters are quoted by git; the quotes don't matter for matching.
	const path = resolveRenamedPath(rawPath.replace(/^"|"$/g, ''));
	const segments = path.split('/');
	const name = segments[segments.length - 1];
	if (NOISE_FILES.has(name)) return true;
	if (segments.slice(0, -1).some((segment) => NOISE_DIRS.has(segment))) return true;
	return NOISE_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

export const COMMIT_SEPARATOR = '\x1e';
export const FIELD_SEPARATOR = '\x1f';
// Format string for `git log` that parseGitLog understands. Pair it with --numstat and
// --date=format-local:%Y-%m-%d (and TZ set) so %ad is the author's day in the chosen zone.
export const GIT_LOG_FORMAT = `${COMMIT_SEPARATOR}%H${FIELD_SEPARATOR}%ae${FIELD_SEPARATOR}%ad`;

export const MAX_FILE_LINES_PER_COMMIT = 5000;

/**
 * Parses `git log --numstat --format=GIT_LOG_FORMAT` output into commits:
 * [{ sha, email, day, linesAdded, linesRemoved }], with noise files, binary files (`-`) and
 * single-file changes over MAX_FILE_LINES_PER_COMMIT lines either way excluded from the line counts.
 */
export function parseGitLog(output) {
	const commits = [];
	for (const record of output.split(COMMIT_SEPARATOR)) {
		if (!record.trim()) continue;
		const [header, ...stats] = record.split('\n');
		const [sha, email, day] = header.split(FIELD_SEPARATOR);
		if (!sha || !day) continue;
		let linesAdded = 0;
		let linesRemoved = 0;
		for (const line of stats) {
			const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
			if (!match || isNoisePath(match[3])) continue;
			// One file gaining or losing thousands of lines in one commit is a data dump, an import
			// or its removal (a vectors.json, a scraped page, a vendored library), not authorship.
			if (Number(match[1]) > MAX_FILE_LINES_PER_COMMIT) continue;
			if (Number(match[2]) > MAX_FILE_LINES_PER_COMMIT) continue;
			if (match[1] !== '-') linesAdded += Number(match[1]);
			if (match[2] !== '-') linesRemoved += Number(match[2]);
		}
		commits.push({ sha, email: (email ?? '').toLowerCase(), day, linesAdded, linesRemoved });
	}
	return commits;
}

/**
 * Sums commits per day, counting each SHA once however many clones or worktrees it appears in,
 * and only commits whose author email is in `emails` (lower case).
 * Returns day -> { linesAdded, linesRemoved, commits }.
 */
export function commitsByDay(commits, emails) {
	const seen = new Set();
	const days = new Map();
	for (const commit of commits) {
		if (seen.has(commit.sha) || !emails.has(commit.email)) continue;
		seen.add(commit.sha);
		const totals = days.get(commit.day) ?? { linesAdded: 0, linesRemoved: 0, commits: 0 };
		totals.linesAdded += commit.linesAdded;
		totals.linesRemoved += commit.linesRemoved;
		totals.commits += 1;
		days.set(commit.day, totals);
	}
	return days;
}

/**
 * Merges per-day maps into the POST body's day list: every counter present (0 if absent), sorted
 * by day, days with nothing at all dropped, and only days on or after `sinceDay` if given.
 */
export function mergeDays(maps, { sinceDay } = {}) {
	const merged = new Map();
	for (const map of maps) {
		for (const [day, totals] of map) {
			if (sinceDay && day < sinceDay) continue;
			const row = merged.get(day) ?? Object.fromEntries(COUNTERS.map((c) => [c, 0]));
			for (const c of COUNTERS) row[c] += totals[c] ?? 0;
			merged.set(day, row);
		}
	}
	return [...merged.entries()]
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.filter(([, row]) => COUNTERS.some((c) => row[c] > 0))
		.map(([day, row]) => ({ day, ...row }));
}

// Today and lifetime sums of the day list, for the log line and --dry-run output.
export function totals(days, today) {
	const zero = () => Object.fromEntries(COUNTERS.map((c) => [c, 0]));
	const result = { today: zero(), lifetime: zero() };
	for (const row of days) {
		for (const c of COUNTERS) {
			result.lifetime[c] += row[c];
			if (row.day === today) result.today[c] += row[c];
		}
	}
	return result;
}

export function chunk(list, size) {
	const chunks = [];
	for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size));
	return chunks;
}

// PokeTokenBar partner. The app's progress bar is the tokens spent in the current evolution stage
// (`usedAtStage`) over that stage's cost, and its caption is "X to graduation" on the final form
// or "X to next evolution" before it (PokemonBalance.phaseThreshold and CompanionStore.progress in
// github.com/chattymin/poketokenbar). The site mirrors that so the two show the same thing. A
// rarity's total T is split across its forms k as T * i / (k (k + 1) / 2) for stage i, so later
// stages cost more.
export const GRADUATION_TOTAL = {
	common: 750_000_000,
	uncommon: 1_875_000_000,
	rare: 3_000_000_000,
	legendary: 6_000_000_000
};
const MIN_LEVEL = 5;
const MAX_LEVEL = 100;
const GROWTH_BOOST = 2; // a repeat partner (hasGrowthBoost) needs half the tokens per stage

// Token cost of the 0-based `stageIndex` of a `forms`-stage line, or undefined for an unknown
// rarity or impossible stage.
export function phaseThreshold(rarity, forms, stageIndex, boosted = false) {
	const total = GRADUATION_TOTAL[rarity];
	if (!total || !Number.isSafeInteger(forms) || forms < 1) return undefined;
	if (!Number.isSafeInteger(stageIndex) || stageIndex < 0 || stageIndex >= forms) return undefined;
	const standard = Math.round((total * (stageIndex + 1)) / ((forms * (forms + 1)) / 2));
	return Math.max(1, Math.round(standard / (boosted ? GROWTH_BOOST : 1)));
}

/**
 * Builds the site payload from PokeTokenBar's companion-state.json and the partner species'
 * details JSON. Returns only what the site shows (no IVs, seed, instance ID, moves or nature),
 * or null if there is no usable partner (an egg, a missing file or an unexpected shape).
 */
export function buildPartner(state, details) {
	const active = state?.active;
	const profile = active?.profile;
	const speciesId = active?.pathIDs?.[active?.stageIndex];
	const name = details?.details?.name;
	if (!Number.isSafeInteger(speciesId) || speciesId < 1 || !profile) return null;
	if (typeof name !== 'string' || !/^[a-z0-9-]{1,40}$/.test(name)) return null;
	if (!Number.isSafeInteger(profile.level) || profile.level < MIN_LEVEL) return null;
	if (profile.level > MAX_LEVEL || !Number.isSafeInteger(profile.growthTokens)) return null;
	if (profile.growthTokens < 0) return null;

	const partner = {
		speciesId,
		name,
		level: profile.level,
		xp: profile.growthTokens,
		shiny: active.isShiny === true
	};
	const threshold = phaseThreshold(
		active.rarity,
		active.totalForms,
		active.stageIndex,
		active.hasGrowthBoost === true
	);
	if (
		threshold !== undefined &&
		Number.isSafeInteger(active.usedAtStage) &&
		active.usedAtStage >= 0
	) {
		partner.stage = active.stageIndex + 1;
		partner.stages = active.totalForms;
		partner.stageXp = active.usedAtStage;
		partner.stageThreshold = threshold;
	}
	return partner;
}

// Sprite file name in PokeTokenBar's sprites/ directory: "-sha" is the shiny animated variant.
export const spriteKey = ({ speciesId, shiny }) => `${speciesId}-${shiny ? 'sha' : 'a'}`;
