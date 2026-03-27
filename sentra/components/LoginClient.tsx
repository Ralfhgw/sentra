"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import type { LoginTranslation } from "@/types/translations";
import Image from "next/image";

interface LoginFormProps {
  translations: { [key: string]: LoginTranslation };
  defaultLanguage?: "en" | "de";
}
//TODO Login soll nur mit email erfolgen
export default function LoginForm({ translations, defaultLanguage = "en" }: LoginFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedLanguage = searchParams.get("lang");
  const redirectUrl = searchParams.get("redirect");
  const registered = searchParams.get("registered") === "1";
  const normalizedRequestedLanguage =
    requestedLanguage === "de" || requestedLanguage === "en" ? requestedLanguage : undefined;
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "de" | null>(null);
  const language = selectedLanguage ?? normalizedRequestedLanguage ?? defaultLanguage;
  const [useremail, setUseremail] = useState("");
  const [password, setPassword] = useState("");
  const { user, login, isLoading, error } = useAuth();
  const [agreed, setAgreed] = useState(false);

  const t = translations[language];
  const registrationNotice =
    language === "de"
      ? "Dein Konto wurde angelegt. Ein Administrator muss es im Auth-Server zuerst freischalten, bevor du dich anmelden kannst."
      : "Your account has been created. An administrator must activate it in the auth server before you can log in.";



  useEffect(() => {
    if (user) {
      router.push(redirectUrl ? redirectUrl : "/");
    }
  }, [user, redirectUrl, router]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await login(useremail, password);
    } catch {
    }
  }

  if (user) {
    return null;
  }

  return (
    <div className="w-full h-full bg-gray-400 flex flex-col items-center justify-center">
      <div className="mb-1 p-1 rounded-lg border bg-gray-300 border-gray-500">
      <div className="w-full max-w-3xl max-h-295 grid grid-cols-1 md:grid-cols-2 rounded-lg shadow-2xl overflow-hidden">

        {/* Left Illustration */}
        <div className="p-4 bg-gray-900 text-white relative flex-col justify-between hidden md:flex">

          {/* Title SENTRA */}
          <h1 className="mt-3 ml-5 text-4xl text-orange-400 font-bold">
            {t.title}
            <sup className="ml-1 text-base align-top">&copy;</sup>
          </h1>


          {/* Title small */}
          <div className="text-orange-400 mt-4 text-center text-[16px] tracking-wide opacity-70">
            {t.slogan}
          </div>

          <p className="text-[16px] tracking-wide opacity-70">{t.description}</p>

          <div className="flex flex-col">
            <div className="mt-4 text-center text-[16px] tracking-wide opacity-70">
              <Image
                src="/login_animation.gif"
                alt="animation"
                width={2200}
                height={90}
                className="mx-auto mb-2 rounded-lg"
                unoptimized
              />
              Events&nbsp;-&nbsp;Wetter&nbsp;-&nbsp;LiveView
            </div>
          </div>

          {/* Weblink Official Website */}
          <button
            type="button"
            className="
              mb-9 px-6 py-2 rounded-xl
              hover:bg-gray-400
              border border-gray-400 
              text-gray-400 hover:text-black transition"
            onClick={() => window.open("/readme?doc=project", "_blank")}
          >
            {t.officialWebsite}
          </button>
        </div>

        {/* Right Form */}
        <div className="p-4 md:p-10 bg-gray-800 flex flex-col justify-center text-white relative h-full min-h-0">
          <h1 className="mb-5 mt-3 ml-4 text-4xl text-orange-400 font-bold md:hidden">
            {t.title}
            <sup className="ml-1 text-base align-top">&copy;</sup>
          </h1>
          {/* Language Button */}
          <div className="h-9 mb-1 flex justify-end">
            <select
              className="w-28 px-2 rounded-xl bg-gray-700 text-[16px] opacity-70"
              value={language}
              onChange={e => setSelectedLanguage(e.target.value as "en" | "de")}
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          <h2 className="mb-9 text-2xl font-semibold text-white">{t.login}</h2>

          {registered && (
            <div className="mb-4 rounded-xl border border-amber-400 bg-amber-100/90 px-4 py-3 text-sm text-amber-900">
              {registrationNotice}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Input Email */}
            <div className="mb-4">
              <label className="mb-1 block text-[16px] opacity-70">{t.email}</label>
              <input
                type="email"
                placeholder="user@domain.com"
                className="h-10 w-full px-4 py-3 rounded-xl bg-gray-700 focus:outline-none"
                value={useremail}
                onChange={e => setUseremail(e.target.value)}
                required
              />
            </div>

            {/* Input Password */}
            <div className="mb-4">
              <label className="mb-1 block text-[16px] opacity-70">{t.password}</label>
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
            <div className="mb-4 h-20 flex items-center text-[16px]">
              <input
                type="checkbox"
                className="mr-2"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              <span className="text-gray-400">
                {t.agreement}{" "}
                <a
                  href={language === "de" ? "/terms/de" : "/terms/en"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-200 hover:text-orange-400 ml-1 text-[16px]"
                >
                  {t.terms}
                </a>
                {" "}&{" "}
                <a
                  href={language === "de" ? "/privacy/de" : "/privacy/en"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-200 hover:text-orange-400 ml-1 text-[16px]"
                >
                  {t.privacy}
                </a>
              </span>
            </div>

            {error && <div className="mb-2 text-red-500 ">{error}</div>}

            {/* Signup Link */}
            <div className="text-[16px] opacity-90">
              {t.noAccount}{" "}
              <span
                className="text-orange-400 opacity-100 hover:underline cursor-pointer"
                onClick={() => router.push(`/register?lang=${language}`)}
              >
                {t.signUp}
              </span>
            </div>
          </form>
        </div>
        </div>

        {/* Logos */} 
        <div className="bg-gray-500 w-full max-w-3xl rounded-lg flex flex-row flex-wrap justify-between p-4 mt-1">
        {/* Logo OpenMeteo */}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="block transition group"
        >
          <div className="h-19 w-19 p-1 rounded-xl border border-gray-700 shadow-md flex items-center justify-center transition-colors duration-300 group-hover:bg-gray-700">
            <Image
              src="/logo-open-meteo.png"
              alt="Open Meteo"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
        </a>
        {/* Logo GPT Image 1.5 */}
        <a
          href="https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/"
          target="_blank"
          rel="noopener noreferrer"
          className="block transition group"
        >
          <div className="h-19 w-19 p-1 rounded-xl border border-gray-700 shadow-md flex items-center justify-center transition-colors duration-300 group-hover:bg-gray-700">
            <Image
              src="/logo-gpt-image1-5.png"
              alt="GPT Image 1.5"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
        </a>
        {/* Logo Tailwind CSS */}
        <a
          href="https://tailwindcss.com//"
          target="_blank"
          rel="noopener noreferrer"
          className="block transition group"
        >
          <div className="h-19 w-19 p-1 rounded-xl border border-gray-700 shadow-md flex items-center justify-center transition-colors duration-300 group-hover:bg-gray-700">
            <Image
              src="/logo-tailwind-css.png"
              alt="Tailwind CSS"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
        </a>
        {/* Logo Next.js */}
        <a
          href="https://nextjs.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="block transition group"
        >
          <div className="h-19 w-19 p-1 rounded-xl border border-gray-700 shadow-md flex items-center justify-center transition-colors duration-300 group-hover:bg-gray-700">
            <Image
              src="/logo-nextjs.svg"
              alt="Next.js"
              width={80}
              height={80}
              className="object-contain"
              style={{ filter: 'grayscale(100%)' }}
            />
          </div>
        </a>
        {/* Logo Serpapi */}
        <a
          href="https://serpapi.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="block transition group"
        >
          <div className="h-19 w-19 p-1 rounded-xl border border-gray-700 shadow-md flex items-center justify-center transition-colors duration-300 group-hover:bg-gray-700">
            <Image
              src="/logo-serpapi.png"
              alt="Serpapi"
              width={80}
              height={80}
              className="object-contain"
              style={{ filter: 'grayscale(100%)' }}
            />
          </div>
        </a>
        {/* Logo Cloudinary */}
        <a
          href="https://cloudinary.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="block transition group"
        >
          <div className="h-19 w-19 p-1 rounded-xl border border-gray-700 shadow-md flex items-center justify-center transition-colors duration-300 group-hover:bg-gray-700">
            <Image
              src="/logo-cloudinary.png"
              alt="Cloudinary"
              width={80}
              height={80}
              className="object-contain"
              style={{ filter: 'grayscale(100%)' }}
            />
          </div>
        </a>
        {/* Logo Mosquitto */}
        <a
          href="https://mosquitto.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="block transition group"
        >
          <div className="h-19 w-19 p-1 rounded-xl border border-gray-700 shadow-md flex items-center justify-center transition-colors duration-300 group-hover:bg-gray-700">
            <Image
              src="/logo-mosquitto.png"
              alt="Mosquitto"
              width={80}
              height={80}
              className="object-contain"
              style={{ filter: 'grayscale(100%)' }}
            />
          </div>
        </a>
        {/* Logo MediaMTX */}
        <a
          href="https://github.com/bluenviron/mediamtx"
          target="_blank"
          rel="noopener noreferrer"
          className="block transition group"
        >
          <div className="h-19 w-19 p-1 rounded-xl border border-gray-700 shadow-md flex items-center justify-center transition-colors duration-300 group-hover:bg-gray-700">
            <Image
              src="/logo-mediamtx.svg"
              alt="MediaMTX"
              width={80}
              height={80}
              className="object-contain"
              style={{ filter: 'grayscale(100%)' }}
            />
          </div>
        </a>
        </div>
       </div>
        <div className="w-full max-w-3xl text-gray-500 text-center text-[16px] opacity-70 tracking-wide">
        {t.pinfo}
       </div>

    </div >
  );
}




