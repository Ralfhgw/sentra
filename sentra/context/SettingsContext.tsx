"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

type Lang = "en" | "de";

type SettingsContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

const SettingsContext = createContext<SettingsContextType>({
  lang: "en",
  setLang: () => {},
});

export function SettingsProvider({
  children,
  initialLang = "en",
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchLang() {
      if (user && user.id) {
        const res = await fetch(`/api/user/lang?userId=${user.id}`);
        const data = await res.json();
        if (data.lang) setLang(data.lang);
      }
    }
    fetchLang();
  }, [user]);

  return (
    <SettingsContext.Provider value={{ lang, setLang }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);