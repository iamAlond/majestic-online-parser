import type { FastifyInstance } from "fastify";
import { OnlineController } from "../controllers/online.controller.js";

export async function registerRoutes(
  app: FastifyInstance,
  onlineController: OnlineController,
) {
  app.get("/online", (req, reply) => onlineController.getAllOnline(req, reply));

  app.get("/online/majestic-rp", (req, reply) =>
    onlineController.getMajesticRP(req, reply),
  );

  app.get("/online/russia-online", (req, reply) =>
    onlineController.getRussiaOnline(req, reply),
  );
}
