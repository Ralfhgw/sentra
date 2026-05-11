import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  applyRefreshedAccessToken,
  getAuthenticatedUserWithSettingsFromRequest,
} from "@/utils/serverAuth";
import type {
  ChatContextItem,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatWebSearchResult,
  ChatWebSearchSummary,
} from "@/types/typesAiChat";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONTEXT_ITEMS = 6;
const MAX_CONTEXT_LENGTH = 6000;

const WEB_SEARCH_RESULT_LIMIT = 5;

type SerpApiOrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
};

type SerpApiResponse = {
  organic_results?: SerpApiOrganicResult[];
  error?: string;
};

function normalizeText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const item = entry as Partial<ChatMessage> | null;
      const role =
        item?.role === "user" || item?.role === "assistant" ? item.role : null;
      const content = normalizeText(item?.content, MAX_MESSAGE_LENGTH);

      if (!role || !content) {
        return null;
      }

      return {
        id: normalizeText(item?.id, 120) || crypto.randomUUID(),
        role,
        content,
        createdAt:
          normalizeText(item?.createdAt, 80) || new Date().toISOString(),
      } satisfies ChatMessage;
    })
    .filter((item): item is ChatMessage => item !== null)
    .slice(-MAX_MESSAGES);
}

function normalizeContextItems(value: unknown): ChatContextItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
     const item = entry as Partial<ChatContextItem> | null;
      const label = normalizeText(item?.label, 120);
      const content = normalizeText(item?.content, MAX_CONTEXT_LENGTH);
      const type =
        item?.type === "markdown" || item?.type === "json" ? item.type : "text";
      if (!label || !content) {
        return null;
      }

      return {
        id: normalizeText(item?.id, 120) || crypto.randomUUID(),
        label,
        type,
        content,
      } satisfies ChatContextItem;
    })
    .filter((item): item is ChatContextItem => item !== null)
    .slice(0, MAX_CONTEXT_ITEMS);
}

function buildWebContextItem(summary: ChatWebSearchSummary): ChatContextItem {
  return {
    id: "web-search-context",
    label: `Web search: ${summary.query}`,
    type: "markdown",
    content: [
      `Search query: ${summary.query}`,
      ...summary.results.map((result, index) =>
        [
          `Result ${index + 1}`,
          `Title: ${result.title}`,
          `Link: ${result.link}`,
          `Snippet: ${result.snippet}`,
        ].join("\n")
      ),
    ].join("\n\n"),
  };
}

async function fetchWebSearchSummary(
  query: string,
  apiKey: string,
  lang: "de" | "en",
  countryCode?: string | null
): Promise<ChatWebSearchSummary> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", String(WEB_SEARCH_RESULT_LIMIT));
  url.searchParams.set("hl", lang === "de" ? "de" : "en");

  if (countryCode) {
    url.searchParams.set("gl", countryCode.toLowerCase());
  }

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Web search request failed");
  }

  const data = (await response.json()) as SerpApiResponse;

  if (data.error) {
   throw new Error(data.error);
  }

  const results = (data.organic_results ?? [])
    .map((result) => ({
      title: normalizeText(result.title, 240),
      link: normalizeText(result.link, 500),
      snippet: normalizeText(result.snippet, 1000),
    }))
    .filter((result) => result.title && result.link)
    .slice(0, WEB_SEARCH_RESULT_LIMIT) as ChatWebSearchResult[];
  return {
    query,
    results,
  };
}

function buildSystemPrompt(contextItems: ChatContextItem[]) {
  const baseInstructions = [
"You are Sentra's integrated AI assistant.",

"Be conversational, natural, intelligent, and emotionally aware.",
"Speak like a thoughtful human, not like a customer support bot.",

"Keep answers clear and concise, but allow warmth, humor, curiosity, and personality when appropriate.",

"If relevant context data is provided, use it naturally in your response.",
"If the available context is insufficient, say so instead of inventing facts.",

"Avoid sounding robotic, overly formal, or repetitive.",
"Do not use emojis.",
"Do not display Markdown.",
"Fasse dich kurz.",
"Stelle am Ende keine Fragen."
  ];

  if (contextItems.length === 0) {
    return baseInstructions.join("\n");
  }

  return [
    baseInstructions.join("\n"),
    "The app attached the following context data for this conversation:",
   ...contextItems.map((item, index) =>
      [
        `Context item ${index + 1}`,
        `Label: ${item.label}`,
        `Type: ${item.type}`,
        "Content:",
        item.content,
     ].join("\n")
    ),
  ].join("\n\n");
}

export async function POST(req: NextRequest) {
  let auth;

  try {
    auth = await getAuthenticatedUserWithSettingsFromRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nicht eingeloggt";

    return NextResponse.json({ error: message }, { status: 401 });
  }

  const claudeApiKey = auth.settings.key7?.trim();

  if (!claudeApiKey) {
    return applyRefreshedAccessToken(
      NextResponse.json(
       { error: "CLAUDE_API_KEY missing in user_settings" },
        { status: 400 }
      ),
      auth
    );
  }

  let payload: Partial<ChatRequest>;

  try {
    payload = (await req.json()) as Partial<ChatRequest>;
  } catch {
    return applyRefreshedAccessToken(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
      auth
    );
  }

  const conversationId =
    normalizeText(payload.conversationId, 120) || crypto.randomUUID();
  const messages = normalizeMessages(payload.messages);
  const useWebSearch = normalizeBoolean(payload.useWebSearch);
  const contextItems = normalizeContextItems(payload.contextItems);
  const mergedContextItems = [...contextItems];
  let webSearch: ChatWebSearchSummary | undefined;

  if (messages.length === 0) {
    return applyRefreshedAccessToken(
      NextResponse.json(
        { conversationId, error: "At least one chat message is required" },
        { status: 400 }
      ),
      auth
    );
  }

  if (messages[messages.length - 1]?.role !== "user") {
    return applyRefreshedAccessToken(
      NextResponse.json(
        {
          conversationId,
          error: "The last message must be a user message",
        },
        { status: 400 }
      ),
      auth
    );
  }

  if (useWebSearch) {
    const serpApiKey = auth.settings.key1?.trim();
    const lastUserMessage = messages[messages.length - 1]?.content.trim();

    if (!serpApiKey) {
      return applyRefreshedAccessToken(
        NextResponse.json(
          {
            conversationId,
            error: "SERPAPI_KEY missing in user_settings",
          },
          { status: 400 }
        ),
        auth
      );
    }

    if (lastUserMessage) {
      webSearch = await fetchWebSearchSummary(
        lastUserMessage,
        serpApiKey,
        auth.settings.lang,
       auth.settings.countryCode
      );

      if (webSearch.results.length > 0) {
        mergedContextItems.push(buildWebContextItem(webSearch));
      }
    }
  }

 const anthropic = new Anthropic({
    apiKey: claudeApiKey,
  });

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(mergedContextItems),
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n\n")
      .trim();

    if (!text) {
      throw new Error("Claude returned no text content");
    }

    const result: ChatResponse = {
      conversationId,
      message: {
        id: crypto.randomUUID(),
        role: "assistant",
        content: text,
        createdAt: new Date().toISOString(),
      },
      usage: {
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
      },
      webSearch,
    };

    return applyRefreshedAccessToken(NextResponse.json(result), auth);
  } catch (error) {
    console.error("Claude chat failed:", error);

    return applyRefreshedAccessToken(
      NextResponse.json(
        {
          conversationId,
          error: "Claude request failed",
        },
        { status: 500 }
      ),
      auth
    );
  }
}