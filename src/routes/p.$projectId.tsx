import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Key, X, Trash2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

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

interface BannerNotification {
  type: "success" | "error";
  message: string;
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

  // 🔒 Validation network processing animation flags
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  // 📢 Status alert banners pinned to the top right of the browser viewport
  const [notification, setNotification] = useState<BannerNotification | null>(null);

  // 📋 Main database list of successfully committed user credentials
  const [savedProviders, setSavedProviders] = useState<SavedCredential[]>([]);

  // Auto-dismiss top notifications after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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

  // Direct asynchronous lookup to check credentials before committing or when testing active rows
  const runKeyValidationProbe = async (provider: KeyProvider, secretKey: string): Promise<boolean> => {
    try {
      if (provider === "gemini") {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${secretKey}`);
        return res.status === 200;
      }
      if (provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${secretKey}` }
        });
        return res.status === 200;
      }
      if (provider === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": secretKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: "claude-3-haiku-20240307", max_tokens: 1, messages: [{ role: "user", content: "ping" }] })
        });
        return res.status !== 401 && res.status !== 403;
      }
      if (provider === "local") {
        const res = await fetch(secretKey || "http://localhost:11434");
        return res.ok;
      }
      
      const baseUrlMap: Record<string, string> = {
        mistral: "https://api.mistral.ai/v1/models",
        groq: "https://api.groq.com/openai/v1/models",
        deepseek: "https://api.deepseek.com/v1/models",
        openrouter: "https://openrouter.ai/api/v1/models",
        custom: secretKey.startsWith("http") ? secretKey : ""
      };
      
      const targetUrl = baseUrlMap[provider];
      if (!targetUrl) return true;

      const res = await fetch(targetUrl, {
        headers: { Authorization: `Bearer ${secretKey}` }
      });
      return res.status === 200;
    } catch {
      return false;
    }
  };

  // Handler for adding a key from the inputs at the bottom
  const handleTestAndAdd = async () => {
    if (!inputKey.trim()) {
      setNotification({ type: "error", message: "Please insert an API key string before attempting a test." });
      return;
    }

    setIsTesting(true);
    const isValid = await runKeyValidationProbe(keyProvider, inputKey.trim());
    setIsTesting(false);

    if (isValid) {
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
        key: inputKey.trim(),
      };

      setSavedProviders((prev) => [...prev, newCred]);
      setNotification({ type: "success", message: "Key works" });
      
      setInputKey("");
      setCustomLabel("");
    } else {
      setNotification({ type: "error", message: "Key is not working" });
    }
  };

  // 🧪 New Inline validation action handler for testing active saved rows
  const handleInlineTestKey = async (cred: SavedCredential) => {
    setTestingKeyId(cred.id);
    const isValid = await runKeyValidationProbe(cred.provider, cred.key);
    setTestingKeyId(null);

    if (isValid) {
      setNotification({ type: "success", message: "Key works" });
    } else {
      setNotification({ type: "error", message: "Key is not working" });
    }
  };

  const handleDeleteCredential = (id: string) => {
    setSavedProviders((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden text-slate-900 relative">
      
      {/* 🚨 Floating Global Status Banners positioned in the top-right corner */}
      {notification && (
        <div className="fixed top-4 right-4 z-[100] w-full max-w-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`flex items-center gap-3 rounded-xl border p-4 shadow-xl text-sm font-medium ${
            notification.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}>
            {notification.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span className="flex-1 leading-snug">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-current opacity-40 hover:opacity-100 transition-opacity">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
            
            {/* Active Credentials Summary Block */}
            <div className="space-y-2 mb-4">
              {savedProviders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 bg-slate-50/50">
                  No providers yet. Add your first one below.
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700 block mb-1">Active Credentials</span>
                  {savedProviders.map((cred) => (
                    <div key={cred.id} className="flex items-center justify-between rounded-xl border border-slate-200/60 p-4 bg-white shadow-sm text-sm">
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          {cred.label}
                          {cred.id === savedProviders[0].id && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-900 text-white">Default</span>
                          )}
                        </div>
                        <div className="text-slate-400 text-xs mt-1 flex gap-2 items-center">
                          <span>{cred.provider === "gemini" ? "Google Gemini" : cred.provider}</span>
                          <span>•</span>
                          <span className="font-mono">{cred.key.slice(0, 4)}...{cred.key.slice(-4) || "Key"}</span>
                        </div>
                      </div>
                      
                      {/* Interactive Actions Panel Container matching layout */}
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleInlineTestKey(cred)}
                          disabled={testingKeyId !== null}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors focus:outline-none disabled:opacity-40 flex items-center gap-1"
                        >
                          {testingKeyId === cred.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : null}
                          <span>Test</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteCredential(cred.id)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors focus:outline-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4">
              {/* Select Provider Block */}
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

              {/* API Secret Key Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Get a key ↗
                </label>
                <input
                  type="password"
                  placeholder={keyProvider === "local" ? "http://localhost:11434" : "Paste credentials here..."}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-900"
                />
              </div>

              {/* Option Label Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Label / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Primary Workspace Key"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-slate-900"
                />
              </div>

              {/* Action Validation Trigger Button */}
              <button 
                onClick={handleTestAndAdd}
                disabled={isTesting}
                className="w-full h-10 mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white font-medium text-sm transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>+ Add</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
