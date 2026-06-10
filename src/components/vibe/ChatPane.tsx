import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Wrench, AlertCircle, Sparkles, Clock, ListChecks, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { ChatMessage, FileMap, ProviderKey, Checkpoint } from "@/lib/vibe/types";
import { callModel, type UnifiedMessage } from "@/lib/vibe/agent";
import { executeTool, SYSTEM_PROMPT } from "@/lib/vibe/tools";
import { getProviderDef } from "@/lib/vibe/providers";
import { nanoid } from "nanoid";

interface Props {
  messages: ChatMessage[];
  files: FileMap;
  provider: ProviderKey | null;
  model: string;
  previewError?: string | null;
  onClearError?: () => void;
  plannerEnabled?: boolean;
  onTogglePlanner?: (v: boolean) => void;
  onCheckpoint?: (cp: Checkpoint) => void;
  onChange: (next: { messages: ChatMessage[]; files: FileMap }) => void;
  onOpenSettings: () => void;
}

const MAX_TOOL_CALLS = 30;

export function ChatPane({
  messages,
  files,
  provider,
  model,
  previewError,
  onClearError,
  plannerEnabled,
  onTogglePlanner,
  onCheckpoint,
  onChange,
  onOpenSettings,
}: Props) {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, running]);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Date.now() - start), 250);
    return () => clearInterval(t);
  }, [running]);

  async function send(promptOverride?: string) {
    const text = (promptOverride ?? input).trim();
    if (!text || running) return;
    if (!provider) {
      toast.error("Add an AI provider in Settings first");
      onOpenSettings();
      return;
    }
    const def = getProviderDef(provider.providerId);
    if (!def) return;

    const userMsg: ChatMessage = {
      id: nanoid(8),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    let currentMessages = [...messages, userMsg];
    let currentFiles = files;

    // Snapshot a checkpoint of files before this turn so we can revert
    if (onCheckpoint && Object.keys(currentFiles).length > 0) {
      onCheckpoint({
        id: nanoid(8),
        label: text.slice(0, 60),
        files: { ...currentFiles },
        createdAt: Date.now(),
      });
    }

    onChange({ messages: currentMessages, files: currentFiles });
    if (!promptOverride) setInput("");
    setRunning(true);
    setStepCount(0);
    const startedAt = Date.now();

    try {
      let systemPrompt = SYSTEM_PROMPT + "\n\nCurrent files:\n" + Object.keys(currentFiles).sort().join("\n");

      // Optional planner pre-step: do a short plain-text plan first
      if (plannerEnabled) {
        const planMsgs: UnifiedMessage[] = [
          {
            role: "system",
            content:
              "You are a senior product engineer. Given the user's request and the current file list, write a SHORT numbered plan (3-7 steps) in plain text. Do NOT call any tools. Do NOT write code. Be specific about files to create/edit.",
          },
          { role: "user", content: `Files:\n${Object.keys(currentFiles).sort().join("\n")}\n\nRequest: ${text}` },
        ];
        const plan = await callModel(provider, def, model, planMsgs);
        const planMsg: ChatMessage = {
          id: nanoid(8),
          role: "assistant",
          content: "📋 Plan\n\n" + (plan.content || "(no plan returned)"),
          createdAt: Date.now(),
        };
        currentMessages = [...currentMessages, planMsg];
        onChange({ messages: currentMessages, files: currentFiles });
        systemPrompt += "\n\nPlan you previously committed to:\n" + plan.content;
      }

      // Build unified history
      const unified: UnifiedMessage[] = [{ role: "system", content: systemPrompt }];
      for (const m of currentMessages) {
        if (m.role === "user") unified.push({ role: "user", content: m.content });
        else if (m.role === "assistant")
          unified.push({
            role: "assistant",
            content: m.content,
            toolCalls: m.toolCalls?.map((tc) => ({ id: tc.id, name: tc.name, args: tc.args })),
          });
        else if (m.role === "tool")
          unified.push({
            role: "tool",
            content: m.content,
            toolCallId: m.toolCalls?.[0]?.id,
            toolName: m.toolName,
          });
      }

      let totalSteps = 0;
      for (let i = 0; i < MAX_TOOL_CALLS; i++) {
        const resp = await callModel(provider, def, model, unified);
        totalSteps += 1;
        setStepCount(totalSteps);

        const assistantMsg: ChatMessage = {
          id: nanoid(8),
          role: "assistant",
          content: resp.content,
          toolCalls: resp.toolCalls.map((tc) => ({ id: tc.id, name: tc.name, args: tc.args })),
          createdAt: Date.now(),
        };
        currentMessages = [...currentMessages, assistantMsg];
        unified.push({
          role: "assistant",
          content: resp.content,
          toolCalls: resp.toolCalls,
        });
        onChange({ messages: currentMessages, files: currentFiles });

        if (resp.toolCalls.length === 0) break;

        let finished = false;
        for (const tc of resp.toolCalls) {
          const { result, files: nextFiles, finished: didFinish } = executeTool(
            tc.name,
            tc.args,
            currentFiles,
          );
          currentFiles = nextFiles;
          const toolMsg: ChatMessage = {
            id: nanoid(8),
            role: "tool",
            content: result,
            toolName: tc.name,
            toolCalls: [{ id: tc.id, name: tc.name, args: tc.args, result }],
            createdAt: Date.now(),
          };
          currentMessages = [...currentMessages, toolMsg];
          unified.push({
            role: "tool",
            content: result.slice(0, 8000),
            toolCallId: tc.id,
            toolName: tc.name,
          });
          if (didFinish) finished = true;
        }
        onChange({ messages: currentMessages, files: currentFiles });
        if (finished) break;
      }

      // Annotate last assistant message with duration + step count
      const dur = Date.now() - startedAt;
      const lastIdx = [...currentMessages].reverse().findIndex((m) => m.role === "assistant");
      if (lastIdx !== -1) {
        const realIdx = currentMessages.length - 1 - lastIdx;
        currentMessages = currentMessages.map((m, i) =>
          i === realIdx ? { ...m, durationMs: dur, steps: totalSteps } : m,
        );
        onChange({ messages: currentMessages, files: currentFiles });
      }
    } catch (e: any) {
      const errMsg: ChatMessage = {
        id: nanoid(8),
        role: "assistant",
        content: `⚠️ ${e.message ?? String(e)}`,
        createdAt: Date.now(),
      };
      onChange({ messages: [...currentMessages, errMsg], files: currentFiles });
      toast.error(e.message ?? "Agent error");
    } finally {
      setRunning(false);
    }
  }

  function fixError() {
    if (!previewError) return;
    const prompt = `The preview is showing this error — please fix it:\n\n${previewError}`;
    onClearError?.();
    send(prompt);
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">VibeCoder</span>
          {provider && (
            <Badge variant="secondary" className="text-xs">
              {model}
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={() => onTogglePlanner?.(!plannerEnabled)}
          className={`text-xs flex items-center gap-1 px-2 py-1 rounded border ${
            plannerEnabled ? "bg-primary/10 border-primary/50 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          title="When on, the agent writes a short plan before coding."
        >
          <ListChecks className="h-3 w-3" /> Plan first
        </button>
      </div>

      {previewError && !running && (
        <div className="border-b bg-red-500/10 px-4 py-2 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-red-600 dark:text-red-400">Preview error detected</div>
            <div className="text-xs text-muted-foreground truncate font-mono">{previewError}</div>
          </div>
          <Button size="sm" variant="outline" onClick={fixError} className="h-7">
            <Wand2 className="h-3 w-3 mr-1" /> Auto-fix
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-12">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Describe what you want to build.</p>
              <p className="text-xs mt-1">e.g. "a pomodoro timer with a dark theme"</p>
            </div>
          )}
          {messages.map((m) => (
            <MessageRow key={m.id} m={m} />
          ))}
          {running && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Working…</span>
              <span className="font-mono text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" /> {(elapsed / 1000).toFixed(1)}s
              </span>
              <span className="font-mono text-xs">· {stepCount} step{stepCount === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-3 space-y-2">
        <Textarea
          placeholder={
            provider ? "Tell the AI what to build…" : "Add an API key in Settings to start"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          rows={3}
          disabled={running}
          className="resize-none"
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">⌘+Enter to send</span>
          <Button onClick={() => send()} disabled={running || !input.trim()} size="sm">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="ml-1">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ m }: { m: ChatMessage }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap">
          {m.content}
        </div>
      </div>
    );
  }
  if (m.role === "tool") {
    const tc = m.toolCalls?.[0];
    const isError = m.content.startsWith("Error");
    return (
      <div className="text-xs flex items-start gap-2 text-muted-foreground">
        {isError ? (
          <AlertCircle className="h-3 w-3 mt-0.5 text-red-500" />
        ) : (
          <Wrench className="h-3 w-3 mt-0.5" />
        )}
        <div className="min-w-0">
          <span className="font-mono">{tc?.name}</span>
          {tc && "path" in tc.args && <span className="font-mono ml-1">({String((tc.args as any).path)})</span>}
          {tc && "from" in tc.args && (
            <span className="font-mono ml-1">
              ({String((tc.args as any).from)} → {String((tc.args as any).to)})
            </span>
          )}
        </div>
      </div>
    );
  }
  // assistant
  return (
    <div className="text-sm whitespace-pre-wrap leading-relaxed">
      {m.content}
      {(m.durationMs || m.steps) && (
        <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          {m.durationMs && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {(m.durationMs / 1000).toFixed(1)}s
            </span>
          )}
          {m.steps && <span>· {m.steps} step{m.steps === 1 ? "" : "s"}</span>}
        </div>
      )}
    </div>
  );
}