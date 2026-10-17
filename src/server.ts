import Fastify from "fastify";
import { config } from "./config/index.js";
import { FetchService } from "./services/fetch.service.js";
import { DecodeService } from "./services/decode.service.js";
import { CacheService } from "./services/cache.service.js";
import { OnlineController } from "./controllers/online.controller.js";
import { registerRoutes } from "./routes/index.js";

export async function createServer() {
  const app = Fastify({
    logger: {
      level: config.logger.level,
      transport: !config.isProduction
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    },
  });

  const fetchService = new FetchService(app.log);
  const decodeService = new DecodeService();
  const cacheService = new CacheService(app.log, fetchService, decodeService);
  const onlineController = new OnlineController(cacheService);

  await registerRoutes(app, onlineController);

  return app;
}
