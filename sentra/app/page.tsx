"use client";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { startpageTranslations } from "@/types/translations";
import { useSettings } from "@/context/SettingsContext";

type BackgroundMode = "loading" | "gradient" | "image";

type StartpageResponse = {
  url?: string | null;
  background?: "gradient";
  pending?: boolean;
};

const startpageRequestCache = new Map<string, Promise<StartpageResponse>>();
const BACKGROUND_RETRY_MS = 3000;
const MAX_BACKGROUND_RETRIES = 20;

function fetchStartpageBackground(userId: string) {
  const existingRequest = startpageRequestCache.get(userId);
  if (existingRequest) {
    return existingRequest;
  }

  const request = fetch(`/api/startpage?userId=${userId}`, {
    cache: "no-store",
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error("Background request failed");
      }

      return (await res.json()) as StartpageResponse;
    })
    .finally(() => {
      startpageRequestCache.delete(userId);
    });

  startpageRequestCache.set(userId, request);
  return request;
}

export default function Home() {
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id ?? null;
  const isAuthLoading = auth?.isLoading ?? false;

  const [infoVisible, setInfoVisible] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [backgroundMode, setBackgroundMode] =
    useState<BackgroundMode>("loading");

  const fallbackGradient =
    "linear-gradient(135deg, #6b7280 0%, #8b949e 45%, #d1d5db 100%)";

  useEffect(() => {
    let cancelled = false;
    let retryTimeout: number | undefined;

    async function fetchImageUrl(attempt = 0) {
        console.log("[startpage] fetchImageUrl()", {
        userId,
        attempt,
        isAuthLoading,
      });

      if (isAuthLoading) {
        return;
      }

      if (!userId) {
        console.log("[startpage] no userId, using gradient fallback");
        setImageUrl(undefined);
        setBackgroundMode("gradient");
        return;
      }

      setImageUrl(undefined);
      setBackgroundMode("loading");

      try {
        const data = await fetchStartpageBackground(userId);
          console.log("[startpage] /api/startpage response", {
          userId,
          attempt,
          hasUrl: Boolean(data.url),
          pending: data.pending ?? false,
          background: data.background ?? "image",
          urlPreview: data.url ? data.url.slice(0, 80) : null,
        });

        if (cancelled) {
          return;
        }

        if (!data.url) {
            console.log("[startpage] no background URL returned, using gradient", {
            userId,
            pending: data.pending ?? false,
            attempt,
          });
          setImageUrl(undefined);
          setBackgroundMode("gradient");

          if (data.pending && attempt < MAX_BACKGROUND_RETRIES) {
            retryTimeout = window.setTimeout(() => {
              void fetchImageUrl(attempt + 1);
            }, BACKGROUND_RETRY_MS);
          }

          return;
        }

        const preloadedImage = new window.Image();

        preloadedImage.onload = () => {
          if (cancelled) {
            return;
          }

        console.log("[startpage] image preload success", {
          userId,
          attempt,
          urlPreview: data.url ? data.url.slice(0, 80) : null,
        });

          setImageUrl(data.url ?? undefined);
          setBackgroundMode("image");

          if (data.pending && attempt < MAX_BACKGROUND_RETRIES) {
            retryTimeout = window.setTimeout(() => {
              void fetchImageUrl(attempt + 1);
            }, BACKGROUND_RETRY_MS);
          }
        };

        preloadedImage.onerror = () => {
          if (cancelled) {
            return;
          }

          console.error("[startpage] image preload failed", {
            userId,
            attempt,
            urlPreview: data.url ? data.url.slice(0, 80) : null,
          });

          setImageUrl(undefined);
          setBackgroundMode("gradient");
        };

        preloadedImage.src = data.url;
      } catch (error) {
        console.error("Fehler beim Laden des Hintergrundbilds:", error);
        if (!cancelled) {
          setImageUrl(undefined);
          setBackgroundMode("gradient");
        }
      }
    }

    fetchImageUrl();

    return () => {
      cancelled = true;
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, [userId, isAuthLoading]);

  const handleToggle = () => setInfoVisible((v) => !v);

  const { lang } = useSettings();
  const t = startpageTranslations[lang];

  return (
    <ProtectedRoute>
      <div
        className="flex justify-center items-center bg-gray-300"
        style={{
          width: "100vw",
          overflow: "hidden",
          backgroundImage:
            backgroundMode === "image" && imageUrl
              ? `url(${imageUrl})`
              : fallbackGradient,
          backgroundColor: "#9ca3af",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          cursor: "pointer",
          position: "relative",
        }}
        onClick={handleToggle}
      >
        {backgroundMode === "image"
                   && (
                    <>
                      <div className="bird-container bird-container--one" style={{ top: "1%" }}>
                        <div className="bird bird--one bird--small"></div>
                      </div>
          
                      <div className="bird-container bird-container--two" style={{ top: "2%" }}>
                        <div className="bird bird--two bird--small"></div>
                      </div>
          
                      <div className="bird-container bird-container--three" style={{ top: "3%" }}>
                        <div className="bird bird--three bird--medium"></div>
                      </div>
          
                      <div className="bird-container bird-container--four" style={{ top: "4%" }}>
                        <div className="bird bird--four bird--medium"></div>
                      </div>
                    </>
                  ) 
        }

        {infoVisible && (
          <div
            className="mt-8 p-4 flex flex-col bg-white/70 rounded-xl shadow-2xl backdrop-blur-md"
            style={{
              maxWidth: "900px",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
          >
            <h1
              className="mt-2 text-5xl text-center font-bold text-orange-400"
              style={{ textShadow: "0 2px 3px rgba(0,0,0,0.5)" }}
            >
              {t.title}
              <sup className="text-base align-top">&copy;</sup>
            </h1>

            <p className="max-w-xl my-3 mx-2 text-gray-800 text-lg">
              {t.description}
            </p>

            <p className="max-w-xl my-3 mx-2 text-gray-800 font-bold text-lg hidden lg:block">
              {t.descriptionlg}
            </p>

            <p className="max-w-xl my-3 mx-2 text-gray-800 font-bold text-lg block lg:hidden">
              {t.descriptionsm}
            </p>


            <p className="max-w-xl my-2 text-center font-bold text-gray-700 ">
              {t.userinfo}
            </p>

            <p
              className="p-2 my-1 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
              style={{
                boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
              }}
            >
              <Link
                href={`/readme?doc=news#${lang === "de" ? "deutsche-sprache" : "english-language"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full h-full font-medium">
                {t.news}
              </Link>
            </p>

            <p
              className="p-2 my-1 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
              style={{
                boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
              }}
            >
              <Link href="/readme?doc=weather" target="_blank" rel="noopener noreferrer" className="block w-full h-full font-medium">
                {t.weather}
              </Link>
            </p>

            <p
              className="p-2 my-1 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
              style={{
                boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
              }}
            >
              <Link href="/readme?doc=liveview" target="_blank" rel="noopener noreferrer" className="block w-full h-full font-medium">
                {t.liveview}
              </Link>
            </p>

            <p
              className="p-2 my-1 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
              style={{
                boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
              }}
            >
              <Link href="/readme?doc=livetalk" target="_blank" rel="noopener noreferrer" className="block w-full h-full font-medium">
                {t.livetalk}
              </Link>
            </p>

{/*             <p
              className="p-2 my-1 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
              style={{
                boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
              }}
            >
              <Link href="/readme?doc=settings" target="_blank" rel="noopener noreferrer" className="block w-full h-full font-medium">
                {t.settings}
              </Link>
            </p> */}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
