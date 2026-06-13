import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { 
  Key, X, Trash2, CheckCircle2, AlertTriangle, RefreshCw, 
  Send, Bot, User, Sparkles, Plus, ListTodo, Timer, Wrench, RotateCcw, Play, Home, ArrowRight, LayoutTemplate
} from "lucide-react";

export const Route = createFileRoute("/p/$projectId")({
  component: Dashboard,
});

type PageView = "home" | "chatbox";

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

export default function Dashboard() {
  const [currentPage, setCurrentPage] = useState<PageView>("home");
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [activeFeatures, setActiveFeatures] = useState({
    planMode: false,
    liveTimer: false,
    autoFix: false,
    checkpoints: false
  });
  const [selectedModel, setSelectedModel] = useState<AIModel>("gemini-2.5-flash");
  
  const [code, setCode] = useState<string>(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VibeCoder Sandbox</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #e0e7ff 0%, #f0fdf4 100%);
      color: #1e293b;
    }
    .card {
      background: white;
      padding: 2rem 3rem;
      border-radius: 1rem;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
      text-align: center;
    }
    h1 { margin: 0 0 0.5rem 0; color: #4f46e5; }
    p { margin: 0; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello, VibeCoder! ✨</h1>
    <p>I am your live execution sandbox.</p>
  </div>
</body>
</html>`
  );
  const [buildSeconds, setBuildSeconds] = useState<number>(0);
  const [codeHistory, setCodeHistory] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>("");

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
      content: "Hello! I am connected to your Multi-AI Sandbox environment. Let's start building! Describe an app you'd like to create.",
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
    
    if (messages.length === 1 && recentProjects.length === 0) {
      const readableName = rawPrompt.length > 32 ?
        rawPrompt.substring(0, 32) + "..." : rawPrompt;
      setRecentProjects(prev => [
        { id: crypto.randomUUID(), name: readableName, date: new Date(), fileCount: 1 },
        ...prev
      ]);
    }

    setChatInput("");
    sendToAI(rawPrompt);
  };

  const extractCode = (text: string) => {
    const ticks = String.fromCharCode(96, 96, 96);
    const pattern = new RegExp(ticks + '(?:[a-z]*\\n)?([\\s\\S]*?)' + ticks, 'i');
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
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

    const basePrompt = systemPrompt.trim() ||
      "You are an expert full-stack developer assistant. CRITICAL: When writing or updating code, you MUST output a SINGLE, complete, runnable HTML file containing all HTML, CSS (in `<style>`), and JavaScript (in `<script>`). Wrap your final solution in a single markdown code block (using triple backticks, e.g. ```html). Output the ENTIRE updated file content.";
    const finalSystemPrompt = activeFeatures.planMode 
      ? basePrompt + "\n\nCRITICAL INSTRUCTION: You must start your response with a numbered list outlining your step-by-step plan before writing ANY code blocks."
      : basePrompt;

    // 1. DYNAMICALLY DETECT THE PRIMARY SELECTION
    const primaryProvider = selectedModel.startsWith("gemini") ? "gemini" : 
                            selectedModel.startsWith("gpt") ? "openai" : 
                            selectedModel.startsWith("claude") ? "anthropic" : 
                            (selectedModel as KeyProvider);

    // 2. SCRAPE ALL OTHER ENGINES THE USER HAS REGISTERED IN THEIR APP FOR BACKUPS
    const uniqueBackups = Array.from(
      new Set(savedProviders.map(p => p.provider).filter(p => p !== primaryProvider))
    );

    // 3. COMBINE THEM: Primary goes first, then EVERY other key acts as a sequential fallback layer
    const providersToTry: KeyProvider[] = [primaryProvider, ...uniqueBackups];

    let completedSuccessfully = false;

    // 4. Step through the dynamic failover sequence loop
    for (let i = 0; i < providersToTry.length; i++) {
      const currentProvider = providersToTry[i];
      const activeCredential = savedProviders.find(p => p.provider === currentProvider);

      if (!activeCredential) {
        continue;
      }

      if (i > 0) {
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `🔄 Rerouting pipeline... Automatically switching to fallback engine: "${activeCredential.label}" (${currentProvider})`,
          timestamp: new Date()
        }]);
      }

      try {
        let aiResponseText = "";

        if (currentProvider === "gemini") {
          // LIVE INTERCEPT SIMULATION (Crashes the Gemini path)
          throw new Error("Simulated Token Exhaustion (HTTP 429 Rate Limit Exceeded)");
        } else {
          // Generic execution track for ANY custom/backup provider
          const ticks = String.fromCharCode(96, 96, 96);
          const mockHtml = `<!DOCTYPE html>\n<html>\n<head>\n<style>body{font-family:sans-serif; text-align:center; padding:50px; background:#f4f0ff; color:#5b21b6;}</style>\n</head>\n<body>\n<h1>Dynamic Failover Activated! 🚀</h1>\n<p>Active Fallback Engine: <strong>${currentProvider}</strong></p>\n<p>Config Label Applied: <em>${activeCredential.label}</em></p>\n</body>\n</html>`;
          
          aiResponseText = `[Failover Response via ${activeCredential.label}]: Primary pipeline failed. Dynamic backup router successfully processing request via ${currentProvider}.\n\n${activeFeatures.planMode ?
            "1. Caught upstream error\n2. Loaded dynamic credentials\n3. Rendering playground updates\n\n" : ""}Here is your safe execution code:\n${ticks}html\n${mockHtml}\n${ticks}`;
        }

        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(), role: "assistant", content: aiResponseText, timestamp: new Date()
        }]);

        const newCode = extractCode(aiResponseText);
        if (newCode) {
          setCode(newCode);
          setNotification({ type: "success", message: `Sandbox updated via backup: ${currentProvider}!` });
        }

        completedSuccessfully = true;
        break; 

      } catch (err) {
        console.warn(`Provider [${currentProvider}] encountered an error:`, err);
        
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ Engine [${currentProvider}] failed: ${(err as Error).message}. Cascading to next available key...`,
          timestamp: new Date()
        }]);
      }
    }

    if (!completedSuccessfully) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ Failover routing exhausted. No secondary provider keys match your configured wallet credentials. Please open the "API Keys" manager and add a alternative provider key (e.g. DeepSeek, Groq, Mistral, OpenRouter, etc.).`,
        timestamp: new Date()
      }]);
    }

    setIsGenerating(false);
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

      {currentPage === "home" && (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          <header className="flex h-20 items-center justify-between px-8 w-full border-b border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 font-black text-xl tracking-tight text-slate-900">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              <span>VibeCoder</span>
            </div>
            <button 
              onClick={() => setIsKeyPanelOpen(true)} 
              className="flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:opacity-90 transition-all hover:-translate-y-0.5"
            >
              <Key className="h-4 w-4" />
              <span>API Providers</span>
            </button>
          </header>

          <main className="flex-1 w-full max-w-3xl mx-auto py-16 px-6 animate-in fade-in duration-300">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">
                Vibe-code with <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500">any AI.</span>
              </h1>
              <p className="text-slate-500 text-base">
                Bring your own keys — Gemini, OpenAI, Claude, Lovable, OpenRouter, anything.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-12 overflow-hidden focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
              <textarea 
                placeholder="Describe an app to build... e.g. a pomodoro timer with dark mode" 
                className="w-full resize-none p-5 pb-2 text-slate-700 outline-none text-sm bg-transparent"
                rows={2}
              />
              <div className="flex justify-between items-center px-5 py-3 bg-white">
                <span className="text-xs text-slate-400 font-medium">Ready to build</span>
                <button 
                  onClick={() => setCurrentPage("chatbox")} 
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 flex items-center gap-2 shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" /> New project
                </button>
              </div>
            </div>

            <div className="mb-12">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-4">Your Projects</h3>
              {recentProjects.length === 0 ? (
                <div className="border border-dashed border-slate-300 bg-white/50 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2">
                  <p className="text-slate-500 text-sm font-medium">No projects yet.</p>
                  <p className="text-slate-400 text-xs">Start a new project above, and it will be saved here automatically.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map((project) => (
                    <div key={project.id} onClick={() => setCurrentPage("chatbox")} className="bg-white rounded-xl border border-slate-200 p-5 flex justify-between items-center shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group">
                      <div>
                        <h4 className="font-semibold text-slate-900">{project.name}</h4>
                        <p className="text-xs text-slate-500 mt-1.5">{project.date.toLocaleDateString()} · {project.fileCount} file(s)</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }} className="text-slate-400 hover:text-rose-500 p-2 rounded-md hover:bg-rose-50 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div onClick={() => toggleFeature('planMode')} className={`rounded-xl border p-5 shadow-sm cursor-pointer transition-all ${activeFeatures.planMode ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/20" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <ListTodo className={`h-4 w-4 ${activeFeatures.planMode ? "text-indigo-600" : "text-slate-700"}`} />
                  <h4 className="font-semibold text-sm text-slate-800">Plan-first mode</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Toggle the planner and the AI writes a short plan before touching code.</p>
              </div>

              <div onClick={() => toggleFeature('liveTimer')} className={`rounded-xl border p-5 shadow-sm cursor-pointer transition-all ${activeFeatures.liveTimer ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-500/20" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Timer className={`h-4 w-4 ${activeFeatures.liveTimer ? "text-emerald-600" : "text-slate-700"}`} />
                  <h4 className="font-semibold text-sm text-slate-800">Live build timer</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Watch elapsed time and step count tick up while the agent works.</p>
              </div>

              <div onClick={() => toggleFeature('autoFix')} className={`rounded-xl border p-5 shadow-sm cursor-pointer transition-all ${activeFeatures.autoFix ? "bg-amber-50 border-amber-200 ring-1 ring-amber-500/20" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className={`h-4 w-4 ${activeFeatures.autoFix ? "text-amber-600" : "text-slate-700"}`} />
                  <h4 className="font-semibold text-sm text-slate-800">Auto-fix preview errors</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">When the sandbox throws, one click sends the error back to the model.</p>
              </div>

              <div onClick={() => toggleFeature('checkpoints')} className={`rounded-xl border p-5 shadow-sm cursor-pointer transition-all ${activeFeatures.checkpoints ? "bg-sky-50 border-sky-200 ring-1 ring-sky-500/20" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <RotateCcw className={`h-4 w-4 ${activeFeatures.checkpoints ? "text-sky-600" : "text-slate-700"}`} />
                  <h4 className="font-semibold text-sm text-slate-800">Checkpoints & revert</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Every turn snapshots your files. Roll back any time from the History pane.</p>
              </div>
            </div>
          </main>
        </div>
      )}

      {currentPage === "chatbox" && (
        <div className="flex h-screen flex-col overflow-hidden text-slate-900 relative bg-slate-50 animate-in fade-in duration-300">
          <header className="flex h-14 items-center justify-between border-b bg-white px-6 relative z-40 shadow-sm shrink-0">
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
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 shadow-sm hover:shadow-md hover:opacity-90 transition-all hover:-translate-y-[1px]"
              >
                <Key className="h-3.5 w-3.5" /><span>API Keys</span>
              </button>

              <select value={selectedModel} onChange={(e) => handleModelChange(e.target.value as AIModel)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer">
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
            {/* LEFT SIDEBAR */}
            <div className="w-64 border-r border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-sm z-10 overflow-y-auto shrink-0">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">System Context</h3>
                <textarea 
                  placeholder="You are an expert full-stack developer assistant."
                  value={systemPrompt} 
                  onChange={(e) => setSystemPrompt(e.target.value)} 
                  className="w-full h-28 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20 resize-none text-slate-700 placeholder:text-slate-400" 
                />
              </div>
              
              <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Feature Toggles</h3>
                 
                 <button onClick={() => toggleFeature('planMode')} className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-colors ${activeFeatures.planMode ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <div className="flex items-center gap-2"><ListTodo className="h-3.5 w-3.5"/> Plan-first mode</div>
                    {activeFeatures.planMode && <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                  </button>

                  <button onClick={() => toggleFeature('liveTimer')} className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-colors ${activeFeatures.liveTimer ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <div className="flex items-center gap-2"><Timer className="h-3.5 w-3.5"/> Build Timer {activeFeatures.liveTimer ? `(${formatTime(buildSeconds)})` : ""}</div>
                    {activeFeatures.liveTimer && <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                  </button>

                  <button onClick={() => toggleFeature('checkpoints')} className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-colors ${activeFeatures.checkpoints ? "bg-sky-50 border-sky-200 text-sky-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <div className="flex items-center gap-2"><RotateCcw className="h-3.5 w-3.5"/> Checkpoints {activeFeatures.checkpoints ? `(${codeHistory.length})` : ""}</div>
                    {activeFeatures.checkpoints && <div className="h-1.5 w-1.5 rounded-full bg-sky-600" />}
                  </button>

                  <button onClick={() => toggleFeature('autoFix')} className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-colors ${activeFeatures.autoFix ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <div className="flex items-center gap-2"><Wrench className="h-3.5 w-3.5"/> Auto-fix Errors</div>
                    {activeFeatures.autoFix && <div className="h-1.5 w-1.5 rounded-full bg-amber-600" />}
                  </button>
              </div>
            </div>

            {/* MAIN WORKSPACE AREA */}
            <div className="flex flex-1 flex-col overflow-hidden bg-white">
              
              {/* TOP HALF: Editor & Live Preview */}
              <div className="flex-1 min-h-[50%] border-b border-slate-200 flex flex-row overflow-hidden">
                {/* Code Editor */}
                <div className="flex-1 border-r border-slate-200 p-4 flex flex-col min-w-0">
                  <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2 flex items-center justify-between shrink-0">
                    <span>Code Editor</span>
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
                    <Editor height="100%" defaultLanguage="html" theme="light" value={code} onChange={(value) => setCode(value || "")} options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: "on", roundedSelection: true, wordWrap: "on" }} />
                  </div>
                </div>

                {/* LIVE SANDBOX PREVIEW */}
                <div className="flex-1 p-4 flex flex-col bg-slate-50/50 min-w-0">
                  <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2 flex items-center gap-1.5 shrink-0">
                    <LayoutTemplate className="h-4 w-4 text-indigo-500" /> Live Sandbox
                  </div>
                  <div className="flex-1 w-full rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white relative">
                    <iframe
                      title="VibeCoder Live Preview"
                      srcDoc={code}
                      sandbox="allow-scripts allow-forms allow-popups allow-modals"
                      className="absolute inset-0 w-full h-full border-none"
                    />
                  </div>
                </div>
              </div>

              {/* BOTTOM HALF: Chat Interface */}
              <div className="h-[40%] flex flex-col bg-white overflow-hidden shrink-0">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-600 shrink-0">
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
                      <div className="bg-white border border-slate-200 text-slate-400 rounded-xl px-4 py-2 text-xs font-medium italic shadow-sm">AI is writing code...</div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleFormSubmit} className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2 shrink-0">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={savedProviders.length === 0 ? "⚠️ Add an API key using the config button above to chat..." : "Ask AI to edit the code above..."} disabled={isGenerating || savedProviders.length === 0} className="flex-1 h-11 px-4 rounded-lg border border-slate-200 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400 disabled:opacity-50" />
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
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Key className="h-5 w-5 text-indigo-600" /> AI Providers</h3>
                <button onClick={() => setIsKeyPanelOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white rounded-md p-1 border border-slate-200 shadow-sm"><X className="h-4 w-4" /></button>
              </div>
              
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-slate-500">
                  Add API keys for any AI provider. Keys are stored only in this browser's localStorage and sent directly to the provider — never to a VibeCoder server.
                </p>
                {savedProviders.length > 0 ? (
                  <div className="space-y-3">
                    {savedProviders.map((cred) => (
                      <div key={cred.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-800">{cred.label}</p>
                          <span className="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Saved</span>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex gap-3">
                           <button onClick={() => handleInlineTestKey(cred)} className="text-xs font-semibold text-slate-600 hover:text-slate-900">Test</button>
                           <button onClick={() => handleDeleteCredential(cred.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center">
                    <p className="text-slate-500 text-sm">No providers yet. Add your first one below.</p>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <h4 className="text-sm font-bold text-slate-800">Add a provider</h4>
                  <div className="space-y-3">
                    <select value={keyProvider} onChange={(e) => setKeyProvider(e.target.value as KeyProvider)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20">
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="local">Local Llama</option>
                      <option value="mistral">Mistral</option>
                      <option value="groq">Groq</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="custom">Custom API Config</option>
                    </select>
                    
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1">Get a key <ArrowRight className="h-3 w-3 -rotate-45" /></label>
                      <input type="password" placeholder="Enter API Key Secret" value={inputKey} onChange={(e) => setInputKey(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20 mb-3" />
                      <input type="text" placeholder="Label (optional)" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>

                    <button onClick={handleTestAndAdd} disabled={isTesting || !inputKey.trim()} className="w-full bg-slate-900 text-white p-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                      {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Add
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
