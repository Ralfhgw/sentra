import postgres from "postgres";

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

function shouldRequireSsl(urlValue: string): boolean {
  const explicit = process.env.POSTGRES_SSL?.toLowerCase();

  if (explicit === "require" || explicit === "true" || explicit === "1") {
    return true;
  }

  if (explicit === "disable" || explicit === "false" || explicit === "0") {
    return false;
  }

  try {
    const parsed = new URL(urlValue);
    const host = parsed.hostname.toLowerCase();

    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "db" ||
      host === "postgres"
    ) {
      return false;
    }
  } catch {
    // Fallback to previous default if URL parsing fails.
  }

  return true;
}

const postgresUrl = process.env.POSTGRES_URL;

if (!postgresUrl) {
  throw new Error("Missing POSTGRES_URL env var");
}

const sql =
  globalForDb.sql ||
  postgres(postgresUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: shouldRequireSsl(postgresUrl) ? "require" : false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export default sql;