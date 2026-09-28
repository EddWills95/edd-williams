# energy-proxy

A tiny, single-purpose Node/Express proxy that sits between the public portfolio site and
Home Assistant. It holds a Home Assistant access token as a server-side secret and exposes
exactly one read-only endpoint with a handful of computed numbers — the site never talks to
Home Assistant directly, and no Home Assistant credentials or unrestricted state ever reach
the browser.

## Endpoint

`GET /api/energy-stats`

```json
{
	"batterySavingsTotal": 60.25,
	"solarGenerationTotalKwh": 211.3,
	"solarGenerationTodayKwh": 1.47,
	"batterySoc": 46.8,
	"batteryPowerW": 401,
	"batteryAction": "Discharging",
	"asOf": "2026-08-16T21:44:04.781Z",
	"solarPowerW": 1234,
	"housePowerW": 513,
	"gridPowerW": -300,
	"batterySavingsToday": 0.84,
	"cached": true
}
```

The first seven fields are always present. The last four are **optional**: each only appears
when its entity is configured (see below) and is currently reporting a real number, so clients
must treat them as possibly absent.

| Field                 | Meaning                                                         | Env var                   |
| --------------------- | --------------------------------------------------------------- | ------------------------- |
| `solarPowerW`         | Solar generation right now, W (never negative)                  | `HA_ENTITY_SOLAR_POWER`   |
| `housePowerW`         | House consumption right now, W                                  | `HA_ENTITY_HOUSE_POWER`   |
| `gridPowerW`          | Grid power right now, W — positive importing, negative exporting | `HA_ENTITY_GRID_POWER`    |
| `batterySavingsToday` | Battery-system savings today, £                                 | `HA_ENTITY_SAVINGS_TODAY` |

Power sensors reporting in `kW` are converted to W. The savings sensor is read as pence unless
its unit is `GBP`/`£`. If the grid sensor uses the opposite sign convention (positive =
exporting), set `HA_GRID_POWER_SIGN=export-positive`. A failing optional entity is logged and
omitted; it never takes the endpoint down.

`GET /healthz` — trivial liveness check for Traefik/Dokploy.

## Setup

1. In Home Assistant, create a **dedicated, restricted user** (not your admin account) and
   generate a long-lived access token for it. This proxy only needs read access to the six
   entities listed in `ENTITIES` in `server.js`, plus any optional entities you configure —
   the token doesn't need to be able to do anything else.
2. Copy `.env.example` to `.env` and fill in `HA_URL` and `HA_TOKEN`.
3. Optionally set the `HA_ENTITY_*` variables to real entity IDs to publish the extra fields.
4. `yarn install && yarn start` (or `node server.js`) to run locally on port 3001.

The payload mapping lives in `map-stats.js` as a pure function, so it can be checked against
fixture states without a Home Assistant instance.

## Deployment

Deployed as its own app under the `edd-williams` project in Dokploy (behind Traefik, like the
other self-hosted services), built from this `energy-proxy/` subdirectory via the included
`Dockerfile`. Set `HA_URL`, `HA_TOKEN`, `ALLOWED_ORIGINS`, `CACHE_TTL_SECONDS` and any optional
`HA_ENTITY_*` / `HA_GRID_POWER_SIGN` values as Dokploy environment variables — never commit a real `.env` file.

## Design notes

- Responses are cached in memory for `CACHE_TTL_SECONDS` (default 10 minutes) so a burst of
  site traffic doesn't turn into a burst of Home Assistant API calls.
- If a Home Assistant fetch fails but a previous successful result is cached, the stale cached
  value is served (with `"stale": true`) rather than the endpoint going down — a public site
  showing a slightly old number is better than it showing an error.
- `ALLOWED_ORIGINS` is a CORS allowlist, not an auth mechanism — this endpoint is read-only and
  intentionally has no secrets in its response, so the main risk it guards against is other
  sites embedding/scraping it, not data exposure.

## Build stats

`POST /api/build-stats` (bearer `BUILD_STATS_TOKEN`) accepts per-day token totals pushed from the
Mac; `GET /api/build-stats` serves today / rolling week / lifetime sums. Data lives in a SQLite
file at `BUILD_STATS_DB` (default `/data/build-stats.db`), on the `energy-proxy-data` volume
declared in `docker-compose.yml`. Without that volume the file is lost on every redeploy.
Days only ever grow (`max()` per day), so re-sending is safe. Requires Node 22+ (`node:sqlite`).
Run tests with `node --test build-stats.test.js`.
