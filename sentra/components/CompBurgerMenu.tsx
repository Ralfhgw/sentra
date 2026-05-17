"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function CompBurgerMenu() {
  const [open, setOpen] = useState(false);
  const [hideTrigger, setHideTrigger] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  const pathname = usePathname();
  const shouldHideTrigger = pathname === "/liveview" && hideTrigger;

  useEffect(() => {
    if (pathname !== "/liveview") {
      return;
    }

    const handleVisibilityChange = (event: Event) => {
      const hidden =
        event instanceof CustomEvent && event.detail?.hidden === true;

      setHideTrigger(hidden);

      if (hidden) {
        setOpen(false);
      }
    };

    window.addEventListener(
      "liveview-burger-visibility",
      handleVisibilityChange as EventListener
    );

    return () => {
      window.removeEventListener(
        "liveview-burger-visibility",
        handleVisibilityChange as EventListener
      );
      setHideTrigger(false);
    };
  }, [pathname]);

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.replace("/login");
  }

  return (
    <div className="fixed top-1 right-1 z-50">
      {!shouldHideTrigger && (
        <button
          aria-label="Menü öffnen"
          className="flex flex-col justify-center items-center w-10 h-10 rounded bg-gray-500/40 text-orange-400 shadow-lg focus:outline-none"
          onClick={() => setOpen(!open)}
        >
          <span className="block w-6 h-0.5 bg-orange-400 mb-1"></span>
          <span className="block w-6 h-0.5 bg-orange-400 mb-1"></span>
          <span className="block w-6 h-0.5 bg-orange-400"></span>
        </button>
      )}

      {open && (
        <nav className="absolute top-12 right-0 bg-gray-600 rounded-xl shadow-xl p-4 flex flex-col gap-4 min-w-40">
          <Link href="/" className="ml-2 text-orange-400 hover:text-white font-bold" onClick={() => setOpen(false)}>
            Home
          </Link>
          <Link href="/news" className="ml-2 text-orange-400 hover:text-white font-bold" onClick={() => setOpen(false)}>
            News
          </Link>
          <Link href="/weather" className="ml-2 text-orange-400 hover:text-white font-bold" onClick={() => setOpen(false)}>
            Weather
          </Link>
          <Link href="/liveview" className="ml-2 text-orange-400 hover:text-white font-bold" onClick={() => setOpen(false)}>
            LiveView
          </Link>
          <Link href="/livetalk" className="ml-2 text-orange-400 hover:text-white font-bold" onClick={() => setOpen(false)}>
            LiveTalk
          </Link>
          <Link href="/settings" className="ml-2 text-orange-400 hover:text-white font-bold" onClick={() => setOpen(false)}>
            Settings
          </Link>

          {user && (
            <button
              type="button"
              className="ml-2 text-center bg-gray-300 rounded-xl text-orange-400 hover:bg-gray-400 font-bold"
              onClick={() => void handleLogout()}
            >
              Logout
            </button>
          )}
        </nav>
      )}
    </div>
  );
}
