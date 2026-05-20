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
const RATE_LIMIT_BACKOFF_MS = 30_000;

type SubtitleRouteResponse = {
  text?: string;
  sourceText?: string;
  sourceLanguage?: string | null;
  translatedToGerman?: boolean;
  retryAfterMs?: number;
  error?: string;
};

function buildEmptySubtitleResponse(
  sourceText = "",
  sourceLanguage: string | null = null
): SubtitleRouteResponse {
  return {
    text: "",
    sourceText,
    sourceLanguage,
    translatedToGerman: false,
  };
}

function normalizeLanguage(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 2);

  return normalized === "de" || normalized === "en" ? normalized : null;
}

function isIgnorableTranscriptionError(error: unknown) {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : null;

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();

  return status === 400 && message.includes("could not process file");
}

function isRateLimitedError(error: unknown) {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : null;

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();

  return status === 429 || message.includes("rate limit");
}

function buildRateLimitedResponse() {
  return NextResponse.json(
    {
      error: "Groq Rate Limit erreicht.",
     retryAfterMs: RATE_LIMIT_BACKOFF_MS,
    } satisfies SubtitleRouteResponse,
    { status: 429 }
  );
}

function extractTranslatedText(content: string | null | undefined) {
  const raw = String(content ?? "").trim();
  if (!raw) {
    return "";
  }

  const withoutCodeFence = raw
    .replace(/^```(?:json|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(withoutCodeFence) as { translation?: string };
    if (typeof parsed.translation === "string" && parsed.translation.trim()) {
      return parsed.translation.trim();
    }
  } catch {
    // Fall back to plain text below.
 }

  return withoutCodeFence.replace(/^"([\s\S]*)"$/, "$1").trim();
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
    let transcription;

    try {
      transcription = await groq.audio.transcriptions.create({
        file: audio,
        model: TRANSCRIPTION_MODEL,
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
       temperature: 0,
      });
    } catch (error) {
      if (isIgnorableTranscriptionError(error)) {
        console.warn("LiveView subtitle skipped invalid media chunk:", error);

        return applyRefreshedAccessToken(
          NextResponse.json(
           buildEmptySubtitleResponse() satisfies SubtitleRouteResponse
          ),
          auth
        );
     }
      if (isRateLimitedError(error)) {
        console.warn("LiveView subtitle transcription rate limited:", error);
        return applyRefreshedAccessToken(buildRateLimitedResponse(), auth);
      }
      throw error;
    }

    const sourceText =
      typeof transcription.text === "string" ? transcription.text.trim() : "";

    if (!sourceText) {
      return applyRefreshedAccessToken(
        NextResponse.json(
          buildEmptySubtitleResponse() satisfies SubtitleRouteResponse
        ),
        auth
      );
    }

    const sourceLanguage =
      "language" in transcription && typeof transcription.language === "string"
        ? transcription.language.slice(0, 2).toLowerCase()
        : null;

    let translatedText = sourceText;
    let translatedToGerman = targetLanguage === "de" && sourceLanguage === "de";

    if (!sourceLanguage || sourceLanguage !== targetLanguage) {
      try {
        const translation = await groq.chat.completions.create({
          model: TRANSLATION_MODEL,
          temperature: 0,
          messages: [
            {
              role: "system",
              content:
                `Translate live subtitles into ${targetLanguage === "de" ? "German" : "English"}. Reply with subtitle text only. No JSON. No explanations. No labels.`,
            },
            {
              role: "user",
              content:
                `Source language: ${sourceLanguage ?? "unknown"}\n` +
                `Target language: ${targetLanguage}\n` +
                `Text:\n${sourceText}`,
            },
          ],
       });

        const nextTranslation = extractTranslatedText(
          translation.choices[0]?.message?.content
        );

        if (nextTranslation) {
          translatedText = nextTranslation;
          translatedToGerman = targetLanguage === "de";
        } else if (targetLanguage === "de") {
          console.warn(
            "LiveView subtitle translation returned empty text.",
            { sourceLanguage, targetLanguage, sourceText }
          );
          return applyRefreshedAccessToken(
            NextResponse.json(
              buildEmptySubtitleResponse(
                sourceText,
               sourceLanguage
              ) satisfies SubtitleRouteResponse
            ),
            auth
          );
    console.warn("LiveView subtitle translation returned empty text.", {
            sourceLanguage,
            targetLanguage,
            sourceText,
            rawTranslation: translation.choices[0]?.message?.content ?? null,
          });
          return applyRefreshedAccessToken(
            NextResponse.json(
              {
               error: "DE translation returned empty text.",
                sourceText,
                sourceLanguage,
                translatedToGerman: false,
              } satisfies SubtitleRouteResponse,
              { status: 502 }
            ),
            auth
          );
       }
      } catch (error) {
        if (isRateLimitedError(error)) {
          console.warn("LiveView subtitle translation rate limited:", error);
          return applyRefreshedAccessToken(buildRateLimitedResponse(), auth);
        }
        console.warn("LiveView subtitle translation failed:", error);

        if (targetLanguage === "de") {
          return applyRefreshedAccessToken(
            NextResponse.json(
              {
                error: "DE translation failed.",
                sourceText,
                sourceLanguage,
                translatedToGerman: false,
              } satisfies SubtitleRouteResponse,
              { status: 502 }
           ),
            auth
          );
       }

        throw error;
     }
    }

    return applyRefreshedAccessToken(
      NextResponse.json({
        text: translatedText,
        sourceText,
        sourceLanguage,
        translatedToGerman,
      } satisfies SubtitleRouteResponse),
      auth
    );
  } catch (error) {
    if (isRateLimitedError(error)) {
      console.warn("LiveView subtitle generation rate limited:", error);
      return applyRefreshedAccessToken(buildRateLimitedResponse(), auth);
    }

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