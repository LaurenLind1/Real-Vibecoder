import type { Project, VibeSettings } from "./types";

const SETTINGS_KEY = "vibecoder.settings.v1";
const PROJECTS_KEY = "vibecoder.projects.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadSettings(): VibeSettings {
  if (!isBrowser()) return { providers: [] };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { providers: [] };
    return JSON.parse(raw);
  } catch {
    return { providers: [] };
  }
}

export function saveSettings(s: VibeSettings) {
  if (!isBrowser()) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function loadProjects(): Project[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  if (!isBrowser()) return;
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getProject(id: string): Project | undefined {
  return loadProjects().find((p) => p.id === id);
}

export function upsertProject(project: Project) {
  const all = loadProjects();
  const idx = all.findIndex((p) => p.id === project.id);
  const updated = { ...project, updatedAt: Date.now() };
  if (idx >= 0) all[idx] = updated;
  else all.unshift(updated);
  saveProjects(all);
}

export function deleteProject(id: string) {
  saveProjects(loadProjects().filter((p) => p.id !== id));
}