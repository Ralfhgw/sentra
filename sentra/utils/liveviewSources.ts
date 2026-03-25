import sql from "@/utils/db";

export type LiveViewSourceKind = "catalog" | "custom_hls" | "mediamtx_rtsp";
export type LiveViewTransport = "tcp" | "udp" | "automatic";

export type ClientLiveViewChannel = {
  name: string;
  url: string;
  location: string;
};

type UpsertLiveViewSourceInput = {
  userId: string;
  slotId: number;
  sourceKind: LiveViewSourceKind;
  displayName: string;
  sourceUrl: string | null;
  channelId: string | null;
  mediamtxPath: string | null;
  transport: LiveViewTransport;
};

type ExistingSourceRow = {
  source_kind: LiveViewSourceKind;
  mediamtx_path: string | null;
};

type RebuildRow = {
  slot_id: number;
  source_kind: LiveViewSourceKind;
  display_name: string | null;
  source_url: string | null;
  mediamtx_path: string | null;
  channel_name: string | null;
  location: string | null;
  stream_url: string | null;
};

type RtspReconcileRow = {
  mediamtx_path: string | null;
  source_url: string | null;
  transport: LiveViewTransport | null;
};

export function normalizeLiveViewSourceUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (!/^rtsps?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return trimmed.split("#")[0];
  }
}

export function detectSourceKind(input: {
  channelId?: string | null;
  url?: string | null;
}): LiveViewSourceKind {
  const url = input.url?.trim() ?? "";

  if (input.channelId) {
    return "catalog";
  }

  if (/^rtsps?:\/\//i.test(url)) {
    return "mediamtx_rtsp";
  }

  if (/^https?:\/\//i.test(url)) {
    return "custom_hls";
  }

  throw new Error("Unbekannter Stream-Typ.");
}

export async function swapLiveViewSlots(
  userId: string,
  fromSlotId: number,
  toSlotId: number
) {
  const tempSlotId = 2147483647;

  await sql.begin(async (tx) => {
    const db = tx as unknown as typeof sql;

    await db`
      UPDATE liveview_sources
      SET slot_id = ${tempSlotId}
      WHERE user_id = ${userId}::uuid
        AND slot_id = ${fromSlotId}
    `;

    await db`
      UPDATE liveview_sources
      SET slot_id = ${fromSlotId}
      WHERE user_id = ${userId}::uuid
        AND slot_id = ${toSlotId}
    `;

    await db`
      UPDATE liveview_sources
      SET slot_id = ${toSlotId}
      WHERE user_id = ${userId}::uuid
        AND slot_id = ${tempSlotId}
    `;
  });

  return rebuildUserChannels(userId);
}

export function buildMediamtxPath(userId: string, slotId: number) {
  return `lv_${userId.replace(/-/g, "")}_${slotId}`;
}

function getMediaMtxApiBaseUrl() {
  return ("http://127.0.0.1:9997").replace(/\/$/, "");
}

function getMediaMtxHlsBaseUrl() {
  return ("http://127.0.0.1:8888").replace(/\/$/, "");
}

function getMediaMtxHeaders() {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  const user = "admin";
  const pass = "password";

  if (user && pass) {
    headers.set(
      "Authorization",
      `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`
    );
  }

  return headers;
}

export async function getExistingLiveViewSource(userId: string, slotId: number) {
  const [row] = await sql<ExistingSourceRow[]>`
    SELECT source_kind, mediamtx_path
    FROM liveview_sources
    WHERE user_id = ${userId}::uuid
      AND slot_id = ${slotId}
    LIMIT 1
  `;

  return row ?? null;
}

export async function upsertLiveViewSource(input: UpsertLiveViewSourceInput) {
  await sql`
    INSERT INTO liveview_sources (
      user_id,
      slot_id,
      source_kind,
      display_name,
      source_url,
      channel_id,
      mediamtx_path,
      transport,
      enabled
    )
    VALUES (
      ${input.userId}::uuid,
      ${input.slotId},
      ${input.sourceKind},
      ${input.displayName || null},
      ${input.sourceUrl},
      ${input.channelId ? sql`${input.channelId}::uuid` : null},
      ${input.mediamtxPath},
      ${input.transport},
      true
    )
    ON CONFLICT (user_id, slot_id) DO UPDATE SET
      source_kind = EXCLUDED.source_kind,
      display_name = EXCLUDED.display_name,
      source_url = EXCLUDED.source_url,
      channel_id = EXCLUDED.channel_id,
      mediamtx_path = EXCLUDED.mediamtx_path,
      transport = EXCLUDED.transport,
      enabled = EXCLUDED.enabled,
      updated_at = now()
  `;
}

export async function deleteLiveViewSource(userId: string, slotId: number) {
  await sql`
    DELETE FROM liveview_sources
    WHERE user_id = ${userId}::uuid
      AND slot_id = ${slotId}
  `;
}

