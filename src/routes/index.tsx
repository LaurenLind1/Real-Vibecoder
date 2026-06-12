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
      {/* FIXED: Changed bg-slate-50 to bg-transparent so the body gradient is visible */}
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 text-slate-900">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex justify-center">
            {/* Swapped white background for a transparent blur to look great against the gradient */}
            <div className="rounded-full bg-white/20 backdrop-blur-md p-4 shadow-sm border border-white/30">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
          </div>
          
          {/* Changed text color to white so it stands out beautifully against the new dark gradient */}
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight sm:text-6xl text-white">
            Vibe-code with <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-sky-200 to-emerald-200">any AI</span>
          </h1>
          
          {/* Adjusted paragraph opacity so it is readable on the dark background */}
          <p className="mb-8 text-lg text-white/80 sm:text-xl">
            Your ultimate Multi-AI Sandbox Dev Environment. Bring your own API keys and seamlessly switch between Gemini, Claude, OpenAI, and local models.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            {/* Added a solid white button layout so it breaks away clean from the background gradient */}
            <Link
              to="/p/$projectId"
              params={{ projectId: freshProjectId }}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-slate-900 shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              Create Workspace <ArrowRight className="ml-2 h-4 w-4 text-slate-900" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
