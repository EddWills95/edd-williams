# Build stats ("the house runs on batteries, so do I")

Status: proxy side built, tested and deployed (endpoint is off until `BUILD_STATS_TOKEN` is set;
the live HA-Proxy Dokploy app is still a Dockerfile app with a `/data` volume, and the Compose
migration below has not been done). Mac job and frontend panel still to do. Both the panel and the
proxy touch `src/components/home-lab.svelte` and `energy-proxy/server.js`.

## Goal

A small "Build" panel next to the Home Lab house showing real coding stats with some humour:

- Tokens written and read from cache: today / this week / lifetime (Claude Code usage)
- Lines of code added and commits: same windows
- Optionally PRs merged this week (GitHub API, the only server-side source)

Real numbers only (see `PRODUCT.md`). Aggregates only: no repo names, project names or anything
that reveals client work.

## Decisions made

- Private and client repo work may be included in anonymous totals.
- Tokens are a fun headline number, with humour in the captions.
- Show the data's own "as of" time, not the browser fetch time.
- The browser never sees credentials; the proxy is the only public surface.
- **Transport: the Mac pushes straight to the proxy** (authenticated POST). Home Assistant is not
  involved. Rejected: HA REST (would put an admin-capable HA token on the Mac), MQTT (needs a
  broker), HA webhook (more config, Mac not always on the home network), HA polling the Mac (wrong
  direction for a laptop). The old "HA is the single source" constraint is dropped.
- **Storage: SQLite file** at `/data/build-stats.db` on a named volume, one row per day. No
  database server. Needs Node 22+ (`node:sqlite`).
- **Deployment: Docker Compose** (`energy-proxy/docker-compose.yml`) so the volume and env vars are
  visible in the repo, not hidden in the Dokploy UI.
- The write secret (`BUILD_STATS_TOKEN`) only authorises posting stats. It is not the HA token.

## Data sources (all from the Mac unless noted)

### Tokens (Claude Code)

