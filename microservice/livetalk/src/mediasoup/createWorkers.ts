import * as mediasoup from "mediasoup";
import type { Worker } from "mediasoup/node/lib/types";
import { config } from "../config";

export const mediaCodecs: mediasoup.types.RouterOptions["mediaCodecs"] = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {}
  }
];

export type WorkerPool = {
  nextWorker(): Worker;
  closeAll(): Promise<void>;
};

export async function createWorkerPool(): Promise<WorkerPool> {
  const totalPorts = config.rtcMaxPort - config.rtcMinPort + 1;
  const workerCount = Math.max(1, config.workerCount);

  if (totalPorts < workerCount * 20) {
    throw new Error("RTC port range is too small for the requested worker count.");
  }

  const span = Math.floor(totalPorts / workerCount);
  const workers: Worker[] = [];

  for (let i = 0; i < workerCount; i += 1) {
    const min = config.rtcMinPort + i * span;
    const max = i === workerCount - 1 ? config.rtcMaxPort : min + span - 1;

    const worker = await mediasoup.createWorker({
      rtcMinPort: min,
      rtcMaxPort: max,
      logLevel: "warn"
    });

    worker.on("died", () => {
      console.error(`[livetalk] mediasoup worker died (${min}-${max})`);
      process.exit(1);
    });

    workers.push(worker);
  }

  let current = 0;

  return {
    nextWorker() {
      const worker = workers[current % workers.length];
      current += 1;
      return worker;
    },
    async closeAll() {
      for (const worker of workers) {
        worker.close();
      }
    }
  };
}
