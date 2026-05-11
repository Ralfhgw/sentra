import { EdgeTTS } from "edge-tts-universal";
import { NextRequest, NextResponse } from "next/server";
import {
  applyRefreshedAccessToken,
  getAuthenticatedUserFromRequest,
} from "@/utils/serverAuth";

export const runtime = "nodejs";

type TtsRequest = {
  text?: string;
  lang?: "de" | "en";
  voice?: string;
};

// de-DE-KatjaNeural, de-DE-SeraphinaMultilingualNeural, en-US-EmmaMultilingualNeural
const DEFAULT_VOICES = {
  de: "de-DE-KatjaNeural",
  en: "en-US-EmmaMultilingualNeural",
} as const;

function normalizeText(value: unknown, maxLength: number) {
 return String(value ?? "").trim().slice(0, maxLength);
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
  let payload: TtsRequest;

  try {
    payload = (await req.json()) as TtsRequest;
  } catch {
    return applyRefreshedAccessToken(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
      auth
    );
  }

  const text = normalizeText(payload.text, 5000);
  const lang = payload.lang === "de" ? "de" : "en";
  const voice =
    normalizeText(payload.voice, 120) || DEFAULT_VOICES[lang];

  if (!text) {
    return applyRefreshedAccessToken(
      NextResponse.json({ error: "TTS text is required" }, { status: 400 }),
      auth
    );
  }

  try {
    const tts = new EdgeTTS(text, voice, {
      rate: "+8%",
      pitch: "+0Hz",
      volume: "+0%",
    });

    const result = await tts.synthesize();
    const audioBytes = new Uint8Array(await result.audio.arrayBuffer());
    return applyRefreshedAccessToken(
      new NextResponse(audioBytes, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
        },
      }),
      auth
    );
  } catch (error) {
    console.error("Edge TTS synthesis failed:", error);

    return applyRefreshedAccessToken(
      NextResponse.json(
        { error: "Edge TTS synthesis failed" },
        { status: 500 }
      ),
      auth
    );
  }
}