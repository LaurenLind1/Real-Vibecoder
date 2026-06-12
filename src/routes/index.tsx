import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { nanoid } from "nanoid";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

export default function LandingPage() {
  const freshProjectId = nanoid(8);

  return (
    <>
      <Toaster richColors position="top-right" />
      {/* bg-transparent ensures it doesn't block the style.css gradient */}
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 text-white">
        <div className="mx-auto max-w-3xl text-center">
          
          {/* Sparkles wrapper with a glassmorphism blur effect */}
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-white/10 backdrop-blur-md p-4 shadow-sm border border-white/20">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
          </div>
          
          {/* Crisp white header text with a lighter, high-contrast nested gradient */}
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight sm:text-6xl text-white">
            Vibe-code with <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-sky-100 to-emerald-200">any AI</span>
          </h1>
          
          <p className="mb-8 text-lg text-white/80 sm:text-xl max-w-2xl mx-auto">
            Your ultimate Multi-AI Sandbox Dev Environment. Bring your own API keys and seamlessly switch between Gemini, Claude, OpenAI, and local models.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            {/* Clean solid white button that pops brilliantly off the background */}
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
