import ProtectedRoute from "@/components/ProtectedRoute";
import SettingsClient from "@/components/SettingsClient";
import { defaultSettings } from "@/types/typesSettings";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsClient initialSettings={defaultSettings} />
    </ProtectedRoute>
  );
}