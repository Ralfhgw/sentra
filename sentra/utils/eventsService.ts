import { getEvents } from "@/app/api/events/getEvents";
import type { EventRefreshInterval } from "@/types/typesSettings";
import { getUserSettings } from "@/utils/serverAuth";
import sql from "@/utils/db";
import type { ReservedSql } from "postgres";

const PRIMARY_SOURCE_KEY = "serpapi:primary";
const inFlightRefreshes = new Map<string, Promise<void>>();

type RefreshStateRow = {
  cache_key: string | null;
  next_refresh_at: string | null;
};

type DbConnection = typeof sql | ReservedSql<Record<string, never>>;

function addInterval(date: Date, interval: EventRefreshInterval) {
  const next = new Date(date);

  switch (interval) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 1);
      break;
  }

  return next;
}

function getLookaheadDays(interval: EventRefreshInterval) {
  switch (interval) {
    case "weekly":
      return 14;
    case "monthly":
      return 60;
    default:
      return 2;
  }
}


function buildPrimaryCacheKey(settings: Awaited<ReturnType<typeof getUserSettings>>) {
  return JSON.stringify({
    town: settings.town ?? "",
    evt: settings.evt,
    key1: settings.key1 ?? "",
    eventRefreshInterval: settings.eventRefreshInterval,
  });
}

