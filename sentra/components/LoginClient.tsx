"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import type { LoginTranslation } from "@/types/translations";

interface LoginFormProps {
  translations: { [key: string]: LoginTranslation };
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
      <div className="w-full max-w-3xl max-h-295 bg-gray-800 grid grid-cols-1 md:grid-cols-2 rounded-2xl shadow-2xl overflow-hidden">

        {/* Left Illustration */}
        <div className="p-4 bg-gray-900 text-white relative flex-col justify-between hidden md:flex">

          {/* Title SENTRA */}
          <h1 className="mt-3 ml-5 text-4xl text-orange-400 font-bold">
            {t.title}
            <sup className="ml-1 text-base align-top">&copy;</sup>
          </h1>

          {/* Box with animation */}
          <div className="flex flex-col">

            <div className="flex flex-row justify-center">

              {/* Buttons */}
              <div className="flex flex-col gap-1 justify-around">
                {/* Animation Button News README */}
                <div className="z-20 h-6 w-20 rounded-xl bg-gray-800 hover:bg-orange-400 opacity-70
                border border-orange-400 text-[16px] text-orange-400 hover:text-black transition">
                  <a
                    href="/readme#aktuelle-news-und-events"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-full flex items-center justify-center"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {t.simNews}
                  </a>
                </div>

                {/* Animation Button Weather README */}
                <div className="z-20 h-6 w-20 rounded-xl bg-gray-800 hover:bg-orange-400 opacity-70
                border border-orange-400 text-[16px] text-orange-400 hover:text-black transition">
                  <a
                    href="/readme#weather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-full flex items-center justify-center"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {t.simWeather}
                  </a>
                </div>

                {/* Animation Button WebCam README */}
                <div className="z-20 h-6 w-20 rounded-xl bg-gray-800 hover:bg-orange-400 opacity-70
                border border-orange-400 text-[16px] text-orange-400 hover:text-black transition">
                  <a
                    href="/readme#webcam"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-full flex items-center justify-center"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {t.simWebCam}
                  </a>
                </div>

                {/* Animation Button Sensors README */}
                <div className="z-20 h-6 w-20 rounded-xl bg-gray-800 hover:bg-orange-400 opacity-70
                border border-orange-400 text-[16px] text-orange-400 hover:text-black transition">
                  <a
                    href="/readme#sensors"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-full flex items-center justify-center"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {t.simSensors}
                  </a>
                </div>
              </div>

              {/* Signals */}
              <div className="flex flex-col justify-around">

                {/* Animation Signal News */}
                <div className="z-10 w-9 h-0.5 bg-linear-to-r from-gray-700 via-gray-500 to-transparent animate-signal"></div>

                {/* Animation Signal Weather */}
                <div className="z-10 w-9 h-0.5 bg-linear-to-r from-gray-700 via-gray-500 to-transparent animate-signal"></div>

                {/* Animation Signal WebCam */}
                <div className="z-10 w-9 h-0.5 bg-linear-to-r from-gray-700 via-gray-500 to-transparent animate-signal"></div>

                {/* Animation Signal Sensors */}
                <div className="z-10 w-9 h-0.5 bg-linear-to-r from-gray-700 via-gray-500 to-transparent animate-signal"></div>
              </div>

              {/* Animation Boxes */}
              <div className="flex items-center justify-center">
                <div className="z-20 md:w-26 md:h-26 lg:w-30 lg:h-30 rounded-xl bg-gray-700 flex items-center justify-center"
                >
                  <div className="md:w-17 md:h-17 lg:w-17 lg:h-17 rounded-xl bg-gray-400"></div>
                </div>
              </div>

              {/* Animation Signal and Button for Display */}
              <div className="flex flex-row items-center">
                {/* Animation Signal Display */}
                <div className="z-10 w-10 h-0.5 bg-linear-to-r from-gray-700 via-gray-500 to-transparent animate-signal"></div>

                {/* Animation Button Display README */}
                <div className="z-20 h-6 w-20 rounded-xl bg-gray-800 hover:bg-orange-400 opacity-70
                border border-orange-400 text-[16px] text-orange-400 hover:text-black transition">
                  <a
                    href="/readme#display"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-full flex items-center justify-center"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {t.simDisplay}
                  </a>
                </div>
              </div>
            </div>

            {/* Title small */}
            <div className="mt-4 text-center text-[16px] tracking-wide opacity-70">
              Sensing&nbsp;&nbsp;Streaming&nbsp;&nbsp;Situating
            </div>

          </div>

          {/* Weblink Official Website */}
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
        <div className="p-4 md:p-10 flex flex-col justify-center text-white relative h-full min-h-0">
          <h1 className="mb-5 mt-3 ml-4 text-4xl text-orange-400 font-bold md:hidden">
            {t.title}
            <sup className="ml-1 text-base align-top">&copy;</sup>
          </h1>
          
          {/* Language Button */}
          <div className="h-9 mb-1 flex justify-end">
            <select
              className="w-28 px-2 rounded-xl bg-gray-700 text-white "
              value={language}
              onChange={e => setLanguage(e.target.value as "en" | "de")}
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          <h2 className="mb-9 text-2xl font-semibold text-white">{t.login}</h2>

          <form onSubmit={handleSubmit}>
            {/* Input Email */}
            <div className="mb-4">
              <label className="mb-1 block text-sm">{t.email}</label>
              <input
                type="email"
                placeholder="user@domain.com"
                className="h-10 w-full px-4 py-3 rounded-xl bg-gray-700 focus:outline-none"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>

            {/* Input Password */}
            <div className="mb-4">
              <label className="mb-1 block text-sm">{t.password}</label>
              <input
                type="password"
                placeholder="********"
                className="h-10 w-full px-4 py-3 rounded-xl bg-gray-700 focus:outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="
              h-12 w-full mb-4 mt-5 py-3 rounded-xl 
              bg-orange-500  hover:bg-orange-400 
              text-black font-semibold transition"
              disabled={isLoading || !agreed}
            >
              {isLoading ? t.loggingIn : t.loginBtn}
            </button>

            {/* Checkbox Aggreement */}
            <div className="mb-4 h-20 flex items-center text-sm ">
              <input
                type="checkbox"
                className="mr-2"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              <span className="text-gray-500">
                {t.agreement}{" "}
                <a
                  href={language === "de" ? "/terms/de" : "/terms/en"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-200 hover:text-orange-400 ml-1"
                >
                  {t.terms}
                </a>
                {" "}und{" "}
                <a
                  href={language === "de" ? "/privacy/de" : "/privacy/en"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-200 hover:text-orange-400 ml-1"
                >
                  {t.privacy}
                </a>
              </span>
            </div>

            {error && <div className="mb-2 text-red-500 ">{error}</div>}

            {/* Signup Link */}
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
