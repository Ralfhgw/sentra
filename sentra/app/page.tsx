"use client";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useCallback, useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { startpageTranslations } from "@/types/translations";
import { useSettings } from "@/context/SettingsContext";
import { MoveableScrollAreaVertical } from "@/components/CompMovableScrollAreaVertical";
import type { ChatContextItem, ChatMessage, ChatResponse, ChatWebSearchSummary } from "@/types/typesAiChat";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { PiSpeakerSimpleHighFill, PiSpeakerSimpleSlashFill } from "react-icons/pi";

type BackgroundMode = "loading" | "gradient" | "image";

type StartpageResponse = {
  url?: string | null;
  background?: "gradient";
  pending?: boolean;
};

type PanelMode = "info" | "petrol" | "chat";

type PetrolStation = {
  id: string;
  name: string;
  street: string;
  place: string;
  dist: number;
  diesel: number | null;
  e5: number | null;
  e10: number | null;
  isOpen: boolean;
};

type PetrolResponse = {
  license?: string;
  stations?: PetrolStation[];
  error?: string;
};

type BrowserSpeechRecognitionAlternative = {
  transcript: string;
};

type BrowserSpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: BrowserSpeechRecognitionAlternative;
};

type BrowserSpeechRecognitionResultList = {
  length: number;
  [index: number]: BrowserSpeechRecognitionResult;
};

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: BrowserSpeechRecognitionResultList;
};

type BrowserSpeechRecognitionErrorEvent = Event & {
  error?: string;
};
type BrowserSpeechRecognition = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type BrowserSpeechWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

type StoredChatState = {
  conversationId: string;
  messages: ChatMessage[];
};

const startpageRequestCache = new Map<string, Promise<StartpageResponse>>();
const BACKGROUND_RETRY_MS = 3000;
const MAX_BACKGROUND_RETRIES = 20;

function createChatMessage(
  role: ChatMessage["role"],
  content: string
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function formatChatMessageTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function fetchStartpageBackground(userId: string) {
  const existingRequest = startpageRequestCache.get(userId);
  if (existingRequest) {
    return existingRequest;
  }

  const request = fetch(`/api/startpage?userId=${userId}`, {
    cache: "no-store",
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error("Background request failed");
      }

      return (await res.json()) as StartpageResponse;
    })
    .finally(() => {
      startpageRequestCache.delete(userId);
    });

  startpageRequestCache.set(userId, request);
  return request;
}

const SPEECH_SUBMIT_DELAY_MS = 2200;

