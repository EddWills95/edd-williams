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
	"cached": true
}
```

`GET /healthz` — trivial liveness check for Traefik/Dokploy.

## Setup

1. In Home Assistant, create a **dedicated, restricted user** (not your admin account) and
   generate a long-lived access token for it. This proxy only needs read access to the six
   entities listed in `ENTITIES` in `server.js` — the token doesn't need to be able to do
   anything else.
2. Copy `.env.example` to `.env` and fill in `HA_URL` and `HA_TOKEN`.
3. `yarn install && yarn start` (or `node server.js`) to run locally on port 3001.

## Deployment

Deployed as its own app under the `edd-williams` project in Dokploy (behind Traefik, like the
other self-hosted services), built from this `energy-proxy/` subdirectory via the included
`Dockerfile`. Set `HA_URL`, `HA_TOKEN`, `ALLOWED_ORIGINS`, and `CACHE_TTL_SECONDS` as Dokploy
environment variables — never commit a real `.env` file.

## Design notes

- Responses are cached in memory for `CACHE_TTL_SECONDS` (default 10 minutes) so a burst of
  site traffic doesn't turn into a burst of Home Assistant API calls.
- If a Home Assistant fetch fails but a previous successful result is cached, the stale cached
  value is served (with `"stale": true`) rather than the endpoint going down — a public site
  showing a slightly old number is better than it showing an error.
- `ALLOWED_ORIGINS` is a CORS allowlist, not an auth mechanism — this endpoint is read-only and
  intentionally has no secrets in its response, so the main risk it guards against is other
  sites embedding/scraping it, not data exposure.
