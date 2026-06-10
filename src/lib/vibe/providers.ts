export interface ProviderDef {
  id: string;
  name: string;
  defaultBaseURL: string;
  models: string[];
  envName: string;
  // gemini uses native @google/genai; rest are openai-compatible
  kind: "gemini" | "openai-compat" | "anthropic";
  docsUrl: string;
  keyHint: string;
  requiresBaseURL?: boolean;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    defaultBaseURL: "https://generativelanguage.googleapis.com",
    models: [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
      "gemini-2.0-flash-thinking-exp",
    ],
    envName: "GEMINI_API_KEY",
    kind: "gemini",
    docsUrl: "https://aistudio.google.com/apikey",
    keyHint: "Starts with AIza...",
  },
  {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    defaultBaseURL: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o3-mini", "o1"],
    envName: "OPENAI_API_KEY",
    kind: "openai-compat",
    docsUrl: "https://platform.openai.com/api-keys",
    keyHint: "Starts with sk-...",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    defaultBaseURL: "https://api.anthropic.com/v1",
    models: [
      "claude-sonnet-4-5",
      "claude-opus-4-5",
      "claude-3-5-haiku-latest",
    ],
    envName: "ANTHROPIC_API_KEY",
    kind: "anthropic",
    docsUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "Starts with sk-ant-...",
  },
  {
    id: "lovable",
    name: "Lovable AI Gateway",
    defaultBaseURL: "https://ai.gateway.lovable.dev/v1",
    models: [
      "google/gemini-2.5-flash",
      "google/gemini-2.5-pro",
      "openai/gpt-5",
      "openai/gpt-5-mini",
    ],
    envName: "LOVABLE_API_KEY",
    kind: "openai-compat",
    docsUrl: "https://docs.lovable.dev/features/ai",
    keyHint: "From Lovable workspace",
  },
  {
    id: "xai",
    name: "xAI Grok",
    defaultBaseURL: "https://api.x.ai/v1",
    models: ["grok-2-latest", "grok-beta"],
    envName: "XAI_API_KEY",
    kind: "openai-compat",
    docsUrl: "https://console.x.ai",
    keyHint: "Starts with xai-...",
  },
  {
    id: "mistral",
    name: "Mistral",
    defaultBaseURL: "https://api.mistral.ai/v1",
    models: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
    envName: "MISTRAL_API_KEY",
    kind: "openai-compat",
    docsUrl: "https://console.mistral.ai/api-keys",
    keyHint: "32-char key",
  },
  {
    id: "groq",
    name: "Groq",
    defaultBaseURL: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    envName: "GROQ_API_KEY",
    kind: "openai-compat",
    docsUrl: "https://console.groq.com/keys",
    keyHint: "Starts with gsk_...",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    defaultBaseURL: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    envName: "DEEPSEEK_API_KEY",
    kind: "openai-compat",
    docsUrl: "https://platform.deepseek.com/api_keys",
    keyHint: "Starts with sk-...",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    defaultBaseURL: "https://openrouter.ai/api/v1",
    models: [
      "anthropic/claude-sonnet-4.5",
      "openai/gpt-5",
      "google/gemini-2.5-pro",
      "x-ai/grok-4",
      "meta-llama/llama-3.3-70b-instruct",
    ],
    envName: "OPENROUTER_API_KEY",
    kind: "openai-compat",
    docsUrl: "https://openrouter.ai/keys",
    keyHint: "Starts with sk-or-...",
  },
  {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    defaultBaseURL: "",
    models: [],
    envName: "CUSTOM_API_KEY",
    kind: "openai-compat",
    docsUrl: "",
    keyHint: "Any OpenAI-compatible endpoint",
    requiresBaseURL: true,
  },
];

export function getProviderDef(id: string): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 3)}…${key.slice(-4)}`;
}