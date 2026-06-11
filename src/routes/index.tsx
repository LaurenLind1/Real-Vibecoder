import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { nanoid } from "nanoid";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

export default function LandingPage() {
  // Generates a unique 8-character ID for a brand-new workspace
  const freshProjectId = nanoid(8);

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4 text-slate-900">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <Sparkles className="h-12 w-12" />
            </div>
          </div>
          
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight sm:text-6xl text-slate-900">
            Vibe-code with any AI
          </h1>
          
          <p className="mb-8 text-lg text-slate-600 sm:text-xl">
            Your ultimate Multi-AI Sandbox Dev Environment. Bring your own API keys and seamlessly switch between Gemini, Claude, OpenAI, and local models.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/p/$projectId"
              params={{ projectId: freshProjectId }}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Create Workspace <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
