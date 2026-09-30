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

Every day is the local calendar day in `Europe/London`. The proxy keeps the maximum it has ever
seen for each day and column, so re-sending is safe and pruned logs never lower a total.

## Run it

```sh
node job.js --dry-run            # print the aggregates as JSON, send nothing
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
