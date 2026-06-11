import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Settings } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <Sparkles className="h-12 w-12" />
          </div>
        </div>
        
        <h1 className="mb-4 text-5xl font-extrabold tracking-tight sm:text-6xl">
          Vibe-code with any AI
        </h1>
        
        <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
          Your ultimate Multi-AI Sandbox Dev Environment. Bring your own API keys and seamlessly switch between Gemini, Claude, OpenAI, and local models.
        </p>
        
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/p/$projectId"
            params={{ projectId: crypto.randomUUID() }}
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Create Workspace <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
