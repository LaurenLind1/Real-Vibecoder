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
      <ProjectShell project={project} onChange={update} />
    </>
  );
}