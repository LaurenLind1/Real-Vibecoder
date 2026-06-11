import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Key, X } from "lucide-react";

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

// Type definition for separate API key fields including your new options
type KeyProvider = "gemini" | "openai" | "anthropic" | "local" | "mistral" | "groq" | "deepseek" | "openrouter" | "custom";

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

  // 🧠 State holding individual API keys for separate platform managers
  const [keyProvider, setKeyProvider] = useState<KeyProvider>("gemini");
  const [apiKeys, setApiKeys] = useState<{ [key in KeyProvider]: string }>({
    gemini: "",
    openai: "",
    anthropic: "",
    local: "",
    mistral: "",
    groq: "",
    deepseek: "",
    openrouter: "",
    custom: "",
  });

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

  // Helper helper to adjust the active target key string
  const handleKeyChange = (value: string) => {
    setApiKeys((prev) => ({
      ...prev,
      [keyProvider]: value,
    }));
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden text-slate-900 relative">
      {/* Top Navigation Control Bar */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-6 relative z-50">
        <div className="flex items-center gap-2 font-semibold">
          <span className="text-primary text-lg">⚙️ Multi-AI Sandbox Dev Environment</span>
        </div>

        {/* Action Controls & Interactive Model/Key Tools */}
        <div className="flex items-center gap-4 relative">
          
          {/* 🔑 Interactive Panel Control Interface */}
          <div className="relative">
            <button
              onClick={() => setIsKeyPanelOpen(!isKeyPanelOpen)}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium shadow-sm transition-colors focus:outline-none ${
                isKeyPanelOpen || Object.values(apiKeys).some(k => k !== "")
                  ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" 
                  : "bg-background text-foreground border-input hover:bg-muted"
              }`}
            >
              <Key className="h-4 w-4" />
              <span>API Keys</span>
            </button>

            {/* 📋 Multi-Provider Key Input Dropdown Drawer */}
            {isKeyPanelOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-lg border border-input bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-muted-foreground" /> Credential Manager
                  </h4>
                  <button 
                    onClick={() => setIsKeyPanelOpen(false)}
                    className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {/* Dropdown Selector for target engines */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-500">
                      Select Target Provider
                    </label>
                    <select
                      value={keyProvider}
                      onChange={(e) => setKeyProvider(e.target.value as KeyProvider)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="gemini">Google Gemini Key</option>
                      <option value="openai">OpenAI API Key</option>
                      <option value="anthropic">Anthropic Claude Key</option>
                      <option value="local">Local Host URL Endpoint</option>
                      <option value="mistral">Mistral AI Key</option>
                      <option value="groq">Groq API Key</option>
                      <option value="deepseek">DeepSeek API Key</option>
                      <option value="openrouter">OpenRouter API Key</option>
                      <option value="custom">Custom Configuration Endpoint</option>
                    </select>
                  </div>

                  {/* Context-driven dynamic secret target input field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-500 capitalize">
                      {keyProvider} Secret Key
                    </label>
                    <input
                      type="password"
                      placeholder={keyProvider === "local" ? "http://localhost:11434" : "Paste credentials here..."}
                      value={apiKeys[keyProvider]}
                      onChange={(e) => handleKeyChange(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-slate-900"
                    />
                  </div>

                  {/* Bulletproof Security Notice Context text block */}
                  <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-slate-100">
                    Keys are safely compiled in memory and sent directly to native client API targets. They are never retained on our cloud origin servers.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* State-Driven Model Picker */}
          <div className="flex items-center gap-2">
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value as AIModel)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
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
    </div>
  );
}
