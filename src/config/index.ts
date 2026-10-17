export const config = {
  isProduction: process.env["NODE_ENV"] === "production",
  server: {
    port: 4444,
    host: "0.0.0.0",
  },
  refreshInterval: 15 * 1000,
  api: {
    majesticRP: "https://wiki.majestic-rp.ru/api/online",
    russiaOnline: "https://wiki.russia.online/api/online",
  },
  cache: {
    staleThreshold: 60 * 1000,
  },
  http: {
    timeout: 5000,
    maxRedirects: 0,
  },
  logger: {
    level: process.env["NODE_ENV"] === "production" ? "info" : "debug",
  },
} as const;
