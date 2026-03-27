import postgres from "postgres";
import { config } from "../config";

export const sql = postgres(config.databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

export async function closeDb() {
  await sql.end({ timeout: 5 });
}
