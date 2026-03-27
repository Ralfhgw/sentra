import "dotenv/config";
import http from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { config } from "./config";
import { RoomsStore } from "./domain/roomsStore";
import { createWorkerPool } from "./mediasoup/createWorkers";
import { closeDb } from "./persistence/db";
import { registerHandlers } from "./socket/registerHandlers";

async function bootstrap() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true
    })
  );

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "livetalk",
      port: config.port
    });
  });

  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      credentials: true
    }
  });

  const workerPool = await createWorkerPool();
  const roomsStore = new RoomsStore(workerPool);

  registerHandlers(io, roomsStore);

  httpServer.listen(config.port, () => {
    console.log(`[livetalk] listening on :${config.port}`);
    console.log(`[livetalk] announced ip: ${config.announcedIp}`);
  });

  const shutdown = async () => {
    console.log("[livetalk] shutting down");
    io.close();
    httpServer.close();
    await workerPool.closeAll();
    await closeDb();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  console.error("[livetalk] bootstrap failed", error);
  process.exit(1);
});
