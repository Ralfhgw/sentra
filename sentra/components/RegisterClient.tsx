"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { registerTranslations } from "@/types/translations";
import { MoveableScrollAreaVertical } from "@/components/CompMovableScrollAreaVertical"
import axios from "axios";


const MapSelector = dynamic(() => import("@/components/CompMapSelector"), { ssr: false });

export default function RegisterClient() {
    const router = useRouter();

    const [lat, setLat] = useState(52.520008);
    const [lon, setLon] = useState(13.404954);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordSecond, setPasswordSecond] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [evt, setEvt] = useState(false);
    const [wea, setWea] = useState(false);
    const [mtx, setMtx] = useState(false);
    const [rtc, setRtc] = useState(false);

    const passwordsMatch = password === passwordSecond && passwordSecond.length > 0;
    const passwordSecondBg = passwordSecond.length === 0 ? "bg-gray-700" : passwordsMatch ? "bg-green-200" : "bg-pink-200";

    const searchParams = useSearchParams();
    const lang = searchParams.get("lang") as "en" | "de" | null;
    const language: "en" | "de" = lang === "de" ? "de" : "en";
    const t = registerTranslations[language];

    type RegisterRouteResponse = {
        success: boolean;
        userId?: string;
        error?: string;
    };

    async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post<RegisterRouteResponse>(
                "/api/register",
                {
                    username,
                    email,
                    password,
                    lang: language,
                    lat,
                    lon,
                    evt,
                    wea,
                    mtx,
                    rtc,
                },
                {
                    headers: { "Content-Type": "application/json" },
                }
            );
            if (!response.data.success) {
                throw new Error(response.data.error ?? "Registration failed");
            }

            router.push("/login");
        } catch (e: unknown) {
            if (axios.isAxiosError(e)) {
                const msg =
                    (e.response?.data as { error?: string } | undefined)?.error ?? e.message;
                setError(msg);
                console.error("Register error:", e.response?.status, e.response?.data);
            } else {
                setError("Registration failed!");
                console.error("Register error:", e);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full h-full bg-gray-400 flex items-center justify-center">
            <div className="p-1 bg-gray-300 rounded-lg border border-gray-500">
            <MoveableScrollAreaVertical className="h-full sm:h-150 max-w-5xl rounded-lg shadow-2xl overflow-hidden bg-gray-800 grid grid-cols-1 md:grid-cols-2">

                {/* Left: Karte und Koordinaten */}
                <div className="p-10 relative bg-gray-900 text-white flex flex-col justify-between">
                    <h1 className="mb-6 text-4xl font-bold text-orange-400">
                        {t.title}
                        <sup className="ml-1 text-base align-top">&copy;</sup>
                    </h1>
                    {/* Leaflet Map, Display of coordinates, Checkboxes*/}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <MapSelector
                            lat={lat}
                            lon={lon}
                            onChange={(newLat: number, newLon: number) => {
                                setLat(newLat);
                                setLon(newLon);
                            }}
                        />
                        <div className="mt-3 flex flex-row items-center justify-between">

                            <div className="flex flex-col my-2 mr-11">
                                <label className="mb-2 block text-[16px] opacity-70 text-center">
                                    {t.latitude} <input
                                        value={lat.toFixed(6)}
                                        readOnly
                                        className="w-30 h-6 ml-3 pl-5 py-1 rounded bg-gray-700" />
                                </label>
                                <label className="block text-[16px] opacity-70 text-center">
                                    {t.longitude} <input
                                        value={lon.toFixed(6)}
                                        readOnly
                                        className="w-30 h-6 ml-3 pl-5 py-1 rounded bg-gray-700"
                                    />
                                </label>
                            </div>

                            <div className="flex flex-row item-center gap-2">
                                <div className="flex flex-col items-center">
                                    <input type="checkbox" checked={evt} onChange={e => setEvt(e.target.checked)} />
                                    <label className="text-[16px] opacity-70">EVT</label>
                                </div>
                                <div className="flex flex-col items-center">
                                    <input type="checkbox" checked={wea} onChange={e => setWea(e.target.checked)} />
                                    <label className="text-[16px] opacity-70">WEA</label>
                                </div>
                                <div className="flex flex-col items-center">
                                    <input type="checkbox" checked={mtx} onChange={e => setMtx(e.target.checked)} />
                                    <label className="text-[16px] opacity-70">MTX</label>
                                </div>
                                <div className="flex flex-col items-center">
                                    <input type="checkbox" checked={rtc} onChange={e => setRtc(e.target.checked)} />
                                    <label className="text-[16px] opacity-70">RTC</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Website Button */}
                    <button
                        type="button"
                        className="mt-3 px-6 py-2 rounded-xl border border-gray-400 hover:bg-gray-400 text-gray-400 hover:text-black transition"
                        onClick={() => window.open("/readme#project", "_blank")}
                    >
                        {t.officialWebsite}
                    </button>
                </div>

                {/* Right: Registrierungsformular --> HandleSubmit()*/}
                <div className="p-10 bg-gray-850 text-white flex flex-col justify-center">
                    <h2 className="mb-6 text-2xl font-semibold text-white">{t.registerTitle}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="mb-1 block text-[16px] opacity-70">{t.username}</label>
                            <input
                                className="h-10 w-full px-4 py-3 rounded-xl bg-gray-700 focus:outline-none"
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-[16px] opacity-70 mb-1">{t.email}</label>
                            <input
                                className="h-10 w-full px-4 py-3 rounded-xl bg-gray-700 focus:outline-none"
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-[16px] opacity-70 mb-1">{t.password}</label>
                            <input
                                className="h-10 w-full px-4 py-3 rounded-xl bg-gray-700 focus:outline-none"
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-5">
                            <label className="mb-1 block text-[16px] opacity-70">{t.repeatPassword}</label>
                            <input
                                className={`h-10 w-full px-4 py-3 rounded-xl ${passwordSecondBg}  focus:outline-none`}
                                id="passwordSecond"
                                type="password"
                                value={passwordSecond}
                                onChange={(e) => setPasswordSecond(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            className="w-full bg-orange-500 py-3 rounded-xl text-black font-semibold hover:bg-orange-400 transition mb-4"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? t.registerIn : t.registerBtn}
                        </button>

                        {/* BackButton and ErrorMessage */}
                        <div className="flex flex-row">
                            <div className="text-[16px] opacity-90">
                                {t.alreadyAccount}
                                <span
                                    className="text-orange-400 hover:underline cursor-pointer"
                                    onClick={() => router.push("/login")}
                                >
                                    {t.loggingIn}
                                </span>
                            </div>
                            <div className="text-sm">
                                {error && <div className="text-red-500 mb-2">{error}</div>}
                            </div>
                        </div>
                    </form>
                </div>
            </MoveableScrollAreaVertical>
            </div>
        </div>
        
    );
}