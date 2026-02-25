import postgres from "postgres";

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

const sql =
  globalForDb.sql ||
  postgres(process.env.POSTGRES_URL!, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: "require",
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export default sql;