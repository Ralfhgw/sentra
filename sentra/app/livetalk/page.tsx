import ProtectedRoute from "@/components/ProtectedRoute";
import LiveTalkClient from "@/components/LiveTalkClient";
import { getAuthenticatedUserWithSettingsFromCookies } from "@/utils/serverAuth";

export const dynamic = "force-dynamic";

export default async function LiveTalkPage() {
  const { settings } = await getAuthenticatedUserWithSettingsFromCookies();

  return (
    <ProtectedRoute>
      <div className="w-full min-h-screen bg-slate-200">
        <LiveTalkClient
          rtcEnabled={settings.rtc}
        />
      </div>
    </ProtectedRoute>
  );
}
