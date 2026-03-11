import ProtectedRoute from "@/components/ProtectedRoute";
import WebcamClient from "@/components/LiveViewClient";
import sql from "@/utils/db";
import { getAuthenticatedUserFromCookies } from "@/utils/serverAuth";
import type { Channel } from "@/types/typesLiveView";

type UserChannel = {
  url: string;
  name: string;
};

type UserChannelsValue = UserChannel[] | string | null;

function normalizeUserChannels(value: UserChannelsValue): UserChannel[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function getWebcams() {
  try {
    const { userId: user_id } = await getAuthenticatedUserFromCookies();
    const [channelsResult, settingsRows] = await Promise.all([
      sql<Channel[]>`
        SELECT
          id::text AS id,
          tvg_name,
          tvg_id,
          "group",
          logo_url,
          sendername,
          stream_url,
          created_at::text AS created_at
        FROM channels
        ORDER BY created_at DESC
      `,
      sql<{ user_channels: UserChannelsValue }[]>`
        SELECT channels AS user_channels
        FROM user_settings
        WHERE user_id = ${user_id}::uuid
        LIMIT 1
      `,
    ]);

    const rawUserChannels = settingsRows[0]?.user_channels ?? null;
    const userChannels = normalizeUserChannels(rawUserChannels);

    console.log("LiveView raw user_channels:", rawUserChannels);
    console.log("LiveView normalized userChannels:", userChannels);

    return {
      channels: Array.from(channelsResult),
      userChannels,
      error: undefined as string | undefined,
    };
  } catch (err) {
    console.error("[DB] Fehlerfall:", err);

    return {
      channels: [] as Channel[],
      userChannels: [] as UserChannel[],
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
        <WebcamClient channels={channels} userChannels={userChannels} />
      </ProtectedRoute>
    </>
  );
}