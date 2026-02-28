"use client";

import { useEffect, useContext } from "react";
import { AuthContext } from "@/context/AuthContext/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const context = useContext(AuthContext);
  const { setLang } = useSettings();
  const router = useRouter();

  useEffect(() => {
    if (!context || !context.user) {
      router.replace("/login");
    } else if (context.user.settings && context.user.settings.lang) {
      setLang(context.user.settings.lang === "de" ? "de" : "en");
    }
  }, [context, router, setLang]);

  if (!context || !context.user) {
    return null;
  }

  return <>{children}</>;
}