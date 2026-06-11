import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Key, X, Trash2 } from "lucide-react";

export const Route = createFileRoute("/p/$projectId")({
  component: Dashboard,
});

type AIModel =
  | "gemini-2.5-flash"
  | "gemini-2.5-pro"
  | "gpt-4o"
  | "claude-3.7-sonnet"
  | "local-llama"
  | "mistral"
  | "groq"
  | "deepseek"
  | "openrouter"
  | "custom";

type KeyProvider = "gemini" | "openai" | "anthropic" | "local" | "mistral" | "groq" | "deepseek" | "openrouter" | "custom";

interface SavedCredential {
  id: string;
  provider: KeyProvider;
  label: string;
  key: string;
}

function Dashboard() {
  const [selectedModel, setSelectedModel] = useState<AIModel>("gemini-2.5-flash");
  const [code, setCode] = useState<string>(
    `// Selected Engine: ${selectedModel}\nfunction init() {\n  console.log("Hello from your sandbox workspace!");\n}`
  );
  const [systemPrompt, setSystemPrompt] = useState<string>(
    "You are an expert full-stack developer assistant."
  );

  // 🎛️ Toggle state for the main credential popup drawer
  const [isKeyPanelOpen, setIsKeyPanelOpen] = useState<boolean>(false);

  // 🧠 State for adding a new provider credential
  const [keyProvider, setKeyProvider] = useState<KeyProvider>("gemini");
  const [inputKey, setInputKey] = useState<string>("");
  const [customLabel, setCustomLabel] = useState<string>("");

  // 📋 Main database list of successfully committed user credentials
  const [savedProviders, setSavedProviders] = useState<SavedCredential[]>([]);

  const handleModelChange = (model: AIModel) => {
    setSelectedModel(model);
    setCode((prev) =>
      `// Switched engine context to: ${model}\n` +
      prev.replace(
        /\/\/ Selected Engine: .*\n|\/\/ Switched engine context to: .*\n/,
        ""
      )
    );
  };

  // Logic to process, bundle and commit credentials into memory storage
  const handleAddCredential = () => {
    if (!inputKey.trim()) return;

    const providerNames: Record<KeyProvider, string> = {
      gemini: "Google Gemini",
      openai: "OpenAI",
      anthropic: "Anthropic Claude",
      local: "Local Endpoints",
      mistral: "Mistral",
      groq: "Groq",
      deepseek: "DeepSeek",
      openrouter: "OpenRouter",
      custom: "Custom Integration",
    };

    const finalLabel = customLabel.trim() || `${providerNames[keyProvider]} Key`;

    const newCred: SavedCredential = {
      id: crypto.randomUUID(),
      provider: keyProvider,
      label: finalLabel,
      key: inputKey,
    };

    setSavedProviders((prev) => [...prev, newCred]);
    
    // Clear input fields for clean user re-use
    setInputKey("");
    setCustomLabel("");
  };

  const handleDeleteCredential = (id: string) => {
    setSavedProviders((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden text-slate-900 relative">
      {/* Top Navigation Control Bar */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-6 relative z-40">
        <div className="flex items-center gap-2 font-semibold">
          <span className="text-primary text-lg">⚙️ Multi-AI Sandbox Dev Environment</span>
        </div>

        {/* Action Controls & Interactive Model/Key Tools */}
        <div className="flex items-center gap-4 relative">
          
          {/* 🔑 Interactive Panel Control Interface */}
          <div>
            <button
              onClick={() => setIsKeyPanelOpen(!isKeyPanelOpen)}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium shadow-sm transition-colors focus:outline-none ${
                isKeyPanelOpen || savedProviders.length > 0
                  ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" 
                  : "bg-background text-foreground border-input hover:bg-muted"
              }`}
            >
              <Key className="h-4 w-4" />
              <span>API Keys</span>
            </button>
          </div>

          {/* State-Driven Model Picker */}
          <div className="flex items-center gap-2">
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value as AIModel)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {/* Dynamic Group generated directly from keys added by user */}
              {savedProviders.length > 0 && (
                <optgroup label="Your Activated Custom Key Routes">
                  {savedProviders.map((cred) => (
                    <option key={cred.id} value={cred.provider}>
                      {cred.label} ({cred.provider})
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="Google Gemini (Native SDK)">
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </optgroup>
              <optgroup label="OpenAI API Integration">
                <option value="gpt-4o">GPT-4o Engine</option>
              </optgroup>
              <optgroup label="Anthropic Models">
                <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
              </optgroup>
              <optgroup label="Mistral & Open-Weight Ecosystem">
                <option value="mistral">Mistral Large</option>
                <option value="groq">Groq LPU Acceleration</option>
                <option value="deepseek">DeepSeek R1 / V3</option>
              </optgroup>
              <optgroup label="Routing Layers & Custom Aggregators">
                <option value="openrouter">OpenRouter Global Endpoint</option>
                <option value="custom">Custom Route Configuration</option>
              </optgroup>
              <optgroup label="Offline Edge Runtimes">
                <option value="local-llama">Local Llama 3 (Sandbox Execution)</option>
              </optgroup>
            </select>
          </div>

          <button className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            Generate Code
          </button>
        </div>
      </header>

      {/* Main Panel Workspace */}
      <main className="flex flex-1 overflow-hidden relative z-10">
        {/* Left Sidebar */}
        <div className="w-80 border-r bg-muted/30 p-4 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium mb-1.5">System Context Configuration</h3>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-32 rounded-md border border-input bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
          <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
            <span className="font-semibold block text-card-foreground mb-1">
              Engine Metadata:
            </span>
            Target compilation running on Vite 7 with automated cloud deployments
            via Nitro Edge engine workers.
          </div>
        </div>

        {/* Right Code Canvas */}
        <div className="flex flex-1 flex-col bg-background">
          <div className="flex items-center justify-between border-b px-4 py-2">
            {/* Canvas Header Elements Go Here */}
          </div>
          <div className="flex-1 p-4">
            {/* Canvas Content Goes Here */}
          </div>
        </div>
      </main>

      {/* 📋 Centered Multi-Provider Modal Panel Overlay */}
      {isKeyPanelOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 relative">
            
            {/* Close button top right */}
            <button 
              onClick={() => setIsKeyPanelOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 rounded-md p-1 transition-colors focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Key className="h-5 w-5 text-slate-700" /> AI Providers
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Add API keys for any AI provider. Keys are stored only in this browser's localStorage and sent directly to the provider — never to a VibeCoder server.
              </p>
            </div>
            
            {/* Displaying Live Configured Active Keys */}
            <div className="space-y-2 mb-4">
              {savedProviders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 bg-slate-50/50">
                  No providers yet. Add your first one below.
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700 block mb-1">Active Credentials</span>
                  {savedProviders.map((cred) => (
                    <div key={cred.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 bg-slate-50/50 text-xs">
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          {cred.label}
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-normal uppercase bg-slate-200 text-slate-700">{cred.provider}</span>
                        </div>
                        <div className="text-slate-400 font-mono mt-0.5">••••••••••••{cred.key.slice(-4) || "Key"}</div>
                      </div>
                      <button 
                        onClick={() => handleDeleteCredential(cred.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4">
              {/* Select Provider block */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Add a provider
                </label>
                <select
                  value={keyProvider}
                  onChange={(e) => setKeyProvider(e.target.value as KeyProvider)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI (ChatGPT)</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="local">Local Endpoints</option>
                  <option value="mistral">Mistral</option>
                  <option value="groq">Groq</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="custom">Custom (OpenAI-compatible)</option>
                </select>
              </div>

              {/* Dynamic Secret Key Input block */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Get a key ↗
                </label>
                <input
                  type="password"
                  placeholder={keyProvider === "local" ? "http://localhost:11434" : "Starts with AIza..."}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-900"
                />
              </div>

              {/* Option Label Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Label (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Production Environment Key"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-900"
                />
              </div>

              {/* Action Button */}
              <button 
                onClick={handleAddCredential}
                className="w-full h-10 mt-2 inline-flex items-center justify-center rounded-lg bg-slate-900 text-white font-medium text-sm transition-colors hover:bg-slate-800"
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
