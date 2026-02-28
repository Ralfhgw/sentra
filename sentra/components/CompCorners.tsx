"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import Image from "next/image";

const cornerButtonStyle =
    "absolute w-8 h-8 bg-white/60 rounded-full flex items-center justify-center z-30 border border-white/30 transition-colors shadow-lg";

const symbols = {
    news: { emoji: "📰", alt: "News" },
    weather: { emoji: "🌦️", alt: "Weather" },
    liveview: { emoji: "📷", alt: "LiveView" },
    livetalk: { emoji: "👥", alt: "LiveTalk" },
};

export function Corners() {
    const { user, logout } = useAuth();
    const [hovered, setHovered] = useState<null | keyof typeof symbols>(null);

    if (!user) return null;

    return (
        <>
                    {/* Logout Button oben mittig */}
<button
    onClick={logout}
    className="fixed left-1/2 top-2 -translate-x-1/2 px-4 py-1 rounded-full z-50 transition-colors"
    style={{
        minWidth: 90,
        background: "linear-gradient(90deg, #b48a5a 0%, #e2c290 100%)",
        color: "#3b2c13",
        fontWeight: 700,
        letterSpacing: "0.05em",
        boxShadow: "inset 0 2px 8px #6b4a1b, 0 2px 8px rgba(0,0,0,0.15)",
        border: "2px solid #a67c52",
        textShadow: "0 1px 2px #6b4a1b, 0 0 8px #fff2, 0 0 1px #fff2",
        fontFamily: "'Merriweather', serif",
        textTransform: "uppercase",
    }}
>
    Logout
</button>
    {/* Button Setting */}
    <Link
        href="/settings"
        className="fixed left-1/2 bottom-2 -translate-x-1/2 px-4 py-1 rounded-full z-50 transition-colors"
        style={{
            minWidth: 90,
            background: "linear-gradient(90deg, #b48a5a 0%, #e2c290 100%)",
            color: "#3b2c13",
            fontWeight: 700,
            letterSpacing: "0.05em",
            boxShadow: "inset 0 2px 8px #6b4a1b, 0 2px 8px rgba(0,0,0,0.15)",
            border: "2px solid #a67c52",
            textShadow: "0 1px 2px #6b4a1b, 0 0 8px #fff2, 0 0 1px #fff2",
            fontFamily: "'Merriweather', serif",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        }}
    >
        Settings
    </Link>
            {/* Overlay in der Mitte */}
            {hovered && (
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
                    <span className="text-[250px] opacity-80 drop-shadow-lg select-none pointer-events-none transition-opacity duration-200">
                        {symbols[hovered].emoji}
                    </span>
                </div>
            )}

            <Link
                href="/weather"
                className={`${cornerButtonStyle} -left-6 -top-5 -translate-x-1/2 -translate-y-1/2`}
                onMouseEnter={() => setHovered("news")}
                onMouseLeave={() => setHovered(null)}
            >
                <div className="rotate-[-15deg] transition-transform duration-300 hover:-rotate-90">
                    <Image src="/screw.png" alt="Weather" loading="eager" width={30} height={30} />
                </div>
            </Link>

            <Link
                href="/news"
                className={`${cornerButtonStyle} -right-6 -top-5 translate-x-1/2 -translate-y-1/2`}
                onMouseEnter={() => setHovered("weather")}
                onMouseLeave={() => setHovered(null)}
            >
                <div className="rotate-10 transition-transform duration-300 hover:-rotate-90">
                    <Image src="/screw.png" alt="Forecast" loading="eager" width={30} height={30} />
                </div>
            </Link>

            <Link
                href="/liveview"
                className={`${cornerButtonStyle} -left-6 -bottom-5 -translate-x-1/2 translate-y-1/2`}
                onMouseEnter={() => setHovered("liveview")}
                onMouseLeave={() => setHovered(null)}
            >
                <div className="rotate-[5deg] transition-transform duration-300 hover:-rotate-90">
                    <Image src="/screw.png" alt="WebCam" loading="eager" width={30} height={30} />
                </div>
            </Link>

            <Link
                href="/livetalk"
                className={`${cornerButtonStyle} -right-6 -bottom-5 translate-x-1/2 translate-y-1/2`}
                onMouseEnter={() => setHovered("livetalk")}
                onMouseLeave={() => setHovered(null)}
            >
                <div className="rotate-[-10deg] transition-transform duration-300 hover:-rotate-90">
                    <Image src="/screw.png" alt="Sensors" loading="eager" width={30} height={30} />
                </div>
            </Link>
        </>
    );
}