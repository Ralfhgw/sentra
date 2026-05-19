import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import {
  applyRefreshedAccessToken,
  getAuthenticatedUserFromRequest,
} from "@/utils/serverAuth";

export const runtime = "nodejs";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const TRANSCRIPTION_MODEL =
  process.env.LIVEVIEW_SUBTITLE_STT_MODEL ?? "whisper-large-v3-turbo";
const TRANSLATION_MODEL =
  process.env.LIVEVIEW_SUBTITLE_TRANSLATION_MODEL ?? "llama-3.1-8b-instant";
const MAX_AUDIO_BYTES = 5_000_000;

type SubtitleRouteResponse = {
  text?: string;
  sourceText?: string;
  sourceLanguage?: string | null;
  error?: string;
};

function normalizeLanguage(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 2);

  return /^[a-z]{2}$/.test(normalized) ? normalized : null;
}

export async function POST(req: NextRequest) {
  let auth;

  try {
    auth = await getAuthenticatedUserFromRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nicht eingeloggt";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  if (!process.env.GROQ_API_KEY) {
    return applyRefreshedAccessToken(
      NextResponse.json(
        { error: "GROQ_API_KEY ist nicht gesetzt." },
        { status: 500 }
      ),
      auth
    );
  }

  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return applyRefreshedAccessToken(
      NextResponse.json({ error: "Invalid form data" }, { status: 400 }),
      auth
    );
  }

  const audio = formData.get("audio");
  const targetLanguage = normalizeLanguage(formData.get("targetLanguage")) ?? "en";

  if (!(audio instanceof File)) {
    return applyRefreshedAccessToken(
      NextResponse.json({ error: "Audio file is required" }, { status: 400 }),
     auth
    );
  }

  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return applyRefreshedAccessToken(
      NextResponse.json(
        { error: "Audioclip fehlt oder ist zu groß." },
        { status: 400 }
      ),
      auth
   );
  }

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: TRANSCRIPTION_MODEL,
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
      temperature: 0,
    });
    const sourceText =
      typeof transcription.text === "string" ? transcription.text.trim() : "";

    if (!sourceText) {
      return applyRefreshedAccessToken(
       NextResponse.json({
          text: "",
          sourceText: "",
          sourceLanguage: null,
        } satisfies SubtitleRouteResponse),
        auth
      );
    }

    const sourceLanguage =
      "language" in transcription && typeof transcription.language === "string"
        ? transcription.language.slice(0, 2).toLowerCase()
        : null;

    let translatedText = sourceText;

    if (!sourceLanguage || sourceLanguage !== targetLanguage) {
      const translation = await groq.chat.completions.create({
        model: TRANSLATION_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Translate live subtitles into the requested language. Keep the text concise, natural and subtitle-friendly. Return JSON only in the form {\"translation\":\"...\"}.",
          },
          {
            role: "user",
            content: JSON.stringify({
              targetLanguage,
              text: sourceText,
            }),
          },
        ],
      });

      const payload = translation.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(payload) as { translation?: string };
      translatedText = parsed.translation?.trim() || sourceText;
    }

    return applyRefreshedAccessToken(
      NextResponse.json({
        text: translatedText,
        sourceText,
        sourceLanguage,
      } satisfies SubtitleRouteResponse),
      auth
    );
  } catch (error) {
   console.error("LiveView subtitle generation failed:", error);

    return applyRefreshedAccessToken(
      NextResponse.json(
        { error: "Live-Untertitel konnten nicht erzeugt werden." },
        { status: 500 }
      ),
      auth
    );
  }
}