export default function Home() {
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id ?? null;
  const isAuthLoading = auth?.isLoading ?? false;

  const [infoVisible, setInfoVisible] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [panelMode, setPanelMode] = useState<PanelMode>("info");
  const [petrolStations, setPetrolStations] = useState<PetrolStation[]>([]);
  const [petrolLoading, setPetrolLoading] = useState(false);
  const [petrolError, setPetrolError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatContextInput, setChatContextInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(() => crypto.randomUUID());
  const [speechInputSupported, setSpeechInputSupported] = useState(false);
  const [speechOutputSupported, setSpeechOutputSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeakReplies, setAutoSpeakReplies] = useState(false);
  const [backgroundMode, setBackgroundMode] =
    useState<BackgroundMode>("loading");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const spokenAssistantMessageIdsRef = useRef(new Set<string>());
  const speechDraftPrefixRef = useRef("");
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const chatScrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const edgeTtsAbortRef = useRef<AbortController | null>(null);
  const resumeListeningAfterPlaybackRef = useRef(false);
  const sendChatMessageRef = useRef<
    (messageOverride?: string) => Promise<void>
  >(async () => { });
  const skipNextChatPersistRef = useRef(true);
  const shouldKeepListeningRef = useRef(false);
  const recognitionRestartTimeoutRef = useRef<number | null>(null);
  const speechSubmitTimeoutRef = useRef<number | null>(null);
  const speechFinalTranscriptRef = useRef("");
  const queuedSpeechMessageRef = useRef("");

  const fallbackGradient =
    "linear-gradient(135deg, #6b7280 0%, #8b949e 45%, #d1d5db 100%)";

  useEffect(() => {
    let cancelled = false;
    let retryTimeout: number | undefined;

    async function fetchImageUrl(attempt = 0) {
      console.log("[startpage] fetchImageUrl()", {
        userId,
        attempt,
        isAuthLoading,
      });

      if (isAuthLoading) {
        return;
      }

      if (!userId) {
        console.log("[startpage] no userId, using gradient fallback");
        setImageUrl(undefined);
        setBackgroundMode("gradient");
        return;
      }

      setImageUrl(undefined);
      setBackgroundMode("loading");

      try {
        const data = await fetchStartpageBackground(userId);
        console.log("[startpage] /api/startpage response", {
          userId,
          attempt,
          hasUrl: Boolean(data.url),
          pending: data.pending ?? false,
          background: data.background ?? "image",
          urlPreview: data.url ? data.url.slice(0, 80) : null,
        });

        if (cancelled) {
          return;
        }

        if (!data.url) {
          console.log("[startpage] no background URL returned, using gradient", {
            userId,
            pending: data.pending ?? false,
            attempt,
          });
          setImageUrl(undefined);
          setBackgroundMode("gradient");

          if (data.pending && attempt < MAX_BACKGROUND_RETRIES) {
            retryTimeout = window.setTimeout(() => {
              void fetchImageUrl(attempt + 1);
            }, BACKGROUND_RETRY_MS);
          }

          return;
        }

        const preloadedImage = new window.Image();

        preloadedImage.onload = () => {
          if (cancelled) {
            return;
          }

          console.log("[startpage] image preload success", {
            userId,
            attempt,
            urlPreview: data.url ? data.url.slice(0, 80) : null,
          });

          setImageUrl(data.url ?? undefined);
          setBackgroundMode("image");

          if (data.pending && attempt < MAX_BACKGROUND_RETRIES) {
            retryTimeout = window.setTimeout(() => {
              void fetchImageUrl(attempt + 1);
            }, BACKGROUND_RETRY_MS);
          }
        };

        preloadedImage.onerror = () => {
          if (cancelled) {
            return;
          }

          console.error("[startpage] image preload failed", {
            userId,
            attempt,
            urlPreview: data.url ? data.url.slice(0, 80) : null,
          });

          setImageUrl(undefined);
          setBackgroundMode("gradient");
        };

        preloadedImage.src = data.url;
      } catch (error) {
        console.error("Fehler beim Laden des Hintergrundbilds:", error);
        if (!cancelled) {
          setImageUrl(undefined);
          setBackgroundMode("gradient");
        }
      }
    }

    fetchImageUrl();

    return () => {
      cancelled = true;
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, [userId, isAuthLoading]);

  const handleToggle = () => {
    setInfoVisible((v) => !v);
    setPanelMode("info");
  };

  const { lang, settings } = useSettings();
  const t = startpageTranslations[lang];

  const petrolText =
    lang === "de"
      ? {
        title: "Aktuelle Benzinpreise",
        subtitle: "Prüfe die Liste nach dem besten Angebot.",
        back: "Zurück",
        loading: "Benzinpreise werden geladen...",
        error: "Die Benzinpreise konnten nicht geladen werden.",
        empty: "Es wurden keine Tankstellen gefunden.",
        missingLocation: "In den user_settings sind keine Koordinaten hinterlegt.",
        station: "Tankstelle",
        place: "Ort",
        diesel: "Diesel",
        e5: "E5",
        e10: "E10",
        distance: "Entfernung",
        status: "Status",
        open: "Offen",
        closed: "Geschlossen",
      }
      : {
        title: "Current fuel prices",
        subtitle: "Check scrollable area for the best offer.",
        back: "Back",
        loading: "Loading fuel prices...",
        error: "Fuel prices could not be loaded.",
        empty: "No stations were found.",
        missingLocation: "No coordinates are stored in user_settings.",
        station: "Station",
        place: "Town",
        diesel: "Diesel",
        e5: "E5",
        e10: "E10",
        distance: "Distance",
        status: "Status",
        open: "Open",
        closed: "Closed",
      };

  const chatText =
    lang === "de"
      ? {
        title: "KI Chat",
        button: "KI Chat",
        subtitle: "Stelle Fragen direkt an Claude in Sentra.",
        back: "Zurück",
        empty: "Noch kein Verlauf. Schreibe deine erste Nachricht.",
        loading: "Claude antwortet gerade...",
        inputPlaceholder: "Schreibe deine Nachricht an die KI...",
        contextPlaceholder: "Optional: Füge hier Notizen, JSON, Eventdaten oder andere Inhalte ein, die Claude bei jeder Antwort berücksichtigen soll.",
        send: "Senden",
        sending: "Sende...",
        clear: "Löschen",
        missingKey: "Bitte hinterlege zuerst den CLAUDE_API_KEY in den Settings.",
        error: "Die Antwort von Claude konnte nicht geladen werden.",
        user: "Du",
        assistant: "Claude",
        webSearch: "Web-Recherche",
        missingSearchKey: "Fuer Web-Recherche muss in den Settings zusaetzlich der SERPAPI_KEY hinterlegt sein.",
        webResultsIntro: "Ich habe diese aktuellen Web-Ergebnisse in meine Antwort einbezogen:",
        speechUnavailable: "Dieser Browser unterstützt die Web Speech API nicht vollständig.",
      }
      : {
        title: "AI Chat",
        button: "Chat",
        subtitle: "Ask Claude directly inside Sentra.",
        back: "Back",
        empty: "No chat history yet. Send your first message.",
        loading: "Claude is responding...",
        inputPlaceholder: "Write your message to the AI...",
        contextPlaceholder: "Optional: Add notes, JSON, event data, or other content that Claude should consider with every reply.",
        send: "Send",
        sending: "Sending...",
        clear: "Clear",
        missingKey:
          "Please add the CLAUDE_API_KEY in the settings first.",
        error: "Claude's response could not be loaded.",
        user: "You",
        assistant: "Claude",
        webSearch: "Web search",
        missingSearchKey: "To use web search, add the SERPAPI_KEY in the settings as well.",
        webResultsIntro: "I included these current web results in my reply:",
        speechUnavailable: "This browser does not fully support the Web Speech API.",
      };

  const formatFuelPrice = (price: number | null | undefined) =>
    typeof price === "number" && price > 0 ? `${price.toFixed(3)} EUR` : "-";

  const handlePetrolPanelClick = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    const target = e.target as HTMLElement;

    if (target.closest("[data-scroll-lock-close='true']")) {
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    setPanelMode("info");
  };

  useEffect(() => {
    if (panelMode !== "petrol") {
      return;
    }

    if (settings.lat == null || settings.lon == null) {
      setPetrolStations([]);
      setPetrolLoading(false);
      setPetrolError(petrolText.missingLocation);
      return;
    }

    const controller = new AbortController();

    async function fetchPetrolStations() {
      setPetrolLoading(true);
      setPetrolError(null);

      try {
        const res = await fetch("/api/petrol", {
          cache: "no-store",
          signal: controller.signal,
        });

        const data = (await res.json()) as PetrolResponse;

        if (!res.ok) {
          throw new Error(data.error ?? "Petrol request failed");
        }

        setPetrolStations(data.stations ?? []);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Fehler beim Laden der Benzinpreise:", error);
        setPetrolStations([]);
        setPetrolError(petrolText.error);
      } finally {
        if (!controller.signal.aborted) {
          setPetrolLoading(false);
        }
      }
    }

    void fetchPetrolStations();

    return () => controller.abort();
  }, [
    panelMode,
    lang,
    settings.lat,
    settings.lon,
    petrolText.error,
    petrolText.missingLocation,
  ]);

  const lowestPrices = {
    e5: Math.min(...petrolStations.map((station) => station.e5 ?? Number.POSITIVE_INFINITY)),
    e10: Math.min(...petrolStations.map((station) => station.e10 ?? Number.POSITIVE_INFINITY)),
    diesel: Math.min(...petrolStations.map((station) => station.diesel ?? Number.POSITIVE_INFINITY)),
  };

  const isLowestPrice = (
    value: number | null,
    fuelType: keyof typeof lowestPrices
  ) => value != null && value === lowestPrices[fuelType];

  const hasClaudeApiKey = Boolean(settings.key7?.trim());
  const hasSerpApiKey = Boolean(settings.key1?.trim());
  const chatStorageKey = userId ? `sentra:chat:${userId}` : null;

  const focusChatInput = () => {
    if (typeof window === "undefined") {
      chatInputRef.current?.focus();
      return;
    }

    window.requestAnimationFrame(() => {
      const element = chatInputRef.current;
      if (!element) {
        return;
      }

      element.focus();
      const length = element.value.length;
      element.setSelectionRange(length, length);
    });
  };

  const stopEdgeTtsPlayback = useCallback(() => {
    edgeTtsAbortRef.current?.abort();
    edgeTtsAbortRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const restartSpeechRecognition = useCallback(() => {
    const recognition = recognitionRef.current;

    resumeListeningAfterPlaybackRef.current = false;

    if (!recognition) {
      return;
    }

    try {
      shouldKeepListeningRef.current = true;
      recognition.lang = lang === "de" ? "de-DE" : "en-US";
      recognition.start();
      setIsListening(true);
      setChatError(null);
      speechDraftPrefixRef.current = "";
    } catch (error) {
      console.error("Speech recognition restart after playback failed:", error);
      shouldKeepListeningRef.current = false;
      setIsListening(false);
    }
  }, [lang]);

  const pauseListeningForPlayback = useCallback(() => {
    const recognition = recognitionRef.current;

    if (!recognition || (!isListening && !shouldKeepListeningRef.current)) {
      resumeListeningAfterPlaybackRef.current = false;
      return;
    }

    resumeListeningAfterPlaybackRef.current = true;
    shouldKeepListeningRef.current = false;

    if (recognitionRestartTimeoutRef.current !== null) {
      window.clearTimeout(recognitionRestartTimeoutRef.current);
      recognitionRestartTimeoutRef.current = null;
    }

    try {
      recognition.stop();
    } catch (error) {
      console.error("Speech recognition pause for playback failed:", error);
    }

    setIsListening(false);
    speechDraftPrefixRef.current = "";
  }, [isListening]);

  const speakWithEdgeTts = useCallback(async (text: string) => {
    if (typeof window === "undefined" || !speechOutputSupported) {
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      return;
    }

    pauseListeningForPlayback();
    stopEdgeTtsPlayback();

    const controller = new AbortController();
    edgeTtsAbortRef.current = controller;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
       credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          text: trimmedText,
          lang,
        }),
      });

      if (!res.ok) {
        throw new Error("TTS request failed");
      }

      const audioBlob = await res.blob();

      if (controller.signal.aborted) {
        return;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        if (audioUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          audioUrlRef.current = null;
        }
        if (audioRef.current === audio) {
          audioRef.current = null;
        }

        if (resumeListeningAfterPlaybackRef.current) {
          restartSpeechRecognition();
        }
      };

      audio.onerror = () => {
        stopEdgeTtsPlayback();

        if (resumeListeningAfterPlaybackRef.current) {
          restartSpeechRecognition();
        }
      };

      await audio.play();
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      console.error("Edge TTS playback failed:", error);
      stopEdgeTtsPlayback();

      if (resumeListeningAfterPlaybackRef.current) {
        restartSpeechRecognition();
      }
    }
  }, [
    lang,
    pauseListeningForPlayback,
    restartSpeechRecognition,
    speechOutputSupported,
    stopEdgeTtsPlayback,
  ]);

  useEffect(() => {
    skipNextChatPersistRef.current = true;

    if (typeof window === "undefined") {
      return;
    }

    if (!chatStorageKey) {
      setChatMessages([]);
      setChatConversationId(crypto.randomUUID());
      return;
    }

    try {
      const raw = window.localStorage.getItem(chatStorageKey);

      if (!raw) {
        setChatMessages([]);
        setChatConversationId(crypto.randomUUID());
        return;
      }

      const parsed = JSON.parse(raw) as Partial<StoredChatState>;

      setChatConversationId(
        typeof parsed.conversationId === "string" && parsed.conversationId.trim()
          ? parsed.conversationId
          : crypto.randomUUID()
      );
      setChatMessages(Array.isArray(parsed.messages) ? parsed.messages : []);
    } catch (error) {
      console.error("Stored chat could not be restored:", error);
      setChatMessages([]);
      setChatConversationId(crypto.randomUUID());
    }
  }, [chatStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !chatStorageKey) {
      return;
    }

    if (skipNextChatPersistRef.current) {
      skipNextChatPersistRef.current = false;
      return;
    }

    try {
      if (chatMessages.length === 0) {
        window.localStorage.removeItem(chatStorageKey);
        return;
      }
      const payload: StoredChatState = {
        conversationId: chatConversationId,
        messages: chatMessages,
      };

      window.localStorage.setItem(chatStorageKey, JSON.stringify(payload));
    } catch (error) {
      console.error("Stored chat could not be saved:", error);
    }
  }, [chatConversationId, chatMessages, chatStorageKey]);

  const formatWebSearchMessage = (summary: ChatWebSearchSummary) =>
    [
      chatText.webResultsIntro,
      ...summary.results.map((result, index) =>
        [
          `${index + 1}. ${result.title}`,
          result.snippet,
          result.link,
        ]
          .filter(Boolean)
          .join("\n")
      ),
    ].join("\n\n");

  const clearSpeechSubmitTimeout = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      speechSubmitTimeoutRef.current !== null
    ) {
      window.clearTimeout(speechSubmitTimeoutRef.current);
      speechSubmitTimeoutRef.current = null;
    }
  }, []);

  const queueSpeechSubmit = useCallback(() => {
    if (typeof window === "undefined") {
     return;
    }

    clearSpeechSubmitTimeout();

    speechSubmitTimeoutRef.current = window.setTimeout(() => {
      const finalMessage = [
        speechDraftPrefixRef.current,
        speechFinalTranscriptRef.current,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (!finalMessage) {
       return;
      }

      if (recognitionRestartTimeoutRef.current !== null) {
        window.clearTimeout(recognitionRestartTimeoutRef.current);
        recognitionRestartTimeoutRef.current = null;
      }

      try {
        recognitionRef.current?.stop();
      } catch (error) {
        console.error("Speech recognition stop before submit failed:", error);
      }

     speechDraftPrefixRef.current = "";
      speechFinalTranscriptRef.current = "";
      speechSubmitTimeoutRef.current = null;

      void sendChatMessageRef.current(finalMessage);
   }, SPEECH_SUBMIT_DELAY_MS);
  }, [clearSpeechSubmitTimeout]);

  const sendChatMessage = async (messageOverride?: string) => {
    if (!hasClaudeApiKey) {
      return;
    }

    const trimmedMessage = (messageOverride ?? chatInput).trim();

    if (chatLoading) {
      if (messageOverride && trimmedMessage) {
        queuedSpeechMessageRef.current = [
          queuedSpeechMessageRef.current,
          trimmedMessage,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        setChatInput(queuedSpeechMessageRef.current);
      }

      return;
    }

    if (useWebSearch && !hasSerpApiKey) {
      setChatError(chatText.missingSearchKey);
      focusChatInput();
      return;
    }

    if (!trimmedMessage) {
      return;
    }

    const userMessage = createChatMessage("user", trimmedMessage);
    const nextMessages = [...chatMessages, userMessage];
    const contextItems: ChatContextItem[] = chatContextInput.trim()
      ? [
        {
          id: "manual-context",
          label: lang === "de" ? "Zusatzdaten" : "Additional context",
          type: "text",
          content: chatContextInput.trim(),
        },
      ]
      : [];

    setChatMessages(nextMessages);
    setChatInput("");
    setChatError(null);
    setChatLoading(true);
    clearSpeechSubmitTimeout();
    speechDraftPrefixRef.current = "";
    speechFinalTranscriptRef.current = "";
    if (queuedSpeechMessageRef.current === trimmedMessage) {
      queuedSpeechMessageRef.current = "";
    }
    focusChatInput();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          conversationId: chatConversationId,
          messages: nextMessages,
          contextItems,
          useWebSearch,
        }),
      });

      const data = (await res.json()) as ChatResponse;

      if (!res.ok || !data.message) {
        throw new Error(data.error ?? chatText.error);
      }

      const assistantMessages = data.webSearch?.results.length
        ? [
          createChatMessage("assistant", formatWebSearchMessage(data.webSearch)),
          data.message,
        ]
        : [data.message];
      setChatMessages([...nextMessages, ...assistantMessages]);
    } catch (error) {
      console.error("Chat request failed:", error);
      setChatError(error instanceof Error ? error.message : chatText.error);
      setChatInput(trimmedMessage);
      focusChatInput();
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = () => {
    if (typeof window !== "undefined" && chatStorageKey) {
      window.localStorage.removeItem(chatStorageKey);
    }

    clearSpeechSubmitTimeout();
    setChatMessages([]);
    setChatInput("");
    setChatError(null);
    setChatLoading(false);
    setChatConversationId(crypto.randomUUID());
    speechDraftPrefixRef.current = "";
    speechFinalTranscriptRef.current = "";
    queuedSpeechMessageRef.current = "";
    focusChatInput();
  };

  sendChatMessageRef.current = sendChatMessage;

  useEffect(() => {
    if (chatLoading) {
      return;
    }

    const queuedMessage = queuedSpeechMessageRef.current.trim();

    if (!queuedMessage) {
      return;
    }

    queuedSpeechMessageRef.current = "";
    void sendChatMessageRef.current(queuedMessage);
  }, [chatLoading]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const speechWindow = window as BrowserSpeechWindow;
    const RecognitionCtor =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    setSpeechInputSupported(Boolean(RecognitionCtor));
    setSpeechOutputSupported(typeof Audio !== "undefined");

    if (!RecognitionCtor) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang === "de" ? "de-DE" : "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim();

        if (result.isFinal && transcript) {
          finalTranscript += `${transcript} `;
        } else if (transcript) {
          interimTranscript += `${transcript} `;
        }
      }

      const prefix = speechDraftPrefixRef.current;

      const nextFinalTranscript = finalTranscript.trim()
        ? [speechFinalTranscriptRef.current, finalTranscript.trim()]
            .filter(Boolean)
            .join(" ")
        : speechFinalTranscriptRef.current;

      speechFinalTranscriptRef.current = nextFinalTranscript;

      const draftMessage = [
        prefix,
        nextFinalTranscript,
        interimTranscript.trim(),
      ]
        .filter(Boolean)
        .join(" ");

      if (draftMessage) {
        setChatInput(draftMessage);
      }

      if (!finalTranscript.trim()) {
        clearSpeechSubmitTimeout();
        return;
      }

      queueSpeechSubmit();
    };

    recognition.onerror = (event) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        shouldKeepListeningRef.current = false;
        clearSpeechSubmitTimeout();
        setIsListening(false);
        speechDraftPrefixRef.current = "";
        speechFinalTranscriptRef.current = "";
      }
    };

    recognition.onend = () => {
      if (!shouldKeepListeningRef.current) {
        setIsListening(false);
        speechDraftPrefixRef.current = "";
        return;
      }

      console.log("[speech] restarting recognition after submit/end");

      if (recognitionRestartTimeoutRef.current !== null) {
        window.clearTimeout(recognitionRestartTimeoutRef.current);
      }

      recognitionRestartTimeoutRef.current = window.setTimeout(() => {
        if (!shouldKeepListeningRef.current) {
          return;
        }

        try {
          recognition.lang = lang === "de" ? "de-DE" : "en-US";
          recognition.start();
          setIsListening(true);
        } catch (error) {
          console.error("Speech recognition restart failed:", error);
          setIsListening(false);
        }
      }, 200);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      if (recognitionRestartTimeoutRef.current !== null) {
        window.clearTimeout(recognitionRestartTimeoutRef.current);
        recognitionRestartTimeoutRef.current = null;
      }
      clearSpeechSubmitTimeout();
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [clearSpeechSubmitTimeout, lang, queueSpeechSubmit]);

  useEffect(() => {
    return () => {
      stopEdgeTtsPlayback();
    };
  }, [stopEdgeTtsPlayback]);

  useEffect(() => {
    if (
      !autoSpeakReplies ||
      !speechOutputSupported ||
      typeof window === "undefined"
    ) {
      return;
    }

    const lastAssistantMessage = [...chatMessages]
      .reverse()
      .find((message) => message.role === "assistant");

    if (!lastAssistantMessage) {
      return;
    }

    if (spokenAssistantMessageIdsRef.current.has(lastAssistantMessage.id)) {
      return;
    }
    spokenAssistantMessageIdsRef.current.add(lastAssistantMessage.id);
    // Sprachausgabe
    void speakWithEdgeTts(lastAssistantMessage.content);
  }, [autoSpeakReplies, chatMessages, speakWithEdgeTts, speechOutputSupported]);

  useEffect(() => {
    if (panelMode !== "chat") {
      return;
    }

    if (typeof window === "undefined") {
      chatScrollAnchorRef.current?.scrollIntoView();
      return;
    }

    window.requestAnimationFrame(() => {
      chatScrollAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, [panelMode, chatMessages, chatLoading]);

  const handleToggleListening = () => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      return;
    }

    if (isListening) {
      shouldKeepListeningRef.current = false;
      clearSpeechSubmitTimeout();
      if (recognitionRestartTimeoutRef.current !== null) {
        window.clearTimeout(recognitionRestartTimeoutRef.current);
        recognitionRestartTimeoutRef.current = null;
      }
      recognition.stop();
      setIsListening(false);
      speechDraftPrefixRef.current = "";
      speechFinalTranscriptRef.current = "";
      return;
    }

    try {
      shouldKeepListeningRef.current = true;
      recognition.lang = lang === "de" ? "de-DE" : "en-US";
      speechDraftPrefixRef.current = chatInput.trim();
      speechFinalTranscriptRef.current = "";
      clearSpeechSubmitTimeout();
      recognition.start();
      setIsListening(true);
      setChatError(null);
    } catch (error) {
      console.error("Speech recognition could not be started:", error);
      setIsListening(false);
    }
  };

  const handleToggleAutoSpeak = () => {
    setAutoSpeakReplies((current) => {
      const nextValue = !current;

      if (nextValue) {
        const lastAssistantMessage = [...chatMessages]
          .reverse()
          .find((message) => message.role === "assistant");

        if (lastAssistantMessage) {
          spokenAssistantMessageIdsRef.current.add(lastAssistantMessage.id);
        }
      }

      if (!nextValue) {
        stopEdgeTtsPlayback();

        if (resumeListeningAfterPlaybackRef.current) {
          restartSpeechRecognition();
        }
      }

      return nextValue;
    });
  };

  const handleChatSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void sendChatMessage();
  };

  const handleChatInputKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      event.key === "Enter" &&
      event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void sendChatMessage();
    }
  };

  return (
    <ProtectedRoute>
      <div
        className="flex justify-center items-center bg-gray-300"
        style={{
          width: "100vw",
          overflow: "hidden",
          backgroundImage:
            backgroundMode === "image" && imageUrl
              ? `url(${imageUrl})`
              : fallbackGradient,
          backgroundColor: "#9ca3af",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          cursor: "pointer",
          position: "relative",
        }}
        onClick={handleToggle}
      >
        {backgroundMode === "image"
          && (
            <>
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
            </>
          )
        }

        {infoVisible && panelMode === "info" && (
          <div
            className="mt-8 p-4 border border-white flex flex-col  rounded-xl shadow-2xl backdrop-blur-md"
            style={{
              maxWidth: "900px",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
            }}
            onClick={handlePetrolPanelClick}
          >
            <h1
              className="mt-2 text-5xl text-center font-bold text-orange-400"
              style={{ textShadow: "0 2px 3px rgba(0,0,0,0.5)" }}
            >
              {t.title}
              <sup className="text-base align-top">&copy;</sup>
            </h1>

            <p className="max-w-xl my-3 mx-2 text-gray-200 text-lg">
              {t.description}
            </p>

            <p className="max-w-xl my-3 mx-2 text-gray-200 font-bold text-lg hidden lg:block">
              {t.descriptionlg}
            </p>

            <p className="max-w-xl my-3 mx-2 text-gray-200 font-bold text-lg block lg:hidden">
              {t.descriptionsm}
            </p>

            <div className="flex flex-col gap-1">
              {/* Additional Tools */}
              <div className=" rounded-xl border border-white">
                <p className="max-w-xl my-2 text-center font-bold text-gray-200 ">
                  {t.toolinfo}
                </p>

                <div className="p-1 flex flex-row flex-wrap align-left gap-2">
                  <p
                    className="w-24 h-10 p-2 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
                    style={{
                      boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
                    }}
                  >
                    <button
                      type="button"
                      className="h-full w-full relative block font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPanelMode("petrol");
                      }}
                    >

                      <span className="text-sm relative z-10 flex items-center justify-center h-full w-full">
                        {t.petrol}
                      </span>
                    </button>
                  </p>
                  <p
                    className="w-24 h-10 p-2 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
                    style={{
                      boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
                    }}
                  >
                    <button
                      type="button"
                      className="h-full w-full relative block font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPanelMode("chat");
                      }}
                    >
                      <span className="text-sm relative z-10 flex items-center justify-center h-full w-full">
                        {chatText.button}
                      </span>
                    </button>
                  </p>
                </div>
              </div>

              {/* User Info and Technical Data */}
              <div className="p-1 rounded-xl border border-white">
                <p className="max-w-xl my-2 text-center font-bold text-gray-200 ">
                  {t.userinfo}
                </p>
                <div className="flex flex-row justify-between gap-2">
                  <p
                    className="w-23 h-10 p-2 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
                    style={{
                      boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
                    }}
                  >
                    <Link
                      href={`/readme?doc=news#${lang === "de" ? "deutsche-sprache" : "english-language"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full h-full font-medium relative z-10"
                    >
                      <span className="text-sm absolute inset-0 flex items-center justify-center z-10">{t.news}</span>
                    </Link>
                  </p>

                  <p
                    className="w-23 h-10 p-2 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
                    style={{
                      boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
                    }}
                  >
                    <Link
                      href={`/readme?doc=weather#${lang === "de" ? "deutsche-sprache" : "english-language"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full h-full font-medium relative z-10"
                    >
                      <span className="text-sm absolute inset-0 flex items-center justify-center z-10">{t.weather}</span>
                    </Link>
                  </p>

                  <p
                    className="w-23 h-10 p-2 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
                    style={{
                      boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
                    }}
                  >
                    <Link
                      href={`/readme?doc=liveview#${lang === "de" ? "deutsche-sprache" : "english-language"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full h-full font-medium relative z-10"
                    >
                      <span className="text-sm absolute inset-0 flex items-center justify-center z-10">{t.liveview}</span>
                    </Link>
                  </p>

                  <p
                    className="w-23 h-10 p-2 transition bg-gray-200 ring-1 ring-gray-700 border-b-4 border-gray-500 text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-xl cursor-pointer active:shadow-md"
                    style={{
                      boxShadow: "6px 8px 20px 0 rgba(31,38,135,0.25)",
                    }}
                  >
                    <Link
                      href={`/readme?doc=livetalk#${lang === "de" ? "deutsche-sprache" : "english-language"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full h-full font-medium relative z-10"
                    >
                      <span className="text-sm absolute inset-0 flex items-center justify-center z-10">{t.livetalk}</span>
                    </Link>
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {infoVisible && panelMode === "petrol" && (
          <div
            className="mt-8 p-4 border border-white rounded-xl shadow-2xl backdrop-blur-md"
            style={{
              maxWidth: "900px",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2
                  className="text-3xl font-bold text-orange-400"
                  style={{ textShadow: "0 2px 3px rgba(0,0,0,0.5)" }}
                >
                  {petrolText.title}
                </h2>
                <p className="text-sm text-white">{petrolText.subtitle}</p>
              </div>
              <button
                type="button"
                className="self-start rounded-lg border border-gray-400 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200"
                onClick={(e) => {
                  e.stopPropagation();
                  setPanelMode("info");
                }}
              >
                {petrolText.back}
              </button>
            </div>

            {petrolLoading ? (
              <p className="py-6 text-center text-white">{petrolText.loading}</p>
            ) : petrolError ? (
              <p className="py-6 text-center font-semibold text-red-700">{petrolError}</p>
            ) : petrolStations.length === 0 ? (
              <p className="py-6 text-center text-white">{petrolText.empty}</p>
            ) : (
              <MoveableScrollAreaVertical className="max-h-[60vh] rounded-xl ring-1 ring-gray-300 w-full markdown overflow-hidden">

                <table className="min-w-full bg-white/75 text-sm text-gray-800">
                  <tbody>
                    {petrolStations.map((station) => (
                      <tr key={station.id} className="bg-green-300/40 border border-green-700 flex flex-wrap rounded-xl">

                        <td className={`w-full px-3 p-1 rounded-t-xl flex flex-col gap-1 ${station.isOpen ? 'bg-green-200 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <span className="text-xs font-bold text-gray-900 leading-tight">{station.place} - {station.name} </span>
                          <span className="text-xs text-gray-500 uppercase tracking-wide">{station.street}</span>
                        </td>

                        <td className={`flex-1 px-4 rounded-bl-xl text-center ${isLowestPrice(station.e5, "e5") ? "bg-orange-200 font-bold rounded-lg" : ""}`}>
                          <div className="text-[10px] text-gray-500 uppercase">{petrolText.e5}</div>
                          <div className="font-medium text-black">{formatFuelPrice(station.e5)}</div>
                        </td>

                        <td className={`flex-1 px-4 text-center ${isLowestPrice(station.e10, "e10") ? "bg-orange-200 font-bold rounded-lg" : ""}`}>
                          <div className="text-[10px] text-gray-500 uppercase">{petrolText.e10}</div>
                          <div className="font-medium text-black">{formatFuelPrice(station.e10)}</div>
                        </td>

                        <td className={`flex-1 px-4 text-center ${isLowestPrice(station.diesel, "diesel") ? "bg-orange-200 font-bold rounded-lg" : ""}`}>
                          <div className="text-[10px] text-gray-500 uppercase">{petrolText.diesel}</div>
                          <div className="font-medium text-black">{formatFuelPrice(station.diesel)}</div>
                        </td>

                        <td className="rounded-br-xl flex-1 px-4 text-right">
                          <div className="text-[10px] text-gray-500 uppercase">{petrolText.distance}</div>
                          <div className="font-medium text-black">{station.dist.toFixed(1)} km</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </MoveableScrollAreaVertical>

            )}
          </div>
        )}

        {infoVisible && panelMode === "chat" && (
          <div className="mt-14 w-full lg:w-225 p-4 border border-white rounded-xl shadow-2xl backdrop-blur-md"
            style={{
              maxWidth: "900px",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Titelbox */}
            <div className="mb-4 flex flex-row justify-between gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2
                  className="text-3xl font-bold text-orange-400"
                  style={{ textShadow: "0 2px 3px rgba(0,0,0,0.5)" }}
                >
                  {chatText.title}
                </h2>
                <p className="text-sm text-white">{chatText.subtitle}</p>
              </div>
              <button
                type="button"
                className="self-start rounded-lg border border-gray-400 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200"
                onClick={(e) => {
                  e.stopPropagation();
                  setPanelMode("info");
                }}
              >
                {chatText.back}
              </button>
            </div>

            <div className="gap-4 grid lg:grid-cols-[minmax(0,1fr)_280px]">
              {/* Chatverlauf */}
              <MoveableScrollAreaVertical className="h-80 rounded-xl ring-1 ring-white/40 w-full markdown overflow-hidden">
                <div className="flex min-h-full flex-col gap-3 bg-black/15 p-4">
                  {chatMessages.length === 0 ? (
                    <p className="m-auto max-w-md text-white! text-center text-sm">
                      {chatText.empty}
                    </p>
                  ) : (
                    chatMessages.slice(-5).map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.role === "user"
                          ? "self-end bg-orange-300/90 text-gray-900"
                          : "self-start bg-white/85 text-gray-900"
                          }`}
                      >
                        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide">
                          <span>
                            {message.role === "user" ? chatText.user : chatText.assistant}
                          </span>
                          <span className="text-gray-800/40">
                            {` - ${formatChatMessageTimestamp(message.createdAt)}`}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap wrap-break-word">
                          {message.content}
                        </p>
                      </div>
                    ))
                  )}

                  {chatLoading && (
                    <div className="max-w-[85%] self-start rounded-2xl bg-white/85 px-4 py-3 text-sm text-gray-900 shadow-sm">
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide opacity-70">
                        {chatText.assistant}
                      </div>
                      <p>{chatText.loading}</p>
                    </div>
                  )}
                  <div ref={chatScrollAnchorRef} />
                </div>
              </MoveableScrollAreaVertical>

              {/* Messagebox */}
              <div className="flex flex-col">
                {/* Inputfeld */}
                <form className="mt-4 flex flex-col gap-3" onSubmit={handleChatSubmit}>
                  {!hasClaudeApiKey && (
                    <p className="rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900">
                      {chatText.missingKey}
                    </p>
                  )}

                  {useWebSearch && !hasSerpApiKey && (
                    <p className="rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900">
                      {chatText.missingSearchKey}
                    </p>
                  )}

                  {chatError && (
                    <p className="rounded-xl border border-red-300 bg-red-100 px-4 py-3 text-sm font-medium text-red-800">
                      {chatError}
                    </p>
                  )}

                  {!speechInputSupported && !speechOutputSupported && (
                    <p className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      {chatText.speechUnavailable}
                    </p>
                  )}

                  <textarea
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatInputKeyDown}
                    placeholder={chatText.inputPlaceholder}
                    rows={4}
                    disabled={!hasClaudeApiKey}
                    className="h-50 w-full resize-none rounded-xl border border-white/30 bg-white/90 px-4 py-3 text-sm text-gray-900 outline-none disabled:cursor-not-allowed disabled:bg-gray-200"
                  />
                  <div className="flex flex-wrap justify-between gap-2">
                    <div className="flex gap-2">
                      {speechInputSupported && (
                        <button
                          type="button"
                          onClick={handleToggleListening}
                          disabled={!hasClaudeApiKey || chatLoading}
                          className="rounded-xl border border-gray-400 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isListening
                            ? <FaMicrophone />
                            : <FaMicrophoneSlash />}
                        </button>
                      )}

                      {speechOutputSupported && (
                        <button
                          type="button"
                          onClick={handleToggleAutoSpeak}
                          className="rounded-xl border border-gray-400 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200"
                        >
                          {autoSpeakReplies
                            ? <PiSpeakerSimpleHighFill />
                            : <PiSpeakerSimpleSlashFill />}
                        </button>
                      )}
                    </div>

                    {/* Web-Recherche */}
                    <label className=" flex items-start gap-3 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={useWebSearch}
                        onChange={(e) => setUseWebSearch(e.target.checked)}
                        className="mt-1"
                      />
                      <span className="block font-semibold">{chatText.webSearch}</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleClearChat}
                      disabled={chatLoading || (chatMessages.length === 0 && !chatInput.trim())}
                      className="rounded-xl border border-gray-400 bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {chatText.clear}
                    </button>

                    <button
                      type="submit"
                      disabled={!hasClaudeApiKey || chatLoading || !chatInput.trim()}
                      className="mx-auto rounded-xl border border-gray-400 bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {chatLoading ? chatText.sending : chatText.send}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Zusatzdaten */}
            <div className="mt-3 flex flex-row rounded-xl border border-white/40 bg-black/20 p-4">
              <textarea
                value={chatContextInput}
                onChange={(e) => setChatContextInput(e.target.value)}
                placeholder={chatText.contextPlaceholder}
                className="mt-3 h-25 w-full resize-none rounded-xl border border-white/30 bg-white/85 px-3 py-2 text-sm text-gray-900 outline-none"
              />
            </div>

          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
