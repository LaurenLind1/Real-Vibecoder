import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { 
  Key, X, Trash2, CheckCircle2, AlertTriangle, RefreshCw, 
  Send, Bot, User, Sparkles, Plus, ListTodo, Timer, Wrench, RotateCcw, Play
} from "lucide-react";

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

interface Project {
  id: string;
  name: string;
  date: Date;
  fileCount: number;
}

function Dashboard() {
  const [hasChatStarted, setHasChatStarted] = useState<boolean>(false);

  const [recentProjects, setRecentProjects] = useState<Project[]>([
    { id: "1", name: "Pomodoro Timer App", date: new Date(), fileCount: 3 }
  ]);

  const [activeFeatures, setActiveFeatures] = useState({
    planMode: false,
    liveTimer: false,
    autoFix: false,
    checkpoints: false
  });

  const [selectedModel, setSelectedModel] = useState<AIModel>("gemini-2.5-flash");
  const [code, setCode] = useState<string>(
    `// Selected Engine: ${selectedModel}\nfunction init() {\n  console.log("Hello from your sandbox workspace!");\n}`
  );
  
  // 🕒 Feature State: Live Timer
  const [buildSeconds, setBuildSeconds] = useState<number>(0);
  
  // ⏪ Feature State: Checkpoints
  const [codeHistory, setCodeHistory] = useState<string[]>([]);

  const [systemPrompt, setSystemPrompt] = useState<string>(
    "You are an expert full-stack developer assistant."
  );

  const [isKeyPanelOpen, setIsKeyPanelOpen] = useState<boolean>(false);
  const [keyProvider, setKeyProvider] = useState<KeyProvider>("gemini");
  const [inputKey, setInputKey] = useState<string>("");
  const [customLabel, setCustomLabel] = useState<string>("");

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  const [notification, setNotification] = useState<BannerNotification | null>(null);
  const [savedProviders, setSavedProviders] = useState<SavedCredential[]>([]);

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

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🕒 Feature Logic: Live Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating && activeFeatures.liveTimer) {
      interval = setInterval(() => {
        setBuildSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setBuildSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating, activeFeatures.liveTimer]);

  const handleDeleteProject = (projectId: string) => {
    setRecentProjects((prev) => prev.filter((p) => p.id !== projectId));
    setNotification({ type: "success", message: "Project deleted successfully." });
  };

  const toggleFeature = (feature: keyof typeof activeFeatures) => {
    setActiveFeatures((prev) => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const handleModelChange = (model: AIModel) => {
    setSelectedModel(model);
    setCode((prev) =>
      `// Switched engine context to: ${model}\n` +
      prev.replace(/\/\/ Selected Engine: .*\n|\/\/ Switched engine context to: .*\n/, "")
    );
  };

  const runKeyValidationProbe = async (provider: KeyProvider, secretKey: string): Promise<boolean> => {
    try {
      if (provider === "gemini") {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${secretKey}`);
        return res.status === 200;
      }
      return true; // Simplified for this example
    } catch {
      return false;
    }
  };

  const handleTestAndAdd = async () => {
    if (!inputKey.trim()) return;
    setIsTesting(true);
    const isValid = await runKeyValidationProbe(keyProvider, inputKey.trim());
    setIsTesting(false);

    if (isValid) {
      setSavedProviders((prev) => [...prev, {
        id: crypto.randomUUID(), provider: keyProvider, label: customLabel.trim() || `${keyProvider} Key`, key: inputKey.trim(),
      }]);
      setNotification({ type: "success", message: "Key works" });
      setInputKey(""); setCustomLabel("");
    } else {
      setNotification({ type: "error", message: "Key is not working" });
    }
  };

  const handleInlineTestKey = async (cred: SavedCredential) => {
    setTestingKeyId(cred.id);
    const isValid = await runKeyValidationProbe(cred.provider, cred.key);
    setTestingKeyId(null);
    setNotification({ type: isValid ? "success" : "error", message: isValid ? "Key works" : "Key is not working" });
  };

  const handleDeleteCredential = (id: string) => {
    setSavedProviders((prev) => prev.filter((item) => item.id !== id));
  };

  // ⏪ Feature Logic: Revert Checkpoint
  const handleRevertCode = () => {
    if (codeHistory.length > 0) {
      const previousCode = codeHistory[codeHistory.length - 1];
      setCode(previousCode);
      setCodeHistory(prev => prev.slice(0, -1));
      setNotification({ type: "success", message: "Reverted to previous checkpoint." });
    }
  };

  // 🔧 Feature Logic: Simulate Auto-Fix Error
  const simulateErrorAndFix = () => {
    const mockError = `Uncaught TypeError: Cannot read properties of undefined (reading 'map')\n    at RenderList (App.tsx:42:15)\n    at React Component Tree`;
    const errorPrompt = `I am getting this error in my preview console. Please analyze the code and provide a fix:\n\n${mockError}`;
    
    // Automatically trigger the send message flow with the error
    sendToAI(errorPrompt);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;
    
    const currentMessageText = chatInput.trim();
    setChatInput("");
    await sendToAI(currentMessageText);
  };

  // Abstracted send function so auto-fix can use it too
  const sendToAI = async (messageText: string) => {
    if (!hasChatStarted) setHasChatStarted(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    // ⏪ Save checkpoint before new generation
    if (activeFeatures.checkpoints) {
      setCodeHistory(prev => [...prev, code]);
    }

    const primaryTargetProvider = selectedModel.startsWith("gemini") ? "gemini" : 
                                  selectedModel.startsWith("gpt") ? "openai" : 
                                  selectedModel.startsWith("claude") ? "anthropic" : selectedModel;

    const activeCredential = savedProviders.find(p => p.provider === primaryTargetProvider) || savedProviders[0];

    if (!activeCredential) {
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(), role: "assistant", content: `⚠️ No active key found for "${primaryTargetProvider}".`, timestamp: new Date()
        }]);
        setIsGenerating(false);
      }, 800);
      return;
    }

    // 🧠 Feature Logic: Plan-first mode injection
    const finalSystemPrompt = activeFeatures.planMode 
      ? systemPrompt + "\n\nCRITICAL INSTRUCTION: You must start your response with a numbered list outlining your step-by-step plan before writing ANY code blocks." 
      : systemPrompt;

    try {
      let aiResponseText = "";

      if (activeCredential.provider === "gemini") {
        const targetModelName = selectedModel.includes("pro") ? "gemini-2.5-pro" : "gemini-2.5-flash";
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModelName}:generateContent?key=${activeCredential.key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `System context: ${finalSystemPrompt}\n\nUser request: ${messageText}` }] }]
          })
        });
        const data = await res.json();
        aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No legible response returned.";
      } else {
        // Mock response for other providers
        aiResponseText = `[Mock Response via ${activeCredential.label}]: Received message "${messageText}".\n\n${activeFeatures.planMode ? "1. Analyzing request\n2. Structuring fix\n3. Applying code\n\n" : ""}Code would be generated here.`;
      }

      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant", content: aiResponseText, timestamp: new Date()
      }]);

    } catch (err) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant", content: `❌ Error: ${(err as Error).message}`, timestamp: new Date()
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper for timer format
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <>
      {notification && (
        <div className="fixed top-4 right-4 z-[100] w-full max-w-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`flex items-center gap-3 rounded-xl border p-4 shadow-xl text-sm font-medium ${
            notification.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
          }`}>
            {notification.type === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />}
            <span className="flex-1 leading-snug">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-current opacity-40 hover:opacity-100 transition-opacity"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {!hasChatStarted ? (
        <div className="min-h-screen bg-[#fafbfc] flex flex-col font-sans">
          <header className="flex h-16 items-center justify-between px-8 w-full border-b border-transparent">
            <div className="flex items-center gap-2 font-bold text-lg text-slate-900">
              <Sparkles className="h-5 w-5" />
              <span>VibeCoder</span>
            </div>
            <button onClick={() => setIsKeyPanelOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              <Key className="h-4 w-4" />
              <span>AI Providers</span>
            </button>
          </header>

          <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center pt-20 px-6 pb-12 animate-in fade-in duration-500">
            <h1 className="text-[40px] font-bold text-slate-900 tracking-tight mb-3">Vibe-code with any AI.</h1>
            <p className="text-slate-500 text-lg mb-10">Bring your own keys — Gemini, OpenAI, Claude, Lovable, OpenRouter, anything.</p>

            <form onSubmit={handleSendMessage} className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-12 transition-shadow focus-within:shadow-md focus-within:border-slate-300">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (chatInput.trim()) handleSendMessage(); }
                }}
                placeholder="Describe an app to build... e.g. a pomodoro timer with dark mode"
                className="w-full h-28 p-5 outline-none resize-none text-slate-800 placeholder:text-slate-400 text-base"
              />
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs font-medium text-slate-400">Ready to build</span>
                <button type="submit" disabled={!chatInput.trim()} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-2 disabled:opacity-50">
                  <Plus className="h-4 w-4" /> New project
                </button>
              </div>
            </form>

            <div className="w-full flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Your Projects</h3>
              {recentProjects.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">No past projects found.</div>
              ) : (
                <div className="space-y-2">
                  {recentProjects.map((project) => (
                    <div key={project.id} className="bg-white rounded-xl border border-slate-200 p-4 flex justify-between items-center shadow-sm cursor-pointer hover:border-slate-300">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{project.name}</h4>
                        <p className="text-xs text-slate-400 mt-1">{project.date.toLocaleDateString()} · {project.fileCount} files</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }} className="text-slate-400 hover:text-rose-500 p-2"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div onClick={() => toggleFeature('planMode')} className={`rounded-xl border p-5 shadow-sm cursor-pointer transition-all ${activeFeatures.planMode ? "bg-slate-50 border-slate-900 ring-1 ring-slate-900/20" : "bg-white border-slate-200"}`}>
                  <div className="flex justify-between mb-2"><div className="flex items-center gap-2"><ListTodo className={`h-4 w-4 ${activeFeatures.planMode ? "text-indigo-600" : "text-slate-700"}`} /><h4 className="font-semibold text-sm">Plan-first mode</h4></div>{activeFeatures.planMode && <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />}</div>
                  <p className="text-xs text-slate-500">Toggle the planner and the AI writes a short plan before touching code.</p>
                </div>
                <div onClick={() => toggleFeature('liveTimer')} className={`rounded-xl border p-5 shadow-sm cursor-pointer transition-all ${activeFeatures.liveTimer ? "bg-slate-50 border-slate-900 ring-1 ring-slate-900/20" : "bg-white border-slate-200"}`}>
                  <div className="flex justify-between mb-2"><div className="flex items-center gap-2"><Timer className={`h-4 w-4 ${activeFeatures.liveTimer ? "text-emerald-600" : "text-slate-700"}`} /><h4 className="font-semibold text-sm">Live build timer</h4></div>{activeFeatures.liveTimer && <div className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />}</div>
                  <p className="text-xs text-slate-500">Watch elapsed time and step count tick up while the agent works.</p>
                </div>
                <div onClick={() => toggleFeature('autoFix')} className={`rounded-xl border p-5 shadow-sm cursor-pointer transition-all ${activeFeatures.autoFix ? "bg-slate-50 border-slate-900 ring-1 ring-slate-900/20" : "bg-white border-slate-200"}`}>
                  <div className="flex justify-between mb-2"><div className="flex items-center gap-2"><Wrench className={`h-4 w-4 ${activeFeatures.autoFix ? "text-amber-600" : "text-slate-700"}`} /><h4 className="font-semibold text-sm">Auto-fix preview errors</h4></div>{activeFeatures.autoFix && <div className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />}</div>
                  <p className="text-xs text-slate-500">When the sandbox throws, one click sends the error back to the model.</p>
                </div>
                <div onClick={() => toggleFeature('checkpoints')} className={`rounded-xl border p-5 shadow-sm cursor-pointer transition-all ${activeFeatures.checkpoints ? "bg-slate-50 border-slate-900 ring-1 ring-slate-900/20" : "bg-white border-slate-200"}`}>
                  <div className="flex justify-between mb-2"><div className="flex items-center gap-2"><RotateCcw className={`h-4 w-4 ${activeFeatures.checkpoints ? "text-sky-600" : "text-slate-700"}`} /><h4 className="font-semibold text-sm">Checkpoints & revert</h4></div>{activeFeatures.checkpoints && <div className="h-2 w-2 rounded-full bg-sky-600 animate-pulse" />}</div>
                  <p className="text-xs text-slate-500">Every turn snapshots your files. Roll back any time.</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="flex h-screen flex-col overflow-hidden text-slate-900 relative bg-slate-50 animate-in fade-in zoom-in-95 duration-300">
          <header className="flex h-14 items-center justify-between border-b bg-white px-6 relative z-40 shadow-sm">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
              <span className="text-slate-800 text-base font-bold tracking-tight">Multi-AI Sandbox Dev Environment</span>
            </div>

            <div className="flex items-center gap-4 relative">
              <button onClick={() => setIsKeyPanelOpen(!isKeyPanelOpen)} className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium shadow-sm transition-colors ${isKeyPanelOpen || savedProviders.length > 0 ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}>
                <Key className="h-4 w-4" /><span>API Keys</span>
              </button>

              <select value={selectedModel} onChange={(e) => handleModelChange(e.target.value as AIModel)} className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm font-medium text-slate-700">
                  <optgroup label="Google Gemini"><option value="gemini-2.5-flash">Gemini 2.5 Flash</option></optgroup>
                  <optgroup label="OpenAI API Integration"><option value="gpt-4o">GPT-4o Engine</option></optgroup>
              </select>
            </div>
          </header>

          <main className="flex flex-1 overflow-hidden relative z-10">
            <div className="w-80 border-r border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-sm z-10">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1.5">System Context Configuration</h3>
                <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="w-full h-32 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 resize-none text-slate-800" />
              </div>
              
              {/* Feature Active States Indicator Panel */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                 <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Features</h3>
                 {activeFeatures.planMode && <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 p-2 rounded border border-indigo-100"><ListTodo className="h-3 w-3"/> Planner Active</div>}
                 {activeFeatures.liveTimer && <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-100"><Timer className="h-3 w-3"/> Build Timer: {formatTime(buildSeconds)}</div>}
                 {activeFeatures.checkpoints && <div className="flex items-center gap-2 text-xs font-medium text-sky-600 bg-sky-50 p-2 rounded border border-sky-100"><RotateCcw className="h-3 w-3"/> {codeHistory.length} Checkpoints Saved</div>}
                 {activeFeatures.autoFix && <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 p-2 rounded border border-amber-100"><Wrench className="h-3 w-3"/> Auto-fix Armed</div>}
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden bg-white">
              <div className="flex-1 min-h-[40%] border-b border-slate-100 p-4 relative flex flex-col">
                <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2 flex items-center justify-between">
                  <span>Active Code Sandbox Canvas</span>
                  <div className="flex items-center gap-2">
                    
                    {/* 🔧 Auto-Fix Mock Button */}
                    {activeFeatures.autoFix && (
                      <button onClick={simulateErrorAndFix} disabled={isGenerating} className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-[10px] uppercase font-bold flex items-center gap-1 hover:bg-amber-200 disabled:opacity-50">
                        <Wrench className="h-3 w-3" /> Simulate Sandbox Error
                      </button>
                    )}
                    
                    {/* ⏪ Checkpoint Revert Button */}
                    {activeFeatures.checkpoints && codeHistory.length > 0 && (
                      <button onClick={handleRevertCode} className="px-2 py-1 rounded bg-sky-100 text-sky-800 text-[10px] uppercase font-bold flex items-center gap-1 hover:bg-sky-200">
                        <RotateCcw className="h-3 w-3" /> Revert
                      </button>
                    )}

                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] uppercase font-bold">{selectedModel}</span>
                  </div>
                </div>
                <div className="flex-1 w-full rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <Editor height="100%" defaultLanguage="javascript" theme="light" value={code} onChange={(value) => setCode(value || "")} options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: "on", roundedSelection: true }} />
                </div>
              </div>

              <div className="h-[45%] flex flex-col bg-slate-50/70 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center justify-between text-xs font-semibold text-slate-600 shadow-sm">
                  <span className="flex items-center gap-1.5"><Bot className="h-4 w-4 text-indigo-600" /> AI Assistant Console</span>
                  
                  {/* 🕒 Timer Display in Header */}
                  {activeFeatures.liveTimer && isGenerating && (
                    <span className="text-emerald-600 font-mono flex items-center gap-1 animate-pulse"><Play className="h-3 w-3" fill="currentColor"/> {formatTime(buildSeconds)}</span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-150 ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === "user" ? "bg-slate-900 text-white" : "bg-indigo-600 text-white"}`}>
                        {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${msg.role === "user" ? "bg-slate-900 text-white font-medium" : "bg-white border border-slate-200 text-slate-800"}`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <span className={`block text-[10px] mt-1 text-right text-slate-400`}>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                  
                  {isGenerating && (
                    <div className="flex gap-3 max-w-[85%] mr-auto items-center animate-pulse">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0"><RefreshCw className="h-4 w-4 text-indigo-600 animate-spin" /></div>
                      <div className="bg-white border border-slate-200 text-slate-400 rounded-xl px-4 py-2 text-xs font-medium italic shadow-sm">AI is calculating response...</div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2 shadow-inner">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask AI to generate functions, explain issues, or build prototypes..." disabled={isGenerating} className="flex-1 h-10 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400" />
                  <button type="submit" disabled={!chatInput.trim() || isGenerating} className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-slate-800 shadow-sm disabled:opacity-40"><Send className="h-4 w-4" /></button>
                </form>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Key Panel Modal (Simplified for brevity but functionally identical) */}
      {isKeyPanelOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200]">
           <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl relative">
              <button onClick={() => setIsKeyPanelOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Key className="h-5 w-5 text-slate-700" /> AI Providers</h3>
              
              <div className="space-y-4">
                {savedProviders.map((cred) => (
                  <div key={cred.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div><p className="font-semibold text-sm">{cred.label}</p><p className="text-xs text-slate-500">{cred.provider}</p></div>
                    <div className="flex gap-2">
                       <button onClick={() => handleInlineTestKey(cred)} className="text-xs text-blue-600">Test</button>
                       <button onClick={() => handleDeleteCredential(cred.id)} className="text-xs text-red-600"><Trash2 className="h-4 w-4"/></button>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4 space-y-3">
                  <select value={keyProvider} onChange={(e) => setKeyProvider(e.target.value as KeyProvider)} className="w-full p-2 border rounded text-sm">
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                  </select>
                  <input type="password" placeholder="API Key" value={inputKey} onChange={(e) => setInputKey(e.target.value)} className="w-full p-2 border rounded text-sm" />
                  <input type="text" placeholder="Label" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} className="w-full p-2 border rounded text-sm" />
                  <button onClick={handleTestAndAdd} className="w-full bg-slate-900 text-white p-2 rounded text-sm hover:bg-slate-800">Add Key</button>
                </div>
              </div>
           </div>
        </div>
      )}
    </>
  );
}
