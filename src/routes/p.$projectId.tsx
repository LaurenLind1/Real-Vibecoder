import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { 
  Key, X, Trash2, CheckCircle2, AlertTriangle, RefreshCw, 
  Send, Bot, User, Sparkles, Plus, ListTodo, Timer, Wrench, RotateCcw, Play, Home, ArrowRight, Code2
} from "lucide-react";

export const Route = createFileRoute("/p/$projectId")({
  component: Dashboard,
});

type PageView = "landing" | "home" | "chatbox";

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
  const [currentPage, setCurrentPage] = useState<PageView>("landing");
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

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
  
  const [buildSeconds, setBuildSeconds] = useState<number>(0);
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
      content: "Hello! I am connected to your Multi-AI Sandbox environment. Let's start writing some code!",
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentPage === "chatbox" && isGenerating && activeFeatures.liveTimer) {
      interval = setInterval(() => {
        setBuildSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentPage, isGenerating, activeFeatures.liveTimer]);

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
      return true; 
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
      setNotification({ type: "success", message: "Key works! You are ready to build." });
      setInputKey(""); setCustomLabel("");
    } else {
      setNotification({ type: "error", message: "Key is not working. Please check it and try again." });
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

  const handleRevertCode = () => {
    if (codeHistory.length > 0) {
      const previousCode = codeHistory[codeHistory.length - 1];
      setCode(previousCode);
      setCodeHistory(prev => prev.slice(0, -1));
      setNotification({ type: "success", message: "Reverted to previous checkpoint." });
    }
  };

  const simulateErrorAndFix = () => {
    const mockError = `Uncaught TypeError: Cannot read properties of undefined (reading 'map')\n    at RenderList (App.tsx:42:15)\n    at React Component Tree`;
    const errorPrompt = `I am getting this error in my preview console. Please analyze the code and provide a fix:\n\n${mockError}`;
    sendToAI(errorPrompt);
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;

    const rawPrompt = chatInput.trim();
    
    // Create an initial project record if this is the first interaction in a new sandbox
    if (messages.length === 1 && recentProjects.length === 0) {
      const readableName = rawPrompt.length > 32 ? rawPrompt.substring(0, 32) + "..." : rawPrompt;
      setRecentProjects(prev => [
        { id: crypto.randomUUID(), name: readableName, date: new Date(), fileCount: 1 },
        ...prev
      ]);
    }

    setChatInput("");
    sendToAI(rawPrompt);
  };

  const sendToAI = async (messageText: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: "user", content: messageText, timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

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
          id: crypto.randomUUID(), role: "assistant", content: `⚠️ No active key found for "${primaryTargetProvider}". Please use the "API Config" button to get connected.`, timestamp: new Date()
        }]);
        setIsGenerating(false);
      }, 800);
      return;
    }

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

      {/* 🚀 PAGE ONE: LANDING PAGE (Now Light Theme) */}
      {currentPage === "landing" && (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_45%)]" />
          
          <header className="flex h-20 items-center justify-between px-10 w-full border-b border-slate-200 relative z-10 backdrop-blur-md bg-white/60">
            <div className="flex items-center gap-2.5 font-black text-xl tracking-tight">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              <span>VibeCoder</span>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentPage("home")}
                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
              >
                Dashboard
              </button>
              <button 
                onClick={() => setIsKeyPanelOpen(true)} 
                className="flex items-center gap-2.5 text-sm font-bold bg-slate-900 text-white px-6 py-3 rounded-xl transition-all hover:bg-slate-800 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <Key className="h-4 w-4" />
                <span>API Keys</span>
              </button>
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-3xl mx-auto relative z-10 py-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600 font-medium mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Next-Gen AI Sandbox Engine
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 leading-[1.1]">
              Vibe-code apps with <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500">any LLM model</span>.
            </h1>
            <p className="text-slate-500 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
              Bring your own API keys. Prompt, blueprint, iterate, and monitor your sandbox build steps in real-time. Completely client-side and sandboxed.
            </p>

            {/* Changed from a form to a direct CTA button that routes to the Home page */}
            <button 
              onClick={() => setCurrentPage("home")} 
              className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-md text-lg hover:-translate-y-0.5"
            >
              Enter Dashboard <ArrowRight className="h-5 w-5" />
            </button>
            
            {savedProviders.length === 0 && (
               <div className="mt-6 flex items-center gap-2 text-slate-500 text-sm font-medium">
                 <AlertTriangle className="h-4 w-4 text-amber-500" /> You will need to add an API key inside to build.
               </div>
            )}
          </main>
          
          <footer className="py-6 text-center text-slate-400 text-sm relative z-10 font-medium">
            Powered by standard multi-provider endpoints. Keys are stored locally.
          </footer>
        </div>
      )}

      {/* 🏠 PAGE TWO: HOME DASHBOARD */}
      {currentPage === "home" && (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          <header className="flex h-16 items-center justify-between px-8 w-full border-b border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 font-bold text-lg text-slate-900">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <span>VibeCoder Dashboard</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentPage("landing")} 
                className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1"
              >
                <Home className="h-4 w-4" /> Home
              </button>
              <button 
                onClick={() => setIsKeyPanelOpen(true)} 
                className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg transition-all shadow-sm ${
                  savedProviders.length === 0 
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse" 
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                <Key className="h-4 w-4" />
                <span>API Keys</span>
              </button>
            </div>
          </header>

          <main className="flex-1 w-full max-w-5xl mx-auto py-12 px-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
                <p className="text-slate-500 mt-1">Manage your recent sandbox projects and global features.</p>
              </div>
              <button onClick={() => setCurrentPage("chatbox")} className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
                <Plus className="h-4 w-4" /> New Blank Project
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Recent Projects</h3>
                {recentProjects.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center flex flex-col items-center justify-center">
                    <Code2 className="h-10 w-10 text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium text-sm">No past projects found.</p>
                    <p className="text-slate-400 text-xs mt-1">Start a new chat to automatically save a project.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentProjects.map((project) => (
                      <div key={project.id} onClick={() => setCurrentPage("chatbox")} className="bg-white rounded-xl border border-slate-200 p-5 flex justify-between items-center shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group">
                        <div>
                          <h4 className="font-semibold text-slate-900">{project.name}</h4>
                          <p className="text-xs text-slate-500 mt-1.5">{project.date.toLocaleDateString()} · {project.fileCount} file(s)</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Resume</span>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }} className="text-slate-400 hover:text-rose-500 p-2 rounded-md hover:bg-rose-50 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-4">Global Features</h3>
                <div className="flex flex-col gap-3">
                  <div onClick={() => toggleFeature('planMode')} className={`rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${activeFeatures.planMode ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/20" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                    <div className="flex justify-between items-center mb-1"><div className="flex items-center gap-2"><ListTodo className={`h-4 w-4 ${activeFeatures.planMode ? "text-indigo-600" : "text-slate-700"}`} /><h4 className="font-semibold text-sm">Plan-first mode</h4></div>{activeFeatures.planMode && <div className="h-2 w-2 rounded-full bg-indigo-600" />}</div>
                    <p className="text-xs text-slate-500 mt-2">AI writes a plan before touching code.</p>
                  </div>
                  <div onClick={() => toggleFeature('liveTimer')} className={`rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${activeFeatures.liveTimer ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-500/20" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                    <div className="flex justify-between items-center mb-1"><div className="flex items-center gap-2"><Timer className={`h-4 w-4 ${activeFeatures.liveTimer ? "text-emerald-600" : "text-slate-700"}`} /><h4 className="font-semibold text-sm">Live build timer</h4></div>{activeFeatures.liveTimer && <div className="h-2 w-2 rounded-full bg-emerald-600" />}</div>
                    <p className="text-xs text-slate-500 mt-2">Watch elapsed time while the agent works.</p>
                  </div>
                  <div onClick={() => toggleFeature('autoFix')} className={`rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${activeFeatures.autoFix ? "bg-amber-50 border-amber-200 ring-1 ring-amber-500/20" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                    <div className="flex justify-between items-center mb-1"><div className="flex items-center gap-2"><Wrench className={`h-4 w-4 ${activeFeatures.autoFix ? "text-amber-600" : "text-slate-700"}`} /><h4 className="font-semibold text-sm">Auto-fix errors</h4></div>{activeFeatures.autoFix && <div className="h-2 w-2 rounded-full bg-amber-600" />}</div>
                    <p className="text-xs text-slate-500 mt-2">One click sends errors back to the model.</p>
                  </div>
                  <div onClick={() => toggleFeature('checkpoints')} className={`rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${activeFeatures.checkpoints ? "bg-sky-50 border-sky-200 ring-1 ring-sky-500/20" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                    <div className="flex justify-between items-center mb-1"><div className="flex items-center gap-2"><RotateCcw className={`h-4 w-4 ${activeFeatures.checkpoints ? "text-sky-600" : "text-slate-700"}`} /><h4 className="font-semibold text-sm">Checkpoints</h4></div>{activeFeatures.checkpoints && <div className="h-2 w-2 rounded-full bg-sky-600" />}</div>
                    <p className="text-xs text-slate-500 mt-2">Snapshot files automatically to roll back.</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* 💻 PAGE THREE: CHATBOX WORKSPACE */}
      {currentPage === "chatbox" && (
        <div className="flex h-screen flex-col overflow-hidden text-slate-900 relative bg-slate-50 animate-in fade-in duration-300">
          <header className="flex h-14 items-center justify-between border-b bg-white px-6 relative z-40 shadow-sm">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentPage("home")} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors">
                <Home className="h-5 w-5" />
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
                <span className="text-slate-800 text-sm font-bold tracking-tight">Active Workspace</span>
              </div>
            </div>

            <div className="flex items-center gap-4 relative">
              <button 
                onClick={() => setIsKeyPanelOpen(!isKeyPanelOpen)} 
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-4 text-xs font-bold shadow-sm transition-colors ${
                  isKeyPanelOpen || savedProviders.length > 0 
                    ? "bg-slate-900 text-white hover:bg-slate-800" 
                    : "bg-white text-slate-800 border-indigo-200 hover:bg-indigo-50 ring-2 ring-indigo-500/20"
                }`}
              >
                <Key className="h-3.5 w-3.5" /><span>API Config</span>
              </button>

              {/* Models dropdown is now updated with all requested options */}
              <select value={selectedModel} onChange={(e) => handleModelChange(e.target.value as AIModel)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm font-medium text-slate-700">
                  <optgroup label="Google Gemini">
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  </optgroup>
                  <optgroup label="OpenAI">
                    <option value="gpt-4o">ChatGPT-4o</option>
                  </optgroup>
                  <optgroup label="Anthropic">
                    <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
                  </optgroup>
                  <optgroup label="Other Providers">
                    <option value="local-llama">Local Llama</option>
                    <option value="mistral">Mistral</option>
                    <option value="groq">Groq</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="custom">Custom API</option>
                  </optgroup>
              </select>
            </div>
          </header>

          <main className="flex flex-1 overflow-hidden relative z-10">
            <div className="w-72 border-r border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-sm z-10 overflow-y-auto">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">System Context</h3>
                <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="w-full h-28 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20 resize-none text-slate-700" />
              </div>
              
              <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Feature Toggles</h3>
                 
                 <button 
                    onClick={() => toggleFeature('planMode')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                      activeFeatures.planMode ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2"><ListTodo className="h-3.5 w-3.5"/> Plan-first mode</div>
                    {activeFeatures.planMode && <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                  </button>

                  <button 
                    onClick={() => toggleFeature('liveTimer')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                      activeFeatures.liveTimer ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2"><Timer className="h-3.5 w-3.5"/> Build Timer {activeFeatures.liveTimer ? `(${formatTime(buildSeconds)})` : ""}</div>
                    {activeFeatures.liveTimer && <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                  </button>

                  <button 
                    onClick={() => toggleFeature('checkpoints')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                      activeFeatures.checkpoints ? "bg-sky-50 border-sky-200 text-sky-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2"><RotateCcw className="h-3.5 w-3.5"/> Checkpoints {activeFeatures.checkpoints ? `(${codeHistory.length})` : ""}</div>
                    {activeFeatures.checkpoints && <div className="h-1.5 w-1.5 rounded-full bg-sky-600" />}
                  </button>

                  <button 
                    onClick={() => toggleFeature('autoFix')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                      activeFeatures.autoFix ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2"><Wrench className="h-3.5 w-3.5"/> Auto-fix Errors</div>
                    {activeFeatures.autoFix && <div className="h-1.5 w-1.5 rounded-full bg-amber-600" />}
                  </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden bg-white">
              <div className="flex-1 min-h-[40%] border-b border-slate-100 p-4 relative flex flex-col">
                <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2 flex items-center justify-between">
                  <span>Code Sandbox</span>
                  <div className="flex items-center gap-2">
                    {activeFeatures.autoFix && (
                      <button onClick={simulateErrorAndFix} disabled={isGenerating} className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-[10px] uppercase font-bold flex items-center gap-1 hover:bg-amber-200 disabled:opacity-50">
                        <Wrench className="h-3 w-3" /> Simulate Error
                      </button>
                    )}
                    {activeFeatures.checkpoints && codeHistory.length > 0 && (
                      <button onClick={handleRevertCode} className="px-2 py-1 rounded bg-sky-100 text-sky-800 text-[10px] uppercase font-bold flex items-center gap-1 hover:bg-sky-200">
                        <RotateCcw className="h-3 w-3" /> Revert
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 w-full rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <Editor height="100%" defaultLanguage="javascript" theme="light" value={code} onChange={(value) => setCode(value || "")} options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: "on", roundedSelection: true }} />
                </div>
              </div>

              <div className="h-[45%] flex flex-col bg-slate-50/70 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center justify-between text-xs font-semibold text-slate-600 shadow-sm">
                  <span className="flex items-center gap-1.5"><Bot className="h-4 w-4 text-indigo-600" /> AI Assistant Console</span>
                  {activeFeatures.liveTimer && isGenerating && (
                    <span className="text-emerald-600 font-mono flex items-center gap-1 animate-pulse"><Play className="h-3 w-3" fill="currentColor"/> {formatTime(buildSeconds)}</span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-150 ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === "user" ? "bg-slate-900 text-white" : "bg-indigo-600 text-white"}`}>
                        {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === "user" ? "bg-slate-900 text-white font-medium" : "bg-white border border-slate-200 text-slate-800"}`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <span className={`block text-[10px] mt-1.5 text-right opacity-60`}>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

                <form onSubmit={handleFormSubmit} className="p-3 border-t border-slate-200 bg-white flex gap-2 shadow-inner">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={savedProviders.length === 0 ? "⚠️ Add an API key using the config button above to chat..." : "Ask AI to edit the code above..."} disabled={isGenerating || savedProviders.length === 0} className="flex-1 h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400 disabled:opacity-50" />
                  <button type="submit" disabled={!chatInput.trim() || isGenerating || savedProviders.length === 0} className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-slate-800 shadow-sm disabled:opacity-40"><Send className="h-4 w-4" /></button>
                </form>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* 🔑 UNIVERSAL MODAL: API KEYS */}
      {isKeyPanelOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
           <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl relative animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Key className="h-5 w-5 text-indigo-600" /> Connection Config</h3>
                <button onClick={() => setIsKeyPanelOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white rounded-md p-1 border border-slate-200 shadow-sm"><X className="h-4 w-4" /></button>
              </div>
              
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {savedProviders.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Keys</h4>
                    {savedProviders.map((cred) => (
                      <div key={cred.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div>
                          <p className="font-bold text-sm text-slate-800">{cred.label}</p>
                          <p className="text-xs text-slate-500 font-medium">{cred.provider}</p>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => handleInlineTestKey(cred)} className="text-xs font-semibold px-2 py-1 rounded bg-white border border-slate-200 text-indigo-600 shadow-sm hover:bg-indigo-50">Test</button>
                           <button onClick={() => handleDeleteCredential(cred.id)} className="text-xs px-2 py-1 rounded bg-white border border-rose-200 text-rose-600 shadow-sm hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add New Provider</h4>
                  <div className="space-y-3">
                    {/* The API keys dropdown is also updated to mirror the expanded list */}
                    <select value={keyProvider} onChange={(e) => setKeyProvider(e.target.value as KeyProvider)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20">
                      <option value="gemini">Google Gemini AI</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="local">Local Llama</option>
                      <option value="mistral">Mistral</option>
                      <option value="groq">Groq</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="custom">Custom API Config</option>
                    </select>
                    <input type="password" placeholder="Paste your secret API Key..." value={inputKey} onChange={(e) => setInputKey(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    <input type="text" placeholder="Custom Label (e.g. My Personal Key)" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    <button onClick={handleTestAndAdd} disabled={isTesting || !inputKey.trim()} className="w-full bg-slate-900 text-white p-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                      {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Add & Validate Key
                    </button>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </>
  );
}
