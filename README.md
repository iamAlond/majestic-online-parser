# Majestic Online Parser

A singleton caching proxy for the Majestic RP / Russia Online wiki online-status APIs.

## Purpose

The upstream wiki APIs (`wiki.majestic-rp.ru`, `wiki.russia.online`) rate-limit aggressively and are not designed to be polled by multiple consumers. This service polls each upstream API **once** on a fixed interval, normalizes the payload into a stable schema, and serves the cached snapshot to any number of internal consumers. Downstream services must call this service instead of the wikis directly.

## Architecture

```
wiki.majestic-rp.ru/api/online ─┐
                                ├─→ CacheService (poll + dedup) ─→ Fastify HTTP API ─→ consumers
wiki.russia.online/api/online ──┘        ↑
                                   DecodeService (normalize)
                                   FetchService (axios, timeout)
```

- **FetchService** — performs the upstream HTTP GET with timeout and redirect limits. Returns `null` on any failure; never throws.
- **DecodeService** — maps the loosely-typed upstream payload onto the strict `OnlineSnapshot` / `Server` types, applies defaults, and sorts servers naturally by id (`mcl`, `ru1`, `ru2`, ...).
- **CacheService** — RxJS `timer` loop that refreshes both snapshots every `refreshInterval` (15 s). Snapshots are only replaced when a checksum of player counts and per-server status changes; otherwise the previous cache entry is kept. Failures retain the last good snapshot.
- **OnlineController** — serves the cached snapshot. No request-time upstream calls.

### Failure semantics

- Upstream fetch failure → previous snapshot is retained; `meta.isStale` becomes `true` once the cache is older than `cache.staleThreshold` (60 s).
- Both upstreams returning empty → the empty result is accepted and `lastUpdatedAt` still advances.
- The API does not return 5xx for upstream problems; consumers must inspect `meta.isStale`.

## API

Base URL inside the Docker network: `http://majestic-online-parser` (port 80). Locally: `http://localhost:4444`.

| Method | Path                    | Description                          |
| ------ | ----------------------- | ------------------------------------ |
| GET    | `/online`               | Both projects                       |
| GET    | `/online/majestic-rp`   | Majestic RP only                     |
| GET    | `/online/russia-online` | Russia Online only                   |

### Response envelope

```json
{
  "status": "ok",
  "meta": {
    "respondedAt": "2026-11-21T01:52:26.074Z",
    "cachedAt": "2026-11-21T01:52:23.062Z",
    "isStale": false
  },
  "data": { }
}
```

| Field                | Type    | Description                                             |
| -------------------- | ------- | ------------------------------------------------------- |
| `meta.respondedAt`   | string  | Time the response was generated                         |
| `meta.cachedAt`      | string  | Time the snapshot was last refreshed from upstream      |
| `meta.isStale`       | boolean | `true` when `cachedAt` is older than 60 s               |
| `data`               | object  | `OnlineSnapshot` (all) or a single snapshot (per-project)|

### `OnlineSnapshot`

```json
{
  "servers": [ { "id": "ru1", "name": "...", "statusText": "online", "...": "..." } ],
  "players": 1234,
  "peakToday": 1500,
  "peakYesterday": 1400,
  "peakTodayRelativePercent": 7.5,
  "peakAllTime": 9999,
  "peakAllTimeDate": "2023-07-07T00:00:00.000Z",
  "globalPeakAllTime": 12000,
  "globalPeakAllTimeDate": "2023-07-07T00:00:00.000Z"
}
```

### `Server`

Key fields: `id`, `benefitId`, `name`, `branch` (`release`), `ip` (masterlist join address), `region` (`ru`/`en`), `project` (`majestic`/`russiaonline`), `country` (`ru`/`de`/`pl`), `status` (boolean), `statusText` (`online`/`offline`/`tech-works`), `techWorks`, `isRegOpened` (`yes`/`no`), `extras`, `players`, `activePlayers` (`players + queuedPlayers`), `queuedPlayers`, `peakAllTime`, `peakAllTimeDate`.

Full type definitions: `src/types/index.ts`.

## Configuration

All tunables live in `src/config/index.ts`; environment overrides:

| Variable | Default | Description                        |
| -------- | ------- | ---------------------------------- |
| `PORT`   | `4444`  | Listen port                        |
| `NODE_ENV` | —     | `production` enables prod logging  |

Fixed constants: `refreshInterval` = 15 s, `cache.staleThreshold` = 60 s, upstream timeout = 5 s, `maxRedirects` = 0.

## Development

Prerequisites: [Bun](https://bun.sh) >= 1.1.

```bash
bun install          # install dependencies (writes bun.lock)
bun run dev          # watch mode, pretty logs, request logging enabled
bun run build        # typecheck / emit to dist/
bun run start        # run compiled dist/main.js
```

Package manager is **Bun only** — `pnpm-lock.yaml`/`package-lock.json` are not used.

## Docker

Multi-stage `Dockerfile` (`oven/bun:1.4.5-alpine`): production deps installed with `bun install --production --frozen-lockfile`, runtime runs as the non-root `bun` user.

```bash
# Base config only — no published ports, API reachable inside majestic-online-network
docker compose -f docker-compose.yml up -d --build

# Default invocation — additionally merges docker-compose.override.yml when present.
# With the local override used for development this publishes 4444:80 on the host.
docker compose up -d --build
```

Note: `docker compose up` auto-loads `docker-compose.override.yml` **if the file exists**. On a fresh clone (or on a server without one) nothing is published and the API is only reachable inside the Docker network.

Deployment notes:

- The service listens on port **80 inside the container** (`PORT=80` in `docker-compose.yml`), so consumers use `http://majestic-online-parser/...` with no port.
- `net.ipv4.ip_unprivileged_port_start=0` sysctl allows the non-root user to bind port 80.
- The base compose file publishes **no ports** — the API is reachable only inside the `majestic-online-network` Docker network. Consumers in other compose projects must attach to that network (`external: true`) and use the container/service name as host.
- `docker-compose.override.yml` is **not tracked in git** by design. Compose auto-loads it when present, so each environment keeps its own local overrides (port publishing, volumes, env vars) without touching the base config or blocking upstream updates. Create your own override for custom setups, or pass additional files via `-f`.
- Request logging is disabled in production (`disableRequestLogging`); only startup messages and errors reach stdout.

## Project structure

```
src/
  main.ts                  # bootstrap entrypoint
  server.ts                # Fastify instance + DI wiring
  config/index.ts          # env-driven configuration
  routes/index.ts          # route registration
  controllers/             # HTTP layer (thin, cache reads only)
  services/
    fetch.service.ts       # upstream HTTP client
    decode.service.ts      # payload normalization
    cache.service.ts       # polling loop + snapshot store
  types/index.ts           # domain types + upstream DTO guards
  utils/checksum.ts        # change detection for cache dedup
```

## Operational notes

- Upstream APIs are external dependencies; this service degrades gracefully (stale cache) but cannot produce fresh data during a wiki outage.
- No authentication or rate limiting is implemented — the API is intended for trusted internal consumers only. Do not publish the port publicly.
- Health signal for monitoring: `meta.isStale` in any response, or HTTP 200 with empty `servers` arrays during upstream outages.
