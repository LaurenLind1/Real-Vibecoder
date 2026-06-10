export type FileMap = Record<string, string>;

export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  toolCalls?: ToolCall[];
  toolName?: string;
  createdAt: number;
  durationMs?: number;
  steps?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  error?: string;
}

export interface ProviderKey {
  id: string;
  providerId: string; // gemini | openai | anthropic | lovable | xai | mistral | groq | deepseek | openrouter | custom
  label: string;
  apiKey: string;
  baseURL?: string;
  createdAt: number;
}

export interface Checkpoint {
  id: string;
  label: string;
  files: FileMap;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  files: FileMap;
  messages: ChatMessage[];
  selectedProviderId?: string;
  selectedModel?: string;
  checkpoints?: Checkpoint[];
  plannerEnabled?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface VibeSettings {
  providers: ProviderKey[];
  defaultProviderKeyId?: string;
  defaultModel?: string;
}