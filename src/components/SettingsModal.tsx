import { useState } from "react";
import { X, Plus, Trash2, KeyRound } from "lucide-react";
import { useProviders, ProviderId } from "../hooks/useProviders";

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { providers, addProvider, removeProvider, toggleProvider } = useProviders();
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newProviderId, setNewProviderId] = useState<ProviderId>("openai");

  if (!open) return null;

  const handleAdd = () => {
    if (!newLabel || !newKey) return;
    addProvider({ label: newLabel, apiKey: newKey, providerId: newProviderId, enabled: true });
    setNewLabel("");
    setNewKey("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg text-foreground">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <KeyRound className="h-5 w-5" /> API Keys & Providers
          </h2>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
          {providers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No API keys added yet. Add one below to start vibing!
            </p>
          )}
          
          {providers.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{p.label}</p>
                <p className="text-xs uppercase text-muted-foreground">{p.providerId}</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={p.enabled}
                  onChange={(e) => toggleProvider(p.id, e.target.checked)}
                  className="h-4 w-4"
                />
                <button onClick={() => removeProvider(p.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="mt-4 space-y-3 rounded-lg border bg-muted/50 p-4">
            <h3 className="text-sm font-medium">Add New Provider</h3>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newProviderId}
                onChange={(e) => setNewProviderId(e.target.value as ProviderId)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq</option>
              </select>
              <input
                type="text"
                placeholder="Label (e.g. Work Key)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <input
              type="password"
              placeholder="Paste your API key here (sk-...)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleAdd}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
