import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, Download, ArrowLeft, Sparkles, History, Undo2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { SettingsModal } from "./SettingsModal";
import { ChatPane } from "./ChatPane";
import { EditorPane } from "./EditorPane";
import { PreviewPane } from "./PreviewPane";
import { loadSettings } from "@/lib/vibe/storage";
import type { Project, VibeSettings, ChatMessage, FileMap, Checkpoint } from "@/lib/vibe/types";

interface Props {
  project: Project;
  onChange: (next: Project) => void;
}

export function ProjectShell({ project, onChange }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<VibeSettings>({ providers: [] });
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    if (settings.providers.length === 0) {
      setSettingsOpen(true);
    }
  }, [settings.providers.length]);

  const provider = useMemo(() => {
    const id = project.selectedProviderId ?? settings.defaultProviderKeyId;
    return settings.providers.find((p) => p.id === id) ?? settings.providers[0] ?? null;
  }, [project.selectedProviderId, settings]);

  const model = project.selectedModel ?? settings.defaultModel ?? "";

  function updateChat(next: { messages: ChatMessage[]; files: FileMap }) {
    onChange({ ...project, messages: next.messages, files: next.files });
  }

  function addCheckpoint(cp: Checkpoint) {
    const list = [...(project.checkpoints ?? []), cp].slice(-20);
    onChange({ ...project, checkpoints: list });
  }

  function revertTo(cp: Checkpoint) {
    onChange({ ...project, files: { ...cp.files } });
    toast.success(`Reverted to "${cp.label}"`);
  }

  function setPlanner(v: boolean) {
    onChange({ ...project, plannerEnabled: v });
  }

  async function exportZip() {
    const [{ default: JSZip }, { saveAs }] = await Promise.all([
      import("jszip"),
      import("file-saver"),
    ]);
    const zip = new JSZip();
    for (const [path, content] of Object.entries(project.files)) {
      zip.file(path.replace(/^\//, ""), content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${project.name.replace(/\s+/g, "-").toLowerCase()}.zip`);
    toast.success("Downloaded zip");
  }

  const checkpoints = [...(project.checkpoints ?? [])].reverse();

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <header className="border-b px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold truncate">{project.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost">
                <History className="h-4 w-4 mr-1" /> History
                {checkpoints.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">({checkpoints.length})</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2 max-h-96 overflow-y-auto">
              {checkpoints.length === 0 ? (
                <div className="text-xs text-muted-foreground p-2">
                  Each chat turn creates a checkpoint you can revert to.
                </div>
              ) : (
                <div className="space-y-1">
                  {checkpoints.map((cp) => (
                    <div
                      key={cp.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{cp.label || "(empty)"}</div>
                        <div className="text-muted-foreground">
                          {new Date(cp.createdAt).toLocaleTimeString()} ·{" "}
                          {Object.keys(cp.files).length} files
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => revertTo(cp)}>
                        <Undo2 className="h-3 w-3 mr-1" /> Revert
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="ghost" onClick={exportZip}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-1" /> Settings
          </Button>
        </div>
      </header>

      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={28} minSize={20}>
          <ChatPane
            messages={project.messages}
            files={project.files}
            provider={provider}
            model={model}
            previewError={previewError}
            onClearError={() => setPreviewError(null)}
            plannerEnabled={project.plannerEnabled}
            onTogglePlanner={setPlanner}
            onCheckpoint={addCheckpoint}
            onChange={updateChat}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={72}>
          <Tabs defaultValue="preview" className="h-full flex flex-col">
            <div className="border-b px-2 pt-1">
              <TabsList className="h-8">
                <TabsTrigger value="preview" className="text-xs">
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="text-xs">
                  Code
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="preview" className="flex-1 m-0">
              <PreviewPane files={project.files} onError={setPreviewError} />
            </TabsContent>
            <TabsContent value="code" className="flex-1 m-0">
              <EditorPane
                files={project.files}
                onChange={(files) => onChange({ ...project, files })}
              />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={(s) => setSettings(s)}
      />
    </div>
  );
}