import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";
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
const MAX_RECENT_MESSAGES = 8;
const MAX_RETRIEVED_MEMORIES = 4;
const SUMMARY_TRIGGER_MESSAGES = 12;
const SUMMARY_REFRESH_BATCH_SIZE = 4;
const SUMMARY_SOURCE_MAX_CHARS = 12000;
const SUMMARY_MAX_CHARS = 2500;

const WEB_SEARCH_RESULT_LIMIT = 5;
const DEBUG_CLAUDE_LOGGING = process.env.NODE_ENV !== "production";

type ConversationMetadata = {
  summaryMessageCount?: number;
};

type ConversationRow = {
  id: string;
  public_id: string;
  user_id: string;
  rolling_summary: string | null;
  summary_updated_at: string | null;
  metadata: ConversationMetadata | string | null;
};

type StoredMessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type MemoryRow = {
  id: string;
  memory_kind: string;
  content: string;
  created_at: string;
};

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

function parseConversationMetadata(
  value: ConversationRow["metadata"]
): ConversationMetadata {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as ConversationMetadata;
    } catch {
      return {};
    }
  }

  return value;
}

function buildSummaryContextItem(summary: string): ChatContextItem {
  return {
    id: "conversation-summary",
    label: "Conversation summary",
    type: "markdown",
    content: summary,
  };
}

function buildMemoryContextItem(memories: MemoryRow[]): ChatContextItem {
  return {
    id: "retrieved-memories",
    label: "Relevant memory",
    type: "markdown",
    content: memories
      .map((memory, index) =>
        [
          `Memory ${index + 1}`,
          `Kind: ${memory.memory_kind}`,
          "Content:",
          memory.content,
        ].join("\n")
      )
      .join("\n\n"),
  };
}


async function getOrCreateConversation(
  publicId: string,
  userId: string
): Promise<ConversationRow> {
  const [existing] = await sql<ConversationRow[]>`
    SELECT id, public_id, user_id, rolling_summary, summary_updated_at, metadata
   FROM ai_chat.conversations
    WHERE public_id = ${publicId}::varchar
      AND user_id = ${userId}::uuid
    LIMIT 1
  `;

  if (existing) {
    return existing;
  }
  const [inserted] = await sql<ConversationRow[]>`
    INSERT INTO ai_chat.conversations (
      public_id,
      user_id,
      last_message_at
    )
    VALUES (
      ${publicId}::varchar,
      ${userId}::uuid,
      NOW()
    )
    RETURNING id, public_id, user_id, rolling_summary, summary_updated_at, metadata
  `;

  return inserted;
}


async function loadStoredMessages(
  conversationDbId: string,
  userId: string
): Promise<StoredMessageRow[]> {
  return sql<StoredMessageRow[]>`
    SELECT id, role, content, created_at
    FROM ai_chat.messages
    WHERE conversation_id = ${conversationDbId}::uuid
      AND user_id = ${userId}::uuid
      AND role IN ('user', 'assistant')
   ORDER BY created_at ASC
  `;
}

