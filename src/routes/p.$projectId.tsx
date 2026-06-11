import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Editor from "@monaco-editor/react";

export const Route = createFileRoute("/p/$projectId")({
  component: Dashboard,
});

type AIModel =
  | "gemini-2.5-flash"
  | "gemini-2.5-pro"
  | "gpt-4o"
  | "claude-3.7-sonnet"
  | "local-llama";

function Dashboard() {
  const [selectedModel, setSelectedModel] = useState<AIModel>("gemini-2.5-flash");
  const [code, setCode] = useState<string>(
    `// Selected Engine: ${selectedModel}\nfunction init() {\n  console.log("Hello from your sandbox workspace!");\n}`
  );
  const [systemPrompt, setSystemPrompt] = useState<string>(
    "You are an expert full-stack developer assistant."
  );

  // 🔑 Added state to store your API key safely without altering app mechanics
  const [apiKey, setApiKey] = useState<string>("");

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

  return (
    <div className="flex h-screen flex-col overflow-hidden text-slate-900">
      {/* Top Navigation Control Bar */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-6">
        <div className="flex items-center gap-2 font-semibold">
          <span className="text-primary text-lg">⚙️ Multi-AI Sandbox Dev Environment</span>
        </div>

        {/* 🔑 API Key Secure Input Field added directly into header flow */}
        <div className="flex-1 max-w-md mx-6">
          <input
            type="password"
            placeholder="Enter your API Key here..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-slate-900"
          />
        </div>

        {/* State-Driven Model Picker */}
        <div className="flex items-center gap-4">
          <label
            htmlFor="model-select"
            className="text-sm font-medium text-muted-foreground"
          >
            Active Provider Engine:
          </label>
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
            <optgroup label="Offline Edge Runtimes">
              <option value="local-llama">Local Llama 3 (Sandbox Execution)</option>
            </optgroup>
          </select>

          <button className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            Generate Code
          </button>
        </div>
      </header>

      {/* Main Panel Workspace */}
      <main className="flex flex-1 overflow-hidden">
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
          <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/20">
            <span className="text-xs font-mono font-medium text-muted-foreground">
              Workspace Source Code
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-400">
              {selectedModel.includes("gemini") ? "Native Direct Hook" : "Proxy Framework"}
            </span>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
