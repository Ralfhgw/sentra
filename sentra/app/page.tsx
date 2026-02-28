"use client";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { startpageTranslations } from "@/types/translations";
import { useSettings } from "@/context/SettingsContext";


export default function Home() {
  const auth = useContext(AuthContext);

  const [infoVisible, setInfoVisible] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  // Get Background Image
  useEffect(() => {
    async function fetchImageUrl() {
      if (auth && auth.user) {
        const res = await fetch(`/api/startpage?userId=${auth.user.id}`);
        const data = await res.json();
        if (data.url) setImageUrl(data.url);
      }
    }
    fetchImageUrl();
  }, [auth]);

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
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          cursor: "pointer",
          position: "relative",
        }}
        onClick={handleToggle}
      >


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
        {infoVisible && (
          <div
            className="p-4 flex flex-col bg-white/70 rounded-xl shadow-2xl backdrop-blur-md"
            style={{
              maxWidth: "900px",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
          >
            {/* t.title */}
            <h1
              className="mt-2 text-5xl text-center font-bold text-orange-400"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
            >{t.title}<sup className="text-base align-top">&copy;</sup></h1>

            {/* t.descriptionlg */}
            <p className="max-w-xl my-3 mx-2 text-gray-800 text-lg hidden lg:block">
              {t.descriptionlg}
            </p>

            {/* t.descriptionsm */}
            <p className="max-w-xl my-3 mx-2  text-gray-800 text-lg block lg:hidden">
              {t.descriptionsm}
            </p>

            {/* t.userinfo */}
            <p className="max-w-xl my-2 text-center font-medium text-gray-700 ">
              {t.userinfo}
            </p>

            {/* t.news */}
            <p
              className="p-2 my-1 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
              style={{
                boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
              }}
            >
              <Link href="/readme#news" target="_blank" rel="noopener noreferrer" className="block w-full h-full font-medium">
                {t.news}
              </Link>
            </p>

            {/* t.weather */}
            <p
              className="p-2 my-1 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
              style={{
                boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
              }}
            >
              <Link href="/readme#weather" target="_blank" rel="noopener noreferrer" className="block w-full h-full font-medium">
                {t.weather}
              </Link>
            </p>

            {/* t.liveview */}
            <p
              className="p-2 my-1 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
              style={{
                boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
              }}
            >
              <Link href="/readme#liveview" target="_blank" rel="noopener noreferrer" className="block w-full h-full font-medium">
                {t.liveview}
              </Link>
            </p>

            {/* t.livetalk */}
            <p
              className="p-2 my-1 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
              style={{
                boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
              }}
            >
              <Link href="/readme#livetalk" target="_blank" rel="noopener noreferrer" className="block w-full h-full font-medium">
                {t.livetalk}
              </Link>
            </p>

          </div>
        )}
      </div>

    </ProtectedRoute>
  );
}