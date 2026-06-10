import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Settings,
  Download,
  ArrowLeft,
  Sparkles,
  History,
  Undo2,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  KeyRound,
  Loader2,
} from "lucide-react";
import { getProviderDef, PROVIDERS, maskKey } from "@/lib/vibe/providers";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { SettingsModal } from "./SettingsModal";
import { ChatPane } from "./ChatPane";
import { EditorPane } from "./EditorPane";
import { PreviewPane } from "./PreviewPane";
import { loadSettings, saveSettings } from "@/lib/vibe/storage";
import type { Project, VibeSettings, ProviderKey, ChatMessage, FileMap, Checkpoint } from "@/lib/vibe/types";

interface Props {
  project: Project;
  onChange: (next: Project) => void;
}

export function ProjectShell({ project, onChange }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<VibeSettings>({ providers: [] });
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string>("");
  const [draftKey, setDraftKey] = useState("");
  const [draftBaseURL, setDraftBaseURL] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "ok" | "fail">>({});

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function persist(next: VibeSettings) {
    setSettings(next);
    saveSettings(next);
  }

  function addProvider() {
    if (!adding || !draftKey.trim()) {
      toast.error("Pick a provider and paste an API key");
      return;
    }
    const def = getProviderDef(adding)!;
    if (def.requiresBaseURL && !draftBaseURL.trim()) {
      toast.error("Custom provider needs a base URL");
      return;
    }
    const newKey: ProviderKey = {
      id: crypto.randomUUID(),
      providerId: adding,
      label: draftLabel.trim() || def.name,
      apiKey: draftKey.trim(),
      baseURL: draftBaseURL.trim() || undefined,
      createdAt: Date.now(),
    };
    const next: VibeSettings = {
      ...settings,
      providers: [...settings.providers, newKey],
      defaultProviderKeyId: settings.defaultProviderKeyId ?? newKey.id,
      defaultModel: settings.defaultModel ?? def.models[0],
    };
    persist(next);
    setAdding("");
    setDraftKey("");
    setDraftBaseURL("");
    setDraftLabel("");
    toast.success(`Added ${def.name}`);
  }

  function removeProvider(id: string) {
    const next: VibeSettings = {
      ...settings,
      providers: settings.providers.filter((p) => p.id !== id),
    };
    if (next.defaultProviderKeyId === id) {
      next.defaultProviderKeyId = next.providers[0]?.id;
      const def = next.providers[0] ? getProviderDef(next.providers[0].providerId) : undefined;
      next.defaultModel = def?.models[0];
    }
    persist(next);
    if (project.selectedProviderId === id) {
      onChange({ ...project, selectedProviderId: next.providers[0]?.id });
    }
  }

  async function testKey(pk: ProviderKey) {
    const def = getProviderDef(pk.providerId);
    if (!def) return;
    setTesting(pk.id);
    try {
      if (def.kind === "gemini") {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(pk.apiKey)}`,
        );
        if (!r.ok) throw new Error(String(r.status));
      } else if (def.kind === "anthropic") {
        const r = await fetch(`${(pk.baseURL || def.defaultBaseURL).replace(/\/+$/, "")}/models`, {
          headers: {
            "x-api-key": pk.apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
        });
        if (!r.ok) throw new Error(String(r.status));
      } else {
        const headers: Record<string, string> = {};
        if (def.id === "lovable") headers["Lovable-API-Key"] = pk.apiKey;
        else headers["Authorization"] = `Bearer ${pk.apiKey}`;
        const r = await fetch(`${(pk.baseURL || def.defaultBaseURL).replace(/\/+$/, "")}/models`, {
          headers,
        });
        if (!r.ok) throw new Error(String(r.status));
      }
      setTestResults((s) => ({ ...s, [pk.id]: "ok" }));
      toast.success("Key works");
    } catch (e: any) {
      setTestResults((s) => ({ ...s, [pk.id]: "fail" }));
      toast.error(`Key test failed: ${e.message ?? e}`);
    } finally {
      setTesting(null);
    }
  }

  function setDefaultProvider(id: string) {
    const pk = settings.providers.find((p) => p.id === id);
    if (!pk) return;
    persist({
      ...settings,
      defaultProviderKeyId: id,
      defaultModel: getProviderDef(pk.providerId)?.models[0] ?? settings.defaultModel,
    });
  }

  function setDefaultModel(model: string) {
    persist({ ...settings, defaultModel: model });
  }

  useEffect(() => {
    if (settings.providers.length === 0) {
      setSettingsOpen(true);
    }
  }, [settings.providers.length]);

  const provider = useMemo(() => {
    const id = project.selectedProviderId ?? settings.defaultProviderKeyId;
    return settings.providers.find((p) => p.id === id) ?? settings.providers[0] ?? null;
  }, [project.selectedProviderId, settings]);

  const model = project.selectedModel ?? settings.defaultModel ?? "";

  function updateChat(next: { messages: ChatMessage[]; files: FileMap }) {
    onChange({ ...project, messages: next.messages, files: next.files });
  }

  function addCheckpoint(cp: Checkpoint) {
    const list = [...(project.checkpoints ?? []), cp].slice(-20);
    onChange({ ...project, checkpoints: list });
  }

  function revertTo(cp: Checkpoint) {
    onChange({ ...project, files: { ...cp.files } });
    toast.success(`Reverted to "${cp.label}"`);
  }

  function setPlanner(v: boolean) {
    onChange({ ...project, plannerEnabled: v });
  }

  async function exportZip() {
    const [{ default: JSZip }, { saveAs }] = await Promise.all([
      import("jszip"),
      import("file-saver"),
    ]);
    const zip = new JSZip();
    for (const [path, content] of Object.entries(project.files)) {
      zip.file(path.replace(/^\//, ""), content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${project.name.replace(/\s+/g, "-").toLowerCase()}.zip`);
    toast.success("Downloaded zip");
  }

  const checkpoints = [...(project.checkpoints ?? [])].reverse();

  // Helpers for selecting provider/model per project
  function setProjectProvider(id?: string) {
    const next: Project = { ...project, selectedProviderId: id };
    // If selecting a provider, set a sensible default model if none selected
    if (id) {
      const pk = settings.providers.find((p) => p.id === id);
      const def = pk ? getProviderDef(pk.providerId) : undefined;
      if (def && def.models?.[0]) next.selectedModel = next.selectedModel ?? def.models[0];
    } else {
      next.selectedModel = undefined;
    }
    onChange(next);
  }

  function setProjectModel(model?: string) {
    onChange({ ...project, selectedModel: model });
  }

  const selectedProviderKeyId = project.selectedProviderId ?? "default";
  const selectedProviderKey = settings.providers.find((p) => p.id === selectedProviderKeyId) ?? null;
  const activeProviderKey = project.selectedProviderId
    ? settings.providers.find((p) => p.id === project.selectedProviderId) ?? null
    : settings.providers.find((p) => p.id === settings.defaultProviderKeyId) ?? settings.providers[0] ?? null;
  const activeProviderDef = activeProviderKey ? getProviderDef(activeProviderKey.providerId) : undefined;
  const activeModel = project.selectedModel ?? settings.defaultModel ?? activeProviderDef?.models?.[0] ?? "";

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold">{project.name}</div>
              <p className="text-sm text-muted-foreground">
                Build with local API keys and switch AI providers without sending secrets to a server.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  <History className="h-4 w-4 mr-1" /> History
                  {checkpoints.length > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">({checkpoints.length})</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-2 max-h-96 overflow-y-auto">
                {checkpoints.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2">
                    Each chat turn creates a checkpoint you can revert to.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {checkpoints.map((cp) => (
                      <div
                        key={cp.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{cp.label || "(empty)"}</div>
                          <div className="text-muted-foreground">
                            {new Date(cp.createdAt).toLocaleTimeString()} · {" "}
                            {Object.keys(cp.files).length} files
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => revertTo(cp)}>
                          <Undo2 className="h-3 w-3 mr-1" /> Revert
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <Button size="sm" variant="outline" onClick={exportZip}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-1" /> Settings
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden px-6 py-6">
          <aside className="flex w-full max-w-[380px] flex-col gap-4 overflow-y-auto pr-2">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">API key manager</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add keys locally, pick your provider, and choose the model for this project.
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs uppercase tracking-[0.12em]">
                  {activeProviderKey ? "Ready" : "Empty"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {activeProviderKey?.label ?? "No provider"}
                </Badge>
                {activeModel ? (
                  <Badge variant="outline" className="text-xs">
                    {activeModel}
                  </Badge>
                ) : null}
              </div>

              {settings.providers.length === 0 ? (
                <div className="mt-6 rounded-[28px] border border-dashed p-5 text-center text-sm text-muted-foreground">
                  No providers yet. Add one below to get started.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {settings.providers.map((pk) => {
                    const def = getProviderDef(pk.providerId);
                    const isDefault = settings.defaultProviderKeyId === pk.id;
                    const tr = testResults[pk.id];
                    return (
                      <div key={pk.id} className="rounded-[28px] border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                              <span className="truncate">{pk.label}</span>
                              {isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {def?.name ?? pk.providerId} • {maskKey(pk.apiKey)}
                            </p>
                            {pk.baseURL ? (
                              <p className="text-xs text-muted-foreground truncate">{pk.baseURL}</p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => testKey(pk)} disabled={testing === pk.id}>
                              {testing === pk.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
                            </Button>
                            {!isDefault ? (
                              <Button size="sm" variant="ghost" onClick={() => setDefaultProvider(pk.id)}>
                                Make default
                              </Button>
                            ) : null}
                            <Button size="icon" variant="ghost" onClick={() => removeProvider(pk.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {tr === "ok" && <p className="mt-2 text-xs text-emerald-600">Key test succeeded</p>}
                        {tr === "fail" && <p className="mt-2 text-xs text-red-600">Key test failed</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {settings.providers.length > 0 ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Project provider</Label>
                    <Select value={selectedProviderKeyId} onValueChange={(v) => setProjectProvider(v === "default" ? undefined : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Use default</SelectItem>
                        {settings.providers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Project model</Label>
                    <Select value={project.selectedModel ?? settings.defaultModel} onValueChange={(v) => setProjectModel(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Model" />
                      </SelectTrigger>
                      <SelectContent>
                        {(activeProviderDef?.models ?? []).map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3 text-sm font-semibold">
                <KeyRound className="h-4 w-4" />
                <span>Add an API key</span>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Provider</Label>
                  <Select value={adding} onValueChange={setAdding}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a provider…" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {adding ? (
                  <div className="space-y-4">
                    {getProviderDef(adding)?.docsUrl && (
                      <a
                        href={getProviderDef(adding)!.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Get a key <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <div>
                      <Label>API key</Label>
                      <Input
                        type="password"
                        placeholder={getProviderDef(adding)?.keyHint ?? "API key"}
                        value={draftKey}
                        onChange={(e) => setDraftKey(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Label (optional)</Label>
                      <Input
                        placeholder="My OpenAI key"
                        value={draftLabel}
                        onChange={(e) => setDraftLabel(e.target.value)}
                      />
                    </div>
                    {(getProviderDef(adding)?.requiresBaseURL || getProviderDef(adding)?.kind !== "gemini") && (
                      <div>
                        <Label>Base URL</Label>
                        <Input
                          placeholder={`Base URL (default: ${getProviderDef(adding)?.defaultBaseURL || "—"})`}
                          value={draftBaseURL}
                          onChange={(e) => setDraftBaseURL(e.target.value)}
                        />
                      </div>
                    )}
                    <Button onClick={addProvider} className="w-full">
                      <Plus className="h-4 w-4 mr-1" /> Save provider
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>

          <main className="ml-4 flex min-w-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_120px_-80px_rgba(15,23,42,0.25)]">
            <div className="border-b border-slate-200 px-6 py-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-semibold">Workspace</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Interact with your selected provider and preview generated output.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>Provider:</span>
                  <span className="font-medium text-foreground">{activeProviderKey?.label ?? "None"}</span>
                  {activeModel ? <span>· {activeModel}</span> : null}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden">
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                <ResizablePanel defaultSize={28} minSize={20}>
                  <ChatPane
                    messages={project.messages}
                    files={project.files}
                    provider={provider}
                    model={model}
                    previewError={previewError}
                    onClearError={() => setPreviewError(null)}
                    plannerEnabled={project.plannerEnabled}
                    onTogglePlanner={setPlanner}
                    onCheckpoint={addCheckpoint}
                    onChange={updateChat}
                    onOpenSettings={() => setSettingsOpen(true)}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={72}>
                  <Tabs defaultValue="preview" className="h-full flex flex-col">
                    <div className="border-b px-2 pt-1">
                      <TabsList className="h-8">
                        <TabsTrigger value="preview" className="text-xs">
                          Preview
                        </TabsTrigger>
                        <TabsTrigger value="code" className="text-xs">
                          Code
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="preview" className="flex-1 m-0">
                      <PreviewPane files={project.files} onError={setPreviewError} />
                    </TabsContent>
                    <TabsContent value="code" className="flex-1 m-0">
                      <EditorPane
                        files={project.files}
                        onChange={(files) => onChange({ ...project, files })}
                      />
                    </TabsContent>
                  </Tabs>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </main>
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={(s) => setSettings(s)}
      />
    </div>
  );
}