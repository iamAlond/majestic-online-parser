import { config } from "./config/index.js";
import { createServer } from "./server.js";

async function bootstrap() {
  try {
    const app = await createServer();
    await app.listen({ port: config.server.port, host: config.server.host });

    app.log.info(
      `Majestic Online Parser started on port ${config.server.port} and listen host ${config.server.host}`,
    );
  } catch (err) {
    console.error(`Fatal during bootstrap(): ${err}`);
    process.exit(1);
  }
}

void bootstrap();
