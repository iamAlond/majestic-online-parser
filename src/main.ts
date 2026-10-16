import axios from "axios"
import Fastify from "fastify"
import {
  BehaviorSubject,
  catchError,
  distinctUntilChanged,
  switchMap,
  timer,
} from "rxjs"
import {
  DEFAULT_FALLBACK_DATE,
  createEmptySnapshot,
  decodeSnapshot,
} from "./decodes.js"
import {
  isWikiApiResponseSuccess,
  type OnlineSnapshot,
  type WikiApiResponseDto,
} from "./types.js"

const isProduction = process.env["NODE_ENV"] === "production"

const app = Fastify({
  logger: {
    level: isProduction ? "info" : "debug",
    transport: !isProduction
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  },
})

const REFRESH_INTERVAL = 15 * 1000
const MAJESTIC_RP_WIKI_API_URL = "https://wiki.majestic-rp.ru/api/online"
const RUSSIA_ONLINE_WIKI_API_URL = "https://wiki.russia.online/api/online"

const cache = new BehaviorSubject<{
  majesticRP: OnlineSnapshot
  russiaOnline: OnlineSnapshot
  lastUpdatedAt: string
}>({
  majesticRP: createEmptySnapshot(),
  russiaOnline: createEmptySnapshot(),
  lastUpdatedAt: DEFAULT_FALLBACK_DATE,
})

async function fetchMajesticApi(url: string): Promise<unknown | null> {
  try {
    const { data } = await axios.get<WikiApiResponseDto<unknown>>(url, {
      headers: {
        "Accepted-Language": "ru",
        "Cache-control": "no-cache",
      },
      maxRedirects: 0,
      timeout: 5000,
    })

    if (isWikiApiResponseSuccess(data)) {
      return data.data
    }

    return null
  } catch (err: unknown) {
    app.log.error(`Failed to fetch url: ${url}, err: ${err}`)
    return null
  }
}

function getSnapshotChecksum(snapshot: OnlineSnapshot): string {
  if (!snapshot || snapshot.servers.length === 0) return ""

  const serversPart = snapshot.servers
    .map((s) => `${s.id}:${s.statusText}:${s.players}:${s.queuedPlayers}`)
    .join(",")

  return `${snapshot.players}-${serversPart}`
}

timer(0, REFRESH_INTERVAL)
  .pipe(
    switchMap(async () => {
      app.log.debug("Fetch online from wiki api's")

      const [rawMajesticRP, rawRussiaOnline] = await Promise.all([
        fetchMajesticApi(MAJESTIC_RP_WIKI_API_URL),
        fetchMajesticApi(RUSSIA_ONLINE_WIKI_API_URL),
      ])

      const majesticRP = decodeSnapshot(rawMajesticRP, "majestic")
      const russiaOnline = decodeSnapshot(rawRussiaOnline, "russiaonline")

      return {
        majesticRP: majesticRP,
        russiaOnline: russiaOnline,
        checksums: {
          majestic: getSnapshotChecksum(majesticRP),
          russia: getSnapshotChecksum(russiaOnline),
        },
      }
    }),
    distinctUntilChanged((prev, curr) => {
      if (
        curr.majesticRP.servers.length === 0 &&
        curr.russiaOnline.servers.length === 0
      ) {
        return true
      }

      return (
        prev.checksums.majestic === curr.checksums.majestic &&
        prev.checksums.russia === curr.checksums.russia
      )
    }),
    catchError((_err, caught) => caught),
  )
  .subscribe(({ majesticRP, russiaOnline }) => {
    const current = cache.getValue()

    cache.next({
      majesticRP: majesticRP || current.majesticRP,
      russiaOnline: russiaOnline || current.russiaOnline,
      lastUpdatedAt: new Date().toISOString(),
    })

    app.log.debug("Online cache updated successfully")
  })

function successResponse<T>(data: T, lastUpdatedAt: string) {
  const nowIsoString = new Date().toISOString()
  const isStale = Date.now() - Date.parse(lastUpdatedAt) > 60000

  return {
    status: "ok" as const,
    meta: {
      respondedAt: nowIsoString,
      cachedAt: lastUpdatedAt,
      isStale: isStale,
    },
    data: data,
  }
}

app.get("/online", async () => {
  const { lastUpdatedAt, ...rest } = cache.getValue()

  return successResponse(rest, lastUpdatedAt)
})

app.get("/online/majestic-rp", async () => {
  const { majesticRP, lastUpdatedAt } = cache.getValue()

  return successResponse(majesticRP, lastUpdatedAt)
})

app.get("/online/russia-online", async () => {
  const { russiaOnline, lastUpdatedAt } = cache.getValue()

  return successResponse(russiaOnline, lastUpdatedAt)
})

async function bootstrap() {
  try {
    await app.listen({ port: 4444, host: "0.0.0.0" })

    app.log.info(
      "Majestic Online Parser started on port 4444 and listen host 0.0.0.0",
    )
  } catch (err) {
    app.log.error(`Fatal during bootstrap(): ${err}`)
    process.exit(1)
  }
}

void bootstrap()
