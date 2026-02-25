"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import type { Translations } from "@/types/translations";

interface LoginFormProps {
  translations: { [key: string]: Translations };
  defaultLanguage?: "en" | "de";
}

export default function LoginForm({ translations, defaultLanguage = "en" }: LoginFormProps) {
  const [language, setLanguage] = useState<"en" | "de">(defaultLanguage);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectUrl = searchParams.get("redirect");
  const { user, login, isLoading, error } = useAuth();
  const [agreed, setAgreed] = useState(false);

  const t = translations[language];

  useEffect(() => {
    if (user) {
      router.push(redirectUrl ? redirectUrl : "/");
    }
  }, [user, redirectUrl, router]);

async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
  e.preventDefault();
  try {
    await login(username, password);
  } catch {
  }
}

  if (user) {
    return null;
  }

   return (
    <div className="w-full h-full bg-gray-500 flex items-center justify-center">
      <div className="w-full max-w-5xl bg-gray-800 grid grid-cols-1 md:grid-cols-2  rounded-2xl shadow-2xl overflow-hidden">
        {/* Left Illustration */}
        <div className="p-10 bg-gray-900 text-white relative flex flex-col justify-between ">
          <h1 className="mb-5 mt-3 text-4xl text-orange-400 font-bold  ">{t.title}<sup className="ml-1 text-base align-top">&copy;</sup></h1>
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-175 h-100">

              <div className="
                z-20 mb-9 py-0.8 px-2 absolute left-[-1] top-27 rounded-xl
                bg-gray-800 hover:bg-orange-400 opacity-70
                border border-orange-400 
                text-[16px] text-orange-400 hover:text-black transition">
                <a
                  href="/readme#aktuelle-news-und-events"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-full block"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {t.simNews}
                </a>

              </div>
              <div className="
                z-20 mb-10 py-0.8 px-1 absolute left-0.7 top-37 rounded-xl 
                bg-gray-800 hover:bg-orange-400 opacity-70
                border border-orange-400 
                text-[16px] text-orange-400 hover:text-black transition">
                <a
                  href="/readme#weather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-full block"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {t.simWeather}
                </a></div>
              <div className="
                z-20 mb-11 py-0.8 px-2 absolute left-0.7 top-47 rounded-xl 
                bg-gray-800 hover:bg-orange-400 opacity-70
                border border-orange-400 
                text-[16px] text-orange-400 hover:text-black transition">
                <a
                  href="/readme#webcam"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-full block"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {t.simWebCam}
                </a></div>
              <div className="
                z-20 mb-11 py-0.8 px-2 absolute left-0.7 top-57 rounded-xl 
                bg-gray-800 hover:bg-orange-400 opacity-70
                border border-orange-400 
                text-[16px] text-orange-400 hover:text-black transition">
                <a
                  href="/readme#sensors"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-full block"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {t.simSensors}
                </a></div>

              <div className="
                z-20 mb-9 py-0.8 px-3 absolute right-1 top-41 rounded-xl 
                bg-gray-800 hover:bg-orange-400 opacity-70
                border border-orange-400 
                text-[16px] text-orange-400 hover:text-black transition">
                <a
                  href="/readme#display"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-full block"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {t.simDisplay}
                </a></div>

              <div className="
              z-10 w-10 h-0.5 absolute left-19 top-30
              bg-linear-to-r from-gray-700 via-gray-500 to-transparent animate-signal">
              </div>
              <div className="
              z-10 w-10 h-0.5 absolute left-19 top-40
              bg-linear-to-r from-gray-700 via-gray-500 to-transparent animate-signal">
              </div>
              <div className="
              z-10 w-10 h-0.5 absolute left-19 top-50
              bg-linear-to-r from-gray-700 via-gray-500 to-transparent animate-signal">
              </div>
              <div className="
              z-10 w-10 h-0.5 absolute left-19 top-60
              bg-linear-to-r from-gray-700 via-gray-500 to-transparent animate-signal">
              </div>
              <div className="
              z-10 w-10 h-0.5 absolute left-78 top-43.75
              bg-linear-to-r from-gray-700 via-gray-500 to-transparent animate-signal">
              </div>

              <div className="
                z-20 w-50 h-50 absolute left-28 top-20 rounded-[20px]
                bg-slate-700  flex items-center justify-center"
              >
                <div className="
                  w-25 h-25 rounded-xl bg-gray-400 ">
                </div>
              </div>

              <div className="
                w-full absolute bottom-18
                text-center text-[16px] tracking-wide opacity-70">
                Central&nbsp;&nbsp;Sentinel&nbsp;&nbsp;Sensing
              </div>

            </div>
          </div>
          <button
            type="button"
            className="
              mb-9 px-6 py-2 rounded-xl
              hover:bg-orange-400
              border border-orange-400 
              text-orange-400 hover:text-black transition"
            onClick={() => window.open("https://www.google.de", "_blank")}
          >
            {t.officialWebsite}
          </button>
        </div>

        {/* Right Form */}
        <div className="p-10 flex flex-col justify-center text-white">
          <div className="mb-1 flex justify-end">
            <select
              className="w-28 px-3 py-2 rounded-xl bg-gray-700 text-white "
              value={language}
              onChange={e => setLanguage(e.target.value as "en" | "de")}
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          <h2 className="mb-9 text-2xl font-semibold text-white">{t.login}</h2>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="mb-4">
              <label className="mb-1 block text-sm">{t.email}</label>
              <input
                type="email"
                placeholder="user@domain.com"
                className="w-full px-4 py-3 rounded-xl bg-gray-700 focus:outline-none"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="mb-1 block text-sm">{t.password}</label>
              <input
                type="password"
                placeholder="********"
                className="w-full px-4 py-3 rounded-xl bg-gray-700 focus:outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="
              w-full mb-4 mt-5 py-3 rounded-xl 
              bg-orange-500  hover:bg-orange-400 
              text-black font-semibold transition"
              disabled={isLoading || !agreed}
            >
              {isLoading ? t.loggingIn : t.loginBtn}
            </button>

            <div className="mb-4 flex items-center text-sm ">
              <input
                type="checkbox"
                className="mr-2"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              <span>
                {t.agreement}
              </span>
            </div>

            {error && <div className="mb-2 text-red-500 ">{error}</div>}
            <div className="text-sm">
              {t.noAccount}{" "}
              <span
                className="text-orange-400 hover:underline cursor-pointer"
                onClick={() => router.push(`/register?lang=${language}`)}
              >
                {t.signUp}
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