- Local logs: `~/.claude/projects/**/*.jsonl`, `type: "assistant"` entries with `message.usage`
  (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`).
- Entries repeat, so de-duplicate on `(message.id, requestId)`.
- Logs are pruned (only back to about 19 Aug 2026), so the proxy's database is the durable record
  of lifetime totals. Re-summing logs alone would shrink the total as files expire.
- Cache reads are ~99% of raw tokens (about 4B vs 9M written over ~40 days). Show "written" as the
  headline and "read from cache" as the joke number.
- Proposed definition: **written = `output_tokens` + `cache_creation_input_tokens`**; cache read is
  separate. Confirm before building.
- The prototype summing script lived in a session scratchpad and may be gone. Rewrite it into the
  repo (e.g. `scripts/build-stats/`).

### Lines of code and commits

- Computed locally with `git log --no-merges --author=<emails> --numstat --date=short`, over repos
  in scanned directories, grouped by local day.
- Exclude noise by pathspec: lockfiles, `dist`/`build`, minified and generated files.
- De-duplicate commits by SHA across clones. Only aggregates leave the Mac.
- Why not the GitHub API for this: it returns per-commit totals including lockfiles and generated
  files, per-file stats need one call per commit, and it only sees pushed work.
- Caveats: only locally cloned repos count; unpushed and rebased commits can add small noise; it is
  authored lines, so AI-assisted code counts (part of the joke). The per-day `max()` rule means
  numbers can never go backwards.

### GitHub (server-side, optional)

- PRs merged (and optionally commits) via GraphQL `contributionsCollection`, with a fine-grained
  read-only token held by the proxy, cached ~30 minutes.
- Private contributions only appear if "Include private contributions" is enabled on the profile.

## Proxy (built)

In `energy-proxy/`: `build-stats.js`, `build-stats.test.js`, routes in `server.js`.

- `POST /api/build-stats`, bearer `BUILD_STATS_TOKEN` (timing-safe compare). Body:
  `{ asOf: ISO, days: [{ day: 'YYYY-MM-DD', written, cacheRead }] }`. Validated: real dates,
  non-negative integers, at most 400 days, `asOf` not in the future.
- Idempotent: each day is upserted with `max()` per column, and `asOf` only moves forward. Re-sends,
  retries and pruned logs cannot lower or double count anything.
- `GET /api/build-stats`: today, rolling seven days, lifetime, `asOf`, `stale` (over 48h). 404
  until the first push. Days are counted in `BUILD_STATS_TZ` (default `Europe/London`).
- Build stats are optional: with no token or an unopenable database, only these routes report
  unavailable and `/api/energy-stats` is unaffected.
- Separate from `/api/energy-stats` so failures stay isolated. The frontend must cope with a 404.

**To add for lines:** `lines_added`, `lines_removed`, `commits` columns (plus a migration for
existing databases), the same `max()` upsert, validation and summary fields, and tests.

## Mac job (to do)

- Node script in the repo, run by launchd with `RunAtLoad` plus an hourly `StartInterval`.
- Sums tokens (and lines) per day, POSTs every day that changed, with retry. If offline it simply
  fails and retries next hour.
- Secret in Keychain (`security find-generic-password -s build-stats-token`), never in the plist.
- First run backfills all available days.
- Proposed defaults: scan `~/Development` and `~/Prodigies`; author emails from those repos' git
  config; headline is lines added (not net).

## Deployment

**Docker Compose migration is deferred.** For now HA-Proxy stays a Dockerfile application in
Dokploy and build stats are enabled by setting `BUILD_STATS_TOKEN` on it.

**The `/data` volume is required and must not be lost.** It holds the SQLite file
(`/data/build-stats.db`), which is the only durable record of lifetime totals (Claude Code logs are
pruned after roughly 30 days). The volume is currently mounted on the existing HA-Proxy app,
added by hand in the Dokploy UI (mount path `/data`, type volume). So:

- Do not delete or recreate that volume, and do not delete the HA-Proxy app without moving it.
- If the app is ever recreated or migrated, mount a persistent volume at `/data` first, and copy
  the existing database across.
- Losing it only loses history: the Mac job resends whatever is still in the logs, and the proxy
  rebuilds from that, but older days would be gone.

Steps to enable now:

1. Generate the secret: `openssl rand -hex 32`, and store it in the Mac Keychain as
   `build-stats-token`.
2. Add `BUILD_STATS_TOKEN` (same value) to the HA-Proxy application's environment in Dokploy and
   redeploy.
3. Install the Mac job; it backfills on first run. Check `GET /api/build-stats`.

When the Compose migration happens later, the plan is: create a Compose service from the repo with
path `energy-proxy/docker-compose.yml` (its named volume `energy-proxy-data` is mounted at `/data`),
copy the env vars from the old app, attach the domain on port 3001 (check the `edge` routing and
`ALLOWED_ORIGINS`), move the existing database into the new volume, then remove the old app.

## Frontend (to do)

- "Build" panel in the Home Lab section, reduced-motion, contrast and mobile requirements matching
  the rest of the site. Hide it if the endpoint 404s or the fields are absent.
- Show `asOf` from the data, and say so plainly when `stale`.
- Headline today and lifetime; keep the week as a caption (three windows is noisy).
- Placement (beside or below the house) depends on the Home Lab redesign.

## Copy ideas (humour)

- "Tokens written today: 687,856. Roughly one Lord of the Rings, if it were less good."
- "The house runs on the sun. The code runs on the sun and vibes."
- Cache reads as the absurd number: "Tokens read from cache: 3,962,429,899. Yes, really."

## Open questions

- Confirm "written" = `output_tokens` + `cache_creation_input_tokens`.
- Directories to scan for lines, and which author emails count.
- Lines headline: added or net.
- Include GitHub PRs merged (needs a GitHub token on the proxy), or take everything from the Mac?
- Panel placement after the Home Lab redesign.

## Status (28 Sep 2026): lines and Mac job built

- Proxy: `linesAdded`, `linesRemoved`, `commits` per day (optional in a POST, default 0), with an
  in-place migration for existing databases. `GET` now also returns `today`, `week` and `lifetime`
  objects, each `{ written, cacheRead, linesAdded, linesRemoved, commits }`; the old flat fields
  stay. Needs a redeploy.
- Mac job: `scripts/build-stats/` (see its README). Decisions taken: written = output + cache
  creation; scan `~/Development` and `~/Prodigies`; authors from repo git config plus
  `edd.williams@me.com`; headline is lines added; single-file changes over 5,000 lines skipped as
  data dumps. GitHub API skipped for now.
