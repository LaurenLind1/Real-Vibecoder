import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { 
  Key, X, Trash2, CheckCircle2, AlertTriangle, RefreshCw, 
  Send, Bot, User, Sparkles, Plus, ListTodo, Timer, Wrench, RotateCcw, Play, Home, ArrowRight
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
  // 🧭 Page Architecture State
  const [currentPage, setCurrentPage] = useState<PageView>("landing");

  // Default empty project view as requested
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
      content: "Hello! I am connected to your Multi-AI Sandbox environment. Add your API keys above, select a model engine, and let's start writing some code!",
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

  // 🕒 Fix: Timer runs constantly while user is active on the Chatbox Page
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentPage === "chatbox" && activeFeatures.liveTimer) {
      interval = setInterval(() => {
        setBuildSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentPage, activeFeatures.liveTimer]);

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;

    const rawPrompt = chatInput.trim();
    
    // Add to project history automatically when initialized
    const readableName = rawPrompt.length > 32 ? rawPrompt.substring(0, 32) + "..." : rawPrompt;
    setRecentProjects(prev => [
      { id: crypto.randomUUID(), name: readableName, date: new Date(), fileCount: 1 },
      ...prev
    ]);

    setChatInput("");
    setCurrentPage("chatbox");
    sendToAI(rawPrompt);
  };

  const sendToAI = async (messageText: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      timestamp: new Date()
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
          id: crypto.randomUUID(), role: "assistant", content: `⚠️ No active key found for "${primaryTargetProvider}". Please use the prominent "API Keys Configuration" button in the top right to get connected.`, timestamp: new Date()
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

      {/* 🚀 PAGE ONE: LANDING PAGE */}
      {currentPage === "landing" && (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_45%)]" />
          
          <header className="flex h-20 items-center justify-between px-10 w-full border-b border-slate-800/60 relative z-10 backdrop-blur-md bg-slate-900/40">
            <div className="flex items-center gap-2.5 font-black text-xl tracking-tight">
              <Sparkles className="h-6 w-6 text-indigo-400" />
              <span>VibeCoder</span>
            </div>

            {/* Prominent High Visibility Key Target */}
            <button 
              onClick={() => setIsKeyPanelOpen(true)} 
              className="flex items-center gap-2.5 text-sm font-bold bg-indigo-600 text-white px-6 py-3 rounded-xl transition-all hover:bg-indigo-500 shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Key className="h-4 w-4" />
              <span>Configure Required API Keys</span>
            </button>
          </header>

          <main className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-3xl mx-auto relative z-10 py-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Next-Gen AI Sandbox Engine
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-6 leading-[1.1]">
              Vibe-code apps with <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">any LLM model</span>.
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
              Bring your own API keys. Prompt, blueprint, iterate, and monitor your sandbox build steps in real-time. Completely client-side and sandboxed.
            </p>

            <div className="flex
