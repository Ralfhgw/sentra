export type ChatRole = "user" | "assistant";

export type ChatContextItemType = "text" | "markdown" | "json";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type ChatContextItem = {
  id: string;
  label: string;
  type: ChatContextItemType;
  content: string;
};

export type ChatWebSearchResult = {
  title: string;
  link: string;
  snippet: string;
};

export type ChatWebSearchSummary = {
  query: string;
  results: ChatWebSearchResult[];
};

export type ChatRequest = {
  conversationId: string;
  messages: ChatMessage[];
  contextItems?: ChatContextItem[];
  useWebSearch?: boolean;
};

export type ChatUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
};

export type ChatResponse = {
  conversationId: string;
  message?: ChatMessage;
  usage?: ChatUsage;
  webSearch?: ChatWebSearchSummary;
  error?: string;
};