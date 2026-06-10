import type { ProviderKey } from "./types";
import type { ProviderDef } from "./providers";
import { TOOL_SCHEMAS } from "./tools";

export interface UnifiedMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: { id: string; name: string; args: Record<string, unknown> }[];
  toolCallId?: string;
  toolName?: string;
}

export interface ModelResponse {
  content: string;
  toolCalls: { id: string; name: string; args: Record<string, unknown> }[];
}

export async function callModel(
  provider: ProviderKey,
  def: ProviderDef,
  model: string,
  messages: UnifiedMessage[],
): Promise<ModelResponse> {
  if (def.kind === "gemini") return callGemini(provider, model, messages);
  if (def.kind === "anthropic") return callAnthropic(provider, def, model, messages);
  return callOpenAICompat(provider, def, model, messages);
}

async function callOpenAICompat(
  provider: ProviderKey,
  def: ProviderDef,
  model: string,
  messages: UnifiedMessage[],
): Promise<ModelResponse> {
  const baseURL = (provider.baseURL || def.defaultBaseURL).replace(/\/$/, "");
  const oaMessages = messages.map((m) => {
    if (m.role === "tool") {
      return { role: "tool", content: m.content, tool_call_id: m.toolCallId };
    }
    if (m.role === "assistant" && m.toolCalls?.length) {
      return {
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.args) },
        })),
      };
    }
    return { role: m.role, content: m.content };
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (def.id === "lovable") {
    headers["Lovable-API-Key"] = provider.apiKey;
  } else {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
  }
  if (def.id === "openrouter") {
    headers["HTTP-Referer"] = typeof window !== "undefined" ? window.location.origin : "";
    headers["X-Title"] = "VibeCoder";
  }

  const tools = TOOL_SCHEMAS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages: oaMessages, tools, tool_choice: "auto" }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${def.name} API error ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  const choice = data.choices?.[0]?.message ?? {};
  const toolCalls = (choice.tool_calls ?? []).map((tc: any) => ({
    id: tc.id ?? crypto.randomUUID(),
    name: tc.function?.name ?? "",
    args: safeParse(tc.function?.arguments ?? "{}"),
  }));
  return { content: choice.content ?? "", toolCalls };
}

async function callAnthropic(
  provider: ProviderKey,
  def: ProviderDef,
  model: string,
  messages: UnifiedMessage[],
): Promise<ModelResponse> {
  const baseURL = (provider.baseURL || def.defaultBaseURL).replace(/\/$/, "");
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const anthMessages: any[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "tool") {
      anthMessages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: m.toolCallId,
            content: m.content,
          },
        ],
      });
      continue;
    }
    if (m.role === "assistant" && m.toolCalls?.length) {
      const blocks: any[] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const tc of m.toolCalls) {
        blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.args });
      }
      anthMessages.push({ role: "assistant", content: blocks });
      continue;
    }
    anthMessages.push({ role: m.role, content: m.content });
  }

  const tools = TOOL_SCHEMAS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));

  const res = await fetch(`${baseURL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system,
      messages: anthMessages,
      tools,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  const blocks = data.content ?? [];
  let content = "";
  const toolCalls: ModelResponse["toolCalls"] = [];
  for (const b of blocks) {
    if (b.type === "text") content += b.text;
    if (b.type === "tool_use")
      toolCalls.push({ id: b.id, name: b.name, args: b.input ?? {} });
  }
  return { content, toolCalls };
}

async function callGemini(
  provider: ProviderKey,
  model: string,
  messages: UnifiedMessage[],
): Promise<ModelResponse> {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const contents: any[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "tool") {
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: m.toolName ?? "tool",
              response: { result: m.content },
            },
          },
        ],
      });
      continue;
    }
    if (m.role === "assistant" && m.toolCalls?.length) {
      const parts: any[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const tc of m.toolCalls) {
        parts.push({ functionCall: { name: tc.name, args: tc.args } });
      }
      contents.push({ role: "model", parts });
      continue;
    }
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    });
  }

  const tools = [
    {
      functionDeclarations: TOOL_SCHEMAS.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(provider.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      tools,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  let content = "";
  const toolCalls: ModelResponse["toolCalls"] = [];
  for (const p of parts) {
    if (p.text) content += p.text;
    if (p.functionCall)
      toolCalls.push({
        id: crypto.randomUUID(),
        name: p.functionCall.name,
        args: p.functionCall.args ?? {},
      });
  }
  return { content, toolCalls };
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}