export async function syncRtspPathInMediaMtx(input: {
  pathName: string;
  sourceUrl: string;
  transport: LiveViewTransport;
}) {
  const payload = {
    source: input.sourceUrl,
    rtspTransport: input.transport,
  };

  const baseUrl = getMediaMtxApiBaseUrl();
  const headers = getMediaMtxHeaders();

  const addResponse = await fetch(
    `${baseUrl}/v3/config/paths/add/${encodeURIComponent(input.pathName)}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

  if (addResponse.ok) {
    return;
  }

  const addMessage = await addResponse.text().catch(() => "");
  const shouldTryPatch =
    addResponse.status === 400 ||
    addResponse.status === 409 ||
    /already exists/i.test(addMessage);

  if (!shouldTryPatch) {
    throw new Error(
      `MediaMTX-Pfad konnte nicht angelegt werden: path=${input.pathName} | transport=${input.transport} | status=${addResponse.status} | statusText=${addResponse.statusText} | body=${addMessage || "<empty>"}`
    );
  }

  const patchResponse = await fetch(
    `${baseUrl}/v3/config/paths/patch/${encodeURIComponent(input.pathName)}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

  if (!patchResponse.ok) {
    const patchMessage = await patchResponse.text().catch(() => "");
    throw new Error(
      `MediaMTX-Pfad konnte nicht gespeichert werden: path=${input.pathName} | transport=${input.transport} | status=${patchResponse.status} | statusText=${patchResponse.statusText} | body=${patchMessage || "<empty>"}`
    );
  }
}

export async function deleteRtspPathFromMediaMtx(pathName: string) {
  const response = await fetch(
    `${getMediaMtxApiBaseUrl()}/v3/config/paths/delete/${encodeURIComponent(pathName)}`,
    {
      method: "DELETE",
      headers: getMediaMtxHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok && response.status !== 404) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `MediaMTX-Pfad konnte nicht gelöscht werden (${response.status}): ${message}`
    );
  }
}

export async function removeLiveViewSlot(userId: string, slotId: number) {
  const existing = await getExistingLiveViewSource(userId, slotId);

  if (
    existing?.source_kind === "mediamtx_rtsp" &&
    existing.mediamtx_path
  ) {
    await deleteRtspPathFromMediaMtx(existing.mediamtx_path);
  }

  await deleteLiveViewSource(userId, slotId);

  return rebuildUserChannels(userId);
}

export async function rebuildUserChannels(userId: string) {
  const rows = await sql<RebuildRow[]>`
    SELECT
      lvs.slot_id,
      lvs.source_kind,
      lvs.display_name,
      lvs.source_url,
      lvs.mediamtx_path,
      ch.channel AS channel_name,
      ch.location,
      ch.stream_url
    FROM liveview_sources lvs
    LEFT JOIN channels ch
      ON ch.id = lvs.channel_id
    WHERE lvs.user_id = ${userId}::uuid
      AND lvs.enabled = true
    ORDER BY lvs.slot_id ASC
  `;

  const maxSlotId = rows.reduce(
    (max, row) => Math.max(max, row.slot_id),
    -1
  );

  const channels: ClientLiveViewChannel[] = Array.from(
    { length: maxSlotId + 1 },
    () => ({ name: "", url: "", location: "" })
  );

  for (const row of rows) {
    let playbackUrl = "";

    if (row.source_kind === "catalog") {
      playbackUrl = row.stream_url ?? "";
    } else if (row.source_kind === "custom_hls") {
      playbackUrl = row.source_url ?? "";
    } else if (row.mediamtx_path) {
      playbackUrl = `${getMediaMtxHlsBaseUrl()}/${row.mediamtx_path}/index.m3u8`;
    }

    channels[row.slot_id] = {
      name: row.display_name ?? row.channel_name ?? "",
      url: playbackUrl,
      location: row.location ?? "",
    };
  }

  await sql`
    UPDATE user_settings
    SET channels = ${sql.json(channels)}::jsonb
    WHERE user_id = ${userId}::uuid
  `;

  return channels;
}

export async function reconcileAllLiveViewRtspSources() {
  const rows = await sql<RtspReconcileRow[]>`
    SELECT mediamtx_path, source_url, transport
    FROM liveview_sources
    WHERE source_kind = 'mediamtx_rtsp'
      AND enabled = true
      AND mediamtx_path IS NOT NULL
      AND source_url IS NOT NULL
  `;

  for (const row of rows) {
    try {
      await syncRtspPathInMediaMtx({
        pathName: row.mediamtx_path!,
        sourceUrl: row.source_url!,
        transport: row.transport ?? "tcp",
      });

      await waitForMediaMtxHlsReady(row.mediamtx_path!);
    } catch (error) {
      console.warn(
        `[liveview] reconcile failed for path ${row.mediamtx_path}: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForMediaMtxHlsReady(
  pathName: string,
  timeoutMs = 15000
) {
  const manifestUrl = `${getMediaMtxHlsBaseUrl()}/${pathName}/index.m3u8`;
  const deadline = Date.now() + timeoutMs;
  let lastStatus = "unbekannt";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(manifestUrl, {
        cache: "no-store",
      });

      if (response.ok) {
        const text = await response.text();
        if (text.includes("#EXTM3U")) {
          return;
        }
        lastStatus = "Manifest ohne #EXTM3U";
      } else {
        lastStatus = `HTTP ${response.status}`;
      }
    } catch (error) {
      lastStatus =
        error instanceof Error ? error.message : "Request fehlgeschlagen";
    }

    await sleep(500);
  }

  throw new Error(
    `MediaMTX-HLS war nicht rechtzeitig bereit (${lastStatus}).`
  );
}