async function syncConversationMessagesFromPayload(
  conversation: ConversationRow,
  incomingMessages: ChatMessage[]
): Promise<StoredMessageRow[]> {
  const existingMessages = await loadStoredMessages(
    conversation.id,
    conversation.user_id
  );

  if (existingMessages.length === 0) {
    if (incomingMessages.length === 0) {
      return [];
    }

    await sql.begin(async (tx) => {
      const trx = tx as unknown as typeof sql;
      const initialTitle = incomingMessages[0]?.content.slice(0, 80) || null;
      const lastCreatedAt =
        incomingMessages[incomingMessages.length - 1]?.createdAt ?? null;

      for (const message of incomingMessages) {
        await trx`
      INSERT INTO ai_chat.messages (
        conversation_id,
        user_id,
        role,
        content,
        created_at
      )
      VALUES (
            ${conversation.id}::uuid,
            ${conversation.user_id}::uuid,
            ${message.role}::text,
            ${message.content}::text,
            ${message.createdAt}::timestamptz
      )
    `;
      }

      await trx`
    UPDATE ai_chat.conversations
    SET
          title = COALESCE(title, ${initialTitle}::text),
          last_message_at = ${lastCreatedAt}::timestamptz
        WHERE id = ${conversation.id}::uuid
          AND user_id = ${conversation.user_id}::uuid
  `;
    });
    return loadStoredMessages(conversation.id, conversation.user_id);
  }

  const latestIncoming = incomingMessages[incomingMessages.length - 1];
  const latestStored = existingMessages[existingMessages.length - 1];

  if (!latestIncoming) {
    return existingMessages;
  }

  const isDuplicate =
    latestStored?.role === latestIncoming.role &&
    latestStored?.content === latestIncoming.content &&
    latestStored?.created_at === latestIncoming.createdAt;
  if (isDuplicate) {
    return existingMessages;
  }

  await sql.begin(async (tx) => {
    const trx = tx as unknown as typeof sql;

    await trx`
    INSERT INTO ai_chat.messages (
      conversation_id,
      user_id,
      role,
      content,
      created_at
    )
    VALUES (
        ${conversation.id}::uuid,
        ${conversation.user_id}::uuid,
        ${latestIncoming.role}::text,
        ${latestIncoming.content}::text,
        ${latestIncoming.createdAt}::timestamptz
    )
  `;

    await trx`
    UPDATE ai_chat.conversations
      SET last_message_at = ${latestIncoming.createdAt}::timestamptz
      WHERE id = ${conversation.id}::uuid
        AND user_id = ${conversation.user_id}::uuid
  `;
  });

  return loadStoredMessages(conversation.id, conversation.user_id);
}

async function maybeRefreshRollingSummary(
  anthropic: Anthropic,
  conversation: ConversationRow,
  storedMessages: StoredMessageRow[]
): Promise<string | null> {
  const summarySource = storedMessages.slice(
    0,
    Math.max(0, storedMessages.length - MAX_RECENT_MESSAGES)
  );
  const metadata = parseConversationMetadata(conversation.metadata);
  const alreadySummarizedCount = metadata.summaryMessageCount ?? 0;
  const pendingSummaryCount = summarySource.length - alreadySummarizedCount;

  if (
    summarySource.length < SUMMARY_TRIGGER_MESSAGES ||
    pendingSummaryCount < SUMMARY_REFRESH_BATCH_SIZE
  ) {
    return conversation.rolling_summary;
  }

  const transcript = summarySource
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n")
    .slice(-SUMMARY_SOURCE_MAX_CHARS);

  const summaryRequest = {
    model: CLAUDE_MODEL,
    max_tokens: 400,
    system: [
      "You maintain a compact rolling memory for a chat application.",
      "Summarize only durable context that should survive future turns.",
      "Keep user preferences, facts, commitments, ongoing tasks, and decisions.",
      "Do not include filler, greetings, or wording that only matters once.",
      "Return plain text only.",
    ].join("\n"),
    messages: [
      {
        role: "user" as const,
        content: [
          "Existing summary:",
          conversation.rolling_summary ?? "(none)",
          "",
          "Transcript to merge into the summary:",
          transcript,
        ].join("\n"),
      },
    ],
  } satisfies MessageCreateParamsNonStreaming;

  if (DEBUG_CLAUDE_LOGGING) {
    console.log(
      "[chat] Summary request preview:\n" +
      JSON.stringify(
        {
          conversationDbId: conversation.id,
          conversationPublicId: conversation.public_id,
          hasExistingSummary: Boolean(conversation.rolling_summary),
          existingSummaryLength: conversation.rolling_summary?.length ?? 0,
          transcriptLength: transcript.length,
          transcriptPreview: transcript.slice(0, 1500),
          summaryRequest,
        },
        null,
        2
      )
    );
  }

  const response = await anthropic.messages.create(summaryRequest);

  const summary = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n\n")
    .trim()
    .slice(0, SUMMARY_MAX_CHARS);

  if (!summary) {
    return conversation.rolling_summary;
  }

  await sql`
    UPDATE ai_chat.conversations
    SET
      rolling_summary = ${summary}::text,
      summary_updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
       'summaryMessageCount',
         ${summarySource.length}::int
      )
    WHERE id = ${conversation.id}::uuid
      AND user_id = ${conversation.user_id}::uuid
  `;

  return summary;
}

