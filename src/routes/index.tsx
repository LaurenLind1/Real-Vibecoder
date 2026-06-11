import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Editor from "@monaco-editor/react";

export const route = createFileRoute("/")({
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
  
  // 🔑 Added state to store your API key safely
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
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top Navigation Control Bar */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-6">
        <div className="flex items-center gap-4">
          <span className="font-bold text-sm tracking-tight text-card-foreground">
            Vibecoder Workspace
          </span>
          
          {/* 🔑 API Key Secure Input Field */}
          <input
            type="password"
            placeholder="Enter your API Key here..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="h-8 w-64 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value as AIModel)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium shadow-sm outline-none text-foreground"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
            <option value="local-llama">Local Llama</option>
          </select>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Control Panel */}
        <div className="flex w-80 flex-col justify-between border-r bg-muted/10 p-4 gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="h-32 w-full rounded-md border border-input bg-background p-2 text-xs shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              />
            </div>
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
