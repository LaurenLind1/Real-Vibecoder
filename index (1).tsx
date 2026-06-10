import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sparkles, Plus, Trash2, KeyRound, Clock, ListChecks, Wand2, History } from "lucide-react";
import { nanoid } from "nanoid";
import { Toaster } from "@/components/ui/sonner";
import { loadProjects, upsertProject, deleteProject, loadSettings } from "@/lib/vibe/storage";
import { createStarterFiles } from "@/lib/vibe/starter";
import { SettingsModal } from "@/components/vibe/SettingsModal";
import type { Project } from "@/lib/vibe/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VibeCoder — Build apps by chatting" },
      {
        name: "description",
        content: "Bring your own API keys (Gemini, OpenAI, Claude, Lovable, and more) and vibe-code React apps in your browser.",
      },
      { property: "og:title", content: "VibeCoder" },
      { property: "og:description", content: "Vibe-code React apps with any AI provider." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [prompt, setPrompt] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasKeys, setHasKeys] = useState(false);

  useEffect(() => {
    setProjects(loadProjects());
    setHasKeys(loadSettings().providers.length > 0);
  }, [settingsOpen]);

  function newProject() {
    const id = nanoid(10);
    const name = prompt.trim() ? prompt.trim().slice(0, 60) : "Untitled project";
    const project: Project = {
      id,
      name,
      files: createStarterFiles(),
      messages: prompt.trim()
        ? [{ id: nanoid(8), role: "user", content: prompt.trim(), createdAt: Date.now() }]
        : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    upsertProject(project);
    navigate({ to: "/p/$projectId", params: { projectId: id } });
  }

  function remove(id: string) {
    deleteProject(id);
    setProjects(loadProjects());
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Toaster richColors position="top-right" />
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg tracking-tight">VibeCoder</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            <KeyRound className="h-4 w-4 mr-1" /> AI Providers
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Vibe-code with <span className="text-primary">any</span> AI.
          </h1>
          <p className="text-lg text-muted-foreground">
            Bring your own keys — Gemini, OpenAI, Claude, Lovable, OpenRouter, anything.
          </p>
        </div>

        <Card className="p-4 mb-10 shadow-lg">
          <Input
            placeholder="Describe an app to build… e.g. a pomodoro timer with dark mode"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") newProject();
            }}
            className="border-0 shadow-none text-base focus-visible:ring-0 mb-2"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {hasKeys ? "Ready to build" : "Add an AI key in Settings first"}
            </span>
            <Button onClick={newProject}>
              <Plus className="h-4 w-4 mr-1" /> New project
            </Button>
          </div>
        </Card>

        {projects.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Your projects
            </h2>
            <div className="space-y-2">
              {projects.map((p) => (
                <Card
                  key={p.id}
                  className="p-3 flex items-center justify-between hover:border-primary/50 transition-colors"
                >
                  <button
                    onClick={() => navigate({ to: "/p/$projectId", params: { projectId: p.id } })}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.updatedAt).toLocaleString()} · {Object.keys(p.files).length} files
                    </div>
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Feature icon={<ListChecks className="h-5 w-5" />} title="Plan-first mode">
            Toggle the planner and the AI writes a short plan before touching code.
          </Feature>
          <Feature icon={<Clock className="h-5 w-5" />} title="Live build timer">
            Watch elapsed time and step count tick up while the agent works.
          </Feature>
          <Feature icon={<Wand2 className="h-5 w-5" />} title="Auto-fix preview errors">
            When the sandbox throws, one click sends the error back to the model.
          </Feature>
          <Feature icon={<History className="h-5 w-5" />} title="Checkpoints & revert">
            Every turn snapshots your files. Roll back any time from the History menu.
          </Feature>
        </div>
      </main>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1 text-primary">{icon}<span className="font-semibold text-foreground">{title}</span></div>
      <p className="text-sm text-muted-foreground">{children}</p>
    </Card>
  );
}
