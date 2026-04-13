import { Suspense } from "react";
export const dynamic = 'force-dynamic';
import ProtectedRoute from "@/components/ProtectedRoute";
import WebcamClient from "@/components/LiveViewClient";
import sql from "@/utils/db";
import { getAuthenticatedUserWithSettingsFromCookies } from "@/utils/serverAuth";
import type { Channel } from "@/types/typesLiveView";
import { reconcileAllLiveViewRtspSources } from "@/utils/liveviewSources";

type RawChannel = Omit<Channel, "isFavorite" | "isHidden">;

async function getWebcams() {
  try {
    const { settings } = await getAuthenticatedUserWithSettingsFromCookies();

    if (!settings.mtx) {
      return {
        mtxEnabled: false,
        channels: [] as Channel[],
        userChannels: settings.channels,
        error: undefined as string | undefined,
      };
    }

    try {
      await reconcileAllLiveViewRtspSources();
    } catch (error) {
      console.warn(
        `[liveview] reconcile failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const channelsResult = await sql<RawChannel[]>`
        SELECT
          id::text AS id,
          tvg_name,
          tvg_id,
          "group",
          location,
          channel,
          stream_url,
          created_at::text AS created_at
        FROM channels
        ORDER BY created_at DESC
      `;

      const preferenceMap = new Map(
        settings.liveviewChannelPreferences.map((entry) => [
          entry.channelId,
          entry,
        ])
      );

      const channels = Array.from(channelsResult)
        .filter((channel) => preferenceMap.get(channel.id)?.deleted !== true)
        .map((channel) => ({
          ...channel,
          isFavorite: preferenceMap.get(channel.id)?.isFavorite === true,
          isHidden: preferenceMap.get(channel.id)?.hidden === true,
        }))
        .sort(
          (a, b) =>
            Number(b.isFavorite) - Number(a.isFavorite) ||
            (a.channel || "").localeCompare(b.channel || "", undefined, {
              sensitivity: "base",
            })
        );

      return {
        mtxEnabled: true,
        channels,
        userChannels: settings.channels,
        error: undefined as string | undefined,
      };
    } catch (err) {
      console.error("[DB] Fehlerfall:", err);

      return {
        mtxEnabled: true,
        channels: [] as Channel[],
        userChannels: settings.channels,
        error: "Fehler beim Laden der Webcams.",
      };
    }
  } catch (err) {
    console.error("[Auth] Fehlerfall:", err);

    return {
      mtxEnabled: false,
      channels: [] as Channel[],
      userChannels: [],
      error: "Fehler beim Laden der Webcams.",
    };
  }
}

export default async function Webcams() {
  const { channels, userChannels, mtxEnabled } = await getWebcams();

  return (
    <>
      <ProtectedRoute>
        <div className="fixed inset-0 bg-gray-400 -z-10" />
        <Suspense fallback={<div>Loading...</div>}>
          <WebcamClient
            channels={channels}
            userChannels={userChannels}
            mtxEnabled={mtxEnabled}
          />
        </Suspense>
      </ProtectedRoute>
    </>
  );
}
