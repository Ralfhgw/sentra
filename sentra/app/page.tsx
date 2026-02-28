"use client";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Home() {
  const auth = useContext(AuthContext);

  const [infoVisible, setInfoVisible] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

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
            <h1
              className="text-5xl font-bold text-orange-400 mb-6"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
            >Willkommen bei Sentra<sup className="ml-1 text-base align-top">&copy;</sup></h1>

            <p className="text-lg text-gray-800 mb-4 max-w-xl">
              Dein zentrales Info-Dashboard für Events, Wetter, Webcam und Sensordaten.
              Alle Daten auf einen Blick – direkt in deinem Holzrahmen-Interface.
            </p>

            <p className="text-md text-gray-700 mb-6 max-w-xl">
              Wähle eine der Schrauben in den Ecken oder die Buttons unten, um die verschiedenen Module zu öffnen.
              Jeder Bereich bietet Echtzeit-Informationen und eine interaktive Übersicht.
            </p>


            <p className="m-2 transition text-gray-700 hover:bg-gray-100 hover:text-gray-800 rounded cursor-pointer">
              <Link href="/readme#news" target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                📰 Aktuelles: Regionale Information und Ereignisse
              </Link>
            </p>
            <p className="m-2 transition text-gray-700 hover:bg-gray-100 hover:text-gray-800 rounded cursor-pointer">
              <Link href="/readme#weather" target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                🌦️ Wettervorschau: Aussichten für die nächsten Tage
              </Link>
            </p>
            <p className="m-2 transition text-gray-700 hover:bg-gray-100 hover:text-gray-800 rounded cursor-pointer">
              <Link href="/readme#webcam" target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                📷 WebCam: Live-Bilder deiner Kameras
              </Link>
            </p>
            <p className="m-2 transition text-gray-700 hover:bg-gray-100 hover:text-gray-800 rounded cursor-pointer">
              <Link href="/readme#sensors" target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                🧭 Sensoren: Echtzeit-Daten von angeschlossenen Sensoren
              </Link>
            </p>


            <p className="text-gray-700 mt-6 max-w-xl">
              Klicke auf ein Modul, um detailierte Informationen in der README zu sehen.
            </p>
          </div>
        )}
      </div>

    </ProtectedRoute>
  );
}