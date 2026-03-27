import os from "node:os";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric env value: ${value}`);
  }

  return parsed;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 3011),
  databaseUrl: requireEnv("DATABASE_URL"),
  liveTalkJwtSecret: requireEnv("LIVETALK_JWT_SECRET"),
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean),
  listenIp: process.env.MEDIASOUP_LISTEN_IP ?? "0.0.0.0",
  announcedIp: requireEnv("MEDIASOUP_ANNOUNCED_IP"),
  rtcMinPort: toNumber(process.env.MEDIASOUP_RTC_MIN_PORT, 40000),
  rtcMaxPort: toNumber(process.env.MEDIASOUP_RTC_MAX_PORT, 40100),
  workerCount: toNumber(process.env.MEDIASOUP_WORKER_COUNT, Math.max(1, Math.min(2, os.cpus().length))),
  chatHistoryLimit: toNumber(process.env.CHAT_HISTORY_LIMIT, 50)
};
