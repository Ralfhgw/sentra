import postgres from "postgres";

type SqlClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as { sql?: SqlClient };

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

function createSqlClient(): SqlClient {
  const postgresUrl = process.env.POSTGRES_URL;

  if (!postgresUrl) {
    throw new Error("Missing POSTGRES_URL env var");
  }

  return postgres(postgresUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: shouldRequireSsl(postgresUrl) ? "require" : false,
  });
}

function getSqlClient(): SqlClient {
  if (globalForDb.sql) {
    return globalForDb.sql;
  }

  const client = createSqlClient();

  if (process.env.NODE_ENV !== "production") {
    globalForDb.sql = client;
  }

  return client;
}

const sql = new Proxy((() => undefined) as unknown as SqlClient, {
  apply(_target, thisArg, argArray) {
    const client = getSqlClient() as unknown as (...args: unknown[]) => unknown;
    return Reflect.apply(client, thisArg, argArray);
  },
  get(_target, prop) {
    const client = getSqlClient() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as SqlClient;

export default sql;
