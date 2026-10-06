// The PokeTokenBar partner: the Pokémon whose level tracks how many tokens I've spent. Stored as
// one replaceable record plus one sprite (a GIF). Unlike the build-stats counters this is NOT
// max-merged: a partner swap or an evolution can lower the level, so the newest push wins. Only
// the order of pushes is guarded, so a late retry of an older one can't overwrite a newer one.
import { DatabaseSync } from 'node:sqlite';

const MAX_SPRITE_BYTES = 512 * 1024; // PokeTokenBar's gifs are ~10-60 KB
const MAX_XP = 1e13;
const NAME_PATTERN = /^[a-z0-9-]{1,40}$/;

export const MAX_SPRITE_LIMIT = MAX_SPRITE_BYTES;

// The file name PokeTokenBar uses, which doubles as the cache key: "-sha" is the shiny gif.
export const spriteKey = ({ speciesId, shiny }) => `${speciesId}-${shiny ? 'sha' : 'a'}`;

const isCount = (v) => Number.isSafeInteger(v) && v >= 0 && v <= MAX_XP;

/**
 * Validates a partner POST: { asOf: ISO string, partner: { speciesId, name, level, xp, shiny,
 * levelStartXp?, nextLevelXp? } }. Unknown fields are dropped, not stored.
 */
export function validatePartner(body, now = new Date()) {
	if (!body || typeof body !== 'object') return { ok: false, error: 'body must be an object' };
	const asOf = new Date(body.asOf);
	if (typeof body.asOf !== 'string' || Number.isNaN(asOf.getTime())) {
		return { ok: false, error: 'asOf must be an ISO timestamp' };
	}
	if (asOf.getTime() > now.getTime() + 5 * 60 * 1000) {
		return { ok: false, error: 'asOf is in the future' };
	}

	const p = body.partner;
	if (!p || typeof p !== 'object') return { ok: false, error: 'partner must be an object' };
	if (!Number.isSafeInteger(p.speciesId) || p.speciesId < 1 || p.speciesId > 100000) {
		return { ok: false, error: 'speciesId must be a positive integer' };
	}
	if (typeof p.name !== 'string' || !NAME_PATTERN.test(p.name)) {
		return { ok: false, error: 'name must be lower-case letters, digits and hyphens' };
	}
	if (!Number.isSafeInteger(p.level) || p.level < 1 || p.level > 100) {
		return { ok: false, error: 'level must be an integer from 1 to 100' };
	}
	if (!isCount(p.xp)) return { ok: false, error: 'xp must be a non-negative integer' };
	if (typeof p.shiny !== 'boolean') return { ok: false, error: 'shiny must be a boolean' };

	const partner = { speciesId: p.speciesId, name: p.name, level: p.level, xp: p.xp, shiny: p.shiny };
	for (const key of ['levelStartXp', 'nextLevelXp']) {
		if (p[key] === undefined || p[key] === null) continue;
		if (!isCount(p[key])) return { ok: false, error: `${key} must be a non-negative integer` };
		partner[key] = p[key];
	}
	// A bar needs a start below its end; anything else is a malformed pair, not a partial one.
	if (
		partner.nextLevelXp !== undefined &&
		(partner.levelStartXp === undefined || partner.nextLevelXp <= partner.levelStartXp)
	) {
		return { ok: false, error: 'nextLevelXp must come with a smaller levelStartXp' };
	}
	return { ok: true, value: { asOf: asOf.toISOString(), partner } };
}

export function isGif(bytes) {
	if (!bytes || bytes.length < 10) return false;
	const head = bytes.subarray(0, 6).toString('latin1');
	return head === 'GIF87a' || head === 'GIF89a';
}

export function openPartner(path) {
	const db = new DatabaseSync(path);
	db.exec(`
		PRAGMA journal_mode = WAL;
		CREATE TABLE IF NOT EXISTS partner (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			as_of TEXT NOT NULL,
			data TEXT NOT NULL,
			sprite_key TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS partner_sprite (
			key TEXT PRIMARY KEY,
			gif BLOB NOT NULL
		);
	`);

	const getPartner = db.prepare(`SELECT as_of, data, sprite_key FROM partner WHERE id = 1`);
	const putPartner = db.prepare(`
		INSERT INTO partner (id, as_of, data, sprite_key) VALUES (1, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			as_of = excluded.as_of, data = excluded.data, sprite_key = excluded.sprite_key
	`);
	const getSprite = db.prepare(`SELECT gif FROM partner_sprite WHERE key = ?`);
	const putSprite = db.prepare(`
		INSERT INTO partner_sprite (key, gif) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET gif = excluded.gif
	`);
	// Only the current sprite is kept: the table can never grow past one row per push of a new one.
	const pruneSprites = db.prepare(`DELETE FROM partner_sprite WHERE key != ?`);

	// Replaces the stored partner unless an equal or newer push already landed. Returns whether
	// the push was applied and whether the proxy still needs the sprite for this partner.
	function ingest({ asOf, partner }) {
		const key = spriteKey(partner);
		const previous = getPartner.get();
		if (previous && asOf < previous.as_of) {
			return { applied: false, needsSprite: !getSprite.get(previous.sprite_key) };
		}
		putPartner.run(asOf, JSON.stringify(partner), key);
		return { applied: true, needsSprite: !getSprite.get(key) };
	}

	// Stores the sprite for the *current* partner only (key must match), so a stale or mistaken
	// upload can't leave a gif the site would never show.
	function setSprite(key, gif) {
		const current = getPartner.get();
		if (!current || current.sprite_key !== key) return false;
		db.exec('BEGIN');
		try {
			putSprite.run(key, gif);
			pruneSprites.run(key);
			db.exec('COMMIT');
		} catch (err) {
			db.exec('ROLLBACK');
			throw err;
		}
		return true;
	}

	// Null until the first push. `spriteUrl` is relative to the API and carries the key, so a new
	// species or shiny flag changes the URL and busts the long image cache.
	function summary(now = new Date()) {
		const row = getPartner.get();
		if (!row) return null;
		const hasSprite = !!getSprite.get(row.sprite_key);
		return {
			asOf: row.as_of,
			stale: now.getTime() - new Date(row.as_of).getTime() > 48 * 60 * 60 * 1000,
			...JSON.parse(row.data),
			spriteUrl: hasSprite ? `/api/partner/sprite?v=${encodeURIComponent(row.sprite_key)}` : null
		};
	}

	function sprite() {
		const row = getPartner.get();
		const gif = row && getSprite.get(row.sprite_key)?.gif;
		return gif ? Buffer.from(gif) : null;
	}

	return { ingest, setSprite, summary, sprite, close: () => db.close() };
}
