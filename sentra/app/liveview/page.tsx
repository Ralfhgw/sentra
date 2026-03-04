import WebcamClient from "@/components/LiveViewClient";
import sql from "@/utils/db";

async function getWebcams() {
  try {
    const channels = await sql`
      SELECT id, tvg_name, tvg_id, "group", logo_url, sendername, stream_url, created_at
      FROM channels
      ORDER BY created_at DESC
    `;
    return { channels, error: null as string | null };
  } catch (err) {
    console.error("DB error:", err);
    return { channels: [], error: "Fehler beim Laden der Webcams." };
  }
}

export default async function Webcams() {
  const { channels, error } = await getWebcams();

  return (
    <>
      <div className="fixed inset-0 bg-gray-400 -z-10" />
      <WebcamClient channels={channels} error={error} />
    </>
  );
}