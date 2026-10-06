# build-stats (Mac job)

Sums coding stats per day on this Mac and POSTs them to the energy proxy's
`/api/build-stats` endpoint, which feeds the "Build" panel on the site. Plain Node (22+), no
dependencies. Only per-day totals leave the Mac: no repo names, paths, commit messages or file
names.

## What it counts

**Tokens** (Claude Code), from `~/.claude/projects/**/*.jsonl`:

- `written` = `output_tokens` + `cache_creation_input_tokens`
- `cacheRead` = `cache_read_input_tokens`
- Only `type: "assistant"` entries with `message.usage`. The same response is logged more than
  once, so entries are de-duplicated on `(message.id, requestId)`.

**Git**, from every repo found under `~/Development` and `~/Prodigies` (up to four levels down,
skipping dot-directories such as `.claude/worktrees`, `node_modules`, `vendor`, `build`, `dist`):

- `git log --branches --remotes --tags --no-merges --numstat`, authored by any `user.email` set in
  those repos' git config, plus `edd.williams@me.com`.
- `commits`, `linesAdded` (the headline) and `linesRemoved`. Commits are de-duplicated by SHA, so
  several clones or worktrees of one repo count once.
- Lines in noise files don't count: lockfiles, `dist/`, `build/`, `.svelte-kit/`, `node_modules/`,
  `vendor/`, `coverage/`, snapshots, `*.min.*`, `*.map`, generated code (`*.generated.*`, `*.pb.go`
  and similar) and Xcode project files. A single file changing by more than 5,000 lines in one
  commit is treated as a data dump or an import and skipped too. See `collect.js`.

**Partner** (PokeTokenBar), from `~/Library/Application Support/PokeTokenBar/` (read-only, and
skipped silently if the app isn't there or is showing an egg): the current partner's `name`,
`level`, `xp` (its `growthTokens`), `shiny` and species ID, plus the level's XP range
(`levelStartXp`, `nextLevelXp`) so the site can draw a progress bar, and the sprite GIF. Nothing
else from `companion-state.json` leaves the Mac: no IVs, seed, instance ID, nature or moves.

The app doesn't store the next-level threshold, so it is derived from the app's own rule (see
`PokemonProfile.advanceGrowth` upstream): `level = 5 + floor(95 × growthTokens / T)`, where `T` is
the rarity's total (common 750M, uncommon 1.875B, rare 3B, legendary 6B). Level _n_ starts at
`ceil((n − 5) / 95 × T)`; level 100 has no next level. It matches the app's saved levels (e.g.
382,775,174 tokens is Lv 53, 750,000,000 is Lv 100) and is tested in `collect.test.js`.

The partner goes to `/api/partner` after the day totals. The proxy answers whether it still needs
the sprite, so the GIF is uploaded (`PUT /api/partner/sprite`) only when the species or shiny flag
changes, not every hour. A partner failure is logged and never fails the run. Set
`BUILD_STATS_PARTNER=off` to skip it.

Every day is the local calendar day in `Europe/London`. The proxy keeps the maximum it has ever
seen for each day and column, so re-sending is safe and pruned logs never lower a total.

## Run it

```sh
node job.js --dry-run            # print the aggregates and partner as JSON, send nothing
node job.js --dry-run --days 7   # only the last seven days (including today)
node job.js                      # send every day available (the first run backfills)
node --test                      # unit tests (parsing, de-duplication, noise, day bucketing)
```

It exits non-zero if anything fails, after retrying a POST up to four times with backoff. Each
run logs one line with today's totals, never the token.

Settings (environment variables, all optional):

| Variable                 | Default                                           |
| ------------------------ | ------------------------------------------------- |
| `BUILD_STATS_URL`        | `https://energy.edd-williams.com/api/build-stats` |
| `BUILD_STATS_ROOTS`      | `~/Development:~/Prodigies` (colon-separated)     |
| `BUILD_STATS_EMAILS`     | extra author emails, comma-separated              |
| `BUILD_STATS_TZ`         | `Europe/London`                                   |
| `BUILD_STATS_CLAUDE_DIR` | `~/.claude/projects:~/.claude-prodigies/projects` (colon-separated) |
| `BUILD_STATS_TOKEN`      | overrides the Keychain, for local testing only    |
| `BUILD_STATS_PARTNER`    | `off` skips the PokeTokenBar partner              |
| `BUILD_STATS_POKETOKENBAR_DIR` | `~/Library/Application Support/PokeTokenBar` |

## The token

The bearer token lives in the login Keychain, never in the plist or the repo. To create one:

```sh
security add-generic-password -a "$USER" -s build-stats-token -w "$(openssl rand -hex 32)" -U
```

Set the same value as `BUILD_STATS_TOKEN` on the proxy. To copy it without printing it:

```sh
security find-generic-password -s build-stats-token -w | pbcopy
```

## Schedule it (launchd)

```sh
./install.sh     # LaunchAgent: runs now, then hourly
./uninstall.sh   # stop and remove it
```

`install.sh` writes `~/Library/LaunchAgents/com.edd-williams.build-stats.plist` from the template
here, pointing at the `node` on your `PATH` and this directory, so re-run it if either moves. Logs
go to `~/Library/Logs/build-stats.log`. A run takes about 10 seconds. If the Mac is offline the run
fails and the next hourly run catches up.

To test against a local proxy instead of production:

```sh
BUILD_STATS_URL=http://localhost:3001/api/build-stats node job.js
```
