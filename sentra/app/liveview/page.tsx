import { Suspense } from "react";
export const dynamic = 'force-dynamic';
import ProtectedRoute from "@/components/ProtectedRoute";
import WebcamClient from "@/components/LiveViewClient";
import sql from "@/utils/db";
import { getAuthenticatedUserWithSettingsFromCookies } from "@/utils/serverAuth";
import type { Channel } from "@/types/typesLiveView";
import { reconcileAllLiveViewRtspSources } from "@/utils/liveviewSources";

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
      const channelsResult = await sql<Channel[]>`
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

      return {
        mtxEnabled: true,
        channels: Array.from(channelsResult),
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