async function getStoredEventCount(userId: string) {
  const [row] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM events
    WHERE user_id = ${userId}::uuid
  `;

  return row?.count ?? 0;
}

async function readPrimaryRefreshState(userId: string) {
  const [row] = await sql<RefreshStateRow[]>`
    SELECT cache_key, next_refresh_at
    FROM user_event_refresh_state
    WHERE user_id = ${userId}::uuid
      AND source_key = ${PRIMARY_SOURCE_KEY}
    LIMIT 1
  `;

  return row ?? null;
}

async function tryAcquireLock(db: DbConnection, lockKey: string) {
  const [row] = await db<{ locked: boolean }[]>`
    SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS locked
  `;

  return row?.locked ?? false;
}

async function releaseLock(db: DbConnection, lockKey: string) {
  await db`
    SELECT pg_advisory_unlock(hashtext(${lockKey}))
  `;
}

async function markRefreshRunning(userId: string, cacheKey: string) {
  await sql`
    INSERT INTO user_event_refresh_state (
      user_id,
      source_key,
      source_kind,
      cache_key,
      refresh_started_at,
      last_status,
      last_error
    )
    VALUES (
      ${userId}::uuid,
      ${PRIMARY_SOURCE_KEY},
      'serpapi',
      ${cacheKey},
      NOW(),
      'running',
      NULL
    )
    ON CONFLICT (user_id, source_key)
    DO UPDATE SET
      source_kind = EXCLUDED.source_kind,
      cache_key = EXCLUDED.cache_key,
      refresh_started_at = EXCLUDED.refresh_started_at,
      last_status = EXCLUDED.last_status,
      last_error = NULL
  `;
}

async function markRefreshSuccess(
  userId: string,
  cacheKey: string,
  nextRefreshAt: Date
) {
  await sql`
    INSERT INTO user_event_refresh_state (
      user_id,
      source_key,
      source_kind,
      cache_key,
      last_refreshed_at,
      next_refresh_at,
      refresh_started_at,
      last_status,
      last_error
    )
    VALUES (
      ${userId}::uuid,
      ${PRIMARY_SOURCE_KEY},
      'serpapi',
      ${cacheKey},
      NOW(),
      ${nextRefreshAt.toISOString()}::timestamptz,
      NULL,
      'success',
      NULL
    )
    ON CONFLICT (user_id, source_key)
    DO UPDATE SET
      source_kind = EXCLUDED.source_kind,
      cache_key = EXCLUDED.cache_key,
      last_refreshed_at = EXCLUDED.last_refreshed_at,
      next_refresh_at = EXCLUDED.next_refresh_at,
      refresh_started_at = NULL,
      last_status = EXCLUDED.last_status,
      last_error = NULL
  `;
}

async function markRefreshError(userId: string, cacheKey: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unbekannter Event-Refresh-Fehler";

  await sql`
    INSERT INTO user_event_refresh_state (
      user_id,
      source_key,
      source_kind,
      cache_key,
      refresh_started_at,
      last_status,
      last_error
    )
    VALUES (
      ${userId}::uuid,
      ${PRIMARY_SOURCE_KEY},
      'serpapi',
      ${cacheKey},
      NULL,
      'error',
      ${message}
    )
    ON CONFLICT (user_id, source_key)
    DO UPDATE SET
      source_kind = EXCLUDED.source_kind,
      cache_key = EXCLUDED.cache_key,
      refresh_started_at = NULL,
      last_status = EXCLUDED.last_status,
      last_error = EXCLUDED.last_error
  `;
}

async function refreshPrimaryEvents(userId: string, settings?: Awaited<ReturnType<typeof getUserSettings>>) {
  const resolvedSettings = settings ?? await getUserSettings(userId);

  if (!resolvedSettings.evt || !resolvedSettings.town || !resolvedSettings.key1) {
    return;
  }

  const cacheKey = buildPrimaryCacheKey(resolvedSettings);
  const lockKey = `events:${userId}:${PRIMARY_SOURCE_KEY}`;
  const lockConnection = await sql.reserve();
  const locked = await tryAcquireLock(lockConnection, lockKey);

  if (!locked) {
    lockConnection.release();
    return;
  }

  try {
    await markRefreshRunning(userId, cacheKey);

    const lookaheadDays = getLookaheadDays(resolvedSettings.eventRefreshInterval);
    for (let offset = 0; offset < lookaheadDays; offset += 1) {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      const dayString = date.toISOString().slice(0, 10);
      await getEvents(userId, resolvedSettings.town, dayString);
    }

    await markRefreshSuccess(
      userId,
      cacheKey,
      addInterval(new Date(), resolvedSettings.eventRefreshInterval)
    );
  } catch (error) {
    await markRefreshError(userId, cacheKey, error);
    throw error;
  } finally {
    try {
      await releaseLock(lockConnection, lockKey);
    } finally {
      lockConnection.release();
    }
  }
}

function runSingleFlight(key: string, work: () => Promise<void>) {
  const existing = inFlightRefreshes.get(key);
  if (existing) {
    return existing;
  }

  const promise = work().finally(() => {
    inFlightRefreshes.delete(key);
  });

  inFlightRefreshes.set(key, promise);
  return promise;
}

export async function ensureFreshEventsForUser(userId: string) {
  const settings = await getUserSettings(userId);

  if (!settings.evt || !settings.town || !settings.key1) {
    return;
  }

  const [eventCount, state] = await Promise.all([
    getStoredEventCount(userId),
    readPrimaryRefreshState(userId),
  ]);

  const cacheKey = buildPrimaryCacheKey(settings);
  const nextRefreshDue =
    !state?.next_refresh_at || new Date(state.next_refresh_at).getTime() <= Date.now();
  const cacheKeyChanged = state?.cache_key !== cacheKey;
  const shouldRefresh = eventCount === 0 || cacheKeyChanged || nextRefreshDue;

  if (!shouldRefresh) {
    return;
  }

  await runSingleFlight(`${userId}:${PRIMARY_SOURCE_KEY}`, () =>
    refreshPrimaryEvents(userId, settings)
  );
}

export async function warmEventsForUser(userId: string) {
  await ensureFreshEventsForUser(userId);
}

export async function invalidatePrimaryEventRefreshState(userId: string) {
  await sql`
    DELETE FROM user_event_refresh_state
    WHERE user_id = ${userId}::uuid
      AND source_key = ${PRIMARY_SOURCE_KEY}
  `;
}
