import { SettingsModal } from "@/components/SettingsModal";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ProjectShell } from "@/components/vibe/ProjectShell";
import { getProject, upsertProject } from "@/lib/vibe/storage";
import type { Project } from "@/lib/vibe/types";

export const Route = createFileRoute("/p/$projectId")({
  component: ProjectPage,
});

function ProjectPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loaded, setLoaded] = useState(false);
  
  // 1. ADDED: State to control if the Settings Modal is open or closed
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const p = getProject(projectId);
    if (!p) {
      navigate({ to: "/" });
      return;
    }
    setProject(p);
    setLoaded(true);
  }, [projectId, navigate]);

  function update(next: Project) {
    setProject(next);
    upsertProject(next);
  }

  if (!loaded || !project) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      
      {/* 2. ADDED: Passed a function to ProjectShell so its settings button can open the modal */}
      <ProjectShell 
        project={project} 
        onChange={update} 
        onOpenSettings={() => setSettingsOpen(true)} 
      />

      {/* 3. ADDED: The actual Settings Modal component */}
      <SettingsModal 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />
    </>
  );
}
