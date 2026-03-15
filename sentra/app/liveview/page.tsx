import { Suspense } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import WebcamClient from "@/components/LiveViewClient";
import sql from "@/utils/db";
import { getAuthenticatedUserWithSettingsFromCookies } from "@/utils/serverAuth";
import type { Channel } from "@/types/typesLiveView";

async function getWebcams() {
  try {
    const { settings } = await getAuthenticatedUserWithSettingsFromCookies();

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
      channels: Array.from(channelsResult),
      userChannels: settings.channels,
      error: undefined as string | undefined,
    };
  } catch (err) {
    console.error("[DB] Fehlerfall:", err);

    return {
      channels: [] as Channel[],
      userChannels: [],
      error: "Fehler beim Laden der Webcams.",
    };
  }
}

export default async function Webcams() {
  const { channels, userChannels } = await getWebcams();

  return (
    <>
      <ProtectedRoute>
        <div className="fixed inset-0 bg-gray-400 -z-10" />
        <Suspense fallback={<div>Loading...</div>}>
          <WebcamClient channels={channels} userChannels={userChannels} />
        </Suspense>
      </ProtectedRoute>
    </>
  );
}