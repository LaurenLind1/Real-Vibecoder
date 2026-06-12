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
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-slate-900">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-indigo-50 p-4 shadow-sm border border-indigo-100">
              <Sparkles className="h-12 w-12 text-indigo-600" />
            </div>
          </div>
          
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight sm:text-6xl text-slate-900">
            Vibe-code with <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500">any AI</span>
          </h1>
          
          <p className="mb-8 text-lg text-slate-500 sm:text-xl">
            Your ultimate Multi-AI Sandbox Dev Environment. Bring your own API keys and seamlessly switch between Gemini, Claude, OpenAI, and local models.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/p/$projectId"
              params={{ projectId: freshProjectId }}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 px-8 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20"
            >
              Create Workspace <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
