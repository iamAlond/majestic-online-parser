import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/index.js";
import { CacheService } from "../services/cache.service.js";

export class OnlineController {
  constructor(private readonly cacheService: CacheService) {}

  public getAllOnline(_req: FastifyRequest, reply: FastifyReply) {
    const { lastUpdatedAt, ...rest } = this.cacheService.getValue();

    return reply.send(this.successResponse(rest, lastUpdatedAt));
  }

  public getMajesticRP(_req: FastifyRequest, reply: FastifyReply) {
    const { majesticRP, lastUpdatedAt } = this.cacheService.getValue();

    return reply.send(this.successResponse(majesticRP, lastUpdatedAt));
  }

  public getRussiaOnline(_req: FastifyRequest, reply: FastifyReply) {
    const { russiaOnline, lastUpdatedAt } = this.cacheService.getValue();

    return reply.send(this.successResponse(russiaOnline, lastUpdatedAt));
  }

  private successResponse<T>(data: T, lastUpdatedAt: string) {
    const nowIsoString = new Date().toISOString();
    const isStale =
      Date.now() - Date.parse(lastUpdatedAt) > config.cache.staleThreshold;

    return {
      status: "ok" as const,
      meta: {
        respondedAt: nowIsoString,
        cachedAt: lastUpdatedAt,
        isStale: isStale,
      },
      data: data,
    };
  }
}
