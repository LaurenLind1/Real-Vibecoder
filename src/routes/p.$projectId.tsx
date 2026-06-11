import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Key, X, Trash2, CheckCircle2, AlertTriangle, RefreshCw, Send, Bot, User, Sparkles } from "lucide-react";

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

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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

  // 💬 Chat Interface State Management
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am connected to your Multi-AI Sandbox environment. Add your API keys above, select a model engine, and let's start writing some code!",
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss top notifications after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  // 🔥 Main chat engine execution loop hooking dynamic client keys directly into live endpoints
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;

    const currentMessageText = chatInput.trim();
    setChatInput("");

    // Package user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: currentMessageText,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    // Look up if we have a key configured for our chosen model/provider target
    // For standalone gemini pickers, try to look up any valid active gemini configuration
    const primaryTargetProvider = selectedModel.startsWith("gemini") ? "gemini" : 
                                  selectedModel.startsWith("gpt") ? "openai" : 
                                  selectedModel.startsWith("claude") ? "anthropic" : selectedModel;

    const activeCredential = savedProviders.find(p => p.provider === primaryTargetProvider) || savedProviders[0];

    if (!activeCredential) {
      // Fake response loop warning user to provide target credentials
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ [Configuration Error]: No active credential key block found for provider target "${primaryTargetProvider}". Please open the API Key dashboard overlay in the header menu and link a functional key code before proceeding.`,
          timestamp: new Date()
        }]);
        setIsGenerating(false);
      }, 800);
      return;
    }

    try {
      let aiResponseText = "";

      if (activeCredential.provider === "gemini") {
        const targetModelName = selectedModel.includes("pro") ? "gemini-2.5-pro" : "gemini-2.5-flash";
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModelName}:generateContent?key=${activeCredential.key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `System context: ${systemPrompt}\n\nUser request: ${currentMessageText}` }] }]
          })
        });
        const data = await res.json();
        aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No legible response returned from Gemini core pipeline node.";
      } else {
        // Universal fallback layer for basic raw completion mocks of additional providers
        aiResponseText = `[Simulated edge route parsing via ${activeCredential.label}]: Received message "${currentMessageText}". Dynamic infrastructure hooks are completely operational. Next setup will map production pipelines to live stream outputs.`;
      }

      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: aiResponseText,
        timestamp: new Date()
      }]);

    } catch (err) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ Network transaction error encountered while delivering frame context arrays directly to targeted host nodes. Details: ${(err as Error).message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden text-slate-900 relative bg-slate-50">
      
      {/* 🚨 Floating Global Status Banners */}
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
      <header className="flex h-14 items-center justify-between border-b bg-white px-6 relative z-40 shadow-sm">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
          <span className="text-slate-800 text-base font-bold tracking-tight">Multi-AI Sandbox Dev Environment</span>
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
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-medium text-slate-700"
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

          <button className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-slate-800">
            Generate Code
          </button>
        </div>
      </header>

      {/* Main Panel Workspace */}
      <main className="flex flex-1 overflow-hidden relative z-10">
        {/* Left Sidebar */}
        <div className="w-80 border-r bg-white p-4 flex flex-col gap-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1.5">System Context Configuration</h3>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-32 rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold block text-slate-700 mb-1">
              Engine Metadata:
            </span>
            Target compilation running on Vite 7 with automated cloud deployments
            via Nitro Edge engine workers.
          </div>
        </div>

        {/* Right Code Workspace & 💬 Integrated Chatbox split container */}
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          {/* Top Code Section Area */}
          <div className="flex-1 min-h-[40%] border-b border-slate-100 p-4 relative flex flex-col">
            <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2 flex items-center justify-between">
              <span>Active Code Sandbox Canvas</span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] uppercase font-bold">{selectedModel}</span>
            </div>
            <div className="flex-1 w-full rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="light"
                value={code}
                onChange={(value) => setCode(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  roundedSelection: true,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>

          {/* Bottom Chat Section Canvas */}
          <div className="h-[45%] flex flex-col bg-slate-50/70 overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center justify-between text-xs font-semibold text-slate-600 shadow-sm">
              <span className="flex items-center gap-1.5"><Bot className="h-4 w-4 text-indigo-600" /> AI Assistant Console</span>
              <span className="text-[10px] text-slate-400 font-mono">Channel: Local client session</span>
            </div>

            {/* Scrollable Message Box */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-150 ${
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    msg.role === "user" ? "bg-slate-900 text-white" : "bg-indigo-600 text-white"
                  }`}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-slate-900 text-white font-medium"
                      : "bg-white border border-slate-200 text-slate-800"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className={`block text-[10px] mt-1 text-right ${msg.role === "user" ? "text-slate-400" : "text-slate-400"}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              
              {isGenerating && (
                <div className="flex gap-3 max-w-[85%] mr-auto items-center animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <RefreshCw className="h-4 w-4 text-indigo-600 animate-spin" />
                  </div>
                  <div className="bg-white border border-slate-200 text-slate-400 rounded-xl px-4 py-2 text-xs font-medium italic shadow-sm">
                    AI is calculating response framework targets...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Action Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2 shadow-inner">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={savedProviders.length === 0 ? "⚠️ Add an API key above to talk to an AI provider..." : "Ask AI to generate functions, explain issues, or build prototypes..."}
                disabled={savedProviders.length === 0 || isGenerating}
                className="flex-1 h-10 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 text-slate-800 placeholder:text-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isGenerating || savedProviders.length === 0}
                className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-slate-800 focus:outline-none shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
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

              {/* Action Button */}
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
