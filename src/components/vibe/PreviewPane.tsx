import { lazy, Suspense, useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { FileMap } from "@/lib/vibe/types";

const SandpackInner = lazy(() => import("./SandpackInner"));

export function PreviewPane({
  files,
  onError,
}: {
  files: FileMap;
  onError?: (msg: string | null) => void;
}) {
  const sandpackFiles = useMemo(() => {
    const out: Record<string, { code: string }> = {};
    for (const [path, content] of Object.entries(files)) {
      out[path] = { code: content };
    }
    return out;
  }, [files]);

  return (
    <div className="h-full w-full bg-background">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        }
      >
        <SandpackInner files={sandpackFiles} onError={onError} />
      </Suspense>
    </div>
  );
}