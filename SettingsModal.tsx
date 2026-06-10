import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, ExternalLink, KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PROVIDERS, getProviderDef, maskKey } from "@/lib/vibe/providers";
import { loadSettings, saveSettings } from "@/lib/vibe/storage";
import type { ProviderKey, VibeSettings } from "@/lib/vibe/types";
import { nanoid } from "nanoid";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (settings: VibeSettings) => void;
}

export function SettingsModal({ open, onOpenChange, onSaved }: Props) {
  const [settings, setSettings] = useState<VibeSettings>({ providers: [] });
  const [adding, setAdding] = useState<string>("");
  const [draftKey, setDraftKey] = useState("");
  const [draftBaseURL, setDraftBaseURL] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "ok" | "fail">>({});

  useEffect(() => {
    if (open) {
      setSettings(loadSettings());
      setTestResults({});
    }
  }, [open]);

  function persist(next: VibeSettings) {
    setSettings(next);
    saveSettings(next);
    onSaved?.(next);
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
      id: nanoid(8),
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
        const r = await fetch(`${(pk.baseURL || def.defaultBaseURL).replace(/\/$/, "")}/models`, {
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
        const r = await fetch(`${(pk.baseURL || def.defaultBaseURL).replace(/\/$/, "")}/models`, {
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
    const def = getProviderDef(pk.providerId);
    persist({
      ...settings,
      defaultProviderKeyId: id,
      defaultModel: def?.models[0] ?? settings.defaultModel,
    });
  }

  function setDefaultModel(model: string) {
    persist({ ...settings, defaultModel: model });
  }

  const defaultProvider = settings.providers.find((p) => p.id === settings.defaultProviderKeyId);
  const defaultDef = defaultProvider ? getProviderDef(defaultProvider.providerId) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> AI Providers
          </DialogTitle>
          <DialogDescription>
            Add API keys for any AI provider. Keys are stored only in this browser's localStorage
            and sent directly to the provider — never to a VibeCoder server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {settings.providers.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No providers yet. Add your first one below.
            </div>
          )}

          {settings.providers.map((pk) => {
            const def = getProviderDef(pk.providerId);
            const isDefault = settings.defaultProviderKeyId === pk.id;
            const tr = testResults[pk.id];
            return (
              <div key={pk.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{pk.label}</span>
                    {isDefault && <Badge variant="default">Default</Badge>}
                    {tr === "ok" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {tr === "fail" && <AlertCircle className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => testKey(pk)}
                      disabled={testing === pk.id}
                    >
                      {testing === pk.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Test"
                      )}
                    </Button>
                    {!isDefault && (
                      <Button size="sm" variant="ghost" onClick={() => setDefaultProvider(pk.id)}>
                        Make default
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => removeProvider(pk.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{def?.name ?? pk.providerId}</span>
                  <span className="font-mono">{maskKey(pk.apiKey)}</span>
                  {pk.baseURL && <span className="font-mono truncate">{pk.baseURL}</span>}
                </div>
              </div>
            );
          })}

          {defaultProvider && defaultDef && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Default model</Label>
                <Select value={settings.defaultModel} onValueChange={setDefaultModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultDef.models.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Using {defaultProvider.label}. Type a custom model below if needed.
                </p>
                <Input
                  placeholder="Or type a custom model id"
                  value={settings.defaultModel ?? ""}
                  onChange={(e) => setDefaultModel(e.target.value)}
                />
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-3">
            <Label>Add a provider</Label>
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

            {adding && (
              <div className="space-y-2">
                {getProviderDef(adding)?.docsUrl && (
                  <a
                    href={getProviderDef(adding)!.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Get a key <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <Input
                  type="password"
                  placeholder={getProviderDef(adding)?.keyHint ?? "API key"}
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                />
                <Input
                  placeholder="Label (optional)"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                />
                {(getProviderDef(adding)?.requiresBaseURL ||
                  getProviderDef(adding)?.kind !== "gemini") && (
                  <Input
                    placeholder={`Base URL (default: ${getProviderDef(adding)?.defaultBaseURL || "—"})`}
                    value={draftBaseURL}
                    onChange={(e) => setDraftBaseURL(e.target.value)}
                  />
                )}
                <Button onClick={addProvider} className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}