async function findRelevantMemories(
  userId: string,
  conversationDbId: string,
  query: string
): Promise<MemoryRow[]> {
  const searchTerm = query.trim();

  if (!searchTerm) {
    return [];
  }

  // Fallback-Ranking. Sobald embeddings in ai_chat.memories gepflegt werden,
  // ersetzt du nur diese Query durch eine pgvector-Similarity-Suche.
  return sql<MemoryRow[]>`
    SELECT id, memory_kind, content, created_at
    FROM ai_chat.memories
    WHERE user_id = ${userId}::uuid
      AND (
        conversation_id = ${conversationDbId}::uuid
        OR content ILIKE ${`%${searchTerm}%`}::text
      )
    ORDER BY
      CASE WHEN conversation_id = ${conversationDbId}::uuid THEN 0 ELSE 1 END,
      importance DESC,
      last_accessed_at DESC NULLS LAST,
      created_at DESC
    LIMIT ${MAX_RETRIEVED_MEMORIES}::int
 `;
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

function buildCurrentTimeContextItem() {
  return {
    id: "current-time",
    label: "Current time",
    type: "text",
    content: `Current timestamp: ${new Date().toISOString()}`,
  } satisfies ChatContextItem;
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
  const mergedContextItems = [buildCurrentTimeContextItem(), ...contextItems];
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

  const anthropic = new Anthropic({
    apiKey: claudeApiKey,
  });

  const latestUserMessage = messages[messages.length - 1]!;
  const conversation = await getOrCreateConversation(conversationId, auth.userId);
  const storedMessages = await syncConversationMessagesFromPayload(
    conversation,
    messages
  );
  const rollingSummary = await maybeRefreshRollingSummary(
    anthropic,
    conversation,
    storedMessages
  );
  const retrievedMemories = await findRelevantMemories(
    auth.userId,
    conversation.id,
    latestUserMessage.content
  );

  if (rollingSummary) {
    mergedContextItems.unshift(buildSummaryContextItem(rollingSummary));
  }

  if (retrievedMemories.length > 0) {
    mergedContextItems.push(buildMemoryContextItem(retrievedMemories));
  }

  if (useWebSearch) {
    const serpApiKey = auth.settings.key1?.trim();
    const lastUserMessage = latestUserMessage.content.trim();

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

  try {
    const recentMessagesForModel: MessageCreateParamsNonStreaming["messages"] = storedMessages
      .slice(-MAX_RECENT_MESSAGES)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));
    const claudeRequest = {
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(mergedContextItems),
      messages: recentMessagesForModel,
    } satisfies MessageCreateParamsNonStreaming;

    if (DEBUG_CLAUDE_LOGGING) {
      console.log(
        "[chat] Claude request preview:\n" +
        JSON.stringify(
          {
            conversationDbId: conversation.id,
            conversationPublicId: conversation.public_id,
            userId: auth.userId,
            recentMessageCount: recentMessagesForModel.length,
            recentMessagesForModel,
            contextItems: mergedContextItems,
            claudeRequest,
          },
          null,
          2
        )
      );
    }

    const response = await anthropic.messages.create(claudeRequest);

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n\n")
      .trim();

    if (DEBUG_CLAUDE_LOGGING) {
      console.log("[chat] Claude response preview:", {
        conversationDbId: conversation.id,
        conversationPublicId: conversation.public_id,
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
        responseTextPreview: text.slice(0, 1500),
      });
    }

    if (!text) {
      throw new Error("Claude returned no text content");
    }

    const assistantCreatedAt = new Date().toISOString();

    await sql.begin(async (tx) => {
      const trx = tx as unknown as typeof sql;
      const title = latestUserMessage.content.slice(0, 80);

      await trx`
    INSERT INTO ai_chat.messages (
      conversation_id,
      user_id,
      role,
      content,
      token_count,
      created_at
    )
    VALUES (
      ${conversation.id}::uuid,
      ${auth.userId}::uuid,
      'assistant',
      ${text}::text,
      ${response.usage?.output_tokens ?? null}::int,
      ${assistantCreatedAt}::timestamptz
    )
  `;

      await trx`
    UPDATE ai_chat.conversations
    SET
      title = COALESCE(title, ${title}::text),
      last_message_at = ${assistantCreatedAt}::timestamptz
      WHERE id = ${conversation.id}::uuid
      AND user_id = ${auth.userId}::uuid
  `;
    });

    const result: ChatResponse = {
      conversationId,
      message: {
        id: crypto.randomUUID(),
        role: "assistant",
        content: text,
        createdAt: assistantCreatedAt